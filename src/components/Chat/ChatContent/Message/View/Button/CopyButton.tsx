import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TickIcon from '@icon/TickIcon';
import CopyIcon from '@icon/CopyIcon';

import BaseButton from './BaseButton';

const CopyButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState<boolean>(false);

  return (
    <BaseButton
      icon={isCopied ? <TickIcon /> : <CopyIcon />}
      buttonProps={{ 'aria-label': 'copy message', 'title': t('copy') }}
      onClick={(e) => {
        onClick(e);
        setIsCopied(true);
        window.setTimeout(() => {
          setIsCopied(false);
        }, 3000);
      }}
    />
  );
};

export default CopyButton;
