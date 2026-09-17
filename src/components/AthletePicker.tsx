import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ClearIcon from '@mui/icons-material/Clear';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';
import { Athlete, FilterState } from '../lib/types';

const PAGE_SIZE = 40;

const athleteKey = (a: Athlete) => `${a.event_id}-${a.bib}`;

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
  Mixta: 'Mixta',
};

interface AthletePickerProps {
  /** Atletas ya filtrados por el hook. */
  athletes: Athlete[];
  /** Total sin filtrar, para el contador. */
  total: number;
  selected: Athlete[];
  onToggle: (athlete: Athlete) => void;
  primaryColor: string;
  /** `single` marca con radio y `multiple` con casilla. */
  mode?: 'single' | 'multiple';
  /** Límite de selección; al alcanzarlo el resto de filas se deshabilita. */
  max?: number;
  /** Color propio de cada seleccionado (columnas de la comparativa). */
  colorOf?: (athlete: Athlete) => string;
  label?: string;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clearFilters: () => void;
  genderOptions: string[];
  categoryOptions: string[];
  ageGroupOptions: string[];
  nationalityOptions: string[];
}

export const AthletePicker: React.FC<AthletePickerProps> = ({
  athletes,
  total,
  selected,
  onToggle,
  primaryColor,
  mode = 'multiple',
  max,
  colorOf,
  label = 'Atletas',
  filters,
  setFilters,
  clearFilters,
  genderOptions,
  categoryOptions,
  ageGroupOptions,
  nationalityOptions,
}) => {
  const [limit, setLimit] = useState(PAGE_SIZE);

  const selectedKeys = useMemo(() => new Set(selected.map(athleteKey)), [selected]);

  const visible = athletes.slice(0, limit);
  const full = max !== undefined && selected.length >= max;

  // Sin género para todos los atletas el dato no es fiable, así que ni se filtra ni se muestra
  const showGender = genderOptions.length > 0;

  // El grupo de edad solo aporta información si no coincide con la categoría
  const showAgeGroup =
    ageGroupOptions.length > 1 &&
    JSON.stringify([...ageGroupOptions].sort()) !== JSON.stringify([...categoryOptions].sort());

  const activeFilters = [
    filters.gender && { key: 'gender' as const, label: GENDER_LABELS[filters.gender] ?? filters.gender },
    filters.category && { key: 'category' as const, label: filters.category },
    filters.ageGroup && { key: 'ageGroup' as const, label: filters.ageGroup },
    filters.nationality && { key: 'nationality' as const, label: filters.nationality },
  ].filter(Boolean) as { key: 'gender' | 'category' | 'ageGroup' | 'nationality'; label: string }[];

  const select = (
    key: 'gender' | 'category' | 'ageGroup' | 'nationality',
    title: string,
    options: string[],
    anyLabel: string,
    render: (value: string) => string = (v) => v,
  ) => (
    <FormControl size="small" sx={{ minWidth: 150, flex: '1 1 150px' }}>
      <InputLabel>{title}</InputLabel>
      <Select
        label={title}
        value={filters[key]}
        onChange={(e) => {
          setFilters((f) => ({ ...f, [key]: e.target.value }));
          setLimit(PAGE_SIZE);
        }}
      >
        <MenuItem value="">{anyLabel}</MenuItem>
        {options.map((o) => (
          <MenuItem key={o} value={o}>
            {render(o)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, fontSize: 10, lineHeight: 1.6 }}>
          {label}
          {max !== undefined ? ` · ${selected.length}/${max}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {athletes.length === total ? `${total} atletas` : `${athletes.length} de ${total} atletas`}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <TextField
          size="small"
          value={filters.search}
          onChange={(e) => {
            setFilters((f) => ({ ...f, search: e.target.value }));
            setLimit(PAGE_SIZE);
          }}
          placeholder="Nombre o dorsal…"
          sx={{ flex: '2 1 200px' }}
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
        {genderOptions.length > 1 &&
          select('gender', 'Género', genderOptions, 'Cualquiera', (v) => GENDER_LABELS[v] ?? v)}
        {categoryOptions.length > 1 && select('category', 'Categoría', categoryOptions, 'Todas')}
        {showAgeGroup && select('ageGroup', 'Grupo de edad', ageGroupOptions, 'Todos')}
        {nationalityOptions.length > 1 && select('nationality', 'Nación', nationalityOptions, 'Todas')}
      </Stack>

      {activeFilters.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center' }}>
          {activeFilters.map((f) => (
            <Chip
              key={f.key}
              size="small"
              label={f.label}
              onDelete={() => setFilters((prev) => ({ ...prev, [f.key]: '' }))}
            />
          ))}
          <Button size="small" color="error" startIcon={<ClearIcon />} onClick={clearFilters}>
            Limpiar
          </Button>
        </Stack>
      )}

      <Paper variant="outlined" sx={{ borderColor: 'divider', maxHeight: 340, overflowY: 'auto', borderRadius: 2 }}>
        {visible.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: 'center' }}>
            Ningún atleta coincide con los filtros.
          </Typography>
        ) : (
          visible.map((a) => {
            const isSelected = selectedKeys.has(athleteKey(a));
            const disabled = !isSelected && full;
            const accent = isSelected ? colorOf?.(a) ?? primaryColor : primaryColor;
            const CheckedIcon = mode === 'single' ? RadioButtonCheckedIcon : CheckBoxIcon;
            const UncheckedIcon = mode === 'single' ? RadioButtonUncheckedIcon : CheckBoxOutlineBlankIcon;
            return (
              <Box
                key={athleteKey(a)}
                component="button"
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onToggle(a)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1,
                  border: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  background: isSelected ? `${accent}14` : 'transparent',
                  textAlign: 'left',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  font: 'inherit',
                  color: 'inherit',
                  '&:hover': { background: disabled ? 'transparent' : `${accent}1f` },
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                {isSelected ? (
                  <CheckedIcon fontSize="small" sx={{ color: accent, flexShrink: 0 }} />
                ) : (
                  <UncheckedIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'monospace', color: 'text.secondary', width: 34, flexShrink: 0 }}
                >
                  {a.rank_overall ? `${a.rank_overall}º` : '—'}
                </Typography>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? accent : 'text.primary', lineHeight: 1.3 }}
                    noWrap
                  >
                    {a.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    #{a.bib}
                    {showGender && a.gender ? ` · ${GENDER_LABELS[a.gender] ?? a.gender}` : ''}
                    {a.age_group ? ` · ${a.age_group}` : ''}
                    {a.category ? ` · ${a.category}` : ''}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontWeight: 700, flexShrink: 0, color: isSelected ? accent : 'text.secondary' }}
                >
                  {a.finish_time || '—'}
                </Typography>
              </Box>
            );
          })
        )}
      </Paper>

      {athletes.length > visible.length && (
        <Button size="small" onClick={() => setLimit((n) => n + PAGE_SIZE)} sx={{ mt: 1, color: primaryColor }}>
          Mostrar más ({athletes.length - visible.length} restantes)
        </Button>
      )}
    </Box>
  );
};
