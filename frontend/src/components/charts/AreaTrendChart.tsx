import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion'

const STROKE = '#2563EB'

type Point = {
  data: string
  percentual: number
  total?: number
  acertos?: number
}

type AreaTrendChartProps = {
  data: Point[]
  gradientId?: string
}

export function AreaTrendChart({ data, gradientId = 'dashTrendFill' }: AreaTrendChartProps) {
  const reduce = useReducedMotionPreference()

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STROKE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={STROKE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(5) : v)}
          dy={6}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          cursor={{ stroke: STROKE, strokeOpacity: 0.25, strokeWidth: 1 }}
          content={
            <ChartTooltip formatter={(v) => `${v}%`} labelFormatter={(l) => `Dia ${l}`} />
          }
        />
        <Area
          type="monotone"
          dataKey="percentual"
          name="Acerto"
          stroke={STROKE}
          fill={`url(#${gradientId})`}
          strokeWidth={2.25}
          animationDuration={reduce ? 0 : 800}
          isAnimationActive={!reduce}
          activeDot={
            reduce
              ? false
              : { r: 4.5, strokeWidth: 2, stroke: '#fff', fill: STROKE }
          }
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
