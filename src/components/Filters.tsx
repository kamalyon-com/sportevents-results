import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Paper,
  Stack,
  IconButton,
  Drawer,
  Badge,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import { FilterState } from '../lib/types';

interface FiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clearFilters: () => void;
  genderOptions: string[];
  categoryOptions: string[];
  ageGroupOptions: string[];
  nationalityOptions: string[];
  resultsCount: number;
  selectorRow?: React.ReactNode;
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  clearFilters,
  genderOptions,
  categoryOptions,
  ageGroupOptions,
  nationalityOptions,
  resultsCount,
  selectorRow,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Only show ageGroup filter when its options differ from category options
  const showAgeGroup = ageGroupOptions.length > 1 &&
    JSON.stringify([...ageGroupOptions].sort()) !== JSON.stringify([...categoryOptions].sort());

  const hasActiveFilters =
    !!filters.gender || !!filters.ageGroup || !!filters.category || !!filters.nationality;
  const activeFilterCount = [filters.gender, filters.ageGroup, filters.category, filters.nationality].filter(Boolean).length;
  const hasDropdownFilters =
    genderOptions.length > 1 || categoryOptions.length > 1 || showAgeGroup || nationalityOptions.length > 1;

  const genderLabel = (g: string) => (g === 'M' ? 'Hombres' : g === 'F' ? 'Mujeres' : g === 'Mixta' ? 'Mixtas' : g);

  const searchField = (fullWidth: boolean) => (
    <TextField
      size="small"
      variant="outlined"
      placeholder="Buscar nombre o dorsal…"
      value={filters.search}
      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
      fullWidth={fullWidth}
      sx={fullWidth ? undefined : { minWidth: 200 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: filters.search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setFilters((f) => ({ ...f, search: '' }))}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );

  const countChip = (
    <Chip
      size="small"
      label={`${resultsCount} resultado${resultsCount !== 1 ? 's' : ''}`}
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: 11, borderRadius: 1, color: 'text.secondary', borderColor: 'divider' }}
    />
  );

  const activeChips = (
    <>
      {filters.gender && (
        <Chip size="small" label={genderLabel(filters.gender)} onDelete={() => setFilters((f) => ({ ...f, gender: '' }))} />
      )}
      {filters.category && (
        <Chip size="small" label={filters.category} onDelete={() => setFilters((f) => ({ ...f, category: '' }))} />
      )}
      {filters.ageGroup && (
        <Chip size="small" label={filters.ageGroup} onDelete={() => setFilters((f) => ({ ...f, ageGroup: '' }))} />
      )}
      {filters.nationality && (
        <Chip size="small" label={filters.nationality} onDelete={() => setFilters((f) => ({ ...f, nationality: '' }))} />
      )}
    </>
  );

  if (isMobile) {
    return (
      <Box sx={{ mb: 1.5 }}>
        {selectorRow && (
          <Box sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            {selectorRow}
          </Box>
        )}
        {/* Search bar + filter icon */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Box sx={{ flex: 1 }}>{searchField(true)}</Box>
          {hasDropdownFilters && (
            <Badge badgeContent={activeFilterCount} color="primary" invisible={activeFilterCount === 0}>
              <IconButton
                size="medium"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  border: 1,
                  borderColor: activeFilterCount > 0 ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  color: activeFilterCount > 0 ? 'primary.main' : 'text.secondary',
                }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Badge>
          )}
        </Stack>
        {/* Count + active chips */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {countChip}
          {activeChips}
        </Stack>

        {/* Bottom drawer for filter options */}
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2, pb: 3 } } }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Filtros</Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack spacing={1.5}>
            {genderOptions.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel>Género</InputLabel>
                <Select label="Género" value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
                  <MenuItem value="">Todos</MenuItem>
                  {genderOptions.map((g) => <MenuItem key={g} value={g}>{genderLabel(g)}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {categoryOptions.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
                  <MenuItem value="">Todas</MenuItem>
                  {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {showAgeGroup && (
              <FormControl size="small" fullWidth>
                <InputLabel>Grupo de Edad</InputLabel>
                <Select label="Grupo de Edad" value={filters.ageGroup} onChange={(e) => setFilters((f) => ({ ...f, ageGroup: e.target.value }))}>
                  <MenuItem value="">Todos</MenuItem>
                  {ageGroupOptions.map((ag) => <MenuItem key={ag} value={ag}>{ag}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {nationalityOptions.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel>Nación</InputLabel>
                <Select label="Nación" value={filters.nationality} onChange={(e) => setFilters((f) => ({ ...f, nationality: e.target.value }))}>
                  <MenuItem value="">Todas</MenuItem>
                  {nationalityOptions.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {hasActiveFilters && (
              <Button size="small" variant="text" color="error" startIcon={<ClearIcon />} onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Stack>
          <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => setDrawerOpen(false)}>
            Aplicar
          </Button>
        </Drawer>
      </Box>
    );
  }

  // Desktop layout
  return (
    <Paper
      variant="outlined"
      sx={{ mb: 2.5, p: 2, borderRadius: 2.5, borderColor: 'divider' }}
    >
      {selectorRow && (
        <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          {selectorRow}
        </Box>
      )}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        {searchField(false)}

        {genderOptions.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Género</InputLabel>
            <Select
              label="Género"
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              {genderOptions.map((g) => (
                <MenuItem key={g} value={g}>{genderLabel(g)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {categoryOptions.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              label="Categoría"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <MenuItem value="">Todas</MenuItem>
              {categoryOptions.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {showAgeGroup && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Grupo de Edad</InputLabel>
            <Select
              label="Grupo de Edad"
              value={filters.ageGroup}
              onChange={(e) => setFilters((f) => ({ ...f, ageGroup: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              {ageGroupOptions.map((ag) => (
                <MenuItem key={ag} value={ag}>{ag}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {nationalityOptions.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Nación</InputLabel>
            <Select
              label="Nación"
              value={filters.nationality}
              onChange={(e) => setFilters((f) => ({ ...f, nationality: e.target.value }))}
            >
              <MenuItem value="">Todas</MenuItem>
              {nationalityOptions.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {hasActiveFilters && (
          <Button size="small" variant="text" color="error" startIcon={<ClearIcon />} onClick={clearFilters}>
            Limpiar
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {countChip}
        {activeChips}
      </Stack>
    </Paper>
  );
};


