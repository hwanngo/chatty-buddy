import React from 'react';

const Toggle = ({
  label,
  isChecked,
  setIsChecked,
  description,
  reversed = false,
}: {
  label: string;
  isChecked: boolean;
  setIsChecked: React.Dispatch<React.SetStateAction<boolean>>;
  description?: string;
  reversed?: boolean;
}) => {
  const switchEl = (
    <div className='relative w-9 h-5 flex-shrink-0'>
      <div
        className={`w-9 h-5 rounded-full transition-colors duration-200 ${isChecked ? 'bg-[#c96442]' : 'bg-[#e8e6dc] dark:bg-[#3d3d3a]'}`}
      />
      <div
        className={`absolute top-[2px] h-4 w-4 bg-white border border-[#e8e6dc] rounded-full transition-transform duration-200 ${isChecked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
      />
    </div>
  );

  if (reversed) {
    return (
      <label className='flex items-center justify-between w-full cursor-pointer gap-4'>
        <div className='flex flex-col'>
          <span className='text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
            {label}
          </span>
          {description && (
            <span className='text-xs text-[#87867f] dark:text-[#6b6a65] mt-0.5'>
              {description}
            </span>
          )}
        </div>
        <input
          type='checkbox'
          className='sr-only'
          checked={isChecked}
          onChange={() => setIsChecked((prev) => !prev)}
        />
        {switchEl}
      </label>
    );
  }

  return (
    <label className='relative flex items-center cursor-pointer'>
      <input
        type='checkbox'
        className='sr-only peer'
        checked={isChecked}
        onChange={() => {
          setIsChecked((prev) => !prev);
        }}
      />
      <div className="w-9 h-5 bg-[#e8e6dc] dark:bg-[#3d3d3a] rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e8e6dc] after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-[#3d3d3a] peer-checked:bg-[#c96442]"></div>
      <span className='ml-3 text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
        {label}
      </span>
    </label>
  );
};

export default Toggle;
