import { Athlete, EventInfo } from './types';

export const MOCK_EVENTS: EventInfo[] = [
  { id: 'HYR-MAD-2026', name: 'HYROX Madrid 2026', date: '2026-03-15', location: 'Madrid, España' },
  { id: 'HYR-BCN-2026', name: 'HYROX Barcelona 2026', date: '2026-04-20', location: 'Barcelona, España' },
];

const NAMES = [
  'Carlos García', 'María López', 'Antonio Martínez', 'Ana Rodríguez', 'José Hernández',
  'Laura Gómez', 'Manuel Jiménez', 'Elena Sánchez', 'Francisco Díaz', 'Carmen Moreno',
  'David Torres', 'Isabel Ruiz', 'Javier Flores', 'Pilar Álvarez', 'Miguel Romero',
  'Rosa Navarro', 'Alejandro Domínguez', 'Marta Ramos', 'Rafael Gil', 'Silvia Serrano',
  'Sergio Blanco', 'Nuria Castro', 'Pablo Ortega', 'Cristina Molina', 'Rubén Morales',
  'Patricia Delgado', 'Iván Ortiz', 'Beatriz Silva', 'Óscar Vargas', 'Lucía Ibáñez',
  'Eduardo Fuentes', 'Teresa Herrera', 'Alberto Medina', 'Sonia León', 'Fernando Pérez',
  'Verónica Santos', 'Roberto Castillo', 'Claudia Reyes', 'Guillermo Guerrero', 'Andrea Cruz',
  'Marcos Lara', 'Mónica Cabrera', 'Andrés Herrero', 'Virginia Moya', 'Daniel Parra',
  'Natalia Gallego', 'Luis Prieto', 'Esther Cano', 'Hugo Campos', 'Raquel Vidal',
  'James Wilson', 'Emma Brown', 'Luca Rossi', 'Sofia Bianchi', 'Thomas Müller',
  'Anna Schmidt', 'Pierre Dupont', 'Marie Lefevre', 'John Smith', 'Sarah Johnson',
  'Matteo Ferrari', 'Chiara Romano', 'Christophe Martin', 'Isabelle Bernard', 'Michael Davis',
  'Jennifer Williams', 'Oliver Jones', 'Charlotte Taylor', 'Noah Anderson', 'Amelia Thomas',
  'Hendrik van der Berg', 'Ingrid Larsen', 'Erik Andersen', 'Astrid Nilsson', 'Marco Conti',
  'Giulia Esposito', 'Nikolai Petrov', 'Olga Ivanova', 'Takashi Yamamoto', 'Yuki Tanaka',
  'Lucas Oliveira', 'Ana Costa', 'João Silva', 'Rita Ferreira', 'Connor Murphy',
  'Aoife Kelly', 'Hamid Bouchikhi', 'Fatima El Aaraby', 'Kevin Mayer', 'Camille Léon',
  'Karim Benzali', 'Leila Saadi', 'Przemek Kowalski', 'Zofia Wiśniewska', 'Dimitri Papadopoulos',
];

const NATIONALITIES = ['ES', 'FR', 'DE', 'IT', 'GB', 'US', 'PT', 'NL', 'SE', 'NO', 'PL', 'GR', 'MA', 'JP', 'BR', 'IE'];
const AGE_GROUPS = ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+'];
const CATEGORIES_M = ['HYROX Men Open', 'HYROX Men Pro', 'HYROX Men Masters 40', 'HYROX Men Masters 50'];
const CATEGORIES_F = ['HYROX Women Open', 'HYROX Women Pro', 'HYROX Women Masters 40', 'HYROX Women Masters 50'];

const STATIONS = ['Run 1', 'SkiErg', 'Run 2', 'Sled Push', 'Run 3', 'Sled Pull', 'Run 4', 'Burpee Broad Jump', 'Run 5', 'Rowing', 'Run 6', 'Farmers Carry', 'Run 7', 'Sandbag Lunges', 'Run 8', 'Wall Balls'];

function padTime(h: number, m: number, s: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeToSeconds(t: string) {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function secondsToTime(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return padTime(h, m, s);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSplits(baseSecs: number) {
  let cumulative = 0;
  return STATIONS.map((station, i) => {
    const portion = baseSecs * (0.03 + Math.random() * 0.04);
    const stationSecs = Math.round(portion);
    cumulative += stationSecs;
    return {
      station,
      time: secondsToTime(cumulative),
      rank: randInt(1, 90),
      diff: i === 0 ? undefined : `+${secondsToTime(randInt(0, 180))}`,
    };
  });
}

// Deterministic enough for demo — seeded by index
export function generateMockAthletes(count = 90): Athlete[] {
  const athletes: Athlete[] = [];
  for (let i = 0; i < count; i++) {
    const gender: 'M' | 'F' = i % 3 === 0 ? 'F' : 'M';
    const category = gender === 'M'
      ? CATEGORIES_M[i % CATEGORIES_M.length]
      : CATEGORIES_F[i % CATEGORIES_F.length];
    const baseFinish = 3600 + i * 60 + randInt(-30, 30); // ~1h base, spread out
    const finishTime = secondsToTime(Math.max(2400, baseFinish));
    const eventId = i < 50 ? 'HYR-MAD-2026' : 'HYR-BCN-2026';
    athletes.push({
      bib: String(1000 + i),
      name: NAMES[i % NAMES.length],
      gender,
      age_group: AGE_GROUPS[i % AGE_GROUPS.length],
      category,
      nationality: NATIONALITIES[i % NATIONALITIES.length],
      finish_time: finishTime,
      rank_overall: i + 1,
      rank_gender: Math.ceil((i + 1) / (gender === 'M' ? 1.5 : 3)),
      rank_category: Math.ceil((i + 1) / 4),
      splits: generateSplits(timeToSeconds(finishTime)),
      event_id: eventId,
    });
  }
  return athletes;
}

export const MOCK_ATHLETES = generateMockAthletes(90);
