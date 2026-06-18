import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Athlete, SortConfig, SortField } from '../lib/types';

interface ResultsTableProps {
  athletes: Athlete[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onAthleteClick: (athlete: Athlete) => void;
  raceFormat?: 'individual' | 'pairs' | 'teams';
  primaryColor?: string;
  genderFilter?: string;
}


export const ResultsTable: React.FC<ResultsTableProps> = ({
  athletes,
  loading,
  sortConfig,
  onSort,
  onAthleteClick,
  raceFormat,
  primaryColor = '#1976d2',
  genderFilter,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Shared cell header sx
  const thSx = { fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const, background: `${primaryColor}1a`, borderBottom: `2px solid ${primaryColor}55`, color: 'text.secondary', whiteSpace: 'nowrap' as const, px: isMobile ? 1 : 2 };
  const tdSx = { px: isMobile ? 1 : 2 };

  // When a gender filter is active, show rank_gender (rank within that gender group)
  // otherwise show rank_overall (unified ranking by finish time)
  const displayRank = (athlete: Athlete) => genderFilter ? athlete.rank_gender : athlete.rank_overall;

  const pagedAthletes = athletes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const hasAgeGroup = athletes.some((a) => !!a.age_group);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const sortCell = (field: SortField, label: string) => (
    <TableSortLabel
      active={sortConfig.field === field}
      direction={sortConfig.field === field ? sortConfig.direction : 'asc'}
      onClick={() => onSort(field)}
    >
      {label}
    </TableSortLabel>
  );

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}>
        <Table size="small">
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell width={50}><Skeleton variant="rounded" width={28} height={28} /></TableCell>
                <TableCell width={80}><Skeleton variant="rounded" width={48} height={24} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Skeleton variant="text" width={160} />
                  </Stack>
                </TableCell>
                <TableCell><Skeleton variant="rounded" width={72} height={24} /></TableCell>
                <TableCell width={60}><Skeleton variant="circular" width={28} height={28} sx={{ mx: 'auto' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  if (!loading && athletes.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{ borderRadius: 2, textAlign: 'center', py: 8, px: 4, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <SearchOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
          No se encontraron resultados
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
          Prueba a cambiar los filtros o el término de búsqueda
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', borderColor: 'divider', boxShadow: `0 0 40px ${primaryColor}08` }}>
      <TableContainer>
        <Table size="small" stickyHeader aria-label="Tabla de resultados">
          <TableHead>
            <TableRow>
              <TableCell sx={thSx}>{sortCell('rank_overall', 'Pos.')}</TableCell>
              {!isMobile && <TableCell sx={thSx}>{sortCell('bib', 'Dorsal')}</TableCell>}
              <TableCell sx={thSx}>{sortCell('name', raceFormat === 'pairs' ? 'Pareja' : raceFormat === 'teams' ? 'Equipo' : 'Atleta')}</TableCell>
              {!isMobile && hasAgeGroup && <TableCell sx={thSx}>{sortCell('category', 'Categ.')}</TableCell>}
              <TableCell sx={{ ...thSx }}>{sortCell('finish_time', isMobile ? 'Tiempo' : 'Tiempo Total')}</TableCell>
              {!isMobile && (
                <TableCell sx={thSx} align="center">Detalle</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedAthletes.map((athlete) => (
              <TableRow
                key={`${athlete.event_id}-${athlete.bib}`}
                hover
                onClick={() => onAthleteClick(athlete)}
                sx={{
                  cursor: 'pointer',
                  ...(displayRank(athlete) === 1 && { background: 'rgba(255,215,0,0.05)', '&:hover': { background: 'rgba(255,215,0,0.09) !important' } }),
                  ...(displayRank(athlete) === 2 && { background: 'rgba(192,192,192,0.04)', '&:hover': { background: 'rgba(192,192,192,0.08) !important' } }),
                  ...(displayRank(athlete) === 3 && { background: 'rgba(205,127,50,0.04)', '&:hover': { background: 'rgba(205,127,50,0.08) !important' } }),
                }}
              >
                {/* Rank */}
                <TableCell sx={tdSx}>
                  {displayRank(athlete) <= 3 ? (
                    <Avatar
                      sx={{
                        width: 28, height: 28,
                        bgcolor: displayRank(athlete) === 1 ? '#FFD700' : displayRank(athlete) === 2 ? '#C0C0C0' : '#CD7F32',
                        color: '#111',
                        fontSize: 11,
                        borderRadius: 1.5,
                        boxShadow: displayRank(athlete) === 1 ? '0 0 10px rgba(255,215,0,0.6)' : displayRank(athlete) === 2 ? '0 0 8px rgba(192,192,192,0.4)' : '0 0 8px rgba(205,127,50,0.4)',
                      }}
                    >
                      {displayRank(athlete)}
                    </Avatar>
                  ) : (
                    <Avatar sx={{ width: 28, height: 28, bgcolor: `${primaryColor}18`, color: 'text.secondary', fontSize: 11, borderRadius: 1.5 }}>
                      {displayRank(athlete)}
                    </Avatar>
                  )}
                </TableCell>

                {/* Dorsal — desktop only */}
                {!isMobile && (
                  <TableCell sx={tdSx}>
                    <Chip label={`#${athlete.bib}`} size="small" color="primary" variant="filled" sx={{ fontFamily: 'monospace', fontWeight: 700, height: 22, fontSize: 11 }} />
                  </TableCell>
                )}

                {/* Name */}
                <TableCell sx={tdSx}>
                  {isMobile ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{athlete.name}</Typography>
                      {athlete.members && athlete.members.map((m, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, pl: 1.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.name}</Typography>
                          {m.club && <Typography variant="caption" sx={{ color: 'text.disabled' }}>· {m.club}</Typography>}
                        </Box>
                      ))}
                      {athlete.age_group && (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{athlete.age_group}</Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>#{athlete.bib}</Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{athlete.name}</Typography>
                      {athlete.members && athlete.members.map((m, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{m.name}</Typography>
                          {m.club && <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1.5 }}>· {m.club}</Typography>}
                        </Box>
                      ))}
                      {!athlete.members && athlete.club && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1.5 }}>{athlete.club}</Typography>
                      )}
                    </Box>
                  )}
                </TableCell>

                {/* Category / age group — desktop only, when data exists */}
                {!isMobile && hasAgeGroup && (
                  <TableCell sx={tdSx}>
                    {athlete.age_group && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{athlete.age_group}</Typography>
                    )}
                  </TableCell>
                )}

                {/* Time */}
                <TableCell sx={tdSx}>
                  <Chip
                    label={athlete.finish_time}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontWeight: 700, color: primaryColor, borderColor: `${primaryColor}45`, bgcolor: `${primaryColor}0a`, height: 24, fontSize: isMobile ? 11 : 12 }}
                  />
                </TableCell>

                {/* Detail button — desktop only */}
                {!isMobile && (
                  <TableCell align="center" sx={tdSx}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onAthleteClick(athlete); }} aria-label={`Ver detalle de ${athlete.name}`}>
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={athletes.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={isMobile ? undefined : handleChangeRowsPerPage}
        rowsPerPageOptions={isMobile ? [] : [25, 50, 100]}
        labelRowsPerPage={isMobile ? '' : 'Filas:'}
        labelDisplayedRows={({ from, to, count }) => isMobile ? `${from}–${to} / ${count}` : `${from}–${to} de ${count}`}
        sx={isMobile ? { '& .MuiTablePagination-toolbar': { minHeight: 40, px: 1 }, '& .MuiTablePagination-displayedRows': { fontSize: 12 } } : undefined}
      />
    </Paper>
  );
};

