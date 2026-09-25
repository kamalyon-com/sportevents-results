/** Sin acentos, ni mayúsculas, ni espacios de más: así se comparan los nombres. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca un texto ya normalizado dentro de otro sin normalizar. */
export function matchesQuery(text: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizeName(text).includes(normalizedQuery);
}
