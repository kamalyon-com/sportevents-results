import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
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
import { useRaceResults, presetFiltersFor } from '../hooks/useRaceResults';
import { useGlobalAthletes } from '../hooks/useGlobalAthletes';
import { matchesQuery, normalizeName } from '../lib/text';
import { SearchForm } from './SearchForm';
import { AthletePicker } from './AthletePicker';
import { ChartLegend, MultiPositionChart, StationBarsChart } from './AnalyzeCharts';
import { formatDelta, toSeconds } from '../lib/time';
import { shortLabel } from '../lib/stations';
import { Athlete, RREventConfig, WidgetConfig } from '../lib/types';

/** Máximo de atletas comparables a la vez — más columnas no caben en pantalla. */
const MAX_ATHLETES = 5;

/** Colores de columna para distinguir a cada atleta. */
const COLUMN_COLORS = ['#9fd4f9', '#FF8C42', '#7BD389', '#C792EA', '#FFD166'];

/** Tope de resultados de la búsqueda entre carreras, para no volcar miles de filas. */
const CROSS_LIMIT = 200;

const athleteKey = (a: Athlete) => `${a.source_key ?? a.event_id}-${a.bib}`;

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
  const [crossEvent, setCrossEvent] = useState(false);

  const events = config.rrEvents && config.rrEvents.length > 0 ? config.rrEvents : availableEvents;
  const { sources, loading: crossLoading, progress, loadAll } = useGlobalAthletes(events, config.apiKey);

  // Al activar la búsqueda entre carreras hay que descargar todas las que haya en el índice
  const handleCrossToggle = (on: boolean) => {
    setCrossEvent(on);
    setSelected([]);
    if (on) loadAll();
  };

  /** Atletas de cualquier carrera que coinciden con el texto buscado. */
  const crossPool = useMemo(() => {
    if (!crossEvent) return null;
    const q = normalizeName(filters.search);
    if (q.length < 2) return [];
    const out: Athlete[] = [];
    for (const source of sources) {
      for (const a of source.athletes) {
        if (matchesQuery(a.name, q) || a.members?.some((m) => matchesQuery(m.name, q))) {
          out.push(a);
          if (out.length >= CROSS_LIMIT) return out;
        }
      }
    }
    return out;
  }, [crossEvent, sources, filters.search]);

  /** Pelotón con el que se compara cada atleta: el de su propia carrera. */
  const poolOf = useCallback(
    (a: Athlete) => (a.source_key ? sources.find((s) => s.key === a.source_key)?.athletes ?? [] : athletes),
    [sources, athletes],
  );

  /** Cuando se mezclan carreras, las posiciones no son comparables entre sí. */
  const mixedEvents = useMemo(
    () => new Set(selected.map((a) => a.source_key ?? a.event_id)).size > 1,
    [selected],
  );

  // Carga el evento más reciente al entrar para no empezar con la lista vacía
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current || events.length === 0) return;
    autoLoadedRef.current = true;
    executeSearch(events[0], presetFiltersFor(events[0]));
  }, [events, executeSearch]);

  const handleSearch = (eventCfg: RREventConfig, name: string) => {
    setSelected([]);
    executeSearch(eventCfg, presetFiltersFor(eventCfg, name));
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

  // Estaciones con parciales utilizables por todos los gráficos
  const chartStations = useMemo(
    () => stations.filter((st) => selected.some((a) => toSeconds(sectorOf(a, st)) > 0)),
    [stations, selected],
  );

  const seriesColor = (i: number) => COLUMN_COLORS[i % COLUMN_COLORS.length];

  /** Posición de cada atleta tras cada estación, según el tiempo acumulado. */
  const positionSeries = useMemo(() => {
    // Con atletas de carreras distintas las posiciones no se pueden dibujar juntas
    if (selected.length === 0 || mixedEvents) return null;
    const field0 = poolOf(selected[0]);
    const labels: string[] = [];
    const fullLabels: string[] = [];
    const ranksPerAthlete: (number | null)[][] = selected.map(() => []);
    let total = 0;

    for (const st of chartStations) {
      const field = field0
        .map((a) => toSeconds(a.splits.find((s) => s.station === st)?.time || ''))
        .filter((v) => isFinite(v) && v > 0);
      if (field.length < 2) continue;
      labels.push(shortLabel(st));
      fullLabels.push(st);
      total = Math.max(total, field.length);
      selected.forEach((a, i) => {
        const own = toSeconds(a.splits.find((s) => s.station === st)?.time || '');
        ranksPerAthlete[i].push(
          isFinite(own) && own > 0 ? field.filter((v) => v < own).length + 1 : null,
        );
      });
    }

    if (labels.length < 2) return null;
    return {
      labels,
      fullLabels,
      total,
      series: selected.map((a, i) => ({ name: a.name, color: seriesColor(i), values: ranksPerAthlete[i] })),
    };
  }, [chartStations, selected, mixedEvents, poolOf]);

  /** Tiempo de sector de cada atleta en cada estación. */
  const stationSeries = useMemo(() => {
    if (chartStations.length === 0) return null;
    return {
      labels: chartStations.map(shortLabel),
      fullLabels: chartStations,
      series: selected.map((a, i) => ({
        name: a.name,
        color: seriesColor(i),
        values: chartStations.map((st) => {
          const v = toSeconds(sectorOf(a, st));
          return isFinite(v) && v > 0 ? v : null;
        }),
      })),
    };
  }, [chartStations, selected]);

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
          <Box sx={{ mb: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={crossEvent}
                  onChange={(e) => handleCrossToggle(e.target.checked)}
                  sx={{ '& .Mui-checked': { color: primaryColor }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: primaryColor } }}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Buscar atletas en todas las carreras
                </Typography>
              }
            />
            {crossEvent && crossLoading && (
              <Box sx={{ mt: 0.5 }}>
                <LinearProgress
                  variant={progress.total ? 'determinate' : 'indeterminate'}
                  value={progress.total ? (progress.done / progress.total) * 100 : 0}
                  sx={{ height: 3, '& .MuiLinearProgress-bar': { backgroundColor: primaryColor } }}
                />
                <Typography variant="caption" color="text.disabled">
                  Cargando carreras… {progress.done} de {progress.total}
                </Typography>
              </Box>
            )}
            {crossEvent && !crossLoading && filters.search.trim().length < 2 && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                Escribe un nombre en el buscador para encontrar atletas entre las {sources.length} carreras.
              </Typography>
            )}
          </Box>

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
            athletes={crossPool ?? filteredAthletes}
            total={crossPool ? crossPool.length : athletes.length}
            selected={selected}
            onToggle={toggleAthlete}
            primaryColor={primaryColor}
            max={MAX_ATHLETES}
            label={crossEvent ? 'Atletas de cualquier carrera' : 'Atletas a comparar'}
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            genderOptions={crossEvent ? [] : genderOptions}
            categoryOptions={crossEvent ? [] : categoryOptions}
            ageGroupOptions={crossEvent ? [] : ageGroupOptions}
            nationalityOptions={crossEvent ? [] : nationalityOptions}
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
            <Stack spacing={2}>
              {mixedEvents && (
                <Alert severity="info" sx={{ borderRadius: 0 }}>
                  Estás comparando atletas de carreras distintas: los recorridos y el nivel del pelotón
                  cambian, así que los tiempos y las posiciones son solo orientativos.
                </Alert>
              )}
              {positionSeries && (
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor, mb: 1 }}>
                    Evolución de la posición
                  </Typography>
                  <ChartLegend series={positionSeries.series} />
                  <MultiPositionChart
                    labels={positionSeries.labels}
                    fullLabels={positionSeries.fullLabels}
                    series={positionSeries.series}
                    total={positionSeries.total}
                  />
                </Paper>
              )}

              {stationSeries && (
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor, mb: 1 }}>
                    Tiempo por estación
                  </Typography>
                  <ChartLegend series={stationSeries.series} />
                  <StationBarsChart
                    labels={stationSeries.labels}
                    fullLabels={stationSeries.fullLabels}
                    series={stationSeries.series}
                  />
                </Paper>
              )}

              <ComparisonTable
                selected={selected}
                stations={stations}
                sectorOf={sectorOf}
                primaryColor={primaryColor}
                showEvent={mixedEvents}
              />
            </Stack>
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
  showEvent,
}: {
  selected: Athlete[];
  stations: string[];
  sectorOf: (athlete: Athlete, station: string) => string;
  primaryColor: string;
  showEvent?: boolean;
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
              {selected.map((a, i) => {
                const accent = COLUMN_COLORS[i % COLUMN_COLORS.length];
                return (
                  <TableCell key={athleteKey(a)} sx={{ ...thSx, borderTop: `3px solid ${accent}` }} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1.7,
                          px: 0.6,
                          borderRadius: 0.75,
                          color: accent,
                          backgroundColor: `${accent}1f`,
                        }}
                      >
                        #{a.bib}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'none', letterSpacing: 0 }}>
                        {a.name}
                      </Typography>
                    </Box>
                    {a.members?.map((m, j) => (
                      <Typography
                        key={j}
                        variant="caption"
                        sx={{ display: 'block', color: 'text.secondary', textTransform: 'none', letterSpacing: 0, lineHeight: 1.4 }}
                      >
                        {m.name}
                      </Typography>
                    ))}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {showEvent && (
              <TableRow hover>
                <TableCell sx={labelSx}>Carrera</TableCell>
                {selected.map((a) => (
                  <TableCell key={athleteKey(a)} align="center">
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                      {a.event_name || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {[a.event_date ? a.event_date.split('-').reverse().join('/') : '', a.event_modality]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            )}

            <TableRow hover>
              <TableCell sx={labelSx}>Posición</TableCell>
              {selected.map((a) => (
                <TableCell key={athleteKey(a)} align="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    #{a.rank_overall}
                    {a.field_size ? (
                      <Typography component="span" variant="caption" color="text.disabled">
                        {` / ${a.field_size}`}
                      </Typography>
                    ) : null}
                  </Typography>
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
