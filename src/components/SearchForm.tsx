import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Unique race names in order of first appearance
  const uniqueRaceNames = React.useMemo(() => {
    const seen = new Set<string>();
    return events.reduce<string[]>((acc, ev) => {
      const n = ev.name ?? String(ev.eventId);
      if (!seen.has(n)) { seen.add(n); acc.push(n); }
      return acc;
    }, []);
  }, [events]);

  const [selectedRaceName, setSelectedRaceName] = useState<string>(() =>
    uniqueRaceNames.length === 1 ? uniqueRaceNames[0] : '',
  );

  // Modalities available for the selected race
  const modalities = React.useMemo(
    () => events.filter((ev) => (ev.name ?? String(ev.eventId)) === selectedRaceName),
    [events, selectedRaceName],
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
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 580, mx: 'auto' }}>
      <Box>
        {/* ── Form fields ── */}
        <Stack spacing={0} divider={<Divider />}>
            {/* Race name */}
            <FormRow label="Evento">
              <FormControl fullWidth size="medium" variant="outlined">
                <Select
                  displayEmpty
                  value={selectedRaceName}
                  onChange={(e) => setSelectedRaceName(e.target.value)}
                  disabled={loading}
                  renderValue={(val) =>
                    val ? val : <em style={{ opacity: 0.45 }}>Seleccionar evento…</em>
                  }
                >
                  {uniqueRaceNames.map((n) => (
                    <MenuItem key={n} value={n}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormRow>

            {/* Modality — only shown when the selected race has multiple formats */}
            {selectedRaceName && modalities.length > 1 && (
              <FormRow label="Modalidad">
                <FormControl fullWidth size="medium" variant="outlined">
                  <Select
                    displayEmpty
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    disabled={loading}
                    renderValue={(val) => {
                      if (!val) return <em style={{ opacity: 0.45 }}>Seleccionar modalidad…</em>;
                      const ev = modalities.find((e) => eventKey(e) === val);
                      if (!ev) return val;
                      return formatLabel(ev);
                    }}
                  >
                    {modalities.map((ev) => (
                      <MenuItem key={eventKey(ev)} value={eventKey(ev)}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatLabel(ev)}
                          </Typography>
                          {!ev.contestName && formatChip(ev.format)}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FormRow>
            )}

            {/* Name */}
            <FormRow label="Nombre / Apellido">
              <TextField
                fullWidth
                size="medium"
                variant="outlined"
                placeholder="Buscar por nombre…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </FormRow>
        </Stack>

        <Divider />

        {/* ── Submit ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth={isMobile}
            disabled={!canSubmit}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
            sx={{
              px: isMobile ? 2 : 6,
              whiteSpace: 'nowrap',
              background: canSubmit
                ? `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`
                : undefined,
              boxShadow: `0 4px 20px ${primaryColor}44`,
              fontSize: 14,
              letterSpacing: 1,
              borderRadius: 2,
              '&:hover': {
                background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}aa 100%)`,
                boxShadow: `0 8px 32px ${primaryColor}66`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
              '&.Mui-disabled': { boxShadow: 'none', transform: 'none' },
            }}
          >
            {loading ? 'Cargando…' : 'Mostrar Resultados'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

// ─── Helper: labelled form row ────────────────────────────────────────────────
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { sm: 'center' }, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, gap: { xs: 0.75, sm: 0 } }}
    >
      <Box sx={{ width: { sm: 160 }, flexShrink: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.3, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  );
}
