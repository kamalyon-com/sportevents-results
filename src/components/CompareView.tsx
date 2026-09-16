import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useRaceResults } from '../hooks/useRaceResults';
import { SearchForm } from './SearchForm';
import { AthletePicker } from './AthletePicker';
import { formatDelta, toSeconds } from '../lib/time';
import { Athlete, RREventConfig, WidgetConfig } from '../lib/types';

/** Máximo de atletas comparables a la vez — más columnas no caben en pantalla. */
const MAX_ATHLETES = 5;

/** Colores de columna para distinguir a cada atleta. */
const COLUMN_COLORS = ['#9fd4f9', '#FF8C42', '#7BD389', '#C792EA', '#FFD166'];

const athleteKey = (a: Athlete) => `${a.event_id}-${a.bib}`;

interface CompareViewProps extends WidgetConfig {}

export const CompareView: React.FC<CompareViewProps> = (config) => {
  const { primaryColor = '#1976d2' } = config;
  const {
    phase,
    executeSearch,
    backToSearch,
    athletes,
    filteredAthletes,
    activeEvent,
    error,
    availableEvents,
    filters,
    setFilters,
    clearFilters,
    genderOptions,
    categoryOptions,
    ageGroupOptions,
    nationalityOptions,
  } = useRaceResults(config);

  const [selected, setSelected] = useState<Athlete[]>([]);

  const events = config.rrEvents && config.rrEvents.length > 0 ? config.rrEvents : availableEvents;

  // Carga el evento más reciente al entrar para no empezar con la lista vacía
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current || events.length === 0) return;
    autoLoadedRef.current = true;
    executeSearch(events[0]);
  }, [events, executeSearch]);

  const handleSearch = (eventCfg: RREventConfig, name: string) => {
    setSelected([]);
    executeSearch(eventCfg, { search: name });
  };

  const handleBack = () => {
    setSelected([]);
    backToSearch();
  };

  const toggleAthlete = (athlete: Athlete) => {
    setSelected((prev) => {
      const key = athleteKey(athlete);
      const without = prev.filter((a) => athleteKey(a) !== key);
      if (without.length !== prev.length) return without;
      return prev.length >= MAX_ATHLETES ? prev : [...prev, athlete];
    });
  };

  // Estaciones en orden de aparición, unificando las de todos los seleccionados
  const stations = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const a of selected) {
      for (const s of a.splits) {
        if (s.station && !seen.has(s.station)) {
          seen.add(s.station);
          list.push(s.station);
        }
      }
    }
    return list;
  }, [selected]);

  const sectorOf = (athlete: Athlete, station: string) =>
    athlete.splits.find((s) => s.station === station)?.sector || '';

  // ─── Selección de evento ───────────────────────────────────────────────────
  if (phase === 'search' || phase === 'loading') {
    return (
      <Box>
        <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: 2.5 }}>
          <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, fontSize: 10, display: 'block', mb: 1 }}>
            Elegir evento
          </Typography>
          <SearchForm
            events={events}
            loading={phase === 'loading'}
            error={error}
            primaryColor={primaryColor}
            onSearch={handleSearch}
          />
        </Paper>
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
          <CompareArrowsIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Elige un evento para comparar los tiempos de varios atletas.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ─── Comparativa ───────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>
            {activeEvent?.name ?? 'Comparativa'}
          </Typography>
          {activeEvent && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: primaryColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${primaryColor}` }} />
              {activeEvent.location ?? ''}
              {activeEvent.date ? ` · ${activeEvent.date.split('-').reverse().join('/')}` : ''}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ borderColor: `${primaryColor}60`, color: primaryColor, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          CAMBIAR EVENTO
        </Button>
      </Stack>

      {athletes.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6" gutterBottom>Resultados no disponibles</Typography>
          <Typography variant="body2">Los resultados de este evento aún no han sido publicados.</Typography>
        </Box>
      ) : (
        <>
          {selected.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {selected.map((a, index) => (
                <Chip
                  key={athleteKey(a)}
                  size="small"
                  label={a.name}
                  variant="outlined"
                  onDelete={() => toggleAthlete(a)}
                  sx={{
                    borderColor: COLUMN_COLORS[index % COLUMN_COLORS.length],
                    color: COLUMN_COLORS[index % COLUMN_COLORS.length],
                    '& .MuiChip-deleteIcon': { color: COLUMN_COLORS[index % COLUMN_COLORS.length] },
                  }}
                />
              ))}
            </Stack>
          )}

          <AthletePicker
            athletes={filteredAthletes}
            total={athletes.length}
            selected={selected}
            onToggle={toggleAthlete}
            primaryColor={primaryColor}
            max={MAX_ATHLETES}
            label="Atletas a comparar"
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            genderOptions={genderOptions}
            categoryOptions={categoryOptions}
            ageGroupOptions={ageGroupOptions}
            nationalityOptions={nationalityOptions}
            colorOf={(a) => {
              const index = selected.findIndex((s) => athleteKey(s) === athleteKey(a));
              return COLUMN_COLORS[(index < 0 ? 0 : index) % COLUMN_COLORS.length];
            }}
          />

          {selected.length >= MAX_ATHLETES && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 0 }}>
              Máximo {MAX_ATHLETES} atletas. Quita uno para añadir otro.
            </Alert>
          )}

          {selected.length < 2 ? (
            <Box sx={{ py: { xs: 5, sm: 8 }, textAlign: 'center', color: 'text.secondary' }}>
              <CompareArrowsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selecciona atletas</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Añade al menos 2 atletas para ver la comparativa de tiempos y parciales.
              </Typography>
            </Box>
          ) : (
            <ComparisonTable
              selected={selected}
              stations={stations}
              sectorOf={sectorOf}
              primaryColor={primaryColor}
            />
          )}
        </>
      )}
    </Box>
  );
};

// ─── Tabla comparativa ───────────────────────────────────────────────────────

function ComparisonTable({
  selected,
  stations,
  sectorOf,
  primaryColor,
}: {
  selected: Athlete[];
  stations: string[];
  sectorOf: (athlete: Athlete, station: string) => string;
  primaryColor: string;
}) {
  const thSx = {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    background: `${primaryColor}1a`,
    borderBottom: `2px solid ${primaryColor}55`,
    color: 'text.secondary',
    whiteSpace: 'nowrap' as const,
  };
  const labelSx = { fontSize: 12, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' as const };

  const finishSeconds = selected.map((a) => toSeconds(a.finish_time));
  const bestFinish = Math.min(...finishSeconds);

  /** Celda de tiempo: destaca el mejor y muestra la diferencia respecto a él. */
  const timeCell = (value: string, seconds: number, best: number, key: string) => {
    const isBest = seconds === best && isFinite(seconds);
    return (
      <TableCell key={key} align="center">
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontWeight: isBest ? 700 : 500, color: isBest ? primaryColor : 'text.primary' }}
        >
          {value || '—'}
        </Typography>
        {isFinite(seconds) && isFinite(best) && !isBest && (
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
            {formatDelta(seconds - best)}
          </Typography>
        )}
      </TableCell>
    );
  };

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small" aria-label="Comparativa de atletas">
          <TableHead>
            <TableRow>
              <TableCell sx={thSx} />
              {selected.map((a, i) => (
                <TableCell key={athleteKey(a)} sx={{ ...thSx, borderTop: `3px solid ${COLUMN_COLORS[i % COLUMN_COLORS.length]}` }} align="center">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'none', letterSpacing: 0 }}>
                    {a.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    #{a.bib}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow hover>
              <TableCell sx={labelSx}>Posición</TableCell>
              {selected.map((a) => (
                <TableCell key={athleteKey(a)} align="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>#{a.rank_overall}</Typography>
                </TableCell>
              ))}
            </TableRow>

            {selected.some((a) => a.age_group) && (
              <TableRow hover>
                <TableCell sx={labelSx}>Categoría</TableCell>
                {selected.map((a) => (
                  <TableCell key={athleteKey(a)} align="center">
                    <Typography variant="caption" color="text.secondary">{a.age_group || '—'}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            )}

            <TableRow hover>
              <TableCell sx={labelSx}>Tiempo total</TableCell>
              {selected.map((a, i) => timeCell(a.finish_time, finishSeconds[i], bestFinish, athleteKey(a)))}
            </TableRow>

            {stations.length > 0 && (
              <TableRow>
                <TableCell colSpan={selected.length + 1} sx={{ ...thSx, background: 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}>
                  Tiempos parciales
                </TableCell>
              </TableRow>
            )}

            {stations.map((station) => {
              const values = selected.map((a) => sectorOf(a, station));
              const secs = values.map(toSeconds);
              const best = Math.min(...secs);
              return (
                <TableRow key={station} hover>
                  <TableCell sx={labelSx}>{station}</TableCell>
                  {values.map((v, i) => timeCell(v, secs[i], best, `${station}-${athleteKey(selected[i])}`))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
