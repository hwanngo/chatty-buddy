import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import Dialog from '@components/Dialog';
import {
  chatToMarkdown,
  downloadImg,
  downloadMarkdown,
  // downloadPDF,
  htmlToImg,
} from '@utils/chat';
import Icon from '@components/Icon';

import downloadFile from '@utils/downloadFile';

const DownloadChat = React.memo(
  ({ saveRef }: { saveRef: React.RefObject<HTMLDivElement | null> }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    return (
      <>
        <button
          className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-mid)] bg-transparent text-[var(--fg-2)] text-[13px] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] transition-colors duration-150 cursor-pointer'
          aria-label={t('downloadChat') as string}
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          <Icon name="export" className='w-[14px] h-[14px]' /> {t('downloadChat')}
        </button>
        {isModalOpen && (
          <Dialog
            setIsModalOpen={setIsModalOpen}
            title={t('downloadChat') as string}
            cancelButton={false}
          >
            <div className='p-6 border-b border-[var(--border-mid)] flex gap-4'>
              <button
                className='btn btn-neutral gap-2'
                aria-label='image'
                onClick={async () => {
                  if (saveRef && saveRef.current) {
                    const imgData = await htmlToImg(saveRef.current);
                    downloadImg(
                      imgData,
                      `${
                        useStore
                          .getState()
                          .chats?.[
                            useStore.getState().currentChatIndex
                          ].title.trim() ?? 'download'
                      }.png`
                    );
                  }
                }}
              >
                <Icon name="image" />
                Image
              </button>
              {/* <button
                className='btn btn-neutral gap-2'
                onClick={async () => {
                  if (saveRef && saveRef.current) {
                    const imgData = await htmlToImg(saveRef.current);
                    downloadPDF(
                      imgData,
                      useStore.getState().theme,
                      `${
                        useStore
                          .getState()
                          .chats?.[
                            useStore.getState().currentChatIndex
                          ].title.trim() ?? 'download'
                      }.pdf`
                    );
                  }
                }}
              >
                <Icon name="pdf" />
                PDF
              </button> */}
              <button
                className='btn btn-neutral gap-2'
                aria-label='markdown'
                onClick={async () => {
                  if (saveRef && saveRef.current) {
                    const chats = useStore.getState().chats;
                    if (chats) {
                      const markdown = chatToMarkdown(
                        chats[useStore.getState().currentChatIndex]
                      );
                      downloadMarkdown(
                        markdown,
                        `${
                          chats[
                            useStore.getState().currentChatIndex
                          ].title.trim() ?? 'download'
                        }.md`
                      );
                    }
                  }
                }}
              >
                <Icon name="markdown" />
                Markdown
              </button>
              <button
                className='btn btn-neutral gap-2'
                aria-label='json'
                onClick={async () => {
                  const chats = useStore.getState().chats;
                  if (chats) {
                    const chat = chats[useStore.getState().currentChatIndex];
                    downloadFile([chat], chat.title);
                  }
                }}
              >
                <Icon name="json" />
                JSON
              </button>
            </div>
          </Dialog>
        )}
      </>
    );
  }
);

export default DownloadChat;
