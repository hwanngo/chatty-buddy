import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const UpButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const { t } = useTranslation();
  return (
    <BaseButton
      icon={<Icon name="downChevronArrow" className='rotate-180' />}
      buttonProps={{ 'aria-label': 'shift message up', 'title': t('moveUp') }}
      onClick={onClick}
    />
  );
};

export default UpButton;
