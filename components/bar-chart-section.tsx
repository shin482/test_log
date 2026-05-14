"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface BarChartSectionProps {
  counts: { IJH: number; SCH: number; EWH: number }
}

// color mapping remains constant
const FILL_COLORS = {
  인제대: "oklch(0.55 0.18 250)",
  이대목동: "oklch(0.62 0.17 170)",
  순천향: "oklch(0.65 0.20 30)",
}

// data will be constructed in component

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      name: string
      fill: string
    }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: data.payload.fill }}
        />
        <span className="text-muted-foreground">{data.payload.name}:</span>
        <span className="font-semibold text-card-foreground">{data.value}명</span>
      </div>
    </div>
  )
}

export function BarChartSection({ counts }: BarChartSectionProps) {
  const barData = [
    { name: "인제대", total: counts.IJH, fill: FILL_COLORS.인제대 },
    { name: "이대목동", total: counts.EWH, fill: FILL_COLORS.이대목동 },
    { name: "순천향", total: counts.SCH, fill: FILL_COLORS.순천향 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-card-foreground">병원별 총 대상자 비교</CardTitle>
        <CardDescription>병원별 누적 등록 대상자 수 비교</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 13, fontWeight: 500 }}
                axisLine={{ stroke: "oklch(0.91 0.01 250)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.50 0.02 250)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.91 0.01 250)" }}
                tickLine={false}
                unit="명"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.96 0.008 250)" }} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={80}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
