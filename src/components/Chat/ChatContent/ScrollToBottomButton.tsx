import React from 'react';
import { useAtBottom, useScrollToBottom } from 'react-scroll-to-bottom';

import Icon from '@components/Icon';

const ScrollToBottomButton = React.memo(() => {
  const scrollToBottom = useScrollToBottom();
  const [atBottom] = useAtBottom();

  return (
    <button
      className={`cursor-pointer absolute right-6 bottom-[60px] md:bottom-[60px] z-10 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-2)] ${
        atBottom ? 'hidden' : ''
      }`}
      aria-label='scroll to bottom'
      onClick={() => scrollToBottom()}
    >
      <Icon name="downArrow" />
    </button>
  );
});

export default ScrollToBottomButton;
