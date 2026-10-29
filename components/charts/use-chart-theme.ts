import { useSyncExternalStore } from 'react';

const FONT_SIZE = 11;

export interface ChartPalette {
  accent: string;
  danger: string;
  info: string;
  purple: string;
  gold: string;
  warning: string;
}

export interface ChartTheme {
  textColor: string;
  gridColor: string;
  palette: ChartPalette;
  baseOptions: {
    responsive: true;
    maintainAspectRatio: true;
    animation: { duration: number };
    plugins: {
      legend: { labels: { color: string; font: { size: number }; boxWidth: number } };
      tooltip: { titleFont: { size: number }; bodyFont: { size: number } };
    };
    scales: {
      x: { ticks: { color: string; font: { size: number } }; grid: { color: string } };
      y: { ticks: { color: string; font: { size: number } }; grid: { color: string } };
    };
  };
}

// Dark-theme values, used during server rendering before CSS variables can be read.
const FALLBACK = {
  textColor: '#a8b0c0',
  gridColor: 'rgba(255, 255, 255, 0.12)',
  palette: {
    accent: '#10b981',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#a855f7',
    gold: '#f5c451',
    warning: '#f59e0b',
  },
};

/**
 * Subscribe to the data-theme attribute that next-themes writes on <html>.
 * Watching the attribute (rather than resolvedTheme) guarantees the new CSS variables
 * are already applied when the colours are read.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

const getTheme = () => document.documentElement.getAttribute('data-theme') ?? 'dark';
const getServerTheme = () => 'server';

function readColors(theme: string): Pick<ChartTheme, 'textColor' | 'gridColor' | 'palette'> {
  if (theme === 'server') return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    textColor: read('--text-dim', FALLBACK.textColor),
    gridColor: read('--border', FALLBACK.gridColor),
    palette: {
      accent: read('--accent', FALLBACK.palette.accent),
      danger: read('--danger', FALLBACK.palette.danger),
      info: read('--info', FALLBACK.palette.info),
      purple: read('--purple', FALLBACK.palette.purple),
      gold: read('--gold', FALLBACK.palette.gold),
      warning: read('--warning', FALLBACK.palette.warning),
    },
  };
}

/** Chart colours that follow the active theme and update when it changes. */
export function useChartTheme(): ChartTheme {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const { textColor, gridColor, palette } = readColors(theme);
  const axis = {
    ticks: { color: textColor, font: { size: FONT_SIZE } },
    grid: { color: gridColor },
  };

  return {
    textColor,
    gridColor,
    palette,
    baseOptions: {
      responsive: true,
      maintainAspectRatio: true,
      // Half the 1s default: each animation frame redraws the chart, which competes with
      // the rest of the page on arrival.
      animation: { duration: 500 },
      plugins: {
        legend: { labels: { color: textColor, font: { size: FONT_SIZE }, boxWidth: 12 } },
        tooltip: { titleFont: { size: FONT_SIZE + 1 }, bodyFont: { size: FONT_SIZE } },
      },
      scales: { x: axis, y: axis },
    },
  };
}

/** Adds transparency to a hex colour (#rgb or #rrggbb). Other formats are returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return color;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
