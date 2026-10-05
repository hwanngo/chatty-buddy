// languages that are selectable on the web page
export const selectableLanguages = ['en-US', 'vi-VN'] as const;

export const languageCodeToName = {
  'en-US': 'English (US)',
  'vi-VN': 'Tiếng Việt',
};

export const languageCodeToShort: Record<string, string> = {
  'en-US': 'EN',
  'vi-VN': 'VI',
};
