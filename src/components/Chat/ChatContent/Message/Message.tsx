import React, { useMemo, useState } from 'react';
import useStore from '@store/store';

import Avatar from './Avatar';
import MessageContent from './MessageContent';
import RoleSelector from './RoleSelector';
import TokenCount from '@components/TokenCount';
import PromptLibraryPicker from '@components/PromptLibraryMenu/PromptLibraryPicker';

import { ContentInterface, Role, TextContentInterface } from '@type/chat';
import countTokens from '@utils/messageUtils';
import { modelCost } from '@constants/modelLoader';
import { ModelOptions } from '@utils/modelReader';

const roleBg: Record<string, string> = {
  system: 'bg-[#faf9f5] dark:bg-[#1c1c1a]',
  user: 'bg-[rgba(201,100,66,0.07)] dark:bg-[rgba(201,100,66,0.10)]',
  assistant: 'bg-[#f5f4ed] dark:bg-[#141413]',
};

const Message = React.memo(
  ({
    role,
    content,
    messageIndex,
    sticky = false,
  }: {
    role: Role;
    content: ContentInterface[];
    messageIndex: number;
    sticky?: boolean;
  }) => {
    const advancedMode = useStore((state) => state.advancedMode);
    const model = useStore((state) =>
      state.chats &&
      state.chats.length > 0 &&
      state.currentChatIndex >= 0 &&
      state.currentChatIndex < state.chats.length
        ? state.chats[state.currentChatIndex].config.model
        : 'gpt-3.5-turbo'
    );

    const setChats = useStore((state) => state.setChats);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const [isDelete, setIsDelete] = useState(false);

    const bg = roleBg[role] ?? roleBg.user;

    const tokenInfo = useMemo(() => {
      if (sticky) return { tokens: 0, cost: 0 };
      try {
        const tokens = countTokens([{ role, content }], model as ModelOptions);
        const modelCostEntry = modelCost[model as keyof typeof modelCost];
        let cost = 0;
        if (modelCostEntry) {
          const { prompt } = modelCostEntry;
          cost = (prompt.price / prompt.unit) * tokens;
        }
        return { tokens, cost };
      } catch {
        return { tokens: 0, cost: 0 };
      }
    }, [role, content, model, sticky]);

    const handleDelete = () => {
      const currentChatIndex = useStore.getState().currentChatIndex;
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].messages.splice(messageIndex, 1);
      useStore.getState().setChats(updatedChats);
    };

    return (
      <div
        className={`w-full group text-[#141413] dark:text-[#faf9f5] ${bg} border border-[#f0eee6] dark:border-[#30302e] rounded-xl overflow-hidden shadow-[rgba(0,0,0,0.03)_0px_2px_8px] dark:shadow-none`}
      >
        {advancedMode && (
          <div
            className={`flex items-center gap-2.5 border-b border-[#f0eee6] dark:border-[#30302e] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.025)] ${sticky ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}
          >
            <Avatar role={role} />
            <RoleSelector
              role={role}
              messageIndex={messageIndex}
              sticky={sticky}
            />
            <div className='flex-1' />
            {role === 'system' && !sticky && (
              <PromptLibraryPicker
                onSelect={(text) => {
                  const updatedChats = JSON.parse(
                    JSON.stringify(useStore.getState().chats)
                  );
                  updatedChats[currentChatIndex].messages[
                    messageIndex
                  ].content = [{ type: 'text', text } as TextContentInterface];
                  setChats(updatedChats);
                }}
              />
            )}
            {sticky && advancedMode && <TokenCount />}
            {!sticky && tokenInfo.tokens > 0 && (
              <span className='text-[11px] text-[#87867f] font-mono tabular-nums'>
                {tokenInfo.tokens} tokens ·{' '}
                {tokenInfo.cost < 0.01
                  ? '<$0.01'
                  : `$${tokenInfo.cost.toFixed(4)}`}
              </span>
            )}
            {!isDelete && !sticky && (
              <button
                className='p-1 rounded-md text-[#87867f] hover:text-[#b53333] hover:bg-[#f0eee6] dark:hover:bg-[#30302e] transition-colors cursor-pointer'
                aria-label='delete message'
                onClick={() => setIsDelete(true)}
              >
                <svg
                  width='13'
                  height='13'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            )}
            {isDelete && (
              <>
                <button
                  className='p-1 rounded-md text-[#87867f] hover:text-[#141413] dark:hover:text-[#faf9f5] hover:bg-[#f0eee6] dark:hover:bg-[#30302e] transition-colors cursor-pointer'
                  aria-label='cancel'
                  onClick={() => setIsDelete(false)}
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <line x1='5' y1='12' x2='19' y2='12' />
                  </svg>
                </button>
                <button
                  className='p-1 rounded-md text-[#87867f] hover:text-[#b53333] hover:bg-[#f0eee6] dark:hover:bg-[#30302e] transition-colors cursor-pointer'
                  aria-label='confirm delete'
                  onClick={handleDelete}
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
        <div className={sticky ? 'px-3 py-2' : 'px-4 py-3'}>
          <MessageContent
            role={role}
            content={content}
            messageIndex={messageIndex}
            sticky={sticky}
            hideDelete={true}
          />
        </div>
      </div>
    );
  }
);

export default Message;
