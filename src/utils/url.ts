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

/** Intranet suffixes that never resolve on the public internet. */
const PRIVATE_SUFFIXES = ['.local', '.lan', '.internal', '.home.arpa'];

/**
 * True for hosts that can only exist on the local machine or local network.
 * Used to permit plaintext HTTP where TLS is impractical (no public CA will
 * issue a certificate for `nas` or 192.168.1.5) and where traffic never leaves
 * the user's own network.
 */
export const isPrivateNetworkHost = (hostname: string): boolean => {
  // URL.hostname keeps IPv6 literals in brackets; strip them and any zone id.
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return false;

  if (host === 'localhost') return true;
  if (PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if ([a, ...ipv4.slice(2).map(Number)].some((n) => n > 255)) return false;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }

  if (host.includes(':')) {
    const v6 = host.split('%')[0]; // drop zone id, e.g. fe80::1%en0
    if (v6 === '::1') return true; // loopback
    if (/^fe[89ab]/.test(v6)) return true; // fe80::/10 link-local
    if (/^f[cd]/.test(v6)) return true; // fc00::/7 unique local
    return false;
  }

  // A single-label name (`nas`, `ollama-box`) can only come from local DNS.
  return !host.includes('.');
};

/**
 * Throws if `endpoint` is not a safe API endpoint. Requires https:// for public
 * hosts; plaintext http:// is permitted for loopback and private-network hosts
 * (RFC1918, link-local, .local/.lan/.internal, single-label names), where no
 * public CA can issue a certificate and traffic stays on the user's network.
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
  if (u.protocol === 'http:' && !isPrivateNetworkHost(u.hostname)) {
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
