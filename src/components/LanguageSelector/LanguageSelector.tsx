import React from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import useStore from '@store/store';
import { languageCodeToName, selectableLanguages } from '@constants/language';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const theme = useStore((state) => state.theme);
  const isDark = theme === 'dark';

  const options = selectableLanguages.map((lang) => ({
    value: lang,
    label: languageCodeToName[lang],
  }));

  const currentValue =
    options.find((o) => o.value === i18n.language) ?? options[0];

  const customStyles = {
    container: (base: Record<string, unknown>) => ({
      ...base,
      fontSize: '14px',
      fontWeight: '400',
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    }),
    control: (base: Record<string, unknown>) => ({
      ...base,
      'backgroundColor': isDark ? '#30302e' : '#faf9f5',
      'borderColor': isDark ? '#3d3d3a' : '#e8e6dc',
      'color': isDark ? '#faf9f5' : '#141413',
      '&:hover': { borderColor: isDark ? '#b0aea5' : '#5e5d59' },
      'boxShadow': 'none',
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      backgroundColor: isDark ? '#30302e' : '#faf9f5',
      border: `1px solid ${isDark ? '#3d3d3a' : '#e8e6dc'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
      borderRadius: '8px',
      zIndex: 50,
    }),
    option: (
      base: Record<string, unknown>,
      state: { isSelected: boolean; isFocused: boolean }
    ) => ({
      ...base,
      'backgroundColor': state.isSelected
        ? '#c96442'
        : state.isFocused
          ? isDark
            ? '#3a3a37'
            : '#f0eee6'
          : 'transparent',
      'color': state.isSelected ? '#faf9f5' : isDark ? '#faf9f5' : '#141413',
      '&:active': { backgroundColor: '#c96442', color: '#faf9f5' },
      'fontSize': '14px',
    }),
    singleValue: (base: Record<string, unknown>) => ({
      ...base,
      color: isDark ? '#faf9f5' : '#141413',
    }),
    input: (base: Record<string, unknown>) => ({
      ...base,
      color: isDark ? '#faf9f5' : '#141413',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
      ...base,
      'color': isDark ? '#b0aea5' : '#5e5d59',
      '&:hover': { color: isDark ? '#faf9f5' : '#141413' },
      'padding': '0 8px',
    }),
    menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={(selected) => selected && i18n.changeLanguage(selected.value)}
      styles={customStyles}
      isSearchable
      menuPortalTarget={document.body}
      menuPosition='fixed'
      aria-label='language selector'
    />
  );
};

export default LanguageSelector;
