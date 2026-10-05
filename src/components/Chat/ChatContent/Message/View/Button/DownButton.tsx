import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const DownButton = ({
  onClick,
  disabled = false,
  disabledReason,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  disabledReason?: string;
}) => {
  const { t } = useTranslation();
  return (
    <BaseButton
      icon={<Icon name='downChevronArrow' />}
      buttonProps={{
        disabled,
        'aria-label': 'shift message down',
        'title': disabledReason ?? t('moveDown'),
      }}
      onClick={onClick}
    />
  );
};

export default DownButton;
