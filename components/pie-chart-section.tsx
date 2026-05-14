"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PieChartSectionProps {
  counts: { IJH: number; SCH: number; EWH: number }
}

const FILL_COLORS = {
  인제대: "oklch(0.55 0.18 250)",
  이대목동: "oklch(0.62 0.17 170)",
  순천향: "oklch(0.65 0.20 30)",
}

// data & total computed inside component

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: {
      fill: string
    }
  }>
  total: number
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0"
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: data.payload.fill }}
        />
        <span className="text-muted-foreground">{data.name}:</span>
        <span className="font-semibold text-card-foreground">
          {data.value}명 ({pct}%)
        </span>
      </div>
    </div>
  )
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: CustomLabelProps) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const labelY = y - 8
  return (
    <text
      x={x}
      y={labelY}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      className="text-xs font-semibold"
    >
      <tspan x={x} dy="-0.1em">{name}</tspan>
      <tspan x={x} dy="1.15em">{(percent * 100).toFixed(0)}%</tspan>
    </text>
  )
}

function CustomLegend({ allData, total }: { allData: { name: string; value: number; fill: string }[]; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 pt-4">
      {allData.map((entry) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"
        return (
          <div key={entry.name} className="flex min-w-0 items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="whitespace-nowrap text-muted-foreground">{entry.name}</span>
            <span className="font-semibold text-card-foreground">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export function PieChartSection({ counts }: PieChartSectionProps) {
  const allData = [
    { name: "인제대", value: counts.IJH, fill: FILL_COLORS.인제대 },
    { name: "이대목동", value: counts.EWH, fill: FILL_COLORS.이대목동 },
    { name: "순천향", value: counts.SCH, fill: FILL_COLORS.순천향 },
  ]
  const pieData = allData.filter((item) => item.value > 0)
  const total = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-card-foreground">등록 대상자 비율</CardTitle>
        <CardDescription>병원별 등록 대상자 수가 차지하는 비율 비교</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[380px] w-full">
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">표시할 데이터가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="44%"
                  innerRadius={70}
                  outerRadius={112}
                  paddingAngle={0}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                  strokeWidth={0}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip total={total} />} />
                <Legend content={<CustomLegend allData={allData} total={total} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
