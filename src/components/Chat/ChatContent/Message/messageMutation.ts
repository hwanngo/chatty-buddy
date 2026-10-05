import type { MessageInterface } from '@type/chat';

export function hasToolMessages(messages: MessageInterface[]): boolean {
  return messages.some(
    (message) => message.role === 'tool' || Boolean(message.tool_calls?.length)
  );
}

/** A folded assistant/tool run must retain its protocol order and roles. */
export function isToolGroupMessage(
  messages: MessageInterface[],
  index: number
): boolean {
  const target = messages[index];
  if (!target || !['assistant', 'tool'].includes(target.role)) return false;
  let start = index;
  let end = index;
  while (start > 0 && ['assistant', 'tool'].includes(messages[start - 1].role))
    start--;
  while (
    end + 1 < messages.length &&
    ['assistant', 'tool'].includes(messages[end + 1].role)
  )
    end++;
  return hasToolMessages(messages.slice(start, end + 1));
}
