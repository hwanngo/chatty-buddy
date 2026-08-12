import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * A tool result in the transcript.
 *
 * Rendered as a one-line chip rather than a full message block: the fetched
 * page is often tens of thousands of characters, and laying it out as prose
 * would bury the conversation it was fetched to support. It stays expandable
 * because when an answer looks wrong, the first question is what the tool
 * actually returned.
 */
const ToolChip = ({
  label,
  content,
}: {
  label?: string;
  content: string;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const failed = content.startsWith('Error:');

  return (
    <div className='w-full max-w-2xl mx-auto px-4 md:px-9'>
      <button
        type='button'
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className='flex w-full items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-left text-[12.5px] text-[var(--fg-3)] transition-colors duration-150 hover:text-[var(--fg-2)] cursor-pointer'
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
          {failed ? (
            <>
              <circle cx='12' cy='12' r='9' />
              <path d='M12 8v4M12 16h.01' />
            </>
          ) : (
            <>
              <path d='M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5' />
              <path d='M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5' />
            </>
          )}
        </svg>
        <span className='font-medium'>
          {failed ? t('toolFailed') : t('toolFetched')}
        </span>
        {label && (
          <span className='truncate font-mono text-[12px]'>{label}</span>
        )}
        <span className='ml-auto shrink-0 text-[11.5px] tabular-nums'>
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        // Plain pre-wrapped text, capped and scrollable: this is raw tool
        // output, so rendering it as markdown would let a fetched page inject
        // headings and links into the transcript.
        <pre className='mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--radius-btn)] border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-[12px] leading-relaxed text-[var(--fg-3)]'>
          {content}
        </pre>
      )}
    </div>
  );
};

export default ToolChip;
