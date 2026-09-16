import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import { RREventConfig } from '../lib/types';

interface SearchFormProps {
  events: RREventConfig[];
  loading: boolean;
  error: string | null;
  primaryColor: string;
  onSearch: (eventCfg: RREventConfig, name: string) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  events,
  loading,
  error,
  primaryColor,
  onSearch,
}) => {
  const eventKey = (ev: RREventConfig) => `${ev.eventId}_${ev.contest ?? 0}_${ev.initialCategory ?? ''}`;

  const [year, setYear] = useState('');
  const [location, setLocation] = useState('');

  const years = React.useMemo(
    () =>
      Array.from(new Set(events.map((ev) => ev.date?.slice(0, 4)).filter(Boolean) as string[])).sort(
        (a, b) => b.localeCompare(a),
      ),
    [events],
  );

  const locations = React.useMemo(
    () => Array.from(new Set(events.map((ev) => ev.location).filter(Boolean) as string[])).sort(),
    [events],
  );

  // Eventos que pasan los filtros previos; alimentan el desplegable de evento
  const matchingEvents = React.useMemo(
    () =>
      events.filter(
        (ev) =>
          (!year || ev.date?.slice(0, 4) === year) && (!location || ev.location === location),
      ),
    [events, year, location],
  );

  // Unique race names in order of first appearance
  const uniqueRaceNames = React.useMemo(() => {
    const seen = new Set<string>();
    return matchingEvents.reduce<string[]>((acc, ev) => {
      const n = ev.name ?? String(ev.eventId);
      if (!seen.has(n)) { seen.add(n); acc.push(n); }
      return acc;
    }, []);
  }, [matchingEvents]);

  const [selectedRaceName, setSelectedRaceName] = useState<string>(() =>
    uniqueRaceNames.length === 1 ? uniqueRaceNames[0] : '',
  );

  // Si el evento elegido deja de estar disponible tras cambiar año o ubicación, se limpia
  React.useEffect(() => {
    if (selectedRaceName && !uniqueRaceNames.includes(selectedRaceName)) setSelectedRaceName('');
  }, [uniqueRaceNames, selectedRaceName]);

  // Modalities available for the selected race
  const modalities = React.useMemo(
    () => matchingEvents.filter((ev) => (ev.name ?? String(ev.eventId)) === selectedRaceName),
    [matchingEvents, selectedRaceName],
  );

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (uniqueRaceNames.length === 1 && events.length === 1) return eventKey(events[0]);
    return '';
  });

  // Auto-select modality when only one exists for the chosen race
  React.useEffect(() => {
    if (modalities.length === 1) {
      setSelectedKey(eventKey(modalities[0]));
    } else {
      setSelectedKey('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceName]);

  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventCfg = events.find((ev) => eventKey(ev) === selectedKey);
    if (!eventCfg) return;
    onSearch(eventCfg, name);
  };

  const selectedEvent = events.find((ev) => eventKey(ev) === selectedKey);
  void selectedEvent; // kept for potential future use
  const canSubmit = selectedRaceName !== '' && selectedKey !== '' && !loading;

  const formatLabel = (ev: RREventConfig) =>
    ev.contestName ?? (ev.format === 'pairs' ? 'Parejas' : ev.format === 'teams' ? 'Equipos' : 'Individual');

  const formatChip = (format: RREventConfig['format']) => {
    if (!format) return null;
    const label = format === 'pairs' ? 'Parejas' : format === 'teams' ? 'Equipos' : 'Individual';
    const icon = format === 'individual' ? <PersonIcon /> : <GroupsIcon />;
    const color = format === 'individual' ? 'primary' : 'secondary';
    return (
      <Chip
        icon={icon}
        label={label}
        size="small"
        color={color}
        variant="outlined"
        sx={{ ml: 1, height: 20, fontSize: 11, '& .MuiChip-icon': { fontSize: 14, ml: '8px', mr: '-2px' }, '& .MuiChip-label': { pl: '10px', pr: '10px' } }}
      />
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {/* Año */}
        {years.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 110, flex: '1 1 110px' }}>
            <InputLabel>Año</InputLabel>
            <Select
              label="Año"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">Cualquier año</MenuItem>
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Ubicación */}
        {locations.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 140, flex: '1 1 140px' }}>
            <InputLabel>Ubicación</InputLabel>
            <Select
              label="Ubicación"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">Cualquier ubicación</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l} value={l}>
                  {l}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Evento */}
        <FormControl size="small" sx={{ minWidth: 190, flex: '2 1 220px' }}>
          <InputLabel>Evento</InputLabel>
          <Select
            label="Evento"
            value={selectedRaceName}
            onChange={(e) => setSelectedRaceName(e.target.value)}
            disabled={loading}
          >
            {uniqueRaceNames.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Modalidad — solo si el evento elegido tiene varias */}
        {selectedRaceName && modalities.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 160, flex: '1 1 160px' }}>
            <InputLabel>Modalidad</InputLabel>
            <Select
              label="Modalidad"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={loading}
              renderValue={(val) => {
                const ev = modalities.find((e) => eventKey(e) === val);
                return ev ? formatLabel(ev) : val;
              }}
            >
              {modalities.map((ev) => (
                <MenuItem key={eventKey(ev)} value={eventKey(ev)}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {formatLabel(ev)}
                    {!ev.contestName && formatChip(ev.format)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Nombre / dorsal */}
        <TextField
          size="small"
          variant="outlined"
          label="Nombre / Dorsal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          sx={{ minWidth: 170, flex: '1 1 170px' }}
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
          disabled={!canSubmit}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
          sx={{
            flex: { xs: '1 1 100%', sm: '0 0 auto' },
            height: 40,
            px: 3,
            whiteSpace: 'nowrap',
            backgroundColor: canSubmit ? primaryColor : undefined,
            color: canSubmit ? '#000000' : undefined,
            borderRadius: 0,
            boxShadow: 'none',
            fontSize: 13,
            letterSpacing: '0.1em',
            '&:hover': {
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow: 'none',
            },
            '&.Mui-disabled': { boxShadow: 'none' },
          }}
        >
          {loading ? 'Cargando…' : 'Ver resultados'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
