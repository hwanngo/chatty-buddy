import React from 'react';

const BaseButton = ({
  onClick,
  icon,
  buttonProps,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  icon: React.ReactElement;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) => {
  return (
    <div className='text-[var(--fg-3)] flex self-end lg:self-center justify-center gap-3 md:gap-4 visible'>
      <button
        className='tap-target p-1 rounded-md text-[var(--fg-3)] hover:bg-[var(--border)] hover:text-[var(--fg)] transition-colors duration-100 md:invisible md:group-hover:visible cursor-pointer'
        onClick={onClick}
        {...buttonProps}
      >
        {icon}
      </button>
    </div>
  );
};

export default BaseButton;
