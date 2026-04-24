import React from 'react';
import { Role } from '@type/chat';

const Avatar = React.memo(({ role }: { role: Role }) => {
  const configs: Record<string, { symbol: string; className: string }> = {
    user: {
      symbol: 'U',
      className: 'bg-[rgba(201,100,66,0.10)] dark:bg-[rgba(201,100,66,0.15)] text-[#c96442]',
    },
    assistant: {
      symbol: '✦',
      className: 'bg-[#e8e6dc] dark:bg-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5]',
    },
    system: {
      symbol: '⚙',
      className: 'bg-[#e8e6dc] dark:bg-[#3d3d3a] text-[#87867f]',
    },
  };

  const cfg = configs[role] ?? configs.user;

  return (
    <div
      className={`h-[26px] w-[26px] flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold border border-[#f0eee6] dark:border-[#30302e] ${cfg.className}`}
    >
      {cfg.symbol}
    </div>
  );
});

export default Avatar;