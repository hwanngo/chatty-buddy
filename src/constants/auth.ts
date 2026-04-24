export const officialAPIEndpoint = 'https://api.openai.com/v1/chat/completions';
export const defaultAPIEndpoint =
  import.meta.env.VITE_DEFAULT_API_ENDPOINT || officialAPIEndpoint;

export const anthropicAPIEndpoint = 'https://api.anthropic.com/v1/messages';

export const availableEndpoints = [officialAPIEndpoint];
