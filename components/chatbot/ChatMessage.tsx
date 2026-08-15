'use client';

import { AlertCircle, CalendarCheck2, Check, Clock, Sparkles } from 'lucide-react';
import { cn, formatDateLong, formatMessageTime, formatPrice, formatTime12h } from '@/lib/utils';
import type { ChatMessage as ChatMessageType, MessagePayload } from '@/types';

/**
 * A single chat bubble, plus the rich attachments an assistant turn can carry.
 *
 * When the assistant returns slots, they are rendered as tappable chips rather
 * than a list of times the patient must retype — the point of a conversational
 * booking flow is lost if choosing still means typing "2:30 PM" exactly right.
 */

interface ChatMessageProps {
  message: ChatMessageType;
  onSlotSelect: (time: string) => void;
  onQuickReply: (text: string) => void;
  onRetry: () => void;
}

export function ChatMessageBubble({
  message,
  onSlotSelect,
  onQuickReply,
  onRetry,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-2.5 animate-fade-up',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-brand-on-solid" aria-hidden />
        </div>
      )}

      <div className={cn('flex max-w-[85%] flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm',
            isUser
              ? 'rounded-br-md bg-brand-solid text-brand-on-solid'
              : 'rounded-bl-md border border-line bg-surface text-content',
            message.pending && 'opacity-70',
            message.failed && 'border-danger-border bg-danger-bg text-danger-fg',
          )}
        >
          <MessageText content={message.content} />
        </div>

        {message.payload && (
          <MessageAttachment
            payload={message.payload}
            onSlotSelect={onSlotSelect}
            onQuickReply={onQuickReply}
          />
        )}

        <div className="flex items-center gap-1.5 px-1 text-[10px] text-content-subtle">
          {message.failed ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 font-medium text-danger-fg hover:underline"
            >
              <AlertCircle className="h-3 w-3" />
              Not sent — tap to retry
            </button>
          ) : (
            <>
              <span>{formatMessageTime(message.createdAt)}</span>
              {isUser && !message.pending && <Check className="h-3 w-3" aria-label="Sent" />}
              {message.pending && <span className="italic">Sending…</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal markdown rendering.
 *
 * The assistant emits `**bold**`, `_italic_`, ```code``` and bullet lines.
 * A full markdown parser is more dependency than three inline patterns justify,
 * and the text is escaped into React elements rather than injected as HTML, so
 * a model response cannot introduce markup.
 */
function MessageText({ content }: { content: string }) {
  return (
    <>
      {content.split('\n').map((line, lineIndex) => {
        if (line.trim() === '') return <div key={lineIndex} className="h-2" />;

        const isBullet = /^\s*[•\-*]\s+/.test(line);
        const text = isBullet ? line.replace(/^\s*[•\-*]\s+/, '') : line;

        return (
          <div key={lineIndex} className={cn(isBullet && 'flex gap-1.5 pl-0.5')}>
            {isBullet && <span aria-hidden>•</span>}
            <span>{renderInline(text)}</span>
          </div>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={key++} className="rounded bg-black/10 px-1 py-0.5 text-[12px] dark:bg-white/15">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={key++} className="opacity-80">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MessageAttachment({
  payload,
  onSlotSelect,
  onQuickReply,
}: {
  payload: MessagePayload;
  onSlotSelect: (time: string) => void;
  onQuickReply: (text: string) => void;
}) {
  /*
   * Payloads are JSONB read back from the database, so their shape is only as
   * trustworthy as whatever wrote them — an older release, a hand-edited row,
   * a seed file. TypeScript cannot check that at runtime.
   *
   * Each branch below therefore verifies the fields it is about to read and
   * renders nothing when they are missing. Reading straight through
   * (`payload.appointment.startTime`) throws inside render, and because there
   * is no error boundary around the widget React unmounts the whole chat — one
   * malformed row silently took the assistant off the page.
   */
  switch (payload.type) {
    case 'slots': {
      if (!payload.date || !Array.isArray(payload.slots) || payload.slots.length === 0) return null;
      return (
        <div className="w-full rounded-xl border border-line bg-surface-sunken/60 p-3">
          {/* formatDateLong already leads with the weekday — do not prefix it
 with dayName as well. */}
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-subtle">
            <Clock className="h-3 w-3" aria-hidden />
            {formatDateLong(payload.date)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {payload.slots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => onSlotSelect(time)}
                className={cn(
                  'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold tabular text-content',
                  'transition-all duration-150 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-700',
                  'active:scale-95',
                )}
              >
                {formatTime12h(time)}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'booking_confirmed': {
      const booked = payload.appointment;
      if (!booked?.appointmentDate || !booked.startTime) return null;
      return (
        <div className="w-full overflow-hidden rounded-xl border border-success-border bg-success-bg">
          <div className="flex items-center gap-2 border-b border-success-border px-3 py-2">
            <CalendarCheck2 className="h-4 w-4 text-success-fg" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide text-success-fg">
              Appointment confirmed
            </span>
          </div>
          <div className="space-y-1 px-3 py-2.5 text-[13px] text-content">
            <p className="font-semibold">{formatDateLong(booked.appointmentDate)}</p>
            <p className="tabular">
              {formatTime12h(booked.startTime)}
              {booked.endTime ? ` – ${formatTime12h(booked.endTime)}` : ''}
            </p>
            {booked.reason && <p className="text-content-muted">{booked.reason}</p>}
            {booked.id && (
              <p className="pt-1 text-[11px] text-content-subtle">
                Reference {booked.id.slice(0, 8).toUpperCase()}
              </p>
            )}
          </div>
        </div>
      );
    }

    case 'appointment_list':
      if (!Array.isArray(payload.appointments) || payload.appointments.length === 0) return null;
      return (
        <div className="w-full space-y-1.5">
          {payload.appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px]"
            >
              <p className="font-semibold text-content">
                {formatDateLong(appointment.appointmentDate)}
              </p>
              <p className="tabular text-content-muted">
                {formatTime12h(appointment.startTime)} · {appointment.reason}
              </p>
            </div>
          ))}
        </div>
      );

    case 'services':
      if (!Array.isArray(payload.services) || payload.services.length === 0) return null;
      return (
        <div className="w-full space-y-1 rounded-xl border border-line bg-surface-sunken/60 p-2.5">
          {payload.services.slice(0, 6).map((service) => (
            <div key={service.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-content">{service.name}</span>
              <span className="shrink-0 text-xs tabular text-content-subtle">
                {formatPrice(service.priceFrom)}
              </span>
            </div>
          ))}
        </div>
      );

    case 'quick_replies':
      if (!Array.isArray(payload.options) || payload.options.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1.5">
          {payload.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onQuickReply(option)}
              className={cn(
                'rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-content-muted',
                'transition-all duration-150 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-700',
                'active:scale-95',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/** Three-dot indicator shown while the assistant composes a reply. */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 animate-fade-in">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-brand-on-solid" aria-hidden />
      </div>
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3"
        role="status"
        aria-label="The assistant is typing"
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-content-subtle animate-typing-bounce"
            style={{ animationDelay: `${index * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}
