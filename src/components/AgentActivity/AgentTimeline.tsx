import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelGrid } from './PixelGridLoader';
import Dialog from '@components/Dialog';

/**
 * One entry in the pre-answer activity trace.
 *
 * A turn that uses a tool spans several stored messages — the assistant's
 * request, each tool result, then the assistant's answer. Rendered literally
 * that is three message blocks for one exchange, two of which have nothing to
 * say. These steps are what the intermediate ones get folded into.
 */
export type TimelineStep =
  | { kind: 'reasoning'; text: string }
  | { kind: 'tool'; label?: string; content: string; failed: boolean };

/**
 * Everything the assistant did before answering, as a single collapsible line.
 *
 * Structure is ported from beautifului.dev's Thinking primitive: a `w-fit`
 * header pill that tints when open, then the detail indented behind a vertical
 * rule. The rule is what makes a multi-step trace read as one unit instead of
 * a stack of loose rows.
 *
 * Collapsed by default once finished — the trace is supporting evidence, and
 * leaving it open pushes the answer off screen, which is the complaint this
 * component exists to fix.
 */
const AgentTimeline = ({
  steps,
  isThinking,
}: {
  steps: TimelineStep[];
  isThinking: boolean;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(isThinking);
  // Fetched pages run to tens of thousands of characters. Inlining one would
  // bury the conversation it was fetched to support, so the row opens it in a
  // modal instead — out of the transcript, one click away when an answer looks
  // wrong and the first question is what the tool actually returned.
  const [viewing, setViewing] = useState<Extract<
    TimelineStep,
    { kind: 'tool' }
  > | null>(null);

  // Follow the thinking state on its edges only — expand when work starts,
  // collapse when it ends — so a manual toggle in between is respected.
  const wasThinking = useRef(isThinking);
  if (wasThinking.current !== isThinking) {
    wasThinking.current = isThinking;
    setExpanded(isThinking);
  }

  if (steps.length === 0) return null;

  const tools = steps.filter((s) => s.kind === 'tool') as Extract<
    TimelineStep,
    { kind: 'tool' }
  >[];

  // Say what was actually done. "Read voz.vn" is worth more than "Reasoning",
  // and when nothing was fetched the trace is only reasoning anyway.
  const label = isThinking
    ? (t('thinking') as string)
    : tools.length === 1 && tools[0].label
      ? `${t('toolFetched')} ${tools[0].label}`
      : tools.length > 1
        ? (t('readPages', { count: tools.length }) as string)
        : (t('reasoning') as string);

  return (
    <div className='mb-2'>
      <button
        type='button'
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`-mx-1.5 flex w-fit items-center gap-2 rounded-[var(--radius-btn)] px-1.5 py-1 text-[13px] text-[var(--fg-2)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] cursor-pointer ${
          expanded ? 'bg-[var(--bg-hover)]' : ''
        }`}
      >
        {isThinking ? (
          <PixelGrid />
        ) : (
          <svg
            viewBox='0 0 24 24'
            className='h-3.5 w-3.5 shrink-0'
            fill='currentColor'
            aria-hidden='true'
          >
            <path d='M12 2.5 13.6 8 19 9.6 13.6 11.2 12 16.7 10.4 11.2 5 9.6 10.4 8 12 2.5Z' />
          </svg>
        )}
        <span className='font-medium'>{label}</span>
        <svg
          viewBox='0 0 24 24'
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
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
        <div className='mt-1.5 ml-1.5 flex flex-col gap-2 border-l border-[var(--border-mid)] pl-3.5'>
          {steps.map((step, i) =>
            step.kind === 'reasoning' ? (
              // Not markdown-rendered: reasoning is frequently truncated
              // mid-token while streaming, and half-open fences would thrash
              // the layout on every chunk.
              <p
                key={i}
                className='m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--fg-3)]'
              >
                {step.text}
              </p>
            ) : (
              <div key={i}>
                <button
                  type='button'
                  onClick={() => setViewing(step)}
                  title={t('viewFetched') as string}
                  className='flex w-full items-center gap-2 text-left text-[13px] text-[var(--fg-3)] transition-colors duration-150 hover:text-[var(--fg-2)] cursor-pointer'
                >
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
                    {step.failed ? (
                      <>
                        <circle cx='12' cy='12' r='9' />
                        <path d='M12 8v4M12 16h.01' />
                      </>
                    ) : (
                      <>
                        <circle cx='12' cy='12' r='9' />
                        <path d='M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18' />
                      </>
                    )}
                  </svg>
                  <span className='font-mono text-[12px]'>
                    {step.label ?? 'fetch_url'}
                  </span>
                  <span className='truncate'>
                    {step.failed ? t('toolFailed') : t('toolFetched')}
                  </span>
                </button>
              </div>
            )
          )}
        </div>
      )}

      {viewing && (
        <Dialog
          title={`${viewing.failed ? t('toolFailed') : t('toolFetched')} ${
            viewing.label ?? ''
          }`}
          setIsModalOpen={() => setViewing(null)}
          cancelButton={false}
          handleClose={() => setViewing(null)}
        >
          {/* Plain pre-wrapped text, never markdown: this is unvetted content
              from a fetched page, and rendering it would let that page style
              itself inside the app. */}
          <pre className='max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-6 pb-4 text-[13px] leading-relaxed text-[var(--fg-2)]'>
            {viewing.content}
          </pre>
        </Dialog>
      )}
    </div>
  );
};

export default AgentTimeline;
