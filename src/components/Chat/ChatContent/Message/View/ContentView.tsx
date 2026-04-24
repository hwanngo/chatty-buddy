import React, { memo, useState } from 'react';

import ReactMarkdown from 'react-markdown';

import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import useStore from '@store/store';

import Icon from '@components/Icon';

import useSubmit from '@hooks/useSubmit';

import {
  ChatInterface,
  ContentInterface,
  ImageContentInterface,
  isImageContent,
  isTextContent,
} from '@type/chat';

import { codeLanguageSubset } from '@constants/chat';

import RefreshButton from './Button/RefreshButton';
import UpButton from './Button/UpButton';
import DownButton from './Button/DownButton';
import CopyButton from './Button/CopyButton';
import EditButton from './Button/EditButton';
import DeleteButton from './Button/DeleteButton';
import MarkdownModeButton from './Button/MarkdownModeButton';

import CodeBlock from '../CodeBlock';
import Dialog from '@components/Dialog';
import { preprocessLaTeX } from '@utils/chat';
import { sanitizeImageUrl } from '@utils/url';

const ContentView = memo(
  ({
    role,
    content,
    setIsEdit,
    messageIndex,
    hideDelete = false,
  }: {
    role: string;
    content: ContentInterface[];
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    messageIndex: number;
    hideDelete?: boolean;
  }) => {
    const { handleSubmit } = useSubmit();

    const [isDelete, setIsDelete] = useState<boolean>(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const lastMessageIndex = useStore((state) =>
      state.chats ? state.chats[state.currentChatIndex].messages.length - 1 : 0
    );
    const inlineLatex = useStore((state) => state.inlineLatex);
    const markdownMode = useStore((state) => state.markdownMode);
    const generating = useStore((state) => state.generating);

    // The last assistant message is the one currently being streamed.
    const isStreamingHere =
      role === 'assistant' && messageIndex === lastMessageIndex && generating;

    const handleDelete = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].messages.splice(messageIndex, 1);
      setChats(updatedChats);
    };

    const handleMove = (direction: 'up' | 'down') => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      const temp = updatedMessages[messageIndex];
      if (direction === 'up') {
        updatedMessages[messageIndex] = updatedMessages[messageIndex - 1];
        updatedMessages[messageIndex - 1] = temp;
      } else {
        updatedMessages[messageIndex] = updatedMessages[messageIndex + 1];
        updatedMessages[messageIndex + 1] = temp;
      }
      setChats(updatedChats);
    };

    const handleMoveUp = () => {
      handleMove('up');
    };

    const handleMoveDown = () => {
      handleMove('down');
    };

    const handleRefresh = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      updatedMessages.splice(updatedMessages.length - 1, 1);
      setChats(updatedChats);
      handleSubmit();
    };
    const currentTextContent = isTextContent(content[0]) ? content[0].text : '';
    const handleCopy = () => {
      navigator.clipboard.writeText(currentTextContent);
    };

    const handleImageClick = (imageUrl: string) => {
      setZoomedImage(imageUrl);
    };

    const handleCloseZoom = () => {
      setZoomedImage(null);
    };
    const validImageContents = Array.isArray(content)
      ? (content.slice(1).filter(isImageContent) as ImageContentInterface[])
      : [];
    return (
      <>
        <div
          className='markdown prose w-full md:max-w-full break-words dark:prose-invert dark'
          aria-live='polite'
          aria-busy={isStreamingHere}
        >
          {markdownMode ? (
            <ReactMarkdown
              urlTransform={(url) =>
                /^(https?:|data:image\/|mailto:|#|\/)/i.test(url.trim())
                  ? url
                  : ''
              }
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: inlineLatex }],
              ]}
              rehypePlugins={[
                rehypeKatex,
                [
                  rehypeHighlight,
                  {
                    detect: true,
                    ignoreMissing: true,
                    subset: codeLanguageSubset,
                  },
                ],
              ]}
              components={{
                code,
                p,
              }}
            >
              {inlineLatex
                ? preprocessLaTeX(currentTextContent)
                : currentTextContent}
            </ReactMarkdown>
          ) : (
            <span className='whitespace-pre-wrap'>{currentTextContent}</span>
          )}
          {isStreamingHere && (
            <span
              className='ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-[var(--fg-2)] align-baseline'
              aria-hidden='true'
            />
          )}
        </div>
        {validImageContents.length > 0 && (
          <div className='flex gap-4'>
            {validImageContents.map((image, index) => {
              const safeSrc = sanitizeImageUrl(image.image_url.url);
              if (!safeSrc) return null;
              return (
                <div key={index} className='image-container'>
                  <img
                    src={safeSrc}
                    alt={`uploaded-${index}`}
                    className='h-20 cursor-pointer'
                    onClick={() => handleImageClick(safeSrc)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {zoomedImage && (
          <Dialog
            title=''
            setIsModalOpen={handleCloseZoom}
            handleConfirm={handleCloseZoom}
            cancelButton={false}
          >
            <div className='flex justify-center'>
              <img
                src={sanitizeImageUrl(zoomedImage)}
                alt='Zoomed'
                className='max-w-full max-h-full'
              />
            </div>
          </Dialog>
        )}
        <div className='flex justify-end gap-2 w-full mt-2'>
          {isDelete || (
            <>
              {!useStore.getState().generating &&
                role === 'assistant' &&
                messageIndex === lastMessageIndex && (
                  <RefreshButton onClick={handleRefresh} />
                )}
              {messageIndex !== 0 && <UpButton onClick={handleMoveUp} />}
              {messageIndex !== lastMessageIndex && (
                <DownButton onClick={handleMoveDown} />
              )}

              <MarkdownModeButton />
              <CopyButton onClick={handleCopy} />
              <EditButton setIsEdit={setIsEdit} />
              {!hideDelete && <DeleteButton setIsDelete={setIsDelete} />}
            </>
          )}
          {isDelete && (
            <>
              <button
                className='tap-target p-1 text-[var(--fg-3)] hover:text-[var(--fg)] cursor-pointer transition-colors'
                aria-label='cancel'
                onClick={() => setIsDelete(false)}
              >
                <Icon name="cross" />
              </button>
              <button
                className='tap-target p-1 text-[var(--fg-3)] hover:text-[var(--fg)] cursor-pointer transition-colors'
                aria-label='confirm'
                onClick={handleDelete}
              >
                <Icon name="tick" />
              </button>
            </>
          )}
        </div>
      </>
    );
  }
);

interface CodeComponentProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

const code = memo((props: CodeComponentProps) => {
  const { inline, className, children } = props;
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];

  if (inline) {
    return <code className={className}>{children}</code>;
  } else {
    return <CodeBlock lang={lang || 'text'} codeChildren={children} />;
  }
});

const p = memo((props: React.HTMLAttributes<HTMLParagraphElement>) => {
  return <p className='whitespace-pre-wrap'>{props.children}</p>;
});

export default ContentView;
