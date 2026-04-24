import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const EditButton = memo(
  ({
    setIsEdit,
  }: {
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const { t } = useTranslation();
    return (
      <BaseButton
        icon={<Icon name="edit2" />}
        buttonProps={{ 'aria-label': 'edit message', 'title': t('edit') }}
        onClick={() => setIsEdit(true)}
      />
    );
  }
);

export default EditButton;
