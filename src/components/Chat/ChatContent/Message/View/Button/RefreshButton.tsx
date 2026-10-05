import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const RefreshButton = ({
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
      icon={<Icon name='refresh' />}
      buttonProps={{
        disabled,
        'aria-label': 'regenerate message',
        'title': disabledReason ?? t('regenerate'),
      }}
      onClick={onClick}
    />
  );
};

export default RefreshButton;
