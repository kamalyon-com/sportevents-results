import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Athlete, EventInfo } from '../lib/types';
import { CertificateGenerator } from './CertificateGenerator';

interface AthleteDetailProps {
  athlete: Athlete;
  event?: EventInfo;
  onBack: () => void;
  primaryColor?: string;
  showCertificate?: boolean;
}

// �"?�"?�"? Section heading �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ width: 3, height: 14, backgroundColor: 'primary.main', borderRadius: 0.5, flexShrink: 0 }} />
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, letterSpacing: 2, color: 'primary.main', lineHeight: 1.2, fontSize: 10 }}
      >
        {children}
      </Typography>
    </Box>
  );
}

// �"?�"?�"? Info row �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.75, justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, fontSize: 12 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', fontSize: 12 }}>
        {value}
      </Typography>
    </Stack>
  );
}

// �"?�"?�"? Race Summary Modal �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function RaceSummaryModal({
  open,
  onClose,
  athlete,
  event,
  primaryColor,
}: {
  open: boolean;
  onClose: () => void;
  athlete: Athlete;
  event?: EventInfo;
  primaryColor: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, display: 'block', lineHeight: 1.2 }}>
          Resumen de Evento
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {athlete.name}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {athlete.splits.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Estación</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">T. Parcial</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">T. Acumulado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {athlete.splits.map((split, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '4px',
                            backgroundColor: primaryColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', fontSize: 10 }}>
                            {String(i + 1).padStart(2, '0')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {split.station}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: split.sector ? 'text.primary' : 'text.disabled' }}>
                        {split.sector || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: i === athlete.splits.length - 1 ? 700 : 400, color: i === athlete.splits.length - 1 ? primaryColor : 'text.primary' }}>
                        {split.time || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
            No hay tiempos parciales disponibles.
          </Typography>
        )}

        {/* Totals */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: `${primaryColor}0d`, borderRadius: 1, border: `1px solid ${primaryColor}33` }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Tiempo Total</Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700, color: primaryColor }}>
              {athlete.finish_time || '—'}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Pos. General</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: primaryColor }}>#{athlete.rank_overall}</Typography>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// �"?�"?�"? Main component �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

export const AthleteDetail: React.FC<AthleteDetailProps> = ({
  athlete,
  event,
  onBack,
  primaryColor = '#1976d2',
  showCertificate = false,
}) => {
  const [certOpen, setCertOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const medalColor =
    athlete.rank_overall === 1
      ? '#FFD700'
      : athlete.rank_overall === 2
      ? '#C0C0C0'
      : athlete.rank_overall === 3
      ? '#CD7F32'
      : null;

  return (
    <Box>
      {/* Page header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 3, pb: 2, borderBottom: '2px solid', borderColor: `${primaryColor}40` }}
        spacing={1}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {medalColor ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                background: `radial-gradient(circle, ${medalColor}33 0%, ${medalColor}11 100%)`,
                border: `2px solid ${medalColor}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 14px ${medalColor}55`,
                flexShrink: 0,
              }}
            >
              <EmojiEventsIcon sx={{ color: medalColor, fontSize: 26 }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                background: `${primaryColor}22`,
                border: `1px solid ${primaryColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: primaryColor, lineHeight: 1 }}>
                {athlete.rank_overall}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.3 }}>
              {athlete.name}
            </Typography>
            <Typography variant="body2" sx={{ color: primaryColor, opacity: 0.8 }}>
              {event?.name ?? athlete.event_id}
            </Typography>
          </Box>
        </Stack>

        {isMobile ? (
          <Tooltip title="Volver">
            <IconButton
              size="small"
              onClick={onBack}
              sx={{ alignSelf: 'flex-start', flexShrink: 0, border: 1, borderColor: `${primaryColor}60`, color: primaryColor, borderRadius: 1.5 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ alignSelf: 'center', flexShrink: 0, borderColor: `${primaryColor}60`, color: primaryColor, '&:hover': { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } }}
          >
            VOLVER
          </Button>
        )}
      </Stack>

      {/* Two-column layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
          gap: 4,
        }}
      >
        {/* �"?�"? Left column �"?�"? */}
        <Stack spacing={3}>
          {/* Participant */}
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <SectionTitle>Participante</SectionTitle>
            <InfoRow label="Nombre" value={athlete.name} />
            <InfoRow label="Dorsal" value={`#${athlete.bib}`} />
            {(athlete.gender || athlete.nationality || athlete.age_group) && (
              <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.75 }}>
                {athlete.gender && (
                  <Chip
                    size="small"
                    label={athlete.gender === 'M' ? '♂ Masculino' : '♀ Femenino'}
                    sx={{ bgcolor: `${primaryColor}20`, color: primaryColor, borderRadius: 1 }}
                  />
                )}
                {athlete.age_group && (
                  <Chip size="small" label={athlete.age_group} variant="outlined" sx={{ borderRadius: 1 }} />
                )}
                {athlete.nationality && (
                  <Chip size="small" label={athlete.nationality} variant="outlined" sx={{ borderRadius: 1 }} />
                )}
              </Stack>
            )}
          </Paper>

          {/* Race Details */}
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <SectionTitle>Detalles del Evento</SectionTitle>
            {event?.name && <InfoRow label="Evento" value={event.name} />}
            {event?.location && <InfoRow label="Lugar" value={event.location} />}
            {event?.date && <InfoRow label="Fecha" value={event.date.split('-').reverse().join('/')} />}
            {athlete.category && <InfoRow label="División" value={athlete.category} />}
          </Paper>

          {/* Overall Time */}
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <SectionTitle>Tiempo y Clasificación</SectionTitle>
            <Stack
              sx={{
                border: '1px solid',
                borderColor: `${primaryColor}55`,
                borderRadius: 2,
                p: 2,
                mb: 1.5,
                background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}22 0%, transparent 70%)`,
                boxShadow: `0 0 24px ${primaryColor}18, inset 0 1px 0 ${primaryColor}30`,
                alignItems: 'center',
              }}
            >
              <Typography variant="h3" sx={{ fontFamily: 'monospace', fontWeight: 800, color: primaryColor, textShadow: `0 0 20px ${primaryColor}88`, letterSpacing: 2, lineHeight: 1.1 }}>
                {athlete.finish_time || '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 10, mt: 0.5 }}>
                Tiempo Total
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.75 }}>
              <Chip
                size="small"
                icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                label={`General #${athlete.rank_overall}`}
                sx={{ bgcolor: `${primaryColor}20`, color: primaryColor, borderRadius: 1 }}
              />
              {athlete.rank_gender != null && athlete.gender && (
                <Chip
                  size="small"
                  label={`${athlete.gender === 'M' ? 'Masc.' : 'Fem.'} #${athlete.rank_gender}`}
                  variant="outlined"
                  sx={{ borderRadius: 1, borderColor: `${primaryColor}45` }}
                />
              )}
              {athlete.rank_category != null && athlete.category && (
                <Chip
                  size="small"
                  label={`Cat. #${athlete.rank_category}`}
                  variant="outlined"
                  sx={{ borderRadius: 1, borderColor: `${primaryColor}45` }}
                />
              )}
            </Stack>
            {showCertificate && (
              <Button
                fullWidth
                variant="contained"
                startIcon={<WorkspacePremiumIcon />}
                onClick={() => setCertOpen(true)}
                sx={{ mt: 2, backgroundColor: primaryColor, boxShadow: `0 0 16px ${primaryColor}55`, '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' } }}
              >
                Certificado
              </Button>
            )}
          </Paper>
        </Stack>

        {/* �"?�"? Right column: splits table �"?�"? */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: `${primaryColor}25` }}>
          <Box sx={{ px: 2, pt: 2 }}>
            <SectionTitle>Tiempos Parciales</SectionTitle>
          </Box>
          {athlete.splits.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', background: `${primaryColor}18`, borderBottom: `2px solid ${primaryColor}44`, color: 'text.secondary' }}>Estación</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', background: `${primaryColor}18`, borderBottom: `2px solid ${primaryColor}44`, color: 'text.secondary' }} align="right">T. Parcial</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', background: `${primaryColor}18`, borderBottom: `2px solid ${primaryColor}44`, color: 'text.secondary' }} align="right">T. Acumulado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {athlete.splits.map((split, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '4px',
                              backgroundColor: primaryColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', fontSize: 10 }}>
                              {String(i + 1).padStart(2, '0')}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {split.station}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: split.sector ? 'text.primary' : 'text.disabled' }}>
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
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                No hay tiempos parciales disponibles para este evento.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={certOpen} onClose={() => setCertOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          <Typography variant="overline" sx={{ color: primaryColor, letterSpacing: 2, display: 'block', lineHeight: 1.2 }}>
            Certificado
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {athlete.name}
          </Typography>
          <IconButton onClick={() => setCertOpen(false)} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <CertificateGenerator
            athlete={athlete}
            event={event}
            primaryColor={primaryColor}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
