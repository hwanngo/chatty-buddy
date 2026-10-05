import { isToolGroupMessage } from './messageMutation';
import React from 'react';
import Select from '@components/Select';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import { Role, roles } from '@type/chat';

const RoleSelector = React.memo(
  ({
    role,
    messageIndex,
    sticky,
  }: {
    role: Role;
    messageIndex: number;
    sticky?: boolean;
  }) => {
    const { t } = useTranslation();
    const setInputRole = useStore((state) => state.setInputRole);
    const setChats = useStore((state) => state.setChats);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const toolGroup = useStore(
      (state) =>
        !sticky &&
        isToolGroupMessage(
          state.chats?.[state.currentChatIndex]?.messages ?? [],
          messageIndex
        )
    );
    const generating = useStore((state) => state.generating);

    return (
      <Select
        value={role}
        aria-label={t('role', { defaultValue: 'Message role' })}
        disabled={generating || toolGroup}
        title={toolGroup ? t('toolStructureLocked') : undefined}
        options={roles.map((value) => ({ value, label: t(value) }))}
        onChange={(event) => {
          const state = useStore.getState();
          if (
            state.generating ||
            (!sticky &&
              isToolGroupMessage(
                state.chats?.[state.currentChatIndex]?.messages ?? [],
                messageIndex
              ))
          )
            return;
          const nextRole = event.target.value as Role;
          if (sticky) setInputRole(nextRole);
          else {
            const chats = useStore.getState().chats;
            if (!chats?.[currentChatIndex]?.messages[messageIndex]) return;
            setChats(
              chats.map((chat, i) =>
                i !== currentChatIndex
                  ? chat
                  : {
                      ...chat,
                      messages: chat.messages.map((message, j) =>
                        j !== messageIndex
                          ? message
                          : { ...message, role: nextRole }
                      ),
                    }
              )
            );
          }
        }}
      />
    );
  }
);

export default RoleSelector;
