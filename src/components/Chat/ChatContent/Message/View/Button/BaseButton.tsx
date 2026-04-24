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
    <div className='text-[#87867f] flex self-end lg:self-center justify-center gap-3 md:gap-4 visible'>
      <button
        className='p-1 rounded-md text-[#87867f] hover:bg-[#f0eee6] hover:text-[#141413] dark:hover:bg-[#30302e] dark:hover:text-[#faf9f5] transition-colors duration-100 md:invisible md:group-hover:visible cursor-pointer'
        onClick={onClick}
        {...buttonProps}
      >
        {icon}
      </button>
    </div>
  );
};

export default BaseButton;
