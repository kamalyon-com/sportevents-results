import React, { useId, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { formatDuration } from '../lib/time';

/** Estimación de densidad por kernel gaussiano, para dibujar la curva del pelotón. */
function kde(values: number[], lo: number, hi: number, samples: number): number[] {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance) || 1;
  const bw = Math.max(1.06 * sd * Math.pow(n, -0.2), (hi - lo) / samples);
  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    const x = lo + ((hi - lo) * i) / (samples - 1);
    let sum = 0;
    for (const v of values) {
      const u = (x - v) / bw;
      sum += Math.exp(-0.5 * u * u);
    }
    out.push(sum / (n * bw * Math.sqrt(2 * Math.PI)));
  }
  return out;
}

// ─── Curva de distribución del pelotón con marcador del atleta ───────────────

export function DistributionChart({
  values,
  value,
  color,
  compact = false,
}: {
  values: number[];
  value: number;
  color: string;
  /** Usa un lienzo más estrecho para tarjetas a media anchura, evitando texto diminuto. */
  compact?: boolean;
}) {
  const theme = useTheme();
  const gradientId = useId();

  // Proporción ancha para que el texto del SVG no se escale en exceso al ocupar todo el ancho.
  const W = compact ? 520 : 900;
  const H = compact ? 160 : 170;
  const PAD_X = 12;
  const BASELINE = H - 34;

  const chart = useMemo(() => {
    const finite = values.filter((v) => isFinite(v)).sort((a, b) => a - b);
    if (finite.length < 3) return null;

    const rawLo = Math.min(finite[0], value);
    const rawHi = Math.max(finite[finite.length - 1], value);
    const pad = (rawHi - rawLo) * 0.06 || 1;
    const lo = rawLo - pad;
    const hi = rawHi + pad;

    const samples = 140;
    const density = kde(finite, lo, hi, samples);
    const maxD = Math.max(...density) || 1;

    const xOf = (v: number) => PAD_X + ((v - lo) / (hi - lo)) * (W - PAD_X * 2);
    const points = density.map((d, i) => {
      const x = PAD_X + (i / (samples - 1)) * (W - PAD_X * 2);
      const y = BASELINE - (d / maxD) * (BASELINE - 12);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const tickCount = compact ? 4 : 6;
    const ticks = Array.from({ length: tickCount }, (_, i) => lo + ((hi - lo) * i) / (tickCount - 1));

    return {
      line: `M${points.join('L')}`,
      area: `M${PAD_X},${BASELINE}L${points.join('L')}L${W - PAD_X},${BASELINE}Z`,
      markerX: isFinite(value) ? xOf(value) : null,
      ticks: ticks.map((t) => ({ x: xOf(t), label: formatDuration(t) })),
    };
  }, [values, value, BASELINE, W, compact]);

  if (!chart) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Datos insuficientes para la distribución
      </Box>
    );
  }

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${W} ${H}`}
      sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      role="img"
      aria-label="Distribución de tiempos del pelotón"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={chart.area} fill={`url(#${gradientId})`} />
      <path d={chart.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <line x1={PAD_X} y1={BASELINE} x2={W - PAD_X} y2={BASELINE} stroke={theme.palette.divider} strokeWidth="1" />
      {chart.markerX !== null && (
        <line
          x1={chart.markerX}
          y1={10}
          x2={chart.markerX}
          y2={BASELINE}
          stroke={theme.palette.text.secondary}
          strokeWidth="3"
        />
      )}
      {chart.ticks.map((t) => (
        <text
          key={t.label + t.x}
          x={t.x}
          y={BASELINE + 20}
          textAnchor="middle"
          fill={theme.palette.text.secondary}
          fontSize="13"
          fontFamily="monospace"
        >
          {t.label}
        </text>
      ))}
    </Box>
  );
}

// ─── Evolución de la posición a lo largo de la carrera ───────────────────────

export function PositionEvolutionChart({
  labels,
  ranks,
  total,
  color,
}: {
  labels: string[];
  ranks: number[];
  total: number;
  color: string;
}) {
  const theme = useTheme();
  const W = 600;
  const H = 230;
  const PAD_L = 34;
  const PAD_R = 10;
  const TOP = 16;
  const BOTTOM = H - 34;

  if (ranks.length < 2) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Sin parciales suficientes
      </Box>
    );
  }

  // El eje se ajusta al rango real de posiciones para que los cambios sean visibles
  const best = Math.min(...ranks);
  const worst = Math.max(...ranks);
  const margin = Math.max(1, Math.round((worst - best) * 0.25));
  const lo = Math.max(1, best - margin);
  const hi = Math.min(total, worst + margin);
  const span = Math.max(1, hi - lo);

  const xOf = (i: number) => PAD_L + (i / (ranks.length - 1)) * (W - PAD_L - PAD_R);
  const yOf = (rank: number) => TOP + ((rank - lo) / span) * (BOTTOM - TOP);
  const points = ranks.map((r, i) => `${xOf(i).toFixed(1)},${yOf(r).toFixed(1)}`);
  // Con muchas estaciones se muestra una etiqueta de cada dos para que no se solapen
  const labelStep = labels.length > 12 ? 2 : 1;
  const yTicks = Array.from(new Set([lo, Math.round((lo + hi) / 2), hi]));

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${W} ${H}`}
      sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      role="img"
      aria-label="Evolución de la posición"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD_L}
            y1={yOf(t)}
            x2={W - PAD_R}
            y2={yOf(t)}
            stroke={theme.palette.divider}
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <text
            x={PAD_L - 8}
            y={yOf(t) + 4}
            textAnchor="end"
            fill={theme.palette.text.secondary}
            fontSize="11"
            fontFamily="monospace"
          >
            {`#${t}`}
          </text>
        </g>
      ))}
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {ranks.map((r, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(r)} r="3.5" fill={theme.palette.background.paper} stroke={color} strokeWidth="2">
          <title>{`${labels[i]}: #${r}/${total}`}</title>
        </circle>
      ))}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={l + i}
            x={xOf(i)}
            y={BOTTOM + 18}
            textAnchor="middle"
            fill={theme.palette.text.secondary}
            fontSize="11"
          >
            {l}
          </text>
        ) : null,
      )}
    </Box>
  );
}

// ─── Radar de percentil por estación ─────────────────────────────────────────

export function RadarChart({
  labels,
  values,
  fullLabels,
  color,
}: {
  labels: string[];
  /** Percentil 0–1 donde 1 = mejor del pelotón. */
  values: number[];
  fullLabels: string[];
  color: string;
}) {
  const theme = useTheme();
  const SIZE = 340;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 112;

  if (values.length < 3) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Sin parciales suficientes
      </Box>
    );
  }

  const angleOf = (i: number) => (i / values.length) * Math.PI * 2 - Math.PI / 2;
  const pointAt = (i: number, radius: number) => [
    CX + Math.cos(angleOf(i)) * radius,
    CY + Math.sin(angleOf(i)) * radius,
  ];

  const ring = (fraction: number) =>
    values
      .map((_, i) => pointAt(i, R * fraction).map((n) => n.toFixed(1)).join(','))
      .join(' ');

  const shape = values
    .map((v, i) => pointAt(i, R * Math.max(0.04, v)).map((n) => n.toFixed(1)).join(','))
    .join(' ');

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      sx={{ width: '100%', maxWidth: 340, height: 'auto', display: 'block', mx: 'auto', overflow: 'visible' }}
      role="img"
      aria-label="Percentil por estación"
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke={theme.palette.divider} strokeWidth="1" />
      ))}
      {values.map((_, i) => {
        const [x, y] = pointAt(i, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={theme.palette.divider} strokeWidth="1" />;
      })}
      <polygon points={shape} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
      {values.map((v, i) => {
        const [x, y] = pointAt(i, R * Math.max(0.04, v));
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color}>
            <title>{`${fullLabels[i]}: top ${Math.round((1 - v) * 100)}%`}</title>
          </circle>
        );
      })}
      {labels.map((l, i) => {
        const [x, y] = pointAt(i, R + 16);
        const cos = Math.cos(angleOf(i));
        const anchor = cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle';
        return (
          <text key={l + i} x={x} y={y + 4} textAnchor={anchor} fill={theme.palette.text.secondary} fontSize="11">
            {l}
            <title>{fullLabels[i]}</title>
          </text>
        );
      })}
    </Box>
  );
}
