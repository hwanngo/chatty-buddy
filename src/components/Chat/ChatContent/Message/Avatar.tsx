import React from 'react';
import { Role } from '@type/chat';

const Avatar = React.memo(({ role }: { role: Role }) => {
  const configs: Record<string, { symbol: string; className: string }> = {
    user: {
      symbol: 'U',
      className: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    },
    assistant: {
      symbol: '✦',
      className: 'bg-[var(--bg-sand)] text-[var(--fg-2)]',
    },
    system: {
      symbol: '⚙',
      className: 'bg-[var(--bg-sand)] text-[var(--fg-3)]',
    },
  };

  const cfg = configs[role] ?? configs.user;

  return (
    <div
      className={`h-[26px] w-[26px] flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold border border-[var(--border)] ${cfg.className}`}
    >
      {cfg.symbol}
    </div>
  );
});

export default Avatar;