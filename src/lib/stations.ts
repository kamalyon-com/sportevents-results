export type StationKind = 'run' | 'zone' | 'other';

export function stationKind(station: string): StationKind {
  const s = station.trim();
  if (/^(carrera|run)\b/i.test(s)) return 'run';
  if (/^(zona|zone)\b/i.test(s)) return 'zone';
  return 'other';
}

/** Etiqueta corta para ejes con poco espacio: "Carrera 3" → "C3", "Zona 2 - Row" → "Z2". */
export function shortLabel(station: string): string {
  const run = station.match(/^(?:carrera|run)\s*(\d+)/i);
  if (run) return `C${run[1]}`;
  const zone = station.match(/^(?:zona|zone)\s*(\d+)/i);
  if (zone) return `Z${zone[1]}`;
  return station.length > 7 ? `${station.slice(0, 7)}…` : station;
}
