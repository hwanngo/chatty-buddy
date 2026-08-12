/**
 * Splits reasoning blocks out of an assistant message.
 *
 * Local runtimes (llama.cpp, MLX, Ollama in its default mode) don't put a
 * thinking model's reasoning in a separate response field — they emit it
 * inline in the message content, wrapped in a pseudo-tag:
 *
 *     <think>Let me weigh two options...</think>Here is the answer.
 *
 * Nothing downstream treats that as markup (there is no `rehype-raw`), so
 * without this split the tags render as literal angle-bracketed text mixed
 * into the answer.
 *
 * This is a *rendering* concern only: the message is still stored verbatim, so
 * editing, export, and re-sending all keep the original text and no store
 * migration is involved.
 */

/**
 * Tag names seen in the wild. `think` covers DeepSeek-R1 and the Qwen 3
 * family; `thinking` and `reason`/`reasoning` cover the variants some
 * finetunes and proxies emit.
 */
const THINK_TAGS = ['think', 'thinking', 'reason', 'reasoning'] as const;

const OPEN_OR_CLOSE = new RegExp(
  `<(/?)(?:${THINK_TAGS.join('|')})\\s*>`,
  'gi'
);

export interface SplitThinking {
  /** Concatenated reasoning, with the tags removed. Empty if there is none. */
  reasoning: string;
  /** The message with every reasoning block stripped out. */
  answer: string;
  /**
   * True when an opening tag has arrived but its closing tag has not — i.e.
   * the model is mid-thought. Callers use this to show reasoning as in
   * progress rather than as a finished, collapsible trace.
   */
  isOpen: boolean;
}

/**
 * Walks the tag boundaries once and partitions the text. Written as a scan
 * rather than a `String.replace` because the streaming case needs an
 * unterminated trailing block to survive as reasoning instead of being
 * dropped or leaking into the answer.
 *
 * Nesting is not supported — no runtime emits nested reasoning tags, and
 * treating a stray inner `<think>` as depth would swallow the rest of the
 * message. Instead the first closing tag ends the block.
 */
export const splitThinking = (text: string): SplitThinking => {
  // Fast path: the overwhelmingly common case is a message with no reasoning
  // at all, and it should not pay for the scan.
  if (!text || text.indexOf('<') === -1) {
    return { reasoning: '', answer: text, isOpen: false };
  }

  const reasoningParts: string[] = [];
  const answerParts: string[] = [];

  let cursor = 0;
  let openAt = -1; // index just past the opening tag, or -1 when outside a block

  OPEN_OR_CLOSE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_OR_CLOSE.exec(text)) !== null) {
    const isClosing = match[1] === '/';

    if (!isClosing) {
      // A second opening tag while already inside a block is malformed; ignore
      // it so the block still ends at the first genuine closing tag.
      if (openAt !== -1) continue;
      answerParts.push(text.slice(cursor, match.index));
      openAt = match.index + match[0].length;
    } else {
      // A closing tag with nothing open is a stray; drop the tag itself but
      // keep the surrounding prose rather than discarding content.
      if (openAt === -1) {
        answerParts.push(text.slice(cursor, match.index));
      } else {
        reasoningParts.push(text.slice(openAt, match.index));
        openAt = -1;
      }
    }
    cursor = match.index + match[0].length;
  }

  const isOpen = openAt !== -1;
  if (isOpen) {
    // Still streaming inside a block: everything after the opening tag is
    // reasoning so far.
    reasoningParts.push(text.slice(openAt));
  } else {
    answerParts.push(text.slice(cursor));
  }

  return {
    reasoning: reasoningParts.join('\n\n').trim(),
    answer: answerParts.join('').trim(),
    isOpen,
  };
};
