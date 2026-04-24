import React from 'react';
import { useTranslation } from 'react-i18next';
import Select from '@components/Select';
import { languageCodeToName, selectableLanguages } from '@constants/language';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const options = selectableLanguages.map((lang) => ({
    value: lang,
    label: languageCodeToName[lang],
  }));

  return (
    <Select
      value={i18n.language}
      options={options}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      aria-label='language selector'
    />
  );
};

export default LanguageSelector;
