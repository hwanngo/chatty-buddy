import React from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@store/store';

import BaseButton from './BaseButton';

import Icon from '@components/Icon';

const MarkdownModeButton = () => {
  const { t } = useTranslation();
  const markdownMode = useStore((state) => state.markdownMode);
  const setMarkdownMode = useStore((state) => state.setMarkdownMode);

  return (
    <BaseButton
      icon={markdownMode ? <Icon name="markdown" /> : <Icon name="fileText" />}
      buttonProps={{
        'aria-label': 'toggle markdown mode',
        'title': t('toggleMarkdown'),
      }}
      onClick={() => {
        setMarkdownMode(!markdownMode);
      }}
    />
  );
};

export default MarkdownModeButton;
