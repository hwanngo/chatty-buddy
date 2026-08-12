import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Per-cell animation delays for the 3x3 pixel grid, in source (row-major)
 * order. The centre cell is `null` — it never animates and sits at a very low
 * opacity, which anchors the figure so the ring around it reads as rotating
 * rather than randomly flickering.
 *
 * The ring delays walk the perimeter in order (0 -> .11 -> .22 -> .33 -> .44
 * -> .55 -> .66 -> .77) but the array below is laid out row-major, so the
 * values look shuffled here while tracing a clean circle on screen.
 */
const CELL_DELAYS: (number | null)[] = [
  0, 0.11, 0.22, 0.77, null, 0.33, 0.66, 0.55, 0.44,
];

/**
 * Formats elapsed milliseconds the way the reference primitive does: tenths of
 * a second under a minute (`6.4s`), minutes plus tenths above it (`1m 15.1s`).
 * Rendered in tabular figures so the label doesn't jitter as digits change.
 */
export const formatElapsed = (ms: number): string => {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}m ${seconds.toFixed(1)}s`;
};

/**
 * The 3x3 grid itself, without the label. Split out so it can also be dropped
 * into tight spots (a toolbar, a chat row) where the text would not fit.
 */
export const PixelGrid = ({ className = '' }: { className?: string }) => (
  <span
    className={`grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px] ${className}`}
    aria-hidden='true'
  >
    {CELL_DELAYS.map((delay, i) => (
      <span
        key={i}
        className={
          delay === null
            ? 'size-[4px] rounded-[1px] bg-[var(--fg)] opacity-[0.07]'
            : 'pixel-grid-cell size-[4px] rounded-[1px] bg-[var(--fg)]'
        }
        style={
          delay === null
            ? undefined
            : {
                animation: `pixel-on 0.95s ease-in-out ${delay}s infinite`,
              }
        }
      />
    ))}
  </span>
);

/**
 * Activity indicator shown while a response is in flight but has not produced
 * any text yet — the window where the assistant message would otherwise be a
 * blank block with nothing to say for itself.
 *
 * Three parts, left to right: the pixel grid (motion), a shimmering label
 * (what is happening), and a live elapsed timer (how long it has been). The
 * timer matters most: it is the difference between "this is slow" and "this is
 * stuck", and it costs one interval to provide.
 *
 * `startedAt` should be the timestamp the request was issued. Passing it in
 * rather than starting the clock on mount keeps the number honest if this
 * component mounts late.
 */
const PixelGridLoader = ({
  startedAt,
  label,
  className = '',
}: {
  startedAt: number;
  label?: string;
  className?: string;
}) => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  // 100ms matches the tenth-of-a-second resolution of the label — ticking any
  // faster would re-render without ever changing the rendered string.
  useEffect(() => {
    setElapsed(Date.now() - startedAt);
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const text = label ?? (t('thinking') as string);

  return (
    <div
      className={`flex w-fit items-center gap-2.5 ${className}`}
      role='status'
      aria-live='polite'
    >
      <PixelGrid />
      {/* The gradient is painted through the glyphs via background-clip, so the
          highlight sweeps the word itself rather than a box behind it. The
          plain-text copy below it is what assistive tech actually reads. */}
      <span
        className='shimmer-text bg-clip-text text-[13px] font-medium text-transparent'
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--fg-3) 35%, var(--fg) 50%, var(--fg-3) 65%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-text 1.4s linear infinite',
        }}
        aria-hidden='true'
      >
        {text}
      </span>
      <span className='sr-only'>{text}</span>
      {/* Hidden from the live region on purpose: it changes ten times a
          second, and announcing every tick would bury the one thing worth
          hearing ("Thinking") under a stream of numbers. */}
      <span
        className='font-mono text-[12px] text-[var(--fg-3)] tabular-nums'
        aria-hidden='true'
      >
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
};

export default PixelGridLoader;
