import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import DeleteIcon from '@icon/DeleteIcon';

import BaseButton from './BaseButton';

const DeleteButton = memo(
  ({
    setIsDelete,
  }: {
    setIsDelete: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const { t } = useTranslation();
    return (
      <BaseButton
        icon={<DeleteIcon />}
        buttonProps={{ 'aria-label': 'delete message', 'title': t('delete') }}
        onClick={() => setIsDelete(true)}
      />
    );
  }
);

export default DeleteButton;
