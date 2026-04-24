import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';

import CrossIcon2 from '@icon/CrossIcon2';

const PopupModal = ({
  title = 'Information',
  message,
  setIsModalOpen,
  handleConfirm,
  handleClose,
  handleClickBackdrop,
  cancelButton = true,
  children,
}: {
  title?: string;
  message?: string;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirm?: () => void;
  handleClose?: () => void;
  handleClickBackdrop?: () => void;
  cancelButton?: boolean;
  children?: React.ReactElement;
}) => {
  const modalRoot = document.getElementById('modal-root');
  const { t } = useTranslation();

  const _handleClose = () => {
    handleClose && handleClose();
    setIsModalOpen(false);
  };

  const _handleBackdropClose = () => {
    if (handleClickBackdrop) handleClickBackdrop();
    else _handleClose();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (handleClickBackdrop) handleClickBackdrop();
      else handleClose ? handleClose() : setIsModalOpen(false);
    } else if (event.key === 'Enter') {
      if (handleConfirm && (event.target as HTMLElement).tagName !== 'TEXTAREA')
        handleConfirm();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleConfirm, handleClose, handleClickBackdrop]);

  if (modalRoot) {
    return ReactDOM.createPortal(
      <div className='fixed top-0 left-0 z-[999] w-full p-4 overflow-x-hidden overflow-y-auto h-full flex justify-center items-start pt-[5vh]'>
        <div className='relative z-2 max-w-2xl w-full flex justify-center'>
          <div
            className='relative bg-[#faf9f5] dark:bg-[#1a1917] rounded-xl border border-[#f0eee6] dark:border-[#30302e] w-full flex flex-col'
            style={{ maxHeight: '90vh' }}
          >
            <div className='flex items-center justify-between p-4 border-b border-[#f0eee6] dark:border-[#30302e] rounded-t flex-shrink-0'>
              <h3 className='ml-2 text-lg font-medium font-serif text-[#141413] dark:text-[#faf9f5]'>
                {title}
              </h3>
              <button
                type='button'
                className='text-[#87867f] bg-transparent hover:bg-[#e8e6dc] hover:text-[#141413] rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-[#30302e] dark:hover:text-[#faf9f5]'
                onClick={_handleClose}
                aria-label='close modal'
              >
                <CrossIcon2 />
              </button>
            </div>

            <div className='overflow-y-auto hide-scroll-bar flex-1 min-h-0'>
              {message && (
                <div className='p-6 border-b border-[#f0eee6] dark:border-[#30302e]'>
                  <div className='min-w-fit text-[#5e5d59] dark:text-[#b0aea5] text-sm'>
                    {message}
                  </div>
                </div>
              )}

              {children}
            </div>

            {(handleConfirm || cancelButton) && (
              <div className='flex items-center justify-center p-6 gap-4 flex-shrink-0 border-t border-[#f0eee6] dark:border-[#30302e]'>
                {handleConfirm && (
                  <button
                    type='button'
                    className='btn btn-primary'
                    onClick={handleConfirm}
                    aria-label='confirm'
                  >
                    {t('confirm')}
                  </button>
                )}
                {cancelButton && (
                  <button
                    type='button'
                    className='btn btn-neutral'
                    onClick={_handleClose}
                    aria-label='cancel'
                  >
                    {t('cancel')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div
          className='bg-[#141413]/70 absolute top-0 left-0 h-full w-full z-[-1]'
          onClick={_handleBackdropClose}
        />
      </div>,
      modalRoot
    );
  } else {
    return null;
  }
};

export default PopupModal;
