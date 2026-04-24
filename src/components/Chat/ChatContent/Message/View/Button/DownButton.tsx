import React from 'react';
import { useTranslation } from 'react-i18next';

import DownChevronArrow from '@icon/DownChevronArrow';

import BaseButton from './BaseButton';

const DownButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const { t } = useTranslation();
  return (
    <BaseButton
      icon={<DownChevronArrow />}
      buttonProps={{
        'aria-label': 'shift message down',
        'title': t('moveDown'),
      }}
      onClick={onClick}
    />
  );
};

export default DownButton;
