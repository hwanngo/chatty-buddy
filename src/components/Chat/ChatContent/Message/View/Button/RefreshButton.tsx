import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const RefreshButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const { t } = useTranslation();
  return (
    <BaseButton
      icon={<Icon name="refresh" />}
      buttonProps={{
        'aria-label': 'regenerate message',
        'title': t('regenerate'),
      }}
      onClick={onClick}
    />
  );
};

export default RefreshButton;
