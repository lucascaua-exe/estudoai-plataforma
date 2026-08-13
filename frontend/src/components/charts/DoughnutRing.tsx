import { useMemo } from 'react'
import { ArcElement, Chart as ChartJS, Legend, Tooltip, type ChartOptions } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

type Slice = { label: string; value: number; color: string }

type DoughnutRingProps = {
  slices: Slice[]
  centerLabel?: string
  centerValue?: string
}

export function DoughnutRing({ slices, centerLabel, centerValue }: DoughnutRingProps) {
  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => s.color),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [slices],
  )

  const options: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 999,
            useBorderRadius: true,
            padding: 14,
            color: 'var(--muted-foreground)',
            font: { size: 12, family: 'Source Sans 3, sans-serif' },
          },
        },
        tooltip: {
          backgroundColor: 'var(--card)',
          titleColor: 'var(--foreground)',
          bodyColor: 'var(--foreground)',
          borderColor: 'var(--border)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
        },
      },
      animation: {
        animateRotate: true,
        duration: 700,
      },
    }),
    [],
  )

  return (
    <div className="relative h-full w-full">
      <Doughnut data={data} options={options} />
      {centerValue || centerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          {centerValue ? (
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {centerValue}
            </p>
          ) : null}
          {centerLabel ? (
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {centerLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
