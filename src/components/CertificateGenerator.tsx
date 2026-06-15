import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import { Athlete, EventInfo } from '../lib/types';

interface CertificateGeneratorProps {
  athlete: Athlete;
  event?: EventInfo;
  logoUrl?: string;
  primaryColor?: string;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  athlete,
  event,
  logoUrl,
  primaryColor = '#1976d2',
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const [generatingJpg, setGeneratingJpg] = React.useState(false);

  const captureCanvas = async () => {
    if (!certRef.current) return null;
    return html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: '#0d0d0d' });
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificado-${athlete.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadJpg = async () => {
    setGeneratingJpg(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `certificado-${athlete.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.93);
      link.click();
    } finally {
      setGeneratingJpg(false);
    }
  };

  const formattedDate = event?.date
    ? (() => {
        try {
          // Parse YYYY-MM-DD directly to avoid UTC offset issues
          const [y, m, d] = event.date.split('-').map(Number);
          return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        } catch {
          return event.date;
        }
      })()
    : null;

  return (
    <Box>
      {/* �"?�"? Dark certificate card �"?�"? */}
      <Box
        ref={certRef}
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 40%, #0d0d0d 100%)',
          borderRadius: 1,
          overflow: 'hidden',
          color: '#fff',
          p: 0,
          // aspect ratio ~A4 landscape
          aspectRatio: '1.414 / 1',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Noise texture overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
            pointerEvents: 'none',
          }}
        />

        {/* Primary color glow in top-left */}
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${primaryColor}33 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 3, sm: 4 } }}>
          {/* Header row */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 'auto' }}>
            <Box>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" style={{ height: 36, objectFit: 'contain', marginBottom: 8 }} />
              )}
              <Typography
                variant="overline"
                sx={{ display: 'block', color: primaryColor, letterSpacing: 4, fontSize: '0.6rem', lineHeight: 1 }}
              >
                Certificado de Participación
              </Typography>
              {event?.name && (
                <Typography
                  sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '0.7rem', sm: '0.85rem' }, letterSpacing: 0.5, mt: 0.5, lineHeight: 1.2 }}
                >
                  {event.name}
                </Typography>
              )}
            </Box>
            {formattedDate && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                {formattedDate}
              </Typography>
            )}
          </Stack>

          {/* Divider line */}
          <Box sx={{ height: '1px', backgroundColor: `${primaryColor}44`, my: 2 }} />

          {/* Athlete name */}
          <Box sx={{ mb: 'auto' }}>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase', fontSize: '0.6rem' }}
            >
              Atleta
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem' },
                fontWeight: 700,
                letterSpacing: 1,
                lineHeight: 1.1,
                mt: 0.5,
                color: '#fff',
              }}
            >
              {athlete.name}
            </Typography>
            {(athlete.category || athlete.bib) && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                {[athlete.category, athlete.bib ? `Dorsal #${athlete.bib}` : null].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>

          {/* Stats row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: 2,
              mt: 3,
            }}
          >
            {[
              { label: 'Tiempo Total', value: athlete.finish_time || '—', accent: true },
              { label: 'Pos. General', value: `#${athlete.rank_overall}` },
              ...(athlete.gender
                ? [{ label: `Pos. ${athlete.gender === 'M' ? 'Masc.' : 'Fem.'}`, value: `#${athlete.rank_gender}` }]
                : []),
              ...(athlete.category
                ? [{ label: 'Pos. Categoría', value: `#${athlete.rank_category}` }]
                : []),
            ].map(({ label, value, accent }) => (
              <Box
                key={label}
                sx={{
                  borderLeft: `2px solid ${accent ? primaryColor : 'rgba(255,255,255,0.15)'}`,
                  pl: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: accent ? { xs: '1.1rem', sm: '1.4rem' } : { xs: '1rem', sm: '1.15rem' },
                    color: accent ? primaryColor : '#fff',
                    lineHeight: 1.1,
                  }}
                >
                  {value}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Bottom row */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mt: 2 }}>
            <Box>
              {event?.location && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.55rem' }}>
                  {event.location}{event.date ? ` · ${formattedDate}` : ''}
                </Typography>
              )}
            </Box>
            <Typography
              sx={{ color: primaryColor, fontWeight: 700, letterSpacing: 2, fontSize: '0.6rem', textTransform: 'uppercase' }}
            >
              sport-events.com
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* �"?�"? Download buttons �"?�"? */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={generatingPdf ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleDownloadPdf}
          disabled={generatingPdf || generatingJpg}
          sx={{ flex: 1 }}
        >
          {generatingPdf ? 'Generando�?�' : 'Descargar PDF'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={generatingJpg ? <CircularProgress size={16} color="inherit" /> : <ImageIcon />}
          onClick={handleDownloadJpg}
          disabled={generatingPdf || generatingJpg}
          sx={{ flex: 1 }}
        >
          {generatingJpg ? 'Generando�?�' : 'Descargar JPG'}
        </Button>
      </Stack>
    </Box>
  );
};
