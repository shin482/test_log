"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"

interface Counts {
  IJH: number
  SCH: number
  EWH: number
}

interface PeriodData {
  period: string
  IJH: number
  SCH: number
  EWH: number
}

interface SummaryTableProps {
  counts: Counts
  monthData: PeriodData[]
}

export function SummaryTable({ counts, monthData }: SummaryTableProps) {
  // last two months for comparison
  const len = monthData.length
  const thisMonth = len > 0 ? monthData[len - 1] : { IJH: 0, SCH: 0, EWH: 0, period: "" }
  const lastMonth = len > 1 ? monthData[len - 2] : { IJH: 0, SCH: 0, EWH: 0, period: "" }
  const total = counts.IJH + counts.SCH + counts.EWH

  const rows = [
    {
      hospital: "인제대학교병원",
      thisMonth: thisMonth.IJH,
      lastMonth: lastMonth.IJH,
      total: counts.IJH,
      ratio: total > 0 ? ((counts.IJH / total) * 100).toFixed(1) + "%" : "0%",
    },
    {
      hospital: "이대목동",
      thisMonth: thisMonth.EWH,
      lastMonth: lastMonth.EWH,
      total: counts.EWH,
      ratio: total > 0 ? ((counts.EWH / total) * 100).toFixed(1) + "%" : "0%",
    },
    {
      hospital: "순천향대학교병원",
      thisMonth: thisMonth.SCH,
      lastMonth: lastMonth.SCH,
      total: counts.SCH,
      ratio: total > 0 ? ((counts.SCH / total) * 100).toFixed(1) + "%" : "0%",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-card-foreground">병원별 등록 현황 요약</CardTitle>
        <CardDescription>최근 월간 등록 현황 및 누적 데이터</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">병원명</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">이번 달</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">지난 달</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">증감</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">누적 합계</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">비율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const diff = row.thisMonth - row.lastMonth
                const pctChange = ((diff / (row.lastMonth || 1)) * 100).toFixed(1)
                const pctDisplay = Math.abs(Number(pctChange)).toFixed(1)
                const trend = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral"
                return (
                  <tr key={row.hospital} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3.5 font-medium text-card-foreground">{row.hospital}</td>
                    <td className="px-4 py-3.5 text-right text-card-foreground font-semibold">{row.thisMonth}명</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground">{row.lastMonth}명</td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          trend === "positive"
                            ? "bg-accent/15 text-accent"
                            : trend === "negative"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-slate-200/70 text-slate-600"
                        }`}
                      >
                        {trend === "positive" ? (
                          <TrendingUp className="mr-1 h-3.5 w-3.5" />
                        ) : trend === "negative" ? (
                          <TrendingDown className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <Minus className="mr-1 h-3.5 w-3.5" />
                        )}
                        {trend === "neutral" ? "0" : pctDisplay}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-card-foreground font-semibold">{row.total}명</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground">{row.ratio}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
