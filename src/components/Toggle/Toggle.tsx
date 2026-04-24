import React from 'react';

interface ToggleProps {
  label: string;
  isChecked: boolean;
  setIsChecked: React.Dispatch<React.SetStateAction<boolean>>;
  description?: string;
  reversed?: boolean;
}

const Toggle = ({
  label,
  isChecked,
  setIsChecked,
  description,
  reversed = false,
}: ToggleProps) => {
  const track = (
    <div className='relative w-9 h-5 flex-shrink-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus)] peer-focus-visible:outline-offset-2'>
      <div
        className={`w-9 h-5 rounded-full transition-colors duration-200 ${
          isChecked ? 'bg-[var(--accent)]' : 'bg-[var(--border-mid)]'
        }`}
      />
      <div
        className={`absolute top-[2px] h-4 w-4 bg-white border border-[var(--border-mid)] rounded-full transition-transform duration-200 ${
          isChecked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </div>
  );

  if (reversed) {
    return (
      <label className='flex items-center justify-between w-full cursor-pointer gap-4'>
        <div className='flex flex-col'>
          <span className='text-sm font-medium text-[var(--fg)]'>{label}</span>
          {description && (
            <span className='text-xs text-[var(--fg-3)] mt-0.5'>
              {description}
            </span>
          )}
        </div>
        <input
          type='checkbox'
          className='sr-only peer'
          checked={isChecked}
          onChange={() => setIsChecked((prev) => !prev)}
        />
        {track}
      </label>
    );
  }

  return (
    <label className='relative flex items-center cursor-pointer'>
      <input
        type='checkbox'
        className='sr-only peer'
        checked={isChecked}
        onChange={() => setIsChecked((prev) => !prev)}
      />
      <div className="w-9 h-5 bg-[var(--border-mid)] rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-mid)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus)] peer-focus-visible:outline-offset-2" />
      <span className='ml-3 text-sm font-medium text-[var(--fg)]'>{label}</span>
    </label>
  );
};

export default Toggle;
