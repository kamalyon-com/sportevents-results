/** Convierte "H:MM:SS.s" o "MM:SS" a segundos. Infinity si falta o es inválido. */
export function toSeconds(t?: string): number {
  if (!t) return Infinity;
  const parts = t.trim().split(':').map((p) => parseFloat(p.replace(',', '.')));
  if (parts.length === 0 || parts.some((n) => isNaN(n))) return Infinity;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return Infinity;
}

/** Formatea una duración en segundos como "M:SS" o "H:MM:SS". */
export function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Formatea una diferencia con signo, p.ej. "+1:23" / "-0:45". */
export function formatDelta(seconds: number): string {
  return `${seconds < 0 ? '-' : '+'}${formatDuration(seconds)}`;
}
