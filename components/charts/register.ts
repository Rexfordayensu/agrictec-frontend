import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Module side effect: runs once, the first time any chart is imported.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

// Canvas text can't use CSS variables, so read the Inter family that next/font registered.
if (typeof document !== 'undefined') {
  const inter = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim();
  if (inter) ChartJS.defaults.font.family = `${inter}, system-ui, sans-serif`;
}
