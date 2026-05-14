"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Target } from "lucide-react"

interface GoalProgressProps {
  counts: { IJH: number; SCH: number; EWH: number }
}

const GOAL = 300

const FILL_COLORS = {
  인제대: "oklch(0.55 0.18 250)",
  이대목동: "oklch(0.62 0.17 170)",
  순천향: "oklch(0.65 0.20 30)",
}

// calculations moved into component

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => {
          if (entry.value === 0) return null
          return (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-card-foreground">{entry.value}명</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GoalProgress({ counts }: GoalProgressProps) {
  const hospitalData = [
    { name: "인제대", value: counts.IJH, fill: FILL_COLORS.인제대 },
    { name: "이대목동", value: counts.EWH, fill: FILL_COLORS.이대목동 },
    { name: "순천향", value: counts.SCH, fill: FILL_COLORS.순천향 },
  ]

  const totalRegistered = hospitalData.reduce((sum, d) => sum + d.value, 0)
  const remaining = Math.max(0, GOAL - totalRegistered)
  const achievementRate = Math.min((totalRegistered / GOAL) * 100, 100)

  const stackedData = [
    {
      name: "달성 현황",
      인제대: hospitalData[0].value,
      이대목동: hospitalData[1].value,
      순천향: hospitalData[2].value,
      남은목표: remaining,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-card-foreground">목표 달성 현황</CardTitle>
              <CardDescription>
                총 목표 {GOAL}명 대비 현재 등록 현황
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-card-foreground">
                {totalRegistered.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/ {GOAL}명</span>
            </div>
            <div className="rounded-lg bg-accent/15 px-2.5 py-1 text-sm font-semibold text-accent">
              {achievementRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-16 w-full sm:h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              barCategoryGap={0}
            >
              <XAxis
                type="number"
                domain={[0, Math.max(GOAL, totalRegistered)]}
                hide
              />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
              />
              <Bar
                dataKey="인제대"
                stackId="goal"
                fill={hospitalData[0].fill}
                radius={[8, 0, 0, 8]}
                barSize={40}
              >
                <LabelList
                  dataKey="인제대"
                  position="center"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v: number) => `${v}`}
                />
              </Bar>
              <Bar
                dataKey="이대목동"
                stackId="goal"
                fill={hospitalData[1].fill}
                radius={[0, 0, 0, 0]}
                barSize={40}
              >
                <LabelList
                  dataKey="이대목동"
                  position="center"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v: number) => `${v}`}
                />
              </Bar>
              <Bar
                dataKey="순천향"
                stackId="goal"
                fill={hospitalData[2].fill}
                radius={remaining > 0 ? [0, 0, 0, 0] : [0, 8, 8, 0]}
                barSize={40}
              >
                <LabelList
                  dataKey="순천향"
                  position="center"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v: number) => `${v}`}
                />
              </Bar>
              {remaining > 0 && (
                <Bar
                  dataKey="남은목표"
                  stackId="goal"
                  fill="oklch(0.87 0.01 250)"
                  radius={[0, 8, 8, 0]}
                  barSize={40}
                >
                  <LabelList
                    dataKey="남은목표"
                    position="center"
                    fill="oklch(0.50 0.02 250)"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(v: number) => `${v}`}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
          {hospitalData.map((h) => (
            <div key={h.name} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: h.fill }}
              />
              <span className="text-muted-foreground">{h.name}</span>
              <span className="font-semibold text-card-foreground">{h.value}명</span>
            </div>
          ))}
          {remaining > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: "oklch(0.87 0.01 250)" }}
              />
              <span className="text-muted-foreground">남은 목표</span>
              <span className="font-semibold text-card-foreground">{remaining}명</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
