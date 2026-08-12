import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelGrid } from './PixelGridLoader';

/**
 * Collapsible reasoning trace for models that emit their chain of thought
 * inline (see `@utils/thinking`). Without this the raw `<think>` tags and
 * their contents render as literal text run together with the answer.
 *
 * Two states, chosen by `isOpen` (i.e. "the model is still thinking"):
 *
 *  - Mid-thought: expanded by default and headed by the animated pixel grid,
 *    so reasoning is visible as it streams rather than hidden behind a
 *    control the reader has to discover mid-stream.
 *  - Finished: collapsed to a one-line summary. Reasoning is supporting
 *    evidence, not the answer, and shouldn't push the answer off screen.
 *
 * Collapse state is intentionally not persisted — it's a per-render reading
 * preference, and remembering it would mean a store field and a migration for
 * something the reader re-decides each time.
 */
const ThinkingBlock = ({
  reasoning,
  isOpen,
}: {
  reasoning: string;
  isOpen: boolean;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(isOpen);

  // Follow the thinking state on its *edges* only: expand when the model
  // starts thinking, collapse when it stops. Between edges the reader's own
  // toggle stands, so manually collapsing a long trace mid-stream sticks.
  //
  // Adjusting state during render (rather than in an effect) is React's
  // documented pattern for deriving state from props — it re-renders
  // immediately instead of painting the stale value first.
  const wasOpen = useRef(isOpen);
  if (wasOpen.current !== isOpen) {
    wasOpen.current = isOpen;
    setExpanded(isOpen);
  }

  if (!reasoning) return null;

  const label = isOpen ? (t('thinking') as string) : (t('reasoning') as string);

  return (
    <div className='mb-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-card)]'>
      <button
        type='button'
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className='flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--fg-2)] transition-colors duration-150 hover:text-[var(--fg)] cursor-pointer'
      >
        {isOpen ? (
          <PixelGrid />
        ) : (
          <svg
            viewBox='0 0 24 24'
            className='h-3.5 w-3.5 shrink-0'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
          >
            <path d='M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3Z' />
            <path d='M10 20h4' />
          </svg>
        )}
        <span className='flex-1'>{label}</span>
        {/* Rotation, not two icons: the chevron animating between states is
            what communicates that the same region is opening and closing. */}
        <svg
          viewBox='0 0 24 24'
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          <path d='m6 9 6 6 6-6' />
        </svg>
      </button>
      {expanded && (
        <div className='border-t border-[var(--border)] px-3 py-2'>
          {/* Deliberately not markdown-rendered: reasoning is often truncated
              mid-token while streaming, and half-open fences or tables would
              thrash the layout on every chunk. Pre-wrapped plain text stays
              stable and legible. */}
          <p className='m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--fg-3)]'>
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
