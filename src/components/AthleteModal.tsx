import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Athlete, EventInfo } from '../lib/types';
import { CertificateGenerator } from './CertificateGenerator';

interface AthleteModalProps {
  athlete: Athlete | null;
  event?: EventInfo;
  open: boolean;
  onClose: () => void;
  logoUrl?: string;
  primaryColor?: string;
  showCertificate?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`tab-${index}`} aria-labelledby={`tab-btn-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export const AthleteModal: React.FC<AthleteModalProps> = ({
  athlete,
  event,
  open,
  onClose,
  logoUrl,
  primaryColor = '#1976d2',
  showCertificate = true,
}) => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  if (!athlete) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      aria-labelledby="athlete-modal-title"
    >
      <DialogTitle
        id="athlete-modal-title"
        sx={{
          background: `linear-gradient(135deg, ${primaryColor}22 0%, transparent 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 1,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              {athlete.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label={`#${athlete.bib}`} size="small" variant="outlined" />
              <Chip label={athlete.category} size="small" color="primary" variant="outlined" />
              <Chip
                label={athlete.gender === 'M' ? 'Masculino' : 'Femenino'}
                size="small"
                variant="outlined"
              />
              <Chip label={athlete.age_group} size="small" variant="outlined" />
              <Chip label={athlete.nationality} size="small" variant="outlined" />
            </Stack>
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar" size="small" sx={{ mt: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Secciones del atleta">
          <Tab label="Resumen" id="tab-btn-0" aria-controls="tab-0" />
          <Tab label="Tiempos Parciales" id="tab-btn-1" aria-controls="tab-1" />
          <Tab label="Clasificaciones" id="tab-btn-2" aria-controls="tab-2" />
          {showCertificate && <Tab label="Certificado" id="tab-btn-3" aria-controls="tab-3" />}
        </Tabs>
      </Box>

      <DialogContent>
        {/* Tab 0: Resumen */}
        <TabPanel value={tab} index={0}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              { label: 'Tiempo Total', value: athlete.finish_time, highlight: true },
              { label: 'Posición General', value: `#${athlete.rank_overall}` },
              { label: 'Posición Género', value: `#${athlete.rank_gender}` },
              { label: 'Posición Categoría', value: `#${athlete.rank_category}` },
              { label: 'Dorsal', value: `#${athlete.bib}` },
              { label: 'Evento', value: event?.name ?? athlete.event_id },
            ].map(({ label, value, highlight }) => (
              <Paper
                key={label}
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderColor: highlight ? primaryColor : 'divider',
                  backgroundColor: highlight ? `${primaryColor}11` : undefined,
                }}
              >
                <Typography
                  variant={highlight ? 'h4' : 'h5'}
                  sx={{
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: highlight ? 'primary.main' : 'text.primary',
                  }}
                >
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Paper>
            ))}
          </Box>

          {athlete.rank_overall <= 3 && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <EmojiEventsIcon
                sx={{
                  color:
                    athlete.rank_overall === 1
                      ? '#FFD700'
                      : athlete.rank_overall === 2
                      ? '#C0C0C0'
                      : '#CD7F32',
                }}
              />
              <Typography sx={{ fontWeight: 600 }}>
                {athlete.rank_overall === 1
                  ? '¡Campeón/a!'
                  : athlete.rank_overall === 2
                  ? 'Subcampeón/a'
                  : 'Tercer puesto'}
              </Typography>
            </Stack>
          )}
        </TabPanel>

        {/* Tab 1: Tiempos Parciales */}
        <TabPanel value={tab} index={1}>
          {athlete.splits.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.disabled">
                No hay tiempos parciales disponibles para este participante.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="Tiempos parciales">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Sector</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">T. Parcial</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">T. Acumulado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {athlete.splits.map((split, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {split.station}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', color: split.sector ? 'text.primary' : 'text.disabled' }}
                        >
                          {split.sector || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: i === athlete.splits.length - 1 ? 700 : 400,
                            color: i === athlete.splits.length - 1 ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {split.time || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 2: Clasificaciones */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            {[
              { label: 'Clasificación General', rank: athlete.rank_overall },
              { label: `Clasificación ${athlete.gender === 'M' ? 'Masculina' : 'Femenina'}`, rank: athlete.rank_gender },
              { label: `Clasificación ${athlete.category}`, rank: athlete.rank_category },
            ].map(({ label, rank }) => (
              <Paper key={label} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {label}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {rank <= 3 && (
                      <EmojiEventsIcon
                        sx={{
                          color:
                            rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
                        }}
                        fontSize="small"
                      />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="primary">
                      #{rank}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </TabPanel>

        {/* Tab 3: Certificado */}
        {showCertificate && (
          <TabPanel value={tab} index={3}>
            <CertificateGenerator
              athlete={athlete}
              event={event}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
            />
          </TabPanel>
        )}
      </DialogContent>
    </Dialog>
  );
};

