import { fetchAthletesForRREvent } from './useRaceResults';

const row = (rank: number, name: string, gender: string, category: string, time: string, sector = 'Meta') => ({
  'AUTORANK.p': `${rank}.`,
  Nombre: name,
  Dorsal: rank,
  'Sector Actual': sector,
  Tiempo: time,
  _pairGender: gender,
  _category: category,
});

async function loadAthletes(rows: object[]) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ rows, info: { id: '1', name: 'Test', date: '2026-01-01', location: '' } }),
  }) as jest.Mock;
  const { athletes } = await fetchAthletesForRREvent({ eventId: 1, listName: 'x' }, '');
  return Object.fromEntries(athletes.map((a) => [a.name, a]));
}

describe('rankings', () => {
  it('ranks category positions within category and gender, not across the whole list', async () => {
    const byName = await loadAthletes([
      row(1, 'Fem 30 A', 'Femenina', 'GGEE 30-39', '35:00'),
      row(2, 'Fem 20 A', 'Femenina', 'GGEE 20-29', '36:00'),
      row(3, 'Fem 30 B', 'Femenina', 'GGEE 30-39', '37:00'),
      row(1, 'Masc 30 A', 'Masculina', 'GGEE 30-39', '30:00'),
      row(2, 'Masc 30 B', 'Masculina', 'GGEE 30-39', '36:30'),
    ]);

    expect(byName['Fem 30 B']).toMatchObject({ rank_overall: 5, rank_gender: 3, rank_category: 2 });
    expect(byName['Fem 20 A'].rank_category).toBe(1);
    expect(byName['Masc 30 B'].rank_category).toBe(2);
  });

  it('places athletes who retired before the finish behind every finisher', async () => {
    const byName = await loadAthletes([
      row(1, 'Finisher', 'Femenina', 'GGEE 30-39', '35:00'),
      row(2, 'Retired', 'Femenina', 'GGEE 30-39', '18:12', 'Carrera 4'),
    ]);

    expect(byName['Finisher']).toMatchObject({ rank_overall: 1, rank_category: 1 });
    expect(byName['Retired']).toMatchObject({ rank_overall: 2, rank_category: 2, dnf: true });
  });
});
