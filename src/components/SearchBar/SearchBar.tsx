import React from 'react';
import { useTranslation } from 'react-i18next';

const SearchBar = ({
  value,
  handleChange,
  className,
  disabled,
}: {
  value: string;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`sticky top-0 z-20 px-2.5 py-2 border-b border-[#f0eee6] dark:border-[#30302e] bg-[#faf9f5] dark:bg-[#1c1c1a] ${className ?? ''}`}
    >
      <div className='flex items-center gap-2 bg-[#f5f4ed] dark:bg-[#141413] rounded-lg px-2.5 py-1.5 border border-[#e8e6dc] dark:border-[#3d3d3a]'>
        <svg
          width={13}
          height={13}
          viewBox='0 0 16 16'
          fill='none'
          className='shrink-0 text-[#87867f]'
        >
          <circle
            cx='7'
            cy='7'
            r='4.5'
            stroke='currentColor'
            strokeWidth='1.3'
          />
          <path
            d='M10.5 10.5L13.5 13.5'
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinecap='round'
          />
        </svg>
        <input
          disabled={disabled}
          type='text'
          className='flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] text-[#141413] dark:text-[#faf9f5] placeholder:text-[#87867f] disabled:opacity-40 disabled:cursor-not-allowed'
          placeholder={t('searchChats') as string}
          value={value}
          onChange={(e) => handleChange(e)}
        />
      </div>
    </div>
  );
};

export default SearchBar;
