import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { useRaceResults } from '../hooks/useRaceResults';
import { PersonHistory, searchPeople, useGlobalAthletes } from '../hooks/useGlobalAthletes';
import { ProgressionChart, ProgressionPoint } from './AnalyzeCharts';
import { formatDuration, toSeconds } from '../lib/time';
import { WidgetConfig } from '../lib/types';

const MIN_QUERY = 2;

const formatDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** "Hybiza Race 2026" → "Hybiza 26", para que quepa bajo el eje del gráfico. */
function shortEventLabel(name = '', date = ''): string {
  const year = date.slice(2, 4);
  const word = name.split(/\s+/).find((w) => w.length > 2 && !/^\d+$/.test(w)) ?? name;
  return year ? `${word} ${year}` : word;
}

interface HistoryViewProps extends WidgetConfig {}

export const HistoryView: React.FC<HistoryViewProps> = (config) => {
  const { primaryColor = '#1976d2' } = config;
  const { availableEvents } = useRaceResults(config);
  const events = config.rrEvents && config.rrEvents.length > 0 ? config.rrEvents : availableEvents;
  const { sources, loading, progress, loadAll } = useGlobalAthletes(events, config.apiKey);

  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [openRace, setOpenRace] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < MIN_QUERY) return;
    setSubmitted(query);
    setOpenPerson(null);
    await loadAll();
  };

  const results = useMemo(
    () => (submitted ? searchPeople(sources, submitted) : []),
    [sources, submitted],
  );

  const searching = loading && submitted !== '';

  return (
    <Box>
      <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: 2.5 }}>
        <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, fontSize: 10, display: 'block', mb: 1 }}>
          Buscar en todas las carreras
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              label="Nombre del atleta"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flex: '1 1 240px' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={query.trim().length < MIN_QUERY || loading}
              sx={{
                height: 40,
                px: 3,
                backgroundColor: primaryColor,
                color: '#000',
                flex: { xs: '1 1 100%', sm: '0 0 auto' },
              }}
            >
              {loading ? 'Cargando…' : 'Buscar'}
            </Button>
          </Stack>
        </Box>
        {loading && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant={progress.total ? 'determinate' : 'indeterminate'}
              value={progress.total ? (progress.done / progress.total) * 100 : 0}
              sx={{ height: 3, '& .MuiLinearProgress-bar': { backgroundColor: primaryColor } }}
            />
            <Typography variant="caption" color="text.secondary">
              Cargando carreras… {progress.done} de {progress.total}
            </Typography>
          </Box>
        )}
      </Paper>

      {!submitted ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
          <HistoryIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Escribe un nombre para ver todas sus carreras y su progresión.
          </Typography>
        </Box>
      ) : searching ? null : results.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Sin coincidencias</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Ningún atleta de las {sources.length} carreras guardadas se llama así.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary">
            {results.length === 1 ? '1 atleta' : `${results.length} atletas`} en {sources.length} carreras
          </Typography>
          {results.map((person) => (
            <PersonCard
              key={person.person}
              person={person}
              primaryColor={primaryColor}
              open={openPerson === person.person}
              onToggle={() => setOpenPerson((p) => (p === person.person ? null : person.person))}
              openRace={openRace}
              onToggleRace={setOpenRace}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

// ─── Ficha de una persona con todas sus carreras ─────────────────────────────

function PersonCard({
  person,
  primaryColor,
  open,
  onToggle,
  openRace,
  onToggleRace,
}: {
  person: PersonHistory;
  primaryColor: string;
  open: boolean;
  onToggle: () => void;
  openRace: string | null;
  onToggleRace: (key: string | null) => void;
}) {
  const points = useMemo<ProgressionPoint[]>(
    () =>
      person.hits
        .map((h) => ({
          label: shortEventLabel(h.athlete.event_name, h.athlete.event_date),
          fullLabel: `${h.athlete.event_name ?? ''}${h.athlete.event_modality ? ` · ${h.athlete.event_modality}` : ''}`,
          seconds: toSeconds(h.athlete.finish_time),
          rank: h.athlete.rank_overall,
          total: h.athlete.field_size ?? 0,
        }))
        .filter((p) => isFinite(p.seconds) && p.seconds > 0),
    [person],
  );

  const best = points.length > 0 ? Math.min(...points.map((p) => p.seconds)) : 0;

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider' }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          border: 0,
          background: 'transparent',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{ color: 'text.secondary', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {person.person}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {person.hits.length === 1 ? '1 carrera' : `${person.hits.length} carreras`}
            {best > 0 ? ` · mejor marca ${formatDuration(best)}` : ''}
          </Typography>
        </Box>
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          {points.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: primaryColor, mb: 1 }}>
                Progresión
              </Typography>
              <ProgressionChart points={points} color={primaryColor} />
              <Typography variant="caption" color="text.disabled">
                Los recorridos cambian de una carrera a otra, así que los tiempos no son del todo comparables.
              </Typography>
            </Box>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 10, letterSpacing: '0.1em', color: 'text.secondary' }}>CARRERA</TableCell>
                  <TableCell sx={{ fontSize: 10, letterSpacing: '0.1em', color: 'text.secondary' }}>MODALIDAD</TableCell>
                  <TableCell sx={{ fontSize: 10, letterSpacing: '0.1em', color: 'text.secondary' }} align="center">POS.</TableCell>
                  <TableCell sx={{ fontSize: 10, letterSpacing: '0.1em', color: 'text.secondary' }} align="right">TIEMPO</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {person.hits.map((hit) => {
                  const a = hit.athlete;
                  const raceKey = `${person.person}-${a.source_key}-${a.bib}`;
                  const splits = a.splits.filter((s) => s.station);
                  const total = a.field_size ?? 0;
                  return (
                    <React.Fragment key={raceKey}>
                      <TableRow hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.event_name}</Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatDate(a.event_date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {a.event_modality ?? '—'}
                          </Typography>
                          {hit.teamName && (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                              {hit.teamName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={total ? `${a.rank_overall} / ${total}` : `${a.rank_overall}`}
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11, fontFamily: 'monospace' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {a.finish_time || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ width: 110 }}>
                          {splits.length > 0 && (
                            <Button
                              size="small"
                              onClick={() => onToggleRace(openRace === raceKey ? null : raceKey)}
                              sx={{ color: primaryColor, fontSize: 10 }}
                            >
                              {openRace === raceKey ? 'Ocultar' : 'Parciales'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {splits.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0, borderBottom: openRace === raceKey ? undefined : 0 }}>
                            <Collapse in={openRace === raceKey} unmountOnExit>
                              <Box sx={{ py: 1.5 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontSize: 10, color: 'text.secondary' }}>ESTACIÓN</TableCell>
                                      <TableCell sx={{ fontSize: 10, color: 'text.secondary' }} align="right">PARCIAL</TableCell>
                                      <TableCell sx={{ fontSize: 10, color: 'text.secondary' }} align="right">ACUMULADO</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {splits.map((s, i) => (
                                      <TableRow key={s.station + i}>
                                        <TableCell>
                                          <Typography variant="caption">{s.station}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {s.sector || '—'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                            {s.time || '—'}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Collapse>
    </Paper>
  );
}
