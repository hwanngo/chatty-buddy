import React from 'react';

const SparkleIcon = ({
  className = 'w-4 h-4',
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    height='1em'
    width='1em'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path d='M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z' />
  </svg>
);

export default SparkleIcon;
