import React from 'react';
import useStore from '@store/store';

import ChatContent from './ChatContent';
import MobileBar from '../MobileBar';
import StopGeneratingButton from '@components/StopGeneratingButton/StopGeneratingButton';

const Chat = () => {
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const menuWidth = useStore((state) => state.menuWidth);

  return (
    <div
      className={`flex h-full flex-1 flex-col md:pl-[var(--menu-w)]`}
      // Desktop pushes content beside the fixed sidebar; on mobile the sidebar
      // is an overlay drawer, so no padding (md:pl is the only padder).
      style={
        {
          '--menu-w': hideSideMenu ? '0px' : `${menuWidth}px`,
        } as React.CSSProperties
      }
    >
      <MobileBar />
      <main className='relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1'>
        <ChatContent />
        <StopGeneratingButton />
      </main>
    </div>
  );
};

export default Chat;
