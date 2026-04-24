import React from 'react';
import { useAtBottom, useScrollToBottom } from 'react-scroll-to-bottom';

import DownArrow from '@icon/DownArrow';

const ScrollToBottomButton = React.memo(() => {
  const scrollToBottom = useScrollToBottom();
  const [atBottom] = useAtBottom();

  return (
    <button
      className={`cursor-pointer absolute right-6 bottom-[60px] md:bottom-[60px] z-10 rounded-lg border border-[#f0eee6] bg-[#faf9f5] text-[#5e5d59] dark:border-[#30302e] dark:bg-[#30302e] dark:text-[#b0aea5] ${
        atBottom ? 'hidden' : ''
      }`}
      aria-label='scroll to bottom'
      onClick={() => scrollToBottom()}
    >
      <DownArrow />
    </button>
  );
});

export default ScrollToBottomButton;
