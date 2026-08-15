'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, tokenStorage } from '@/services/api-client';
import { chatService } from '@/services';
import { useAuth } from './useAuth';
import type { AiProviderInfo, ChatMessage } from '@/types';

/**
 * Chat over Socket.IO.
 *
 * Owns the socket lifecycle and the message list. Everything the UI needs to
 * render honest state — connecting, sending, assistant typing, failed to send —
 * comes from here, so the widget itself stays presentational.
 *
 * ## Why a socket rather than polling
 *
 * An assistant turn involves retrieval, one or more tool calls and a model
 * round trip. Over a socket the typing indicator starts the moment the server
 * begins work and the reply lands the moment it finishes. Polling would either
 * add latency on every reply or waste requests waiting for one.
 *
 * ## Reconnection
 *
 * Socket.IO reconnects with backoff on its own. What it cannot do is know that
 * the conversation must be rejoined afterwards, so `connect` re-emits
 *`chat:join` with the stored session id. The transcript is server-side, so a
 * reconnect restores the full history rather than an empty window.
 *
 * If the websocket cannot be established at all, `sendMessage` falls back to
 * the REST endpoint — which runs the identical chat service — so the assistant
 * still works on a restrictive network.
 */

/**
 * The conversation id is kept in `localStorage`, not `sessionStorage`.
 *
 * `sessionStorage` is wiped when the tab closes, so a returning visitor always
 * started a brand-new conversation and the assistant had no memory of what they
 * asked last time. The transcript itself has always lived in PostgreSQL; this is
 * what lets the browser point back at it.
 *
 * For signed-in patients the server is the real source of continuity — it
 * resumes their most recent conversation even on a different device, so losing
 * this value costs nothing.
 */
const SESSION_STORAGE_KEY = 'bsds.chatSession';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface UseChatResult {
  messages: ChatMessage[];
  sessionId: string | null;
  connection: ConnectionState;
  /** The assistant is composing a reply. */
  assistantTyping: boolean;
  sending: boolean;
  error: string | null;
  provider: AiProviderInfo | null;
  sendMessage: (content: string) => Promise<void>;
  retryLast: () => Promise<void>;
  clearError: () => void;
}

export function useChat(enabled: boolean): UseChatResult {
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiProviderInfo | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const sessionRef = useRef<string | null>(null);
  const lastMessageRef = useRef<string | null>(null);

  // Keep a ref alongside the state: the socket event handlers below close over
  // their first render, and the ref is how they read the current session id.
  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  /**
   * Opens the connection.
   *
   * Deferred until the widget is first opened (`enabled`) — a visitor who never
   * uses the assistant should not pay for a websocket. It also waits for the
   * auth check, so the handshake carries a token when one exists and the
   * conversation is attributed to the right account from the first message.
   */
  useEffect(() => {
    if (!enabled || authLoading) return;

    const storedSession = (() => {
      try {
        return window.localStorage.getItem(SESSION_STORAGE_KEY);
      } catch {
        return null;
      }
    })();

    setConnection('connecting');

    const socket = io(API_URL, {
      auth: { token: tokenStorage.get() ?? undefined },
      // Prefer websocket; fall back to long-polling on networks that block it.
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 6,
      reconnectionDelay: 800,
      reconnectionDelayMax: 6000,
      timeout: 12_000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnection('connected');
      setError(null);
      // Rejoin on every connect, including reconnects.
      socket.emit('chat:join', {
        sessionId: sessionRef.current ?? storedSession ?? undefined,
      });
    });

    socket.on(
      'chat:joined',
      (data: {
        session: { id: string };
        messages: ChatMessage[];
        welcome: { content: string; payload: ChatMessage['payload'] } | null;
        provider: AiProviderInfo;
      }) => {
        setSessionId(data.session.id);
        sessionRef.current = data.session.id;
        setProvider(data.provider);
        try {
          window.localStorage.setItem(SESSION_STORAGE_KEY, data.session.id);
        } catch {
          /* ignore */
        }

        // The welcome message is generated, not stored, so it is synthesised
        // into a message object rather than arriving in `messages`.
        setMessages(
          data.messages.length > 0
            ? data.messages
            : data.welcome
              ? [
                  {
                    id: 'welcome',
                    sessionId: data.session.id,
                    role: 'assistant' as const,
                    content: data.welcome.content,
                    payload: data.welcome.payload,
                    createdAt: new Date().toISOString(),
                  },
                ]
              : [],
        );
      },
    );

    socket.on('chat:message', (data: { message: ChatMessage }) => {
      // Replace the optimistic copy with the persisted row, matching on
      // content so the bubble does not duplicate or flicker.
      setMessages((current) => {
        const optimisticIndex = current.findIndex(
          (message) => message.pending && message.content === data.message.content,
        );
        if (optimisticIndex === -1) {
          return current.some((message) => message.id === data.message.id)
            ? current
            : [...current, data.message];
        }
        const next = [...current];
        next[optimisticIndex] = data.message;
        return next;
      });
    });

    socket.on('chat:reply', (data: { message: ChatMessage }) => {
      setAssistantTyping(false);
      setSending(false);
      setMessages((current) =>
        current.some((message) => message.id === data.message.id)
          ? current
          : [...current, data.message],
      );
    });

    socket.on('chat:typing', (data: { isTyping: boolean }) => {
      setAssistantTyping(data.isTyping);
    });

    socket.on('chat:error', (data: { message: string }) => {
      setAssistantTyping(false);
      setSending(false);
      setError(data.message);
      // Mark the in-flight message so the UI can offer a retry.
      setMessages((current) =>
        current.map((message) =>
          message.pending ? { ...message, pending: false, failed: true } : message,
        ),
      );
    });

    socket.on('disconnect', (reason) => {
      setAssistantTyping(false);
      // An intentional close from either side should not show as an outage.
      setConnection(reason === 'io client disconnect' ? 'idle' : 'reconnecting');
    });

    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    socket.io.on('reconnect_failed', () => {
      setConnection('offline');
      setError('Lost connection to the assistant. Messages will be sent over a backup connection.');
    });
    socket.on('connect_error', () => setConnection('reconnecting'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, authLoading, user?.id]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || sending) return;

      lastMessageRef.current = trimmed;
      setError(null);
      setSending(true);

      // Optimistic echo — the bubble appears instantly, then is replaced by the
      // persisted row when the server confirms.
      const optimistic: ChatMessage = {
        id: `pending-${Date.now()}`,
        sessionId: sessionRef.current ?? '',
        role: 'user',
        content: trimmed,
        payload: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((current) => [...current, optimistic]);

      const socket = socketRef.current;

      if (socket?.connected && sessionRef.current) {
        setAssistantTyping(true);
        socket.emit(
          'chat:message',
          { sessionId: sessionRef.current, content: trimmed },
          (ack: { ok: boolean; error?: string }) => {
            if (!ack?.ok) {
              setSending(false);
              setAssistantTyping(false);
              setError(ack?.error ?? 'Your message could not be sent.');
              setMessages((current) =>
                current.map((message) =>
                  message.id === optimistic.id
                    ? { ...message, pending: false, failed: true }
                    : message,
                ),
              );
            }
          },
        );
        return;
      }

      // Websocket unavailable — the REST route runs the same chat service.
      try {
        let activeSession = sessionRef.current;
        if (!activeSession) {
          const created = await chatService.createSession();
          activeSession = created.session.id;
          setSessionId(activeSession);
          sessionRef.current = activeSession;
          setProvider(created.provider);
        }

        setAssistantTyping(true);
        const result = await chatService.sendMessage(activeSession, trimmed);

        setMessages((current) => [
          ...current.map((message) =>
            message.id === optimistic.id ? result.userMessage : message,
          ),
          result.assistantMessage,
        ]);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Your message could not be sent. Please try again.',
        );
        setMessages((current) =>
          current.map((message) =>
            message.id === optimistic.id ? { ...message, pending: false, failed: true } : message,
          ),
        );
      } finally {
        setAssistantTyping(false);
        setSending(false);
      }
    },
    [sending],
  );

  const retryLast = useCallback(async () => {
    const last = lastMessageRef.current;
    if (!last) return;
    // Drop the failed bubble before resending so it is not shown twice.
    setMessages((current) => current.filter((message) => !message.failed));
    await sendMessage(last);
  }, [sendMessage]);

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    sessionId,
    connection,
    assistantTyping,
    sending,
    error,
    provider,
    sendMessage,
    retryLast,
    clearError,
  };
}
