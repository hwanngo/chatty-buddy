// Centralized URL/endpoint validation. The app sends the user's API key to
// whatever endpoint is configured, so endpoints must be restricted to safe
// HTTP(S) origins to prevent key exfiltration via javascript:/data:/file: URIs.

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/** True only for well-formed http(s) URLs. */
export const isSafeHttpUrl = (value: string): boolean => {
  try {
    const u = new URL(value.trim());
    return SAFE_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
};

/**
 * Throws if `endpoint` is not a safe API endpoint. Requires https:// except
 * for localhost/127.0.0.1 (local proxies / dev), which may use http://.
 */
export const assertSafeApiEndpoint = (endpoint: string): void => {
  let u: URL;
  try {
    u = new URL(endpoint.trim());
  } catch {
    throw new Error(`Invalid API endpoint URL: ${endpoint}`);
  }
  if (!SAFE_PROTOCOLS.has(u.protocol)) {
    throw new Error(
      `Refusing to send credentials to non-HTTP(S) endpoint (${u.protocol})`
    );
  }
  const isLocal =
    u.hostname === 'localhost' ||
    u.hostname === '127.0.0.1' ||
    u.hostname === '[::1]';
  if (u.protocol === 'http:' && !isLocal) {
    throw new Error(
      'Refusing to send API key over plaintext HTTP. Use an https:// endpoint.'
    );
  }
};

/**
 * Returns a safe image src or '' for unsafe ones. Allows https:, http:,
 * and data:image/* (used for pasted/uploaded images); rejects everything else.
 */
export const sanitizeImageUrl = (value: string): string => {
  const v = value.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);/i.test(v)) return v;
  return isSafeHttpUrl(v) ? v : '';
};
