import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InsightsIcon from '@mui/icons-material/Insights';
import HistoryIcon from '@mui/icons-material/History';
import { RaceResultsWidget } from './RaceResultsWidget';
import { CompareView } from './CompareView';
import { AnalyzeView } from './AnalyzeView';
import { HistoryView } from './HistoryView';
import { WidgetConfig } from '../lib/types';

type TabKey = 'search' | 'compare' | 'analyze' | 'history';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactElement }> = [
  { key: 'search', label: 'Buscar', icon: <SearchIcon fontSize="small" /> },
  { key: 'compare', label: 'Comparar', icon: <CompareArrowsIcon fontSize="small" /> },
  { key: 'analyze', label: 'Analizar', icon: <InsightsIcon fontSize="small" /> },
  { key: 'history', label: 'Trayectoria', icon: <HistoryIcon fontSize="small" /> },
];

// ─── Panel: se mantiene montado para no perder el estado al cambiar de tab ───

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <Box role="tabpanel" hidden={!active} sx={{ display: active ? 'block' : 'none' }}>
      {children}
    </Box>
  );
}

interface AppShellProps extends WidgetConfig {}

export const AppShell: React.FC<AppShellProps> = (config) => {
  const {
    title = 'Buscador de Resultados',
    logoUrl,
    primaryColor = '#1976d2',
  } = config;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState<TabKey>('search');

  const tabsNav = (
    <Tabs
      value={tab}
      onChange={(_, v: TabKey) => setTab(v)}
      variant={isMobile ? 'fullWidth' : 'standard'}
      aria-label="Secciones"
      sx={{
        minHeight: 0,
        '& .MuiTabs-indicator': { height: 2, backgroundColor: primaryColor },
        '& .MuiTab-root': {
          minHeight: 0,
          px: { xs: 1, sm: 2 },
          py: 1.25,
          fontSize: { xs: 11, sm: 12 },
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          minWidth: 0,
          '&.Mui-selected': { color: primaryColor },
        },
      }}
    >
      {TABS.map((t) => (
        <Tab
          key={t.key}
          value={t.key}
          label={t.label}
          icon={t.icon}
          iconPosition="start"
          disableRipple
        />
      ))}
    </Tabs>
  );

  return (
    <Box sx={{ fontFamily: 'inherit' }}>
      {/* ── Cabecera + navegación ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          justifyContent: 'space-between',
          mb: { xs: 2, sm: 3 },
          borderBottom: '2px solid',
          borderColor: `${primaryColor}40`,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', pb: { xs: 0, sm: 1.5 } }}>
          {logoUrl && (
            <Avatar
              src={logoUrl}
              alt="Logo"
              variant="square"
              sx={{ width: 48, height: 48, borderRadius: 1, boxShadow: `0 0 12px ${primaryColor}44` }}
            />
          )}
          <Box>
            <Typography
              variant="overline"
              sx={{ color: primaryColor, letterSpacing: 2.5, display: 'block', lineHeight: 1.2, fontSize: 10 }}
            >
              RANKING
            </Typography>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              {title}
            </Typography>
          </Box>
        </Stack>

        {tabsNav}
      </Stack>

      {/* ── Contenido ── */}
      <TabPanel active={tab === 'search'}>
        <RaceResultsWidget {...config} showHeader={false} />
      </TabPanel>

      <TabPanel active={tab === 'compare'}>
        <CompareView {...config} />
      </TabPanel>

      <TabPanel active={tab === 'analyze'}>
        <AnalyzeView {...config} />
      </TabPanel>

      {/* Se monta solo al entrar: descarga todas las carreras y no conviene hacerlo de fondo */}
      {tab === 'history' && (
        <TabPanel active>
          <HistoryView {...config} />
        </TabPanel>
      )}
    </Box>
  );
};
