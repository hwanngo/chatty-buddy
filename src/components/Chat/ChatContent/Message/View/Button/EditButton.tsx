import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const EditButton = memo(
  ({
    setIsEdit,
    disabled = false,
    disabledReason,
  }: {
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    disabled?: boolean;
    disabledReason?: string;
  }) => {
    const { t } = useTranslation();
    return (
      <BaseButton
        icon={<Icon name='edit2' />}
        buttonProps={{
          disabled,
          'aria-label': 'edit message',
          'title': disabledReason ?? t('edit'),
        }}
        onClick={() => setIsEdit(true)}
      />
    );
  }
);

export default EditButton;
