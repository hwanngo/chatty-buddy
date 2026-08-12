import { ToolCallInterface } from '@type/chat';

/**
 * Client-executed tools.
 *
 * These are ordinary function tools: the model asks, *this app* performs the
 * work, and the result goes back as a `tool` message. That is the only shape
 * that works against a local runtime — provider-hosted tools like OpenAI's
 * `web_search_preview` have no function body for anyone else to run.
 */

/**
 * Reader service that fetches a page server-side and returns readable
 * Markdown. Going through it is not a convenience but a requirement: a browser
 * cannot fetch arbitrary sites directly, because almost nothing serves the
 * CORS headers that would allow it. Verified from the app's own origin —
 * `r.jina.ai` responds 200 with no API key, while direct fetches of ordinary
 * pages fail with `TypeError: Failed to fetch`.
 *
 * The privacy cost is real and is why the toggle ships off: the URL being read
 * is disclosed to this third party. Nothing else in the app leaves the device
 * except the model request itself.
 */
const READER_ENDPOINT = 'https://r.jina.ai/';

/**
 * Ceiling on how much page text is fed back to the model. Long articles can
 * run to hundreds of kilobytes, which would blow the context window and evict
 * the actual conversation. Truncation is announced in the payload so the model
 * can say the page was cut rather than assume it ended there.
 */
const MAX_CONTENT_CHARS = 20000;

/**
 * Shortest body we'll believe is a real page.
 *
 * Measured, not guessed: a cached voz.vn thread came back as 271 bytes whose
 * title was an ad-tracker URL, while the same page fetched with caching off
 * was ~38KB. Anything this small is a redirect stub, a consent wall, or a
 * tracker probe — never an article.
 */
const MIN_BODY_CHARS = 200;

/** The reader prefixes metadata and then this marker before the page body. */
const BODY_MARKER = 'Markdown Content:';

/**
 * Whether a 200 response actually contains a readable page.
 *
 * HTTP status alone is not enough: the reader answers 200 for stubs and
 * tracker pixels too, and handing one to the model is worse than reporting a
 * failure — it looks like real content, so the model fills the gap by
 * inferring from the URL slug and states the result as fact.
 */
const looksUnreadable = (raw: string): boolean => {
  const markerAt = raw.indexOf(BODY_MARKER);
  const body = markerAt === -1 ? raw : raw.slice(markerAt + BODY_MARKER.length);
  if (body.trim().length < MIN_BODY_CHARS) return true;

  // A title that is itself a URL means the reader landed on a redirect or
  // consent endpoint rather than the page that was asked for.
  const title = /^Title:\s*(.+)$/m.exec(raw)?.[1]?.trim() ?? '';
  return /^https?:\/\//i.test(title);
};

export const FETCH_URL_TOOL = {
  type: 'function' as const,
  function: {
    name: 'fetch_url',
    description:
      'Fetch a web page and return its readable text content as Markdown. ' +
      'Use this whenever the user gives a URL, or asks about the contents of ' +
      'a page, article, or documentation link. Returns the page text, not a ' +
      'search result.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The absolute http(s) URL of the page to fetch.',
        },
      },
      required: ['url'],
    },
  },
};

export const TOOL_DEFINITIONS = [FETCH_URL_TOOL];

/** Tool results are plain strings; errors come back as text for the model. */
export interface ToolResult {
  content: string;
  /** Shown on the transcript chip. */
  label: string;
}

/**
 * Pulls the `url` argument out of the model's JSON blob and vets it.
 *
 * Rejecting non-http(s) schemes matters because the argument is model-chosen,
 * and a model can be talked into things by the very page it just read. Note
 * the reader fetches server-side, so a `localhost` URL would resolve on the
 * reader's host and not on the user's machine or LAN.
 */
const parseUrlArgument = (rawArguments: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments || '{}');
  } catch {
    throw new Error('arguments were not valid JSON');
  }

  const url = (parsed as { url?: unknown })?.url;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error('missing required argument "url"');
  }

  let candidate: URL;
  try {
    candidate = new URL(url.trim());
  } catch {
    throw new Error(`"${url}" is not a valid absolute URL`);
  }
  if (candidate.protocol !== 'http:' && candidate.protocol !== 'https:') {
    throw new Error(`unsupported scheme "${candidate.protocol}"`);
  }
  return candidate.toString();
};

/**
 * Failure text handed back to the model.
 *
 * The explicit instruction is there because of an observed failure: given a
 * near-empty page, a model reconstructed a plausible summary from words in the
 * URL slug and presented it as what the article said. A bare "could not fetch"
 * leaves that door open, so the message closes it.
 */
const fetchFailed = (url: string, reason: string) =>
  `Error: could not read ${url} (${reason}). ` +
  `Do not infer or guess what the page says — in particular, do not derive ` +
  `it from words in the URL. Tell the user the page could not be fetched.`;

/**
 * Runs one tool call and always resolves to something the model can read.
 *
 * Failures are returned as text rather than thrown: a tool that errors should
 * let the model apologise or try a different URL, not abort the generation the
 * user is waiting on. The one exception is an abort, which is the user
 * stopping the run and must propagate.
 */
export const executeToolCall = async (
  call: ToolCallInterface,
  signal?: AbortSignal
): Promise<ToolResult> => {
  if (call.function.name !== FETCH_URL_TOOL.function.name) {
    return {
      content: `Error: unknown tool "${call.function.name}".`,
      label: call.function.name,
    };
  }

  let url: string;
  try {
    url = parseUrlArgument(call.function.arguments);
  } catch (e) {
    return {
      content: `Error: ${(e as Error).message}.`,
      label: 'fetch_url',
    };
  }

  const label = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  try {
    // Some sites serve an ad or consent interstitial to the reader's crawler
    // instead of the page, and either the cache or a live crawl can be the one
    // holding junk — observed both ways round on the same URL within minutes.
    // So: take the cached copy first (it's faster), and only if that looks
    // unreadable spend a second request forcing a fresh crawl. Neither mode is
    // reliable alone; trying both costs an extra request only on failure.
    let text = '';
    let status = 0;

    for (const fresh of [false, true]) {
      const response = await fetch(READER_ENDPOINT + url, {
        signal,
        headers: {
          Accept: 'text/plain',
          ...(fresh ? { 'x-no-cache': 'true' } : {}),
        },
      });
      status = response.status;
      if (!response.ok) continue;

      text = await response.text();
      if (!looksUnreadable(text)) break;
      text = '';
    }

    if (!text) {
      return {
        content: fetchFailed(
          url,
          status >= 400 ? `HTTP ${status}` : 'no readable content'
        ),
        label,
      };
    }

    if (text.length <= MAX_CONTENT_CHARS) return { content: text, label };

    return {
      content:
        text.slice(0, MAX_CONTENT_CHARS) +
        `\n\n[Content truncated at ${MAX_CONTENT_CHARS} characters.]`,
      label,
    };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    return { content: fetchFailed(url, (e as Error).message), label };
  }
};
