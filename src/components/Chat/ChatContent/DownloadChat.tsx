import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import PopupModal from '@components/PopupModal';
import {
  chatToMarkdown,
  downloadImg,
  downloadMarkdown,
  // downloadPDF,
  htmlToImg,
} from '@utils/chat';
import ImageIcon from '@icon/ImageIcon';
import PdfIcon from '@icon/PdfIcon';
import MarkdownIcon from '@icon/MarkdownIcon';
import JsonIcon from '@icon/JsonIcon';

import downloadFile from '@utils/downloadFile';
import ExportIcon from '@icon/ExportIcon';

const DownloadChat = React.memo(
  ({ saveRef }: { saveRef: React.RefObject<HTMLDivElement | null> }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    return (
      <>
        <button
          className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e6dc] dark:border-[#3d3d3a] bg-transparent text-[#5e5d59] dark:text-[#b0aea5] text-[13px] font-medium hover:bg-[#f0eee6] dark:hover:bg-[#30302e] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors duration-150 cursor-pointer'
          aria-label={t('downloadChat') as string}
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          <ExportIcon className='w-[14px] h-[14px]' /> {t('downloadChat')}
        </button>
        {isModalOpen && (
          <PopupModal
            setIsModalOpen={setIsModalOpen}
            title={t('downloadChat') as string}
            cancelButton={false}
          >
            <div className='p-6 border-b border-[#e8e6dc] dark:border-[#3d3d3a] flex gap-4'>
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
                <ImageIcon />
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
                <PdfIcon />
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
                <MarkdownIcon />
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
                <JsonIcon />
                JSON
              </button>
            </div>
          </PopupModal>
        )}
      </>
    );
  }
);

export default DownloadChat;
