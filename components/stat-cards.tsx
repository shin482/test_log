"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Users, Building2, CalendarCheck, UserX, CheckCircle2 } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  color?: string // optional tailwind bg class
  compact?: boolean
  isOngoingDeltaCard?: boolean
  ongoingDeltaMeta?: {
    delta: number
    newlyRegisteredCount: number
    withdrawnCount: number
    completedCount: number
  }
}

interface StatCardsProps {
  counts: { IJH: number; SCH: number; EWH: number; todayCount?: number; weekCount?: number }
  summary?: { total: number; ongoing: number; withdrawn: number; completed: number }
  summaryChanges?: { total: number; ongoing: number; withdrawn: number; completed: number }
  ongoingDeltaMeta?: { delta: number; newlyRegisteredCount: number; withdrawnCount: number; completedCount: number }
  hospitalChanges?: { IJH: number; SCH: number; EWH: number }
  onHospitalClick?: (site: "IJH" | "EWH" | "SCH") => void
  variant?: "all" | "hospital" | "summary"
}

function StatCard({ title, value, change = 0, icon, color, compact = false, isOngoingDeltaCard = false, ongoingDeltaMeta }: StatCardProps) {
  const trend = change > 0 ? "positive" : change < 0 ? "negative" : "neutral"
  const displayValue = Math.abs(change)
  const changeText = Number.isInteger(displayValue) ? String(displayValue) : displayValue.toFixed(1)

  // allow overriding card background (hospital coloring)
  const cardClasses = ["relative overflow-hidden min-w-[200px]"]
  if (color) cardClasses.push(color)

  return (
    <Card className={cardClasses.join(" ")}>
      <CardContent className={compact ? "flex min-h-[90px] items-center gap-3 px-4 py-3" : "flex items-center gap-4 pt-0"}>
        <div className={compact ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"}>
          {icon}
        </div>
        {isOngoingDeltaCard ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className={compact ? "text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" : "text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"}>{title}</p>
              <p className="text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
            </div>
            <div className="relative ml-auto flex w-[92px] shrink-0 flex-col items-end gap-1 text-[11px] font-semibold leading-none">
              <span className="absolute -top-3 right-0 whitespace-nowrap text-[10px] font-normal text-muted-foreground/80">최근 주 기준 누적</span>
              <span className="inline-flex min-w-[78px] justify-between rounded-md bg-emerald-100 px-1.5 py-1 text-emerald-700">
                <span>신규</span>
                <span>{ongoingDeltaMeta?.newlyRegisteredCount ?? 0}명</span>
              </span>
              <span className="inline-flex min-w-[78px] justify-between rounded-md bg-amber-100 px-1.5 py-1 text-amber-700">
                <span>탈락</span>
                <span>{ongoingDeltaMeta?.withdrawnCount ?? 0}명</span>
              </span>
              <span className="inline-flex min-w-[78px] justify-between rounded-md bg-red-100 px-1.5 py-1 text-red-700">
                <span>종료</span>
                <span>{ongoingDeltaMeta?.completedCount ?? 0}명</span>
              </span>
            </div>
          </>
        ) : compact ? (
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_92px] grid-rows-[auto_auto] items-center">
            <p className="col-start-1 row-start-1 text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
            <p className="col-start-1 row-start-2 text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
            <div
              className={`col-start-2 row-start-2 ml-auto flex w-[92px] items-center justify-center gap-1 translate-y-[-5px] rounded-lg px-1.5 py-0.5 text-xs font-semibold ${
                trend === "positive"
                  ? "bg-accent/15 text-accent"
                  : trend === "negative"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {trend === "positive" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : trend === "negative" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span>{changeText}%</span>
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
              <p className="text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
            </div>
            <div
              className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ${
                trend === "positive"
                  ? "bg-accent/15 text-accent"
                  : trend === "negative"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {trend === "positive" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : trend === "negative" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span>{changeText}%</span>
            </div>
          </>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/10" />
    </Card>
  )
}

export function StatCards({ counts, summary, summaryChanges, ongoingDeltaMeta, hospitalChanges, onHospitalClick, variant = "all" }: StatCardsProps) {
  const total = counts.IJH + counts.SCH + counts.EWH
  const summaryStats = summary ?? { total: 0, ongoing: 0, withdrawn: 0, completed: 0 }
  const summaryCards: StatCardProps[] = [
    {
      title: "전체 등록 대상자",
      value: (summary?.total ?? total).toLocaleString(),
      change: summaryChanges?.total ?? 0,
      icon: <Users className="h-5 w-5" />,
      compact: true,
    },
    {
      title: "진행 중 대상자",
      value: summaryStats.ongoing.toLocaleString(),
      change: summaryChanges?.ongoing ?? 0,
      icon: <CalendarCheck className="h-5 w-5" />,
      compact: true,
      isOngoingDeltaCard: true,
      ongoingDeltaMeta,
    },
    {
      title: "중도탈락 대상자",
      value: summaryStats.withdrawn.toLocaleString(),
      change: summaryChanges?.withdrawn ?? 0,
      icon: <UserX className="h-5 w-5" />,
      compact: true,
    },
    {
      title: "연구종료 대상자",
      value: summaryStats.completed.toLocaleString(),
      change: summaryChanges?.completed ?? 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      compact: true,
    },
  ]

  const hospitalCards: StatCardProps[] = [
    {
      title: "인제대학교병원",
      value: counts.IJH.toLocaleString(),
      change: hospitalChanges?.IJH ?? 0,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-blue-50",
    },
    {
      title: "이대목동 병원",
      value: counts.EWH.toLocaleString(),
      change: hospitalChanges?.EWH ?? 0,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-green-50",
    },
    {
      title: "순천향대학교병원",
      value: counts.SCH.toLocaleString(),
      change: hospitalChanges?.SCH ?? 0,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-red-50",
    },
  ]

  const statsData = variant === "hospital" ? hospitalCards : variant === "summary" ? summaryCards : [...summaryCards, ...hospitalCards]
  const gridClassName =
    variant === "hospital"
      ? "grid grid-cols-1 gap-4 md:grid-cols-3"
      : variant === "summary"
      ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"

  return (
    <div className={gridClassName}>
      {statsData.map((stat) => {
        const site = stat.title.includes("인제") ? "IJH" : stat.title.includes("이대") ? "EWH" : stat.title.includes("순천향") ? "SCH" : null
        const clickable = Boolean(site && onHospitalClick)
        if (!clickable) {
          return <StatCard key={stat.title} {...stat} />
        }

        return (
          <button
            key={stat.title}
            onClick={() => onHospitalClick?.(site as "IJH" | "EWH" | "SCH")}
            className="cursor-pointer text-left transition hover:-translate-y-0.5"
          >
            <StatCard {...stat} />
          </button>
        )
      })}
    </div>
  )
}
