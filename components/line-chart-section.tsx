"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PeriodEntry {
  period: string
  IJH: number
  SCH: number
  EWH: number
}

const COLORS = {
  인제대: "oklch(0.55 0.18 250)",
  이대목동: "oklch(0.62 0.17 170)",
  순천향: "oklch(0.65 0.20 30)",
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-sm font-semibold text-card-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-card-foreground">{entry.value}명</span>
        </div>
      ))}
    </div>
  )
}

interface LineChartSectionProps {
  weekData: PeriodEntry[]
}

function formatWeekLabel(date: Date) {
  const end = new Date(date)
  end.setDate(end.getDate() + 4)
  return `${date.getMonth() + 1}/${date.getDate()}~${end.getMonth() + 1}/${end.getDate()}`
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function LineChartSection({ weekData }: LineChartSectionProps) {
  const chartData = useMemo(() => {
    const sortedRows = weekData
      .map((entry) => {
        const start = new Date(entry.period)
        if (Number.isNaN(start.getTime())) return null
        start.setHours(0, 0, 0, 0)
        return { start, ...entry }
      })
      .filter((entry): entry is { start: Date } & PeriodEntry => Boolean(entry))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    if (sortedRows.length === 0) return []

    const weekMap = new Map<string, PeriodEntry>()
    for (const row of sortedRows) {
      weekMap.set(toDateKey(row.start), row)
    }

    const first = new Date(sortedRows[0].start)
    const last = new Date(sortedRows[sortedRows.length - 1].start)
    const filled: Array<{ period: string; 인제대: number; 이대목동: number; 순천향: number; sortKey: number }> = []

    for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
      const key = toDateKey(cursor)
      const row = weekMap.get(key)
      filled.push({
        period: formatWeekLabel(cursor),
        인제대: row?.IJH ?? 0,
        이대목동: row?.EWH ?? 0,
        순천향: row?.SCH ?? 0,
        sortKey: cursor.getTime(),
      })
    }

    return filled.sort((a, b) => a.sortKey - b.sortKey)
  }, [weekData])

  const activeSeries = useMemo(() => {
    const hasIJH = chartData.some((item) => item.인제대 > 0)
    const hasEWH = chartData.some((item) => item.이대목동 > 0)
    const hasSCH = chartData.some((item) => item.순천향 > 0)
    return [
      hasIJH ? { key: "인제대", color: COLORS.인제대 } : null,
      hasEWH ? { key: "이대목동", color: COLORS.이대목동 } : null,
      hasSCH ? { key: "순천향", color: COLORS.순천향 } : null,
    ].filter((item): item is { key: "인제대" | "이대목동" | "순천향"; color: string } => Boolean(item))
  }, [chartData])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg text-card-foreground">대상자 등록 추이(주 별)</CardTitle>
          <CardDescription>인제대, 이대목동, 순천향 주별 등록 대상자</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.91 0.01 250)" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.91 0.01 250)" }}
                tickLine={false}
                unit="명"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "13px" }}
              />
              {activeSeries.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: series.color, strokeWidth: 2, stroke: "#fff" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
