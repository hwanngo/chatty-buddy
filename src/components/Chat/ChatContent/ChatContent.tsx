import React, { useEffect } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import useStore from '@store/store';
import { useTranslation } from 'react-i18next';

import ScrollToBottomButton from './ScrollToBottomButton';
import ChatTitle from './ChatTitle';
import Message from './Message';
import NewMessageButton from './Message/NewMessageButton';

import useSubmit from '@hooks/useSubmit';
import { TextContentInterface } from '@type/chat';
import countTokens, { limitMessageTokens } from '@utils/messageUtils';
import { defaultModel, reduceMessagesToTotalToken } from '@constants/chat';

const ChatContent = () => {
  const { t } = useTranslation();
  const inputRole = useStore((state) => state.inputRole);
  const setError = useStore((state) => state.setError);
  const setChats = useStore((state) => state.setChats);
  const setToastMessage = useStore((state) => state.setToastMessage);
  const setToastStatus = useStore((state) => state.setToastStatus);
  const setToastShow = useStore((state) => state.setToastShow);
  const messages = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].messages
      : []
  );
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const stickyIndex = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].messages.length
      : 0
  );
  const advancedMode = useStore((state) => state.advancedMode);
  const generating = useStore.getState().generating;
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const autoScroll = useStore((state) => state.autoScroll);
  const model = useStore((state) =>
    state.chats &&
    state.chats.length > 0 &&
    state.currentChatIndex >= 0 &&
    state.currentChatIndex < state.chats.length
      ? state.chats[state.currentChatIndex].config.model
      : defaultModel
  );
  const messagesLimited = limitMessageTokens(
    messages,
    reduceMessagesToTotalToken,
    model
  );

  const handleReduceMessages = () => {
    const confirmMessage = t('reduceMessagesWarning');
    if (window.confirm(confirmMessage)) {
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const removedMessagesCount = messages.length - messagesLimited.length;
      updatedChats[currentChatIndex].messages = messagesLimited;
      setChats(updatedChats);
      setToastMessage(
        t('reduceMessagesSuccess', { count: removedMessagesCount })
      );
      setToastStatus('success');
      setToastShow(true);
    }
  };

  useEffect(() => {
    if (!generating) {
      if (messagesLimited.length < messages.length) {
        const hiddenTokens =
          countTokens(messages, model) - countTokens(messagesLimited, model);
        setToastMessage(
          t('hiddenMessagesWarning', {
            hiddenTokens,
            reduceMessagesToTotalToken,
          })
        );
        setToastStatus('error');
        setToastShow(true);
      }
    }
  }, [messagesLimited, generating, messages, model]);

  // clear error at the start of generating new messages
  useEffect(() => {
    if (generating) {
      setError('');
    }
  }, [generating]);

  const { error } = useSubmit();

  // show errors as toast and clear inline state
  useEffect(() => {
    if (error !== '') {
      setToastMessage(error);
      setToastStatus('error');
      setToastShow(true);
      setError('');
    }
  }, [error]);

  // Custom scroller function to control auto-scroll behavior
  const customScroller = ({
    maxValue,
  }: {
    maxValue: number;
    minValue: number;
    offsetHeight: number;
    scrollHeight: number;
    scrollTop: number;
  }) => {
    return autoScroll ? maxValue : 0;
  };

  return (
    <div className='flex-1 overflow-hidden flex flex-col'>
      <ScrollToBottom
        className='flex-1 min-h-0 bg-[#f5f4ed] dark:bg-[#141413]'
        followButtonClassName='hidden'
        scroller={customScroller}
      >
        <ScrollToBottomButton />
        <div className='flex flex-col text-sm bg-[#f5f4ed] dark:bg-[#141413] min-h-full'>
          {advancedMode && <ChatTitle />}

          <div className='flex-1 flex flex-col px-4 md:px-9 pt-5 gap-0 pb-4'>
            {!generating && advancedMode && messages?.length === 0 && (
              <NewMessageButton messageIndex={-1} />
            )}
            {messagesLimited?.map(
              (message, index) =>
                (advancedMode || index !== 0 || message.role !== 'system') && (
                  <React.Fragment key={index}>
                    <Message
                      role={message.role}
                      content={message.content}
                      messageIndex={index}
                    />
                    {!generating && advancedMode && (
                      <NewMessageButton messageIndex={index} />
                    )}
                  </React.Fragment>
                )
            )}
          </div>

          <div className='sticky bottom-0 bg-[#f5f4ed] dark:bg-[#141413] border-t border-[#f0eee6] dark:border-[#30302e]'>
            <div className='px-4 md:px-9 pt-3 pb-5'>
              <Message
                role={inputRole}
                content={[{ type: 'text', text: '' } as TextContentInterface]}
                messageIndex={stickyIndex}
                sticky
              />
            </div>
          </div>
        </div>
      </ScrollToBottom>
    </div>
  );
};

export default ChatContent;
