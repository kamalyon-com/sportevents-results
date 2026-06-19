import React, { useMemo, useEffect } from 'react';
import {
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
      primary: { main: '#9fd4f9', contrastText: '#000000' },
      secondary: { main: '#FF8C42' },
      background: isDark
        ? { default: '#000000', paper: '#0a0a0a' }
        : { default: '#f0f4f8', paper: '#ffffff' },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    typography: {
      fontFamily: '"Panton", "Barlow Condensed", "Roboto", "Arial", sans-serif',
      h1: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const },
      h2: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
      h3: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.05em' },
      h4: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.04em' },
      h5: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.04em' },
      h6: { fontFamily: '"Panton", sans-serif', fontWeight: 700, letterSpacing: '0.03em' },
      overline: { fontFamily: '"Panton", sans-serif', letterSpacing: '0.22em', fontWeight: 700 },
      button: { fontFamily: '"Panton", sans-serif', letterSpacing: '0.12em', fontWeight: 700 },
    },
    shape: { borderRadius: 2 },
    components: {
      MuiMenuItem: {
        styleOverrides: {
          root: { fontFamily: '"Panton", "Barlow Condensed", "Roboto", "Arial", sans-serif', letterSpacing: '0.04em' },
        },
      },
      MuiCardHeader: {
        styleOverrides: { root: { paddingBottom: 8 } },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            textTransform: 'uppercase',
            fontWeight: 700,
            fontFamily: '"Panton", sans-serif',
            letterSpacing: '0.12em',
            fontSize: '0.85rem',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            '&:hover': {
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow: 'none',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
              backgroundColor: '#ffffff',
              color: '#000000',
              borderColor: '#ffffff',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontFamily: '"Panton", sans-serif',
            letterSpacing: '0.05em',
            borderRadius: 2,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '10px 14px', borderColor: `${tableBorder} !important` },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': { backgroundColor: 'rgba(159, 212, 249, 0.06)' },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontFamily: '"Panton", sans-serif', letterSpacing: '0.06em', fontWeight: 700 },
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
            '&.Mui-focused fieldset': { borderColor: '#9fd4f9 !important' },
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

  // Inject self-hosted Panton Bold @font-face once on mount
  useEffect(() => {
    const id = 'sport-events-panton-font';
    if (!document.getElementById(id)) {
      const fontUrl = new URL('./fonts/Panton Bold.ttf', document.baseURI).href;
      const style = document.createElement('style');
      style.id = id;
      style.textContent = [
        '@font-face {',
        `  font-family: 'Panton';`,
        `  src: url('${fontUrl}') format('truetype');`,
        `  font-weight: 700;`,
        `  font-style: normal;`,
        `  font-display: swap;`,
        '}',
      ].join('\n');
      document.head.appendChild(style);
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
      <Container maxWidth="xl" sx={{ py: { xs: 1, md: 4 } }}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 4 },
            borderColor: isDark ? 'rgba(159,212,249,0.12)' : 'rgba(0,0,0,0.09)',
            borderRadius: 0,
            background: isDark ? '#000000' : '#ffffff',
            boxShadow: isDark
              ? '0 0 0 1px rgba(159,212,249,0.08), 0 32px 80px rgba(0,0,0,0.9)'
              : '0 32px 64px rgba(0,0,0,0.08)',
          }}
        >
          <RaceResultsWidget
            apiKey={process.env.REACT_APP_RR_API_KEY}
            title="Buscador de Resultados"
            primaryColor="#9fd4f9"
            showCertificate={true}
            eventPrefix={eventPrefix}
          />
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;

