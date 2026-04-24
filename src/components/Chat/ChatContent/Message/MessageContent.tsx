import React, { useState } from 'react';
import useStore from '@store/store';

import ContentView from './View/ContentView';
import EditView from './View/EditView';
import { ContentInterface } from '@type/chat';

const MessageContent = ({
  role,
  content,
  messageIndex,
  sticky = false,
  hideDelete = false,
}: {
  role: string;
  content: ContentInterface[];
  messageIndex: number;
  sticky?: boolean;
  hideDelete?: boolean;
}) => {
  const [isEdit, setIsEdit] = useState<boolean>(sticky);
  const advancedMode = useStore((state) => state.advancedMode);

  return (
    <div className='relative flex flex-col gap-2 md:gap-3 w-full'>
      {isEdit ? (
        <EditView
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          sticky={sticky}
          role={role}
        />
      ) : (
        <ContentView
          role={role}
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          hideDelete={hideDelete}
        />
      )}
    </div>
  );
};

export default MessageContent;
