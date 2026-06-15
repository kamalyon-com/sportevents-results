import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
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
      executeSearch(eventCfg, {
        search: name,
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
          SPORT EVENTS
        </Typography>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {title}
        </Typography>
      </Box>
    </Stack>
  );

  // ─── SEARCH phase ───────────────────────────────────────────────────────────
  if (phase === 'search' || phase === 'loading') {
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
            <>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, mt: 0.5 }}>
                {activeEvent.name}
                {activeEventCfg?.contestName && (
                  <Box component="span" sx={{ ml: 1.5, px: 1.5, py: 0.3, borderRadius: 1.5, backgroundColor: `${primaryColor}22`, color: primaryColor, fontWeight: 700, fontSize: 14, letterSpacing: 0.5, verticalAlign: 'middle' }}>
                    {activeEventCfg.contestName}
                  </Box>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: primaryColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${primaryColor}` }} />
                {activeEvent.location ? `${activeEvent.location}` : ''}
                {activeEvent.date ? ` · ${activeEvent.date.split('-').reverse().join('/')}` : ''}
              </Typography>
            </>
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
                sx={{ borderColor: `${primaryColor}60`, color: primaryColor, whiteSpace: 'nowrap', '&:hover': { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } }}
              >
                NUEVA BÚSQUEDA
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={reload}
                sx={{ borderColor: `${primaryColor}60`, color: primaryColor, whiteSpace: 'nowrap', '&:hover': { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } }}
              >
                RECARGAR
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Inline filters */}
      <Filters
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        genderOptions={genderOptions}
        categoryOptions={categoryOptions}
        ageGroupOptions={ageGroupOptions}
        nationalityOptions={nationalityOptions}
        resultsCount={filteredAthletes.length}
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

