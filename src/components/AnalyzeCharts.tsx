import React, { useId, useMemo, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { formatDuration } from '../lib/time';

// ─── Tooltip interactivo compartido por todos los gráficos ───────────────────

interface TipRow {
  color?: string;
  label: string;
  value: string;
}

interface TipState {
  /** Posición en píxeles dentro del contenedor del gráfico. */
  x: number;
  y: number;
  /** Se dibuja a la izquierda del cursor cuando está cerca del borde derecho. */
  flip: boolean;
  title: string;
  rows: TipRow[];
}

/** Coordenadas del puntero en píxeles del contenedor y en unidades del viewBox. */
function pointerPos(
  e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  W: number,
  H: number,
) {
  const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
  const rect = e.currentTarget.getBoundingClientRect();
  const px = (clientX ?? 0) - rect.left;
  const py = (clientY ?? 0) - rect.top;
  return {
    px,
    py,
    vx: (px / rect.width) * W,
    vy: (py / rect.height) * H,
    scale: rect.width / W,
    flip: px > rect.width * 0.6,
  };
}

function ChartTooltip({ tip }: { tip: TipState }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: tip.x,
        top: tip.y,
        transform: `translate(${tip.flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
        pointerEvents: 'none',
        zIndex: 5,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.25,
        py: 0.75,
        boxShadow: 8,
        whiteSpace: 'nowrap',
      }}
    >
      <Box sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', mb: tip.rows.length ? 0.5 : 0 }}>
        {tip.title}
      </Box>
      {tip.rows.map((r, i) => (
        <Box key={r.label + i} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12 }}>
          {r.color && (
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: r.color, flexShrink: 0 }} />
          )}
          <Box component="span" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
            {r.label}
          </Box>
          <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
            {r.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Contenedor relativo para poder posicionar el tooltip sobre el SVG. */
function ChartFrame({ tip, children }: { tip: TipState | null; children: React.ReactNode }) {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {tip && <ChartTooltip tip={tip} />}
    </Box>
  );
}

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
  const [tip, setTip] = useState<TipState | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

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
      lo,
      hi,
      sorted: finite,
    };
  }, [values, value, BASELINE, W, compact]);

  if (!chart) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Datos insuficientes para la distribución
      </Box>
    );
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!chart) return;
    const { px, py, vx, flip } = pointerPos(e, W, H);
    const clamped = Math.min(Math.max(vx, PAD_X), W - PAD_X);
    const t = chart.lo + ((clamped - PAD_X) / (W - PAD_X * 2)) * (chart.hi - chart.lo);
    const faster = chart.sorted.filter((v) => v < t).length;
    const pct = Math.round((faster / chart.sorted.length) * 100);
    setHoverX(clamped);
    setTip({
      x: px,
      y: py,
      flip,
      title: formatDuration(t),
      rows: [
        { label: 'Por delante', value: `${faster} (${pct}%)` },
        { label: 'Por detrás', value: String(chart.sorted.length - faster) },
      ],
    });
  };

  const handleLeave = () => {
    setTip(null);
    setHoverX(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Distribución de tiempos del pelotón"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
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
        {hoverX !== null && (
          <line x1={hoverX} y1={10} x2={hoverX} y2={BASELINE} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
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
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </Box>
    </ChartFrame>
  );
}

// ─── Evolución de la posición a lo largo de la carrera ───────────────────────

export function PositionEvolutionChart({
  labels,
  ranks,
  total,
  color,
  fullLabels,
}: {
  labels: string[];
  ranks: number[];
  total: number;
  color: string;
  fullLabels?: string[];
}) {
  const theme = useTheme();
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
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

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const { vx, py, flip, scale } = pointerPos(e, W, H);
    const step = (W - PAD_L - PAD_R) / (ranks.length - 1);
    const i = Math.min(Math.max(Math.round((vx - PAD_L) / step), 0), ranks.length - 1);
    setHover(i);
    setTip({
      x: xOf(i) * scale,
      y: py,
      flip,
      title: fullLabels?.[i] ?? labels[i],
      rows: [{ color, label: 'Posición', value: `#${ranks[i]} / ${total}` }],
    });
  };

  const handleLeave = () => {
    setTip(null);
    setHover(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Evolución de la posición"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
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
        {hover !== null && (
          <line x1={xOf(hover)} y1={TOP} x2={xOf(hover)} y2={BOTTOM} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
        )}
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {ranks.map((r, i) => (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yOf(r)}
            r={hover === i ? 5.5 : 3.5}
            fill={theme.palette.background.paper}
            stroke={color}
            strokeWidth="2"
          />
        ))}
        {labels.map((l, i) =>
          i % labelStep === 0 ? (
            <text
              key={l + i}
              x={xOf(i)}
              y={BOTTOM + 18}
              textAnchor="middle"
              fill={hover === i ? color : theme.palette.text.secondary}
              fontSize="11"
            >
              {l}
            </text>
          ) : null,
        )}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </Box>
    </ChartFrame>
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
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
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

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const { px, py, vx, vy, flip } = pointerPos(e, SIZE, SIZE);
    const dx = vx - CX;
    const dy = vy - CY;
    if (Math.hypot(dx, dy) > R + 26) {
      setTip(null);
      setHover(null);
      return;
    }
    // El eje más cercano se deduce del ángulo del puntero respecto al centro
    const turns = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2);
    const i = ((Math.round(turns * values.length) % values.length) + values.length) % values.length;
    setHover(i);
    setTip({
      x: px,
      y: py,
      flip,
      title: fullLabels[i],
      rows: [{ color, label: 'Percentil', value: `top ${Math.max(1, Math.round((1 - values[i]) * 100))}%` }],
    });
  };

  const handleLeave = () => {
    setTip(null);
    setHover(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        sx={{ width: '100%', maxWidth: 340, height: 'auto', display: 'block', mx: 'auto', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Percentil por estación"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={theme.palette.divider} strokeWidth="1" />
        ))}
        {values.map((_, i) => {
          const [x, y] = pointAt(i, R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={hover === i ? color : theme.palette.divider}
              strokeWidth="1"
            />
          );
        })}
        <polygon points={shape} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
        {values.map((v, i) => {
          const [x, y] = pointAt(i, R * Math.max(0.04, v));
          return <circle key={i} cx={x} cy={y} r={hover === i ? 5 : 3} fill={color} />;
        })}
        {labels.map((l, i) => {
          const [x, y] = pointAt(i, R + 16);
          const cos = Math.cos(angleOf(i));
          const anchor = cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle';
          return (
            <text
              key={l + i}
              x={x}
              y={y + 4}
              textAnchor={anchor}
              fill={hover === i ? color : theme.palette.text.secondary}
              fontSize="11"
            >
              {l}
            </text>
          );
        })}
        <rect x="0" y="0" width={SIZE} height={SIZE} fill="transparent" />
      </Box>
    </ChartFrame>
  );
}

// ─── Series multi-atleta ─────────────────────────────────────────────────────

export interface ChartSeries {
  name: string;
  color: string;
  /** Un valor por etiqueta; null cuando el atleta no tiene ese parcial. */
  values: (number | null)[];
}

/** Evolución de la posición de varios atletas a la vez. */
export function MultiPositionChart({
  labels,
  fullLabels,
  series,
  total,
}: {
  labels: string[];
  fullLabels?: string[];
  series: ChartSeries[];
  total: number;
}) {
  const theme = useTheme();
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 260;
  const PAD_L = 40;
  const PAD_R = 12;
  const TOP = 16;
  const BOTTOM = H - 34;

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  if (labels.length < 2 || all.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Sin parciales suficientes
      </Box>
    );
  }

  const margin = Math.max(1, Math.round((Math.max(...all) - Math.min(...all)) * 0.25));
  const lo = Math.max(1, Math.min(...all) - margin);
  const hi = Math.min(total, Math.max(...all) + margin);
  const span = Math.max(1, hi - lo);

  const xOf = (i: number) => PAD_L + (i / (labels.length - 1)) * (W - PAD_L - PAD_R);
  const yOf = (rank: number) => TOP + ((rank - lo) / span) * (BOTTOM - TOP);
  const labelStep = labels.length > 12 ? 2 : 1;
  const yTicks = Array.from(new Set([lo, Math.round((lo + hi) / 2), hi]));

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const { vx, py, flip, scale } = pointerPos(e, W, H);
    const step = (W - PAD_L - PAD_R) / (labels.length - 1);
    const i = Math.min(Math.max(Math.round((vx - PAD_L) / step), 0), labels.length - 1);
    setHover(i);
    setTip({
      x: xOf(i) * scale,
      y: py,
      flip,
      title: fullLabels?.[i] ?? labels[i],
      rows: series
        .map((s) => ({
          color: s.color,
          label: s.name,
          value: s.values[i] === null ? '—' : `#${s.values[i]} / ${total}`,
          rank: s.values[i] ?? Infinity,
        }))
        .sort((a, b) => a.rank - b.rank),
    });
  };

  const handleLeave = () => {
    setTip(null);
    setHover(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Evolución de la posición de los atletas seleccionados"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} y1={yOf(t)} x2={W - PAD_R} y2={yOf(t)} stroke={theme.palette.divider} strokeWidth="1" strokeDasharray="3 4" />
            <text x={PAD_L - 8} y={yOf(t) + 4} textAnchor="end" fill={theme.palette.text.secondary} fontSize="11" fontFamily="monospace">
              {`#${t}`}
            </text>
          </g>
        ))}
        {hover !== null && (
          <line x1={xOf(hover)} y1={TOP} x2={xOf(hover)} y2={BOTTOM} stroke={theme.palette.text.secondary} strokeWidth="1" strokeDasharray="3 3" />
        )}
        {series.map((s) => {
          const pts = s.values
            .map((v, i) => (v === null ? null : `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`))
            .filter((p): p is string => p !== null);
          return (
            <g key={s.name}>
              <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              {s.values.map((v, i) =>
                v === null ? null : (
                  <circle
                    key={i}
                    cx={xOf(i)}
                    cy={yOf(v)}
                    r={hover === i ? 5.5 : 3.5}
                    fill={theme.palette.background.paper}
                    stroke={s.color}
                    strokeWidth="2"
                  />
                ),
              )}
            </g>
          );
        })}
        {labels.map((l, i) =>
          i % labelStep === 0 ? (
            <text
              key={l + i}
              x={xOf(i)}
              y={BOTTOM + 18}
              textAnchor="middle"
              fill={hover === i ? theme.palette.text.primary : theme.palette.text.secondary}
              fontSize="11"
            >
              {l}
            </text>
          ) : null,
        )}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </Box>
    </ChartFrame>
  );
}

/** Barras agrupadas: tiempo de cada atleta en cada estación. */
export function StationBarsChart({
  labels,
  fullLabels,
  series,
}: {
  labels: string[];
  fullLabels: string[];
  series: ChartSeries[];
}) {
  const theme = useTheme();
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const PAD_L = 46;
  const PAD_R = 12;
  const ROW_H = 13;
  const GROUP_GAP = 12;
  const W = 760;
  const groupH = series.length * ROW_H + GROUP_GAP;
  const H = labels.length * groupH + 24;

  const max = Math.max(...series.flatMap((s) => s.values).filter((v): v is number => v !== null), 1);

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const { px, py, vy, flip } = pointerPos(e, W, H);
    const gi = Math.min(Math.max(Math.floor((vy - 8) / groupH), 0), labels.length - 1);
    const best = Math.min(...series.map((s) => s.values[gi] ?? Infinity));
    setHover(gi);
    setTip({
      x: px,
      y: py,
      flip,
      title: fullLabels[gi],
      rows: series
        .map((s) => {
          const v = s.values[gi];
          const delta = v !== null && isFinite(best) && v > best ? ` (+${formatDuration(v - best)})` : '';
          return {
            color: s.color,
            label: s.name,
            value: v === null ? '—' : `${formatDuration(v)}${delta}`,
            sort: v ?? Infinity,
          };
        })
        .sort((a, b) => a.sort - b.sort),
    });
  };

  const handleLeave = () => {
    setTip(null);
    setHover(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Tiempo por estación de los atletas seleccionados"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        {labels.map((l, gi) => {
          const top = gi * groupH + 8;
          return (
            <g key={l + gi}>
              {hover === gi && (
                <rect
                  x="0"
                  y={top - 4}
                  width={W}
                  height={series.length * ROW_H + 5}
                  fill={theme.palette.text.primary}
                  fillOpacity="0.06"
                />
              )}
              <text
                x={PAD_L - 8}
                y={top + (series.length * ROW_H) / 2 + 4}
                textAnchor="end"
                fill={hover === gi ? theme.palette.text.primary : theme.palette.text.secondary}
                fontSize="11"
              >
                {l}
              </text>
              {series.map((s, si) => {
                const v = s.values[gi];
                const y = top + si * ROW_H;
                const w = v === null ? 0 : (v / max) * (W - PAD_L - PAD_R);
                return (
                  <rect
                    key={s.name}
                    x={PAD_L}
                    y={y}
                    width={Math.max(w, 1)}
                    height={ROW_H - 3}
                    fill={s.color}
                    fillOpacity={hover === null || hover === gi ? 1 : 0.45}
                    rx="1"
                  />
                );
              })}
            </g>
          );
        })}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </Box>
    </ChartFrame>
  );
}

/** Una carrera dentro de la trayectoria de una persona. */
export interface ProgressionPoint {
  label: string;
  fullLabel: string;
  seconds: number;
  rank: number;
  total: number;
}

// ─── Progresión del tiempo carrera a carrera ─────────────────────────────────

export function ProgressionChart({ points, color }: { points: ProgressionPoint[]; color: string }) {
  const theme = useTheme();
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 220;
  const PAD_L = 52;
  const PAD_R = 12;
  const TOP = 16;
  const BOTTOM = H - 38;

  if (points.length < 2) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
        Hace falta más de una carrera para ver la progresión
      </Box>
    );
  }

  const times = points.map((p) => p.seconds);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const margin = Math.max(30, (max - min) * 0.2);
  const lo = Math.max(0, min - margin);
  const hi = max + margin;
  const span = Math.max(1, hi - lo);

  const xOf = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
  // Menos tiempo, más arriba: mejorar sube la línea
  const yOf = (s: number) => TOP + ((s - lo) / span) * (BOTTOM - TOP);
  const yTicks = [lo, (lo + hi) / 2, hi];
  const labelStep = points.length > 10 ? 2 : 1;

  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const { vx, py, flip, scale } = pointerPos(e, W, H);
    const step = (W - PAD_L - PAD_R) / (points.length - 1);
    const i = Math.min(Math.max(Math.round((vx - PAD_L) / step), 0), points.length - 1);
    const p = points[i];
    const first = points[0].seconds;
    const rows: TipRow[] = [
      { color, label: 'Tiempo', value: formatDuration(p.seconds) },
      { label: 'Posición', value: p.total > 0 ? `#${p.rank} / ${p.total}` : `#${p.rank}` },
    ];
    if (i > 0) {
      const delta = p.seconds - first;
      rows.push({ label: 'Desde la primera', value: `${delta >= 0 ? '+' : '−'}${formatDuration(Math.abs(delta))}` });
    }
    setHover(i);
    setTip({ x: xOf(i) * scale, y: py, flip, title: p.fullLabel, rows });
  };

  const handleLeave = () => {
    setTip(null);
    setHover(null);
  };

  return (
    <ChartFrame tip={tip}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        role="img"
        aria-label="Progresión de los tiempos"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} y1={yOf(t)} x2={W - PAD_R} y2={yOf(t)} stroke={theme.palette.divider} strokeWidth="1" strokeDasharray="3 4" />
            <text x={PAD_L - 8} y={yOf(t) + 4} textAnchor="end" fill={theme.palette.text.secondary} fontSize="11" fontFamily="monospace">
              {formatDuration(t)}
            </text>
          </g>
        ))}
        {hover !== null && (
          <line x1={xOf(hover)} y1={TOP} x2={xOf(hover)} y2={BOTTOM} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
        )}
        <polyline
          points={points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.seconds).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yOf(p.seconds)}
            r={hover === i ? 5.5 : 3.5}
            fill={theme.palette.background.paper}
            stroke={color}
            strokeWidth="2"
          />
        ))}
        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text
              key={p.label + i}
              x={xOf(i)}
              y={BOTTOM + 18}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              fill={hover === i ? color : theme.palette.text.secondary}
              fontSize="11"
            >
              {p.label}
            </text>
          ) : null,
        )}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </Box>
    </ChartFrame>
  );
}

/** Leyenda compartida por los gráficos multi-atleta. */
export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
      {series.map((s) => (
        <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {s.name}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
