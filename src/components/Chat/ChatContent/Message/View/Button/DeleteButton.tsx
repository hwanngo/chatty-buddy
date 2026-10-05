import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const DeleteButton = memo(
  ({
    setIsDelete,
    disabled = false,
    disabledReason,
  }: {
    setIsDelete: React.Dispatch<React.SetStateAction<boolean>>;
    disabled?: boolean;
    disabledReason?: string;
  }) => {
    const { t } = useTranslation();
    return (
      <BaseButton
        icon={<Icon name='delete' />}
        buttonProps={{
          disabled,
          'aria-label': 'delete message',
          'title': disabledReason ?? t('delete'),
        }}
        onClick={() => setIsDelete(true)}
      />
    );
  }
);

export default DeleteButton;
