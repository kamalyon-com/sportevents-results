import React, { useMemo, useEffect } from 'react';
import {
  Box,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  createTheme,
  Container,
  Paper,
} from '@mui/material';
import { RaceResultsWidget } from './components/RaceResultsWidget';

// ─── Theme factory ────────────────────────────────────────────────────────────
function buildTheme(mode: 'dark' | 'light') {
  const isDark = mode === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)';
  const inputBorderHover = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const tableBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#00A3E0' },
      secondary: { main: '#FF8C42' },
      background: isDark
        ? { default: '#0d0d0d', paper: '#161616' }
        : { default: '#f0f4f8', paper: '#ffffff' },
      divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    },
    typography: {
      fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontFamily: '"Exo 2", sans-serif', fontWeight: 800 },
      h2: { fontFamily: '"Exo 2", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"Exo 2", sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Exo 2", sans-serif', fontWeight: 700 },
      h5: { fontFamily: '"Exo 2", sans-serif', fontWeight: 700 },
      h6: { fontFamily: '"Exo 2", sans-serif', fontWeight: 700 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiMenuItem: {
        styleOverrides: {
          root: { fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' },
        },
      },
      MuiCardHeader: {
        styleOverrides: { root: { paddingBottom: 8 } },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, textTransform: 'none', fontWeight: 700, letterSpacing: 0.4 },
          contained: { '&:hover': { boxShadow: 'none' } },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '10px 14px', borderColor: `${tableBorder} !important` },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': { backgroundColor: 'rgba(0, 163, 224, 0.06)' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: `${borderColor} !important` },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 2 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: `${borderColor} !important`,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& fieldset': { borderColor: `${inputBorder} !important` },
            '&:hover fieldset': { borderColor: `${inputBorderHover} !important` },
            '&.Mui-focused fieldset': { borderColor: '#00A3E0 !important' },
          },
          notchedOutline: { borderColor: `${inputBorder} !important` },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: { color: isDark ? 'rgba(255,255,255,0.56) !important' : 'rgba(0,0,0,0.54) !important' },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: `${borderColor} !important` },
        },
      },
    },
  });
}

// ─── Dev preview — mirrors how the widget is embedded on a real page ──────────

function App({ eventPrefix, theme: themeProp = 'dark' }: { eventPrefix?: string; theme?: 'dark' | 'light' }) {
  const mode = themeProp;
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const isDark = mode === 'dark';

  // Inject Google Fonts link once on mount
  useEffect(() => {
    const FONT_URL = 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap';
    const id = 'sport-events-google-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={{
        '#sportevents-results, #kamalyon-race-results': {
          color: `${theme.palette.text.primary} !important`,
        },
        '#sportevents-results input, #kamalyon-race-results input': {
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important',
          background: 'transparent !important',
          color: 'inherit !important',
        },
        '#sportevents-results a, #kamalyon-race-results a': {
          color: 'inherit !important',
          textDecoration: 'none !important',
        },
        '#sportevents-results img, #kamalyon-race-results img': {
          maxWidth: 'none !important',
          height: 'auto',
        },
        '#sportevents-results li, #kamalyon-race-results li': {
          listStyle: 'none !important',
          margin: '0 !important',
          padding: '0 !important',
        },
      }} />
      <CssBaseline />
      {/* Gradient mesh background */}
      <Box
        sx={{
          minHeight: '100vh',
          background: isDark
            ? 'radial-gradient(ellipse at 15% 25%, rgba(0,163,224,0.09) 0%, transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(255,140,66,0.07) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 15% 25%, rgba(0,163,224,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(255,140,66,0.05) 0%, transparent 50%)',
        }}
      >
      <Container maxWidth="xl" sx={{ py: { xs: 1, md: 4 } }}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 4 },
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)',
            borderRadius: 4,
            backdropFilter: 'blur(24px)',
            background: isDark ? 'rgba(18,18,18,0.88)' : 'rgba(255,255,255,0.90)',
            boxShadow: isDark
              ? '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)'
              : '0 32px 64px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          <RaceResultsWidget
            apiKey={process.env.REACT_APP_RR_API_KEY}
            title="Buscador de Resultados"
            primaryColor="#00A3E0"
            showCertificate={true}
            eventPrefix={eventPrefix}
          />
        </Paper>
      </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;

