import { useCallback, useMemo, useRef, useState } from 'react';
import { Athlete, EventInfo, RREventConfig } from '../lib/types';
import { matchesQuery, normalizeName } from '../lib/text';
import { fetchAthletesForRREvent } from './useRaceResults';

/** Una carrera ya cargada: los atletas vienen sellados con su procedencia. */
export interface EventSource {
  key: string;
  cfg: RREventConfig;
  info: EventInfo;
  athletes: Athlete[];
}

/** Una persona encontrada en una carrera; en parejas y equipos, el integrante. */
export interface PersonHit {
  person: string;
  athlete: Athlete;
  source: EventSource;
  /** Nombre de la pareja o equipo cuando la persona no compitió sola. */
  teamName?: string;
}

export interface PersonHistory {
  person: string;
  hits: PersonHit[];
}

/** Las variantes por género comparten fichero, así que solo se carga una vez cada uno. */
export function uniqueSources(events: RREventConfig[]): RREventConfig[] {
  const seen = new Set<string>();
  const list: RREventConfig[] = [];
  for (const cfg of events) {
    if (cfg.noResults) continue;
    const key = String(cfg.fileKey ?? cfg.eventId);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(cfg);
  }
  return list;
}

const cache = new Map<string, Promise<EventSource | null>>();

function loadSource(cfg: RREventConfig, apiKey: string): Promise<EventSource | null> {
  const key = String(cfg.fileKey ?? cfg.eventId);
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = fetchAthletesForRREvent(cfg, apiKey)
    .then(({ athletes, eventInfo }) => {
      const stamped = athletes.map((a) => ({
        ...a,
        source_key: key,
        event_name: cfg.name ?? eventInfo.name,
        event_date: cfg.date ?? eventInfo.date,
        event_modality: cfg.contestName,
        field_size: athletes.length,
      }));
      return { key, cfg, info: eventInfo, athletes: stamped };
    })
    .catch(() => null);
  cache.set(key, promise);
  return promise;
}

/** Carga de cuatro en cuatro para no disparar quince peticiones a la vez. */
async function loadAllSources(
  configs: RREventConfig[],
  apiKey: string,
  onProgress: (done: number) => void,
): Promise<EventSource[]> {
  const out: EventSource[] = [];
  let done = 0;
  const queue = [...configs];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const source = await loadSource(next, apiKey);
      if (source) out.push(source);
      onProgress(++done);
    }
  };
  await Promise.all([...Array(Math.min(4, configs.length))].map(worker));
  return out;
}

/** Busca personas por nombre en todas las carreras cargadas. */
export function searchPeople(sources: EventSource[], rawQuery: string): PersonHistory[] {
  const query = normalizeName(rawQuery);
  if (query.length < 2) return [];

  const groups = new Map<string, PersonHistory>();
  const add = (person: string, hit: Omit<PersonHit, 'person'>) => {
    const key = normalizeName(person);
    const group = groups.get(key);
    if (group) group.hits.push({ person, ...hit });
    else groups.set(key, { person, hits: [{ person, ...hit }] });
  };

  for (const source of sources) {
    for (const athlete of source.athletes) {
      const members = athlete.members ?? [];
      const matching = members.filter((m) => matchesQuery(m.name, query));
      if (matching.length > 0) {
        for (const m of matching) add(m.name, { athlete, source, teamName: athlete.name });
      } else if (matchesQuery(athlete.name, query) || athlete.bib === rawQuery.trim()) {
        add(athlete.name, { athlete, source, teamName: members.length > 0 ? athlete.name : undefined });
      }
    }
  }

  const byDate = (a: PersonHit, b: PersonHit) => (a.athlete.event_date ?? '').localeCompare(b.athlete.event_date ?? '');
  const list: PersonHistory[] = [];
  groups.forEach((g) => list.push(g));
  list.forEach((g) => g.hits.sort(byDate));
  return list.sort((a, b) => b.hits.length - a.hits.length || a.person.localeCompare(b.person));
}

interface UseGlobalAthletesReturn {
  sources: EventSource[];
  loading: boolean;
  /** Carreras ya cargadas y total a cargar, para la barra de progreso. */
  progress: { done: number; total: number };
  ready: boolean;
  loadAll: () => Promise<EventSource[]>;
}

/** Carga bajo demanda todas las carreras del índice para poder buscar entre eventos. */
export function useGlobalAthletes(events: RREventConfig[], apiKey?: string): UseGlobalAthletesReturn {
  const [sources, setSources] = useState<EventSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const runningRef = useRef<Promise<EventSource[]> | null>(null);

  const configs = useMemo(() => uniqueSources(events), [events]);

  const loadAll = useCallback(() => {
    if (runningRef.current) return runningRef.current;
    const key = apiKey || process.env.REACT_APP_RR_API_KEY || '';
    setLoading(true);
    setProgress({ done: 0, total: configs.length });
    const run = loadAllSources(configs, key, (done) =>
      setProgress({ done, total: configs.length }),
    ).then((loaded) => {
      const ordered = [...loaded].sort((a, b) => (b.info.date ?? '').localeCompare(a.info.date ?? ''));
      setSources(ordered);
      setLoading(false);
      runningRef.current = null;
      return ordered;
    });
    runningRef.current = run;
    return run;
  }, [configs, apiKey]);

  return { sources, loading, progress, ready: sources.length > 0, loadAll };
}
