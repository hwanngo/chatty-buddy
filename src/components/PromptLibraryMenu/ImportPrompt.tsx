import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@store/store';

import { importPromptCSV } from '@utils/prompt';

const ImportPrompt = () => {
  const { t } = useTranslation();

  const inputRef = useRef<HTMLInputElement>(null);
  const [alert, setAlert] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  const handleFileUpload = () => {
    if (!inputRef || !inputRef.current) return;
    const file = inputRef.current.files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        const csvString = event.target?.result as string;

        try {
          const results = importPromptCSV(csvString);

          const prompts = useStore.getState().prompts;
          const setPrompts = useStore.getState().setPrompts;

          const newPrompts = results.map((data) => {
            const columns = Object.values(data);
            return {
              id: uuidv4(),
              name: columns[0],
              prompt: columns[1],
            };
          });

          setPrompts(prompts.concat(newPrompts));

          setAlert({ message: 'Succesfully imported!', success: true });
        } catch (error: unknown) {
          setAlert({ message: (error as Error).message, success: false });
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-sm font-semibold text-[#141413] dark:text-[#faf9f5]'>
        {t('import')} (CSV)
      </p>
      <input
        className='w-full text-sm file:px-3 file:py-1.5 file:mr-3 text-[#141413] file:text-[#5e5d59] dark:text-[#faf9f5] dark:file:text-[#b0aea5] rounded-lg cursor-pointer focus:outline-none bg-[#f5f3ec] file:bg-[#e8e6dc] dark:bg-[#242422] dark:file:bg-[#30302e] file:border-0 border border-[#e8e6dc] dark:border-[#3d3d3a] file:cursor-pointer file:rounded-md file:text-xs file:font-medium file:transition-colors hover:file:bg-[#dbd9cf] dark:hover:file:bg-[#3d3d3a] py-1.5'
        type='file'
        ref={inputRef}
      />
      <div>
        <button
          className='btn btn-small btn-primary'
          onClick={handleFileUpload}
          aria-label={t('import') as string}
        >
          {t('import')}
        </button>
      </div>
      {alert && (
        <div
          className={`py-2 px-3 w-full border rounded-lg text-sm whitespace-pre-wrap ${
            alert.success
              ? 'border-green-500/50 bg-green-500/10 text-[#2d6a2d] dark:text-[#86efac]'
              : 'border-red-500/50 bg-red-500/10 text-[#b53333] dark:text-[#fca5a5]'
          }`}
        >
          {alert.message}
        </div>
      )}
    </div>
  );
};

export default ImportPrompt;
