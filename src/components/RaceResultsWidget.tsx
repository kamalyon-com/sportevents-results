import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tooltip,
  Stack,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRaceResults } from '../hooks/useRaceResults';
import { SearchForm } from './SearchForm';
import { Filters } from './Filters';
import { ResultsTable } from './ResultsTable';
import { AthleteDetail } from './AthleteDetail';
import { Athlete, RREventConfig, SortField, WidgetConfig } from '../lib/types';

interface RaceResultsWidgetProps extends WidgetConfig {}

export const RaceResultsWidget: React.FC<RaceResultsWidgetProps> = ({
  eventIds,
  rrEvents,
  apiKey,
  title = 'Buscador de Resultados',
  logoUrl,
  primaryColor = '#1976d2',
  showCertificate = true,
  eventPrefix,
}) => {
  const {
    phase,
    executeSearch,
    backToSearch,
    reload,
    activeEvent,
    filteredAthletes,
    error,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    clearFilters,
    genderOptions,
    categoryOptions,
    ageGroupOptions,
    nationalityOptions,
    availableEvents,
  } = useRaceResults({ eventIds, rrEvents, apiKey, title, logoUrl, primaryColor, showCertificate, eventPrefix });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [activeEventCfg, setActiveEventCfg] = useState<RREventConfig | null>(null);

  // ─── In-results event/modality selector ────────────────────────────────────
  const eventsForSelector = rrEvents && rrEvents.length > 0 ? rrEvents : availableEvents;
  const selectorEventKey = (ev: RREventConfig) => `${ev.eventId}_${ev.contest ?? 0}_${ev.initialCategory ?? ''}`;
  const selectorFormatLabel = (ev: RREventConfig) =>
    ev.contestName ?? (ev.format === 'pairs' ? 'Parejas' : ev.format === 'teams' ? 'Equipos' : 'Individual');
  const selectorRaceNames = useMemo(() => {
    const seen = new Set<string>();
    return eventsForSelector.reduce<string[]>((acc, ev) => {
      const n = ev.name ?? String(ev.eventId);
      if (!seen.has(n)) { seen.add(n); acc.push(n); }
      return acc;
    }, []);
  }, [eventsForSelector]);
  const [selectorRace, setSelectorRace] = useState<string>('');
  const [selectorKey, setSelectorKey] = useState<string>('');
  useEffect(() => {
    if (activeEventCfg) {
      setSelectorRace(activeEventCfg.name ?? String(activeEventCfg.eventId));
      setSelectorKey(selectorEventKey(activeEventCfg));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEventCfg]);
  const selectorModalities = useMemo(
    () => eventsForSelector.filter((ev) => (ev.name ?? String(ev.eventId)) === selectorRace),
    [eventsForSelector, selectorRace],
  );
  const [inResultsLoading, setInResultsLoading] = useState(false);
  useEffect(() => {
    if (phase === 'results') setInResultsLoading(false);
  }, [phase]);

  const handleSelectorRaceChange = (newRace: string) => {
    setSelectorRace(newRace);
    const mods = eventsForSelector.filter((ev) => (ev.name ?? String(ev.eventId)) === newRace);
    if (mods.length === 1) {
      setSelectorKey(selectorEventKey(mods[0]));
      setInResultsLoading(true);
      handleSearch(mods[0], '');
    } else {
      setSelectorKey('');
    }
  };
  const handleSelectorModalityChange = (newKey: string) => {
    setSelectorKey(newKey);
    const ev = selectorModalities.find((e) => selectorEventKey(e) === newKey);
    if (ev) {
      setInResultsLoading(true);
      handleSearch(ev, '');
    }
  };

  const handleAthleteClick = useCallback((athlete: Athlete) => {
    setSelectedAthlete(athlete);
  }, []);

  const handleBackToResults = useCallback(() => setSelectedAthlete(null), []);

  const handleSort = useCallback(
    (field: SortField) => {
      setSortConfig((prev) => ({
        field,
        direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    },
    [setSortConfig],
  );

  const handleSearch = useCallback(
    (eventCfg: RREventConfig, name: string) => {
      setActiveEventCfg(eventCfg);
      setSelectedAthlete(null);
      const genderFromCat = eventCfg.initialCategory === 'Femenina' ? 'F' :
                            eventCfg.initialCategory === 'Masculina' ? 'M' :
                            eventCfg.initialCategory === 'Mixta' ? 'Mixta' : undefined;
      executeSearch(eventCfg, {
        search: name,
        ...(genderFromCat ? { gender: genderFromCat } : {}),
      });
    },
    [executeSearch],
  );

  // ─── Shared header ─────────────────────────────────────────────────────────
  const header = (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        mb: { xs: 1.5, sm: 3 },
        pb: { xs: 1.5, sm: 2 },
        borderBottom: '2px solid',
        borderColor: `${primaryColor}40`,
        position: 'relative',
      }}
    >
      {logoUrl && (
        <Avatar src={logoUrl} alt="Logo" sx={{ width: 48, height: 48, borderRadius: 1, boxShadow: `0 0 12px ${primaryColor}44` }} variant="square" />
      )}
      <Box>
        <Typography
          variant="overline"
          sx={{ color: primaryColor, letterSpacing: 2.5, display: 'block', lineHeight: 1.2, fontSize: 10 }}
        >
          RANKING
        </Typography>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {title}
        </Typography>
      </Box>
    </Stack>
  );

  // ─── SEARCH phase ───────────────────────────────────────────────────────────
  if ((phase === 'search' || phase === 'loading') && !inResultsLoading) {
    return (
      <Box sx={{ fontFamily: 'inherit' }}>
        {header}
        <SearchForm
          events={rrEvents && rrEvents.length > 0 ? rrEvents : availableEvents}
          loading={phase === 'loading'}
          error={error}
          primaryColor={primaryColor}
          onSearch={handleSearch}
        />
      </Box>
    );
  }

  // ─── DETAIL phase ───────────────────────────────────────────────────────────
  if (selectedAthlete) {
    return (
      <Box sx={{ fontFamily: 'inherit' }}>
        <AthleteDetail
          athlete={selectedAthlete}
          event={activeEvent ?? undefined}
          onBack={handleBackToResults}
          primaryColor={primaryColor}
          showCertificate={showCertificate}
        />
      </Box>
    );
  }

  // ─── RESULTS phase ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ fontFamily: 'inherit' }}>
      {/* Results header */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2.5 } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {logoUrl && (
            <Avatar src={logoUrl} alt="Logo" sx={{ width: 36, height: 36, borderRadius: 1, mb: 0.5, boxShadow: `0 0 8px ${primaryColor}44` }} variant="square" />
          )}
          <Typography variant="h6" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {activeEvent && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: primaryColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${primaryColor}` }} />
              {activeEvent.location ? `${activeEvent.location}` : ''}
              {activeEvent.date ? ` · ${activeEvent.date.split('-').reverse().join('/')}` : ''}
            </Typography>
          )}
        </Box>

        {/* Action buttons */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {isMobile ? (
            <>
              <Tooltip title="Nueva búsqueda">
                <IconButton size="small" onClick={backToSearch} sx={{ border: 1, borderColor: `${primaryColor}60`, color: primaryColor, borderRadius: 1.5 }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Recargar">
                <IconButton size="small" onClick={reload} sx={{ border: 1, borderColor: `${primaryColor}60`, color: primaryColor, borderRadius: 1.5 }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={backToSearch}
                sx={{ borderColor: `${primaryColor}60`, color: primaryColor, whiteSpace: 'nowrap' }}
              >
                NUEVA BÚSQUEDA
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={reload}
                sx={{ borderColor: `${primaryColor}60`, color: primaryColor, whiteSpace: 'nowrap' }}
              >
                RECARGAR
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Smooth loading indicator for in-results refresh */}
      {inResultsLoading && (
        <LinearProgress
          sx={{
            mb: 1.5,
            borderRadius: 1,
            backgroundColor: `${primaryColor}22`,
            '& .MuiLinearProgress-bar': { backgroundColor: primaryColor },
          }}
        />
      )}

      {/* Inline filters */}
      <Box sx={{ opacity: inResultsLoading ? 0.45 : 1, transition: 'opacity 0.25s', pointerEvents: inResultsLoading ? 'none' : undefined }}>
        <Filters
          filters={filters}
          setFilters={setFilters}
          clearFilters={clearFilters}
          genderOptions={genderOptions}
          categoryOptions={categoryOptions}
          ageGroupOptions={ageGroupOptions}
          nationalityOptions={nationalityOptions}
          resultsCount={filteredAthletes.length}
          eventSelector={
            selectorRaceNames.length > 1 ? (
              <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                <InputLabel id="selector-race-label">Evento</InputLabel>
                <Select
                  labelId="selector-race-label"
                  label="Evento"
                  value={selectorRace}
                  onChange={(e) => handleSelectorRaceChange(e.target.value)}
                  disabled={inResultsLoading}
                >
                  {selectorRaceNames.map((n) => (
                    <MenuItem key={n} value={n}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : undefined
          }
          modalitySelector={
            selectorModalities.length > 1 ? (
              <FormControl size="small" sx={{ flex: 1, minWidth: 110 }}>
                <InputLabel id="selector-modality-label">Modalidad</InputLabel>
                <Select
                  labelId="selector-modality-label"
                  label="Modalidad"
                  value={selectorKey}
                  onChange={(e) => handleSelectorModalityChange(e.target.value)}
                  disabled={inResultsLoading}
                  displayEmpty
                  renderValue={(val) => {
                    if (!val) return <em style={{ opacity: 0.45 }}>Modalidad…</em>;
                    const ev = selectorModalities.find((e) => selectorEventKey(e) === val);
                    return ev ? selectorFormatLabel(ev) : val;
                  }}
                >
                  {selectorModalities.map((ev) => (
                    <MenuItem key={selectorEventKey(ev)} value={selectorEventKey(ev)}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectorFormatLabel(ev)}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : undefined
          }
        />

        {/* Results table — or "no results yet" message */}
        {filteredAthletes.length === 0 && !filters.search && !filters.gender && !filters.category && !filters.ageGroup && !filters.nationality ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="h6" gutterBottom>Resultados no disponibles</Typography>
            <Typography variant="body2">Los resultados de este evento aún no han sido publicados.</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>Vuelve más tarde o pulsa RECARGAR.</Typography>
          </Box>
        ) : (
          <ResultsTable
            athletes={filteredAthletes}
            loading={false}
            sortConfig={sortConfig}
            onSort={handleSort}
            onAthleteClick={handleAthleteClick}
            raceFormat={activeEventCfg?.format}
            primaryColor={primaryColor}
            genderFilter={filters.gender}
          />
        )}
      </Box>

      {/* Footer action buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {isMobile ? (
          <>
            <Tooltip title="Nueva búsqueda">
              <IconButton size="small" onClick={backToSearch} sx={{ color: 'text.secondary' }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Recargar">
              <IconButton size="small" onClick={reload} sx={{ color: 'text.secondary' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Button size="small" variant="text" startIcon={<ArrowBackIcon />} onClick={backToSearch} sx={{ whiteSpace: 'nowrap' }}>
              NUEVA BÚSQUEDA
            </Button>
            <Button size="small" variant="text" startIcon={<RefreshIcon />} onClick={reload} sx={{ whiteSpace: 'nowrap' }}>
              RECARGAR
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};

