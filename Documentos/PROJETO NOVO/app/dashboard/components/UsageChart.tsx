'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type UsageChartProps = {
  data: { date: string; minutesConsumed: number }[]
}

export function UsageChart({ data }: UsageChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  const hasData = data.some((d) => d.minutesConsumed > 0)

  return (
    <div className="ta-card" style={{ padding: '1.25rem 1.5rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
        Uso — últimos 30 dias
      </p>
      {!hasData ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
          Nenhum processamento nos últimos 30 dias
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-2)' }}
              itemStyle={{ color: 'var(--accent)' }}
              formatter={(val: any) => [`${Number(val).toFixed(1)} min`, 'Consumo']}
            />
            <Bar dataKey="minutesConsumed" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {formatted.map((_, i) => (
                <Cell key={i} fill="var(--accent)" fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
