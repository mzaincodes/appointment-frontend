'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, Wifi, WifiOff, X, Minimize2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { cn, formatTime12h } from '@/lib/utils';
import { ChatMessageBubble, TypingIndicator } from './ChatMessage';

/**
 * Floating assistant.
 *
 * Present on every page as a launcher in the bottom-right; opens into a docked
 * panel on desktop and a bottom sheet on mobile.
 *
 * On mobile the sheet is capped at 85dvh rather than going fullscreen, so the
 * booking page stays partly visible behind it — a patient mid-booking should
 * not lose their place to ask a question.
 */

const SUGGESTIONS = [
  '📅 Book an appointment',
  '🕐 What are your opening hours?',
  '🦷 What services do you offer?',
  '📍 Where are you located?',
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The socket is not opened until the widget has been used at least once.
  const [everOpened, setEverOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);

  const {
    messages,
    connection,
    assistantTyping,
    sending,
    error,
    provider,
    sendMessage,
    retryLast,
    clearError,
  } = useChat(everOpened);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  // The admin dashboard is a staff tool; the patient assistant does not belong
  // over the top of it.
  const hidden = pathname.startsWith('/admin');

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [messages, assistantTyping, open]);

  // Badge replies that arrive while the panel is closed.
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      const latest = messages[messages.length - 1];
      if (!open && latest?.role === 'assistant' && lastCountRef.current > 0) {
        setUnread((count) => count + 1);
      }
    }
    lastCountRef.current = messages.length;
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      window.setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleOpen = () => {
    setEverOpened(true);
    setOpen(true);
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || sending) return;
    setDraft('');
    clearError();
    await sendMessage(content);
  };

  /** A slot chip resolves to the natural phrasing a patient would type. */
  const handleSlotSelect = (time: string) => {
    void handleSend(`${formatTime12h(time)} please`);
  };

  if (hidden) return null;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={open ? 'Close the assistant' : 'Open the assistant'}
        aria-expanded={open}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl',
          'bg-brand-gradient text-brand-on-solid shadow-lifted',
          'transition-all duration-300 hover:scale-105 active:scale-95',
          open && 'scale-90 opacity-0 pointer-events-none',
        )}
      >
        {/* Pulse ring draws the eye without being a permanent animation. */}
        <span
          className="absolute inset-0 rounded-2xl bg-brand-500/40 animate-pulse-ring"
          aria-hidden
        />
        <MessageCircle className="relative h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-brand-on-solid">
            {unread}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden bg-surface shadow-lifted',
          'transition-all duration-300 ease-out',
          // Bottom sheet on mobile, docked card from `sm` up.
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl border-t border-line',
          'sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100dvh-6rem))] sm:w-[400px] sm:rounded-2xl sm:border',
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-6 opacity-0 sm:translate-y-4',
        )}
        role="dialog"
        aria-label="Clinic assistant"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-gradient px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-on-solid/20 backdrop-blur">
              <MessageCircle className="h-4.5 w-4.5 text-brand-on-solid" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-brand-on-solid/90',
                  connection === 'connected'
                    ? 'bg-green-400'
                    : connection === 'offline'
                      ? 'bg-red-400'
                      : 'bg-amber-400',
                )}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-on-solid">Clinic Assistant</p>
              <p className="flex items-center gap-1 text-[11px] text-brand-on-solid/90">
                {connection === 'connected' ? (
                  <>
                    <Wifi className="h-2.5 w-2.5" /> Online now
                  </>
                ) : connection === 'offline' ? (
                  <>
                    <WifiOff className="h-2.5 w-2.5" /> Backup connection
                  </>
                ) : connection === 'reconnecting' ? (
                  'Reconnecting…'
                ) : (
                  'Connecting…'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimise the assistant"
            className="shrink-0 rounded-lg p-1.5 text-brand-on-solid/80 transition-colors hover:bg-brand-on-solid/15 hover:text-brand-on-solid"
          >
            <span className="hidden sm:block">
              <Minimize2 className="h-4 w-4" />
            </span>
            <span className="sm:hidden">
              <X className="h-5 w-5" />
            </span>
          </button>
        </div>

        {/* Offline-provider notice — honest about which mode is running. */}
        {provider && !provider.isLive && (
          <div className="border-b border-warning-border bg-warning-bg px-4 py-2 text-[11px] leading-snug text-warning-fg">
            Running in offline mode — no AI key configured. Booking and clinic answers still work
            normally.
          </div>
        )}

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          {messages.length === 0 && connection === 'connecting' && (
            <div className="space-y-3">
              <div className="skeleton h-16 w-3/4 rounded-2xl" />
              <div className="skeleton ml-auto h-10 w-1/2 rounded-2xl" />
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              onSlotSelect={handleSlotSelect}
              onQuickReply={(text) => void handleSend(text)}
              onRetry={() => void retryLast()}
            />
          ))}

          {assistantTyping && <TypingIndicator />}

          {/*
 Starter prompts for an empty conversation — but not when the
 welcome message already carries its own quick-reply chips, which
 would otherwise show the same four options twice.
          */}
          {messages.length <= 1 &&
            !assistantTyping &&
            messages[messages.length - 1]?.payload?.type !== 'quick_replies' && (
              <div className="space-y-1.5 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void handleSend(suggestion)}
                    className={cn(
                      'block w-full rounded-xl border border-line bg-surface-sunken/50 px-3.5 py-2.5 text-left text-[13px] text-content-muted',
                      'transition-all duration-150 hover:border-brand-500/50 hover:bg-brand-500/8 hover:text-content active:scale-[0.99]',
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-xs text-danger-fg"
            >
              <span className="leading-snug">{error}</span>
              <button
                type="button"
                onClick={clearError}
                aria-label="Dismiss"
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-surface px-3 py-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                // Grow with the content, up to four lines.
                event.target.style.height = 'auto';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 96)}px`;
              }}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter makes a new line.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask a question or book an appointment…"
              aria-label="Message"
              className={cn(
                'max-h-24 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5',
                'text-[13.5px] text-content placeholder:text-content-subtle',
                'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
              )}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className={cn(
                'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl',
                'bg-brand-solid text-brand-on-solid transition-all',
                'hover:bg-brand-700 active:scale-95',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 px-1 text-center text-[10px] text-content-subtle">
            For dental emergencies call{' '}
            <a href="tel:+14155550142" className="font-medium underline">
              +1 (415) 555-0142
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
