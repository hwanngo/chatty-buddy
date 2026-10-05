import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const UpButton = ({
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
      icon={<Icon name='downChevronArrow' className='rotate-180' />}
      buttonProps={{
        disabled,
        'aria-label': 'shift message up',
        'title': disabledReason ?? t('moveUp'),
      }}
      onClick={onClick}
    />
  );
};

export default UpButton;
