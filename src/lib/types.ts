export interface Split {
  station: string;
  time: string;     // cumulative time from start, e.g. "06:16"
  sector?: string;  // time for this sector alone, e.g. "03:51"
  rank: number;
  diff?: string;    // difference from leader e.g. "+00:01:23"
}

export interface Athlete {
  bib: string;
  name: string;
  gender?: 'M' | 'F';
  age_group: string; // e.g. "30-34"
  category: string; // e.g. "HYROX Men Open"
  nationality: string; // ISO 3166-1 alpha-2
  finish_time: string; // "HH:MM:SS"
  rank_overall: number;
  rank_gender: number;
  rank_category: number;
  splits: Split[];
  event_id: string;
}

export interface EventInfo {
  id: string;
  name: string;
  date: string; // ISO date string
  location: string;
  /** Stored in race-data.json so the widget can reconstruct a full RREventConfig */
  listName?: string;
  contest?: number;
  /**
   * Key used to name the cache file: race-data-{fileKey}.json.
   * Defaults to `id`. Set by the prefetch script when an event has multiple lists
   * (e.g. "376174_individual", "376174_parejas").
   */
  fileKey?: string;
  /** Format set by prefetch EVENT_VARIANTS config */
  format?: 'individual' | 'pairs' | 'teams';
  /** Actual contest name from RaceResult (e.g. "Élite", "Open Sábado") */
  contestName?: string;
  /** True when the list returned 0 rows at prefetch time (results not published yet) */
  noResults?: boolean;
}

/**
 * Optional overrides for how list column labels map to Athlete fields.
 * If a field is omitted the widget auto-detects using common Spanish/English names.
 *
 * Example column labels from a typical RaceResult event:
 *   "AUTORANK.p" → rank, "Nombre" → name, "Dorsal" → bib,
 *   "Tiempo" → finish_time, "Modalidad" → category
 */
export interface RRFieldMapping {
  name?: string;        // e.g. "Nombre"
  bib?: string;         // e.g. "Dorsal"
  time?: string;        // e.g. "Tiempo"
  rank?: string;        // e.g. "AUTORANK.p"
  category?: string;    // e.g. "Modalidad"
  gender?: string;      // e.g. "Sexo"
  ageGroup?: string;    // e.g. "Grupo de Edad"
  nationality?: string; // e.g. "Nación"
}

/**
 * Configuration for a single RaceResult 14 event.
 * Each event requires an eventId and the name of the Output List to display.
 *
 * Find the event ID in the RaceResult software or by calling rrEventList().
 * Find list names via rrListNames() or the Basic Settings → Output Lists screen.
 */
export interface RREventConfig {
  /** Numeric event ID in events.raceresult.com */
  eventId: number;
  /**
   * Output list name to display, e.g. "Resultados|01.LIVE".
   * Use rrListNames() to discover available lists for an event.
   */
  listName: string;
  /** Server hostname (default: events.raceresult.com) */
  server?: string;
  /** Contest filter — 0 = all contests (default) */
  contest?: number;
  /** Language for formatted fields (default: 'es') */
  lang?: string;
  /** Override event display name (otherwise read from the list headline) */
  name?: string;
  /** Override event date shown in the widget (ISO date string) */
  date?: string;
  /** Override event location shown in the widget */
  location?: string;
  /** Optional field-name overrides for this event's list columns */
  fieldMapping?: RRFieldMapping;
  /** Race format shown to users in the search form */
  format?: 'individual' | 'pairs' | 'teams';
  /** Actual contest name from RaceResult (e.g. "Élite", "Open Sábado"). Shown in the modality dropdown. */
  contestName?: string;
  /** Cache file key — matches the fileKey in EventInfo. Defaults to String(eventId). */
  fileKey?: string;
  /** True when no results were available at prefetch time */
  noResults?: boolean;
}

export interface WidgetConfig {
  /** RaceResult 14 events — loaded live from events.raceresult.com */
  rrEvents?: RREventConfig[];
  /**
   * RaceResult API key (read-only key for the results portal).
   * Can also be provided via the REACT_APP_RR_API_KEY environment variable.
   */
  apiKey?: string;
  /** Legacy string IDs — used only for mock/offline development mode */
  eventIds?: string[];
  title?: string;
  logoUrl?: string;
  primaryColor?: string;
  showCertificate?: boolean;
  /**
   * Only show events whose name (case-insensitive) contains this string.
   * E.g. data-prefix="sac series" or data-prefix="strong race" on the mount div.
   */
  eventPrefix?: string;
}

export type SortField = keyof Pick<Athlete, 'rank_overall' | 'name' | 'finish_time' | 'category' | 'bib'>;
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface FilterState {
  search: string;
  eventId: string;
  gender: '' | 'M' | 'F';
  ageGroup: string;
  category: string;
  nationality: string;
}
