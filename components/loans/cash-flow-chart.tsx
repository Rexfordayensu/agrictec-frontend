'use client';

import '@/components/charts/register';
import {
  BarController,
  Chart as ChartJS,
  LineController,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { formatTransactionMoney } from '@/lib/transactions';
import type { FinancialSummary } from '@/types/financial';

ChartJS.register(BarController, LineController);

/** The server's monthly totals; Number is used only for drawing the chart. */
export function CashFlowChart({ summary }: { summary: FinancialSummary }) {
  const { baseOptions } = useChartTheme();
  const rows = summary.monthly;
  const data: ChartData<'bar' | 'line'> = {
    labels: rows.map((r) =>
      new Date(`${r.month}-01T00:00:00Z`).toLocaleDateString('en-GH', {
        month: 'short',
        timeZone: 'UTC',
      }),
    ),
    datasets: [
      {
        type: 'bar',
        label: 'Income',
        data: rows.map((r) => Number(r.income)),
        backgroundColor: '#087c74',
        borderRadius: 3,
        maxBarThickness: 22,
        order: 2,
      },
      {
        type: 'bar',
        label: 'Expenses',
        data: rows.map((r) => Number(r.expenses)),
        backgroundColor: '#96df8c',
        borderRadius: 3,
        maxBarThickness: 22,
        order: 2,
      },
      {
        type: 'line',
        label: 'Net cash flow',
        data: rows.map((r) => Number(r.net)),
        borderColor: '#009d6a',
        backgroundColor: '#ffffff',
        pointRadius: 3.5,
        pointBorderWidth: 2,
        borderWidth: 2.5,
        tension: 0.25,
        order: 1,
      },
    ],
  };
  const options: ChartOptions<'bar' | 'line'> = {
    ...baseOptions,
    maintainAspectRatio: false,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ...baseOptions.scales.x, grid: { display: false }, border: { display: false } },
      y: {
        ...baseOptions.scales.y,
        beginAtZero: true,
        suggestedMax: rows.every((r) => Number(r.income) === 0 && Number(r.expenses) === 0)
          ? 100
          : undefined,
        border: { display: false },
      },
    },
  };
  return (
    <>
      <div className="loans-cash-chart">
        <Chart
          type="bar"
          data={data}
          options={options}
          role="img"
          aria-label="Monthly recorded income, expenses and net cash flow in Ghana cedis"
        />
      </div>
      <details className="loans-chart-data">
        <summary>View monthly figures</summary>
        <div className="overflow-x-auto">
          <table>
            <caption className="sr-only">Recorded monthly cash flow in Ghana cedis</caption>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month}>
                  <th>{r.month}</th>
                  <td>{formatTransactionMoney(r.income)}</td>
                  <td>{formatTransactionMoney(r.expenses)}</td>
                  <td>{formatTransactionMoney(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
