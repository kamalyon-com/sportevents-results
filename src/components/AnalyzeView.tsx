import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useRaceResults, presetFiltersFor } from '../hooks/useRaceResults';
import { SearchForm } from './SearchForm';
import { AthletePicker } from './AthletePicker';
import { DistributionChart, PositionEvolutionChart, RadarChart } from './AnalyzeCharts';
import { formatDelta, formatDuration, toSeconds } from '../lib/time';
import { StationKind, shortLabel, stationKind } from '../lib/stations';
import { Athlete, RREventConfig, WidgetConfig } from '../lib/types';

const RUN_COLOR = '#FF8C42';
const ZONE_COLOR = '#7BD389';

const athleteKey = (a: Athlete) => `${a.event_id}-${a.bib}`;

interface Metric {
  label: string;
  seconds: number;
  /** Tiempos del resto del pelotón para esta métrica, ordenados ascendentemente. */
  field: number[];
  color: string;
}

interface StationMetric extends Metric {
  station: string;
  short: string;
  kind: StationKind;
}

/** Posición dentro del pelotón y percentil (0 = el mejor, 1 = el último). */
function rankOf(seconds: number, field: number[]) {
  const total = field.length;
  const rank = field.filter((v) => v < seconds).length + 1;
  return { rank, total, top: total > 0 ? (rank - 1) / total : 0 };
}

interface AnalyzeViewProps extends WidgetConfig {}

export const AnalyzeView: React.FC<AnalyzeViewProps> = (config) => {
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

  const [selected, setSelected] = useState<Athlete | null>(null);
  const [section, setSection] = useState<'totals' | 'runs' | 'zones'>('totals');

  const events = config.rrEvents && config.rrEvents.length > 0 ? config.rrEvents : availableEvents;

  // Carga el evento más reciente al entrar para no empezar con la lista vacía
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current || events.length === 0) return;
    autoLoadedRef.current = true;
    executeSearch(events[0], presetFiltersFor(events[0]));
  }, [events, executeSearch]);

  const handleSearch = (eventCfg: RREventConfig, name: string) => {
    setSelected(null);
    executeSearch(eventCfg, presetFiltersFor(eventCfg, name));
  };

  const handleBack = () => {
    setSelected(null);
    backToSearch();
  };

  // Selección única: volver a pulsar el mismo atleta lo deselecciona
  const toggleAthlete = (athlete: Athlete) => {
    setSelected((prev) => (prev && athleteKey(prev) === athleteKey(athlete) ? null : athlete));
  };

  const fieldByStation = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const a of athletes) {
      for (const s of a.splits) {
        if (!s.station) continue;
        const secs = toSeconds(s.sector || s.time);
        if (!isFinite(secs)) continue;
        const list = map.get(s.station);
        if (list) list.push(secs);
        else map.set(s.station, [secs]);
      }
    }
    map.forEach((list) => list.sort((a, b) => a - b));
    return map;
  }, [athletes]);

  const stations = useMemo<StationMetric[]>(() => {
    if (!selected) return [];
    return selected.splits
      .filter((s) => s.station)
      .map((s) => {
        const kind = stationKind(s.station);
        return {
          station: s.station,
          short: shortLabel(s.station),
          kind,
          label: s.station,
          seconds: toSeconds(s.sector || s.time),
          field: fieldByStation.get(s.station) ?? [],
          color: kind === 'run' ? RUN_COLOR : kind === 'zone' ? ZONE_COLOR : primaryColor,
        };
      });
  }, [selected, fieldByStation, primaryColor]);

  const totals = useMemo<Metric[]>(() => {
    if (!selected) return [];
    const sumOf = (a: Athlete, kind: StationKind) =>
      a.splits
        .filter((s) => s.station && stationKind(s.station) === kind)
        .reduce((acc, s) => acc + toSeconds(s.sector || s.time), 0);
    const fieldOf = (kind: StationKind) =>
      athletes.map((a) => sumOf(a, kind)).filter((n) => isFinite(n) && n > 0).sort((a, b) => a - b);

    const list: Metric[] = [
      {
        label: 'Tiempo total',
        seconds: toSeconds(selected.finish_time),
        field: athletes.map((a) => toSeconds(a.finish_time)).filter(isFinite).sort((a, b) => a - b),
        color: primaryColor,
      },
    ];
    const runField = fieldOf('run');
    if (runField.length > 0) {
      list.push({ label: 'Tiempo total en carreras', seconds: sumOf(selected, 'run'), field: runField, color: RUN_COLOR });
    }
    const zoneField = fieldOf('zone');
    if (zoneField.length > 0) {
      list.push({ label: 'Tiempo total en zonas', seconds: sumOf(selected, 'zone'), field: zoneField, color: ZONE_COLOR });
    }
    return list;
  }, [selected, athletes, primaryColor]);

  /** Posición del atleta tras cada estación, usando el tiempo acumulado. */
  const positionEvolution = useMemo(() => {
    if (!selected) return null;
    const labels: string[] = [];
    const fullLabels: string[] = [];
    const ranks: number[] = [];
    let total = 0;
    selected.splits.forEach((split, i) => {
      if (!split.station) return;
      const own = toSeconds(split.time);
      if (!isFinite(own) || own <= 0) return;
      const others = athletes
        .map((a) => (a.splits[i]?.station === split.station ? toSeconds(a.splits[i].time) : Infinity))
        .filter((v) => isFinite(v) && v > 0);
      if (others.length < 2) return;
      labels.push(shortLabel(split.station));
      fullLabels.push(split.station);
      ranks.push(others.filter((v) => v < own).length + 1);
      total = Math.max(total, others.length);
    });
    return ranks.length >= 2 ? { labels, fullLabels, ranks, total } : null;
  }, [selected, athletes]);

  const radar = useMemo(() => {
    const usable = stations.filter((s) => isFinite(s.seconds) && s.field.length > 1);
    return {
      labels: usable.map((s) => s.short),
      fullLabels: usable.map((s) => s.station),
      values: usable.map((s) => 1 - rankOf(s.seconds, s.field).top),
    };
  }, [stations]);

  /** Estaciones donde más tiempo se pierde frente a la mediana del pelotón. */
  const improvements = useMemo(
    () =>
      stations
        .map((s) => {
          if (s.field.length === 0 || !isFinite(s.seconds)) return null;
          const mid = Math.floor(s.field.length / 2);
          const median = s.field.length % 2 === 0 ? (s.field[mid - 1] + s.field[mid]) / 2 : s.field[mid];
          return { station: s.station, loss: s.seconds - median };
        })
        .filter((x): x is { station: string; loss: number } => x !== null && x.loss > 0)
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 3),
    [stations],
  );

  const runStations = stations.filter((s) => s.kind === 'run');
  const zoneStations = stations.filter((s) => s.kind === 'zone');
  const otherStations = stations.filter((s) => s.kind === 'other');

  // Si el atleta elegido no tiene esa sección, se vuelve a Totales
  useEffect(() => {
    if (section === 'runs' && runStations.length === 0) setSection('totals');
    if (section === 'zones' && zoneStations.length === 0) setSection('totals');
  }, [section, runStations.length, zoneStations.length]);

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
          <InsightsIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Elige un evento para analizar el rendimiento de un atleta.
          </Typography>
        </Box>
      </Box>
    );
  }

  // ─── Desglose de carrera ───────────────────────────────────────────────────
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>
            {activeEvent?.name ?? 'Análisis'}
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
          <AthletePicker
            athletes={filteredAthletes}
            total={athletes.length}
            selected={selected ? [selected] : []}
            onToggle={toggleAthlete}
            primaryColor={primaryColor}
            mode="single"
            label="Atleta a analizar"
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            genderOptions={genderOptions}
            categoryOptions={categoryOptions}
            ageGroupOptions={ageGroupOptions}
            nationalityOptions={nationalityOptions}
          />

          {!selected ? (
            <Box sx={{ py: { xs: 5, sm: 8 }, textAlign: 'center', color: 'text.secondary' }}>
              <InsightsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selecciona un atleta</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Verás su desglose de carrera frente al resto del pelotón.
              </Typography>
            </Box>
          ) : (
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', mb: 1 }}
              >
                <Box>
                  <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, fontSize: 10, display: 'block', lineHeight: 1.4 }}>
                    Análisis de rendimiento
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    Desglose de carrera
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Comparado con {athletes.length} atletas
                </Typography>
              </Stack>

              {runStations.length === 0 && zoneStations.length === 0 ? (
                <Alert severity="info" variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
                  Este evento no publica tiempos parciales, así que solo puede mostrarse el tiempo total.
                </Alert>
              ) : (
                <Tabs
                  value={section}
                  onChange={(_, v) => setSection(v)}
                  aria-label="Categorías de análisis"
                  sx={{
                    minHeight: 0,
                    mb: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTabs-indicator': { height: 2, backgroundColor: primaryColor },
                    '& .MuiTab-root': {
                      minHeight: 0,
                      py: 1,
                      px: 2,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'text.secondary',
                      '&.Mui-selected': { color: primaryColor },
                    },
                  }}
                >
                  {[
                    <Tab key="totals" value="totals" label="Totales" disableRipple />,
                    ...(runStations.length > 0
                      ? [<Tab key="runs" value="runs" label="Carreras" disableRipple />]
                      : []),
                    ...(zoneStations.length > 0
                      ? [<Tab key="zones" value="zones" label="Zonas" disableRipple />]
                      : []),
                  ]}
                </Tabs>
              )}

              {section === 'totals' && (
                <Stack spacing={2}>
                  {totals.map((m) => (
                    <MetricCard key={m.label} metric={m} />
                  ))}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
                    {positionEvolution && (
                      <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor }}>
                            Evolución de la posición
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor, fontFamily: 'monospace' }}>
                            #{selected.rank_overall}/{athletes.length}
                          </Typography>
                        </Stack>
                        <PositionEvolutionChart
                          labels={positionEvolution.labels}
                          fullLabels={positionEvolution.fullLabels}
                          ranks={positionEvolution.ranks}
                          total={positionEvolution.total}
                          color={primaryColor}
                        />
                      </Paper>
                    )}

                    {radar.values.length >= 3 && (
                      <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor }}>
                            Rendimiento por estación
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor, fontFamily: 'monospace' }}>
                            {selected.finish_time || '—'}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
                          Cuanto más lejos del centro, mejor percentil
                        </Typography>
                        <RadarChart
                          labels={radar.labels}
                          fullLabels={radar.fullLabels}
                          values={radar.values}
                          color={primaryColor}
                        />
                      </Paper>
                    )}
                  </Box>

                  {improvements.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                        <TrendingUpIcon fontSize="small" sx={{ color: primaryColor }} />
                        <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, fontSize: 10, lineHeight: 1 }}>
                          Puntos de mejora
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Estaciones donde se pierde más tiempo respecto a la mediana del pelotón.
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {improvements.map((s) => (
                          <Chip
                            key={s.station}
                            size="small"
                            label={`${s.station} · ${formatDelta(s.loss)}`}
                            variant="outlined"
                            sx={{ borderColor: `${primaryColor}55`, color: 'text.primary' }}
                          />
                        ))}
                      </Stack>
                    </Paper>
                  )}

                  {otherStations.map((s) => (
                    <MetricCard key={s.station} metric={s} />
                  ))}
                </Stack>
              )}

              {section === 'runs' && <StationGrid stations={runStations} />}
              {section === 'zones' && <StationGrid stations={zoneStations} />}
            </>
          )}
        </>
      )}
    </Box>
  );
};

// ─── Tarjeta de métrica con curva de distribución ────────────────────────────

function MetricCard({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const { rank, total, top } = rankOf(metric.seconds, metric.field);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: `${metric.color}40` }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: metric.color }}>
            {metric.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {total > 0 ? `#${rank}/${total}` : '—'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: metric.color, fontFamily: 'monospace' }}>
            {isFinite(metric.seconds) ? formatDuration(metric.seconds) : '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total > 0 ? `Top ${(top * 100).toFixed(1)}%` : ''}
          </Typography>
        </Box>
      </Stack>
      <DistributionChart values={metric.field} value={metric.seconds} color={metric.color} compact={compact} />
    </Paper>
  );
}

function StationGrid({ stations }: { stations: StationMetric[] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      {stations.map((s) => (
        <MetricCard key={s.station} metric={s} compact />
      ))}
    </Box>
  );
}
