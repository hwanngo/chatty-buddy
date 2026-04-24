import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import EditIcon2 from '@icon/EditIcon2';

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
        icon={<EditIcon2 />}
        buttonProps={{ 'aria-label': 'edit message', 'title': t('edit') }}
        onClick={() => setIsEdit(true)}
      />
    );
  }
);

export default EditButton;
