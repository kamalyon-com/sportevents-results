/**
 * RaceResult 14 Web API client
 *
 * Reference implementation: https://github.com/raceresult/go-webapi
 *
 * Authentication:
 *   POST /api/public/login  body: apikey=<KEY>  → returns a session ID string
 *   All subsequent requests: Authorization: Bearer <sessionID>
 *
 * URL format:
 *   Global:  https://{server}/api/{cmd}
 *   Event:   https://{server}/_{eventId}/api/{cmd}
 *
 * CORS: events.raceresult.com returns Access-Control-Allow-Origin: *
 *       so all calls work directly from the browser.
 *
 * ⚠️  SECURITY NOTE: The API key will be visible in the compiled JS bundle and
 *     network requests. Only use a read-only / results-only API key here.
 *     For more sensitive keys, route requests through a server-side proxy.
 */

const DEFAULT_SERVER = 'events.raceresult.com';

// ─── Session cache ──────────────────────────────────────────────────────────
// Stored at module scope so it survives re-renders. Sessions live ~2h.

interface SessionCache {
  id: string;
  expiry: number;
  server: string;
}

let sessionCache: SessionCache | null = null;

/**
 * Login and return the session ID (Bearer token).
 * Result is cached for 90 min to avoid redundant logins.
 */
export async function rrLogin(apiKey: string, server = DEFAULT_SERVER): Promise<string> {
  if (sessionCache?.server === server && Date.now() < sessionCache.expiry) {
    return sessionCache.id;
  }
  const body = new URLSearchParams({ apikey: apiKey });
  const resp = await fetch(`https://${server}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => String(resp.status));
    throw new Error(`RaceResult login failed (${resp.status}): ${msg}`);
  }
  const sessionId = (await resp.text()).trim();
  sessionCache = { id: sessionId, server, expiry: Date.now() + 90 * 60 * 1000 };
  return sessionId;
}

// ─── Flat JSON row type ─────────────────────────────────────────────────────
// lists/create?format=JSON returns an array of plain objects.
// Keys are the column labels configured in the output list.

export type RRRow = Record<string, string | number | null>;

// ─── API calls ───────────────────────────────────────────────────────────────

export interface RREventInfo {
  ID: string;
  EventName: string;
  EventDate: string;
  EventLocation: string;
}

/** List all events accessible with the given API key. */
export async function rrEventList(
  apiKey: string,
  server = DEFAULT_SERVER,
): Promise<RREventInfo[]> {
  const sessionId = await rrLogin(apiKey, server);
  const resp = await fetch(
    `https://${server}/api/public/eventlist?year=0&filter=&addsettings=EventName,EventDate,EventLocation`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (!resp.ok) throw new Error(`Event list failed: ${resp.status}`);
  return resp.json();
}

/** List all output-list names defined in the event. */
export async function rrListNames(
  eventId: number | string,
  apiKey: string,
  server = DEFAULT_SERVER,
): Promise<string[]> {
  const sessionId = await rrLogin(apiKey, server);
  const resp = await fetch(
    `https://${server}/_${eventId}/api/lists/names`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (!resp.ok) throw new Error(`List names failed: ${resp.status}`);
  return resp.json();
}

/**
 * Fetch an Output List as a flat JSON array.
 *
 * Each row is a plain object whose keys are the column labels defined in the
 * list (e.g. { "AUTORANK.p": "1.", "Nombre": "Hugo ...", "Dorsal": 884, "Tiempo": "21:09" }).
 *
 * Endpoint: GET https://{server}/_{eventId}/api/lists/create
 *           ?name={listName}&format=JSON&contest={n}&lang={lang}
 */
export async function rrFetchList(
  eventId: number | string,
  listName: string,
  apiKey: string,
  server = DEFAULT_SERVER,
  contest: number | string = 0,
  lang = 'es',
  _retry = false,
): Promise<RRRow[]> {
  const sessionId = await rrLogin(apiKey, server);
  const params = new URLSearchParams({
    name: listName,
    format: 'JSON',
    contest: String(contest),
    lang,
  });
  const resp = await fetch(
    `https://${server}/_${eventId}/api/lists/create?${params}`,
    { headers: { Authorization: `Bearer ${sessionId}` } },
  );
  if (resp.status === 401 && !_retry) {
    // Session may have expired server-side — clear cache and retry once
    sessionCache = null;
    return rrFetchList(eventId, listName, apiKey, server, contest, lang, true);
  }
  if (!resp.ok) {
    const msg = await resp.text().catch(() => String(resp.status));
    throw new Error(`List fetch failed (${resp.status}): ${msg}`);
  }
  return resp.json();
}
