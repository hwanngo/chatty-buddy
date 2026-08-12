export const isAzureEndpoint = (endpoint: string) => {
  return endpoint.includes('openai.azure.com');
};

/**
 * Whether an endpoint is OpenAI's own API, and so might accept OpenAI-hosted
 * built-in tools (`web_search_preview` and friends).
 *
 * These tool types have no `function` block — the provider is expected to run
 * them server-side. Send one to a gateway that doesn't implement it (ollama,
 * llama.cpp, vLLM, LM Studio) and the model is told a tool exists that can
 * never be invoked: given a prompt that plainly calls for it, such as a URL to
 * fetch, it can reason toward that tool indefinitely and never emit content or
 * a finish reason. The request looks like a hang.
 *
 * Matched on host rather than by substring so a look-alike domain
 * (`api.openai.com.evil.test`) doesn't slip through. Unparseable endpoints are
 * treated as not-OpenAI, i.e. tools are withheld — the safe direction.
 */
export const supportsOpenAIHostedTools = (endpoint: string) => {
  try {
    return new URL(endpoint).hostname.toLowerCase() === 'api.openai.com';
  } catch {
    return false;
  }
};
