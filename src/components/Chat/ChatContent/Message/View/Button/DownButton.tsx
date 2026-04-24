import React from 'react';
import { useTranslation } from 'react-i18next';

import Icon from '@components/Icon';

import BaseButton from './BaseButton';

const DownButton = ({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const { t } = useTranslation();
  return (
    <BaseButton
      icon={<Icon name="downChevronArrow" />}
      buttonProps={{
        'aria-label': 'shift message down',
        'title': t('moveDown'),
      }}
      onClick={onClick}
    />
  );
};

export default DownButton;
