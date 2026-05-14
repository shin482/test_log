"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowLeft, Building2, CalendarCheck2, CalendarClock, CalendarDays, ChevronDown, Footprints, Search, TriangleAlert, UserX, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GoalProgress } from "@/components/goal-progress";
import { StatCards } from "@/components/stat-cards";
import { LineChartSection } from "@/components/line-chart-section";
import { BarChartSection } from "@/components/bar-chart-section";
import { PieChartSection } from "@/components/pie-chart-section";
import { SummaryTable } from "@/components/summary-table";
import { IWRSButton } from "@/components/iwrs-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SiteCode = "IJH" | "EWH" | "SCH";

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type SubjectStatus = "ongoing" | "withdrawn" | "completed";

interface Counts {
  IJH: number;
  SCH: number;
  EWH: number;
  todayCount?: number;
  weekCount?: number;
}

interface SubjectRecord {
  subject_id: string;
  baseline: string;
  fu1: string;
  fu2: string;
  fu3: string;
  fu4: string;
  status: SubjectStatus;
  statusText: string;
  eos_date: string;
  end_reason: string;
}

interface FuItem {
  subject_id: string;
  next_fu: string;
  days_to_fu: number;
  status: string;
  staff: string;
  remark: string;
}

interface HospitalSummary {
  total: number;
  ongoing: number;
  withdrawn: number;
  completed: number;
}

interface HospitalDashboard {
  summary: HospitalSummary;
  upcomingFu: FuItem[];
  delayedFu: FuItem[];
  subjects: SubjectRecord[];
  monthlyTrend: Array<{ period: string; count: number }>;
  staffStats: Array<{ staff: string; count: number }>;
  withdrawReasonStats: Array<{ reason: string; count: number }>;
}

interface DashboardData {
  overall: {
    summary: HospitalSummary;
    hospitalCounts: Record<SiteCode, number>;
    monthlyTrend: Array<{ period: string; IJH: number; EWH: number; SCH: number }>;
    withdrawReasonStats: Array<{ reason: string; count: number }>;
  };
  hospitals: Record<SiteCode, HospitalDashboard>;
}

interface ApiPayload {
  ok: boolean;
  counts: Counts;
  monthData: Array<{ period: string; IJH: number; EWH: number; SCH: number }>;
  weekData: Array<{ period: string; IJH: number; EWH: number; SCH: number }>;
  dashboard: DashboardData;
}

interface SummaryChangeSet {
  total: number;
  ongoing: number;
  withdrawn: number;
  completed: number;
}

interface SummaryCountSet {
  total: number;
  ongoing: number;
  withdrawn: number;
  completed: number;
}

interface OngoingDeltaMeta {
  delta: number;
  newlyRegisteredCount: number;
  withdrawnCount: number;
  completedCount: number;
}

function normalizeApiPayload(input: any): ApiPayload | null {
  if (!input || typeof input !== "object") return null;

  const safeCounts = input.counts ?? {};
  const monthData = Array.isArray(input.monthData) ? input.monthData : [];
  const weekData = Array.isArray(input.weekData) ? input.weekData : [];
  const dashboard = input.dashboard ?? {};
  const hospitals = dashboard.hospitals ?? {};
  const overall = dashboard.overall ?? {};

  const normalizeHospitalDashboard = (hospital: any): HospitalDashboard => ({
    summary: {
      total: Number(hospital?.summary?.total ?? 0),
      ongoing: Number(hospital?.summary?.ongoing ?? 0),
      withdrawn: Number(hospital?.summary?.withdrawn ?? 0),
      completed: Number(hospital?.summary?.completed ?? 0),
    },
    upcomingFu: Array.isArray(hospital?.upcomingFu)
      ? hospital.upcomingFu.map((item: any) => ({
          subject_id: String(item?.subject_id ?? ""),
          next_fu: String(item?.next_fu ?? ""),
          days_to_fu: Number(item?.days_to_fu ?? 0),
          status: String(item?.status ?? ""),
          staff: String(item?.staff ?? ""),
          remark: String(item?.remark ?? ""),
        }))
      : [],
    delayedFu: Array.isArray(hospital?.delayedFu)
      ? hospital.delayedFu.map((item: any) => ({
          subject_id: String(item?.subject_id ?? ""),
          next_fu: String(item?.next_fu ?? ""),
          days_to_fu: Number(item?.days_to_fu ?? 0),
          status: String(item?.status ?? ""),
          staff: String(item?.staff ?? ""),
          remark: String(item?.remark ?? ""),
        }))
      : [],
    subjects: Array.isArray(hospital?.subjects)
      ? hospital.subjects.map((subject: any) => ({
          subject_id: String(subject?.subject_id ?? ""),
          baseline: String(subject?.baseline ?? ""),
          fu1: String(subject?.fu1 ?? ""),
          fu2: String(subject?.fu2 ?? ""),
          fu3: String(subject?.fu3 ?? ""),
          fu4: String(subject?.fu4 ?? ""),
          status: subject?.status === "withdrawn" || subject?.status === "completed" ? subject.status : "ongoing",
          statusText: String(subject?.statusText ?? ""),
          eos_date: String(subject?.eos_date ?? ""),
          end_reason: String(subject?.end_reason ?? ""),
        }))
      : [],
    monthlyTrend: Array.isArray(hospital?.monthlyTrend)
      ? hospital.monthlyTrend.map((row: any) => ({
          period: String(row?.period ?? ""),
          count: Number(row?.count ?? 0),
        }))
      : [],
    staffStats: Array.isArray(hospital?.staffStats)
      ? hospital.staffStats.map((row: any) => ({
          staff: String(row?.staff ?? ""),
          count: Number(row?.count ?? 0),
        }))
      : [],
    withdrawReasonStats: Array.isArray(hospital?.withdrawReasonStats)
      ? hospital.withdrawReasonStats.map((row: any) => ({
          reason: String(row?.reason ?? ""),
          count: Number(row?.count ?? 0),
        }))
      : [],
  });

  return {
    ok: Boolean(input.ok),
    counts: {
      IJH: Number(safeCounts.IJH ?? 0),
      EWH: Number(safeCounts.EWH ?? 0),
      SCH: Number(safeCounts.SCH ?? 0),
      todayCount: Number(safeCounts.todayCount ?? 0),
      weekCount: Number(safeCounts.weekCount ?? 0),
    },
    monthData: monthData.map((row: any) => ({
      period: String(row?.period ?? ""),
      IJH: Number(row?.IJH ?? 0),
      EWH: Number(row?.EWH ?? 0),
      SCH: Number(row?.SCH ?? 0),
    })),
    weekData: weekData.map((row: any) => ({
      period: String(row?.period ?? ""),
      IJH: Number(row?.IJH ?? 0),
      EWH: Number(row?.EWH ?? 0),
      SCH: Number(row?.SCH ?? 0),
    })),
    dashboard: {
      overall: {
        summary: {
          total: Number(overall?.summary?.total ?? 0),
          ongoing: Number(overall?.summary?.ongoing ?? 0),
          withdrawn: Number(overall?.summary?.withdrawn ?? 0),
          completed: Number(overall?.summary?.completed ?? 0),
        },
        hospitalCounts: {
          IJH: Number(overall?.hospitalCounts?.IJH ?? 0),
          EWH: Number(overall?.hospitalCounts?.EWH ?? 0),
          SCH: Number(overall?.hospitalCounts?.SCH ?? 0),
        },
        monthlyTrend: monthData.map((row: any) => ({
          period: String(row?.period ?? ""),
          IJH: Number(row?.IJH ?? 0),
          EWH: Number(row?.EWH ?? 0),
          SCH: Number(row?.SCH ?? 0),
        })),
        withdrawReasonStats: Array.isArray(overall?.withdrawReasonStats) ? overall.withdrawReasonStats : [],
      },
      hospitals: {
        IJH: normalizeHospitalDashboard(hospitals.IJH),
        EWH: normalizeHospitalDashboard(hospitals.EWH),
        SCH: normalizeHospitalDashboard(hospitals.SCH),
      },
    },
  } as ApiPayload;
}

const SITE_META: Record<SiteCode, { name: string; color: string }> = {
  IJH: { name: "인제대학교병원", color: "#3b82f6" },
  EWH: { name: "이대목동", color: "#10b981" },
  SCH: { name: "순천향대학교병원", color: "#f97316" },
};

// 기관별 검진 요일 설정. 병원별 복수 요일 확장을 위해 배열로 유지.
const SITE_SCREENING_WEEKDAYS: Record<SiteCode, Weekday[]> = {
  IJH: [5], // 금요일
  EWH: [2], // 화요일
  SCH: [4], // 목요일
};

function getSubjectStatusBadge(status: SubjectStatus, statusText: string) {
  const normalized = normalizeIwrsStatusValue(statusText);
  if (normalized === "오류") {
    return { label: "오류", className: "border-red-200 bg-red-50 text-red-700" };
  }
  if (normalized === "중도탈락" || status === "withdrawn") {
    return { label: "중도탈락", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (normalized === "연구종료" || status === "completed") {
    return { label: "연구종료", className: "border-red-200 bg-red-50 text-red-700" };
  }
  return { label: "진행 중", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function DetailStatCard({
  title,
  value,
  icon,
  iconColorClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconColorClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-0">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value.toLocaleString()}명</p>
        </div>
        <div className={`rounded-xl p-3 ${iconColorClass}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function parseDateString(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/[./]/g, "-")
    .replace(/\s+/g, "")
    .replace(/T.*$/, "");
  const matched = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matched) {
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const localDate = new Date(year, month - 1, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  return null;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractSubjectOrder(subjectId: string) {
  const allNums = subjectId.match(/\d+/g);
  if (!allNums?.length) return Number.MAX_SAFE_INTEGER;
  const lastNum = allNums[allNums.length - 1];
  return Number(lastNum);
}

function getFuVisitLabel(raw: string) {
  const matched = raw?.match(/fu\s*#?\s*(\d+)/i);
  if (matched) return `fu#${matched[1]}`;
  return raw?.trim() ? raw : "fu#-";
}

function hasFuDate(value: string) {
  return Boolean(value && value.trim() && value !== "-");
}

function parseComparableDate(value: string) {
  if (!hasFuDate(value)) return null;
  const raw = String(value ?? "").trim();
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const matched = raw.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]) - 1;
  const day = Number(matched[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCompletedFuCount(subject: SubjectRecord) {
  const today = new Date();
  const visitDates = [subject.baseline, subject.fu1, subject.fu2, subject.fu3, subject.fu4]
    .map((value) => parseComparableDate(value))
    .filter((value): value is Date => Boolean(value));

  return visitDates.filter((date) => date.getTime() < today.getTime()).length;
}

function getSubjectBucket(subject: SubjectRecord) {
  const group = getIwrsStatusGroup(subject);
  if (group === "completed") return "연구종료";
  if (group === "withdrawn") return "중도탈락";
  if (group === "duplicate") return "중복";
  if (group === "error") return "오류";
  return "진행중";
}

function getProgressPercent(current: number, total = 5) {
  if (total <= 0) return 0;
  const value = Math.max(0, Math.min(total, current));
  return Math.round((value / total) * 100);
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const diff = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function calculateDisplayRateFromTotals(currentTotal: number, previousTotal: number) {
  if (previousTotal <= 0) return currentTotal <= 0 ? 0 : 100;
  const rate = (currentTotal / previousTotal) * 100;
  return Math.round(rate - 100);
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getIwrsStatusRaw(subject: SubjectRecord) {
  return String(subject.statusText ?? "").replace(/\s+/g, "").toLowerCase();
}

type IwrsStatusGroup = "ongoing" | "withdrawn" | "completed" | "duplicate" | "error";

function normalizeIwrsStatusValue(value: string) {
  const raw = String(value ?? "").replace(/\s+/g, "").toLowerCase();
  if (!raw) return "진행중";
  if (raw.includes("오류")) return "오류";
  if (raw.includes("중복")) return "중복";
  if (raw === "연구종료") return "연구종료";
  if (raw === "중도탈락") return "중도탈락";
  return "진행중";
}

function getIwrsStatusGroup(subject: SubjectRecord): IwrsStatusGroup {
  const normalized = normalizeIwrsStatusValue(subject.statusText);
  if (normalized === "오류") return "error";
  if (normalized === "중복") return "duplicate";
  if (normalized === "중도탈락") return "withdrawn";
  if (normalized === "연구종료") return "completed";
  return "ongoing";
}

function getIwrsStatusCategory(subject: SubjectRecord): SubjectStatus {
  const group = getIwrsStatusGroup(subject);
  if (group === "completed") return "completed";
  if (group === "withdrawn" || group === "duplicate") return "withdrawn";
  return "ongoing";
}

function getStatusEventDate(subject: SubjectRecord) {
  if (subject.status === "completed") {
    if (!subject.eos_date) return null;
    const eosDate = parseComparableDate(subject.eos_date);
    return eosDate;
  }
  if (subject.status === "withdrawn" && subject.eos_date) {
    const eosDate = parseComparableDate(subject.eos_date);
    if (eosDate) return eosDate;
  }
  const lastFuDate = getLastFuDate(subject);
  if (lastFuDate) return lastFuDate;
  return parseComparableDate(subject.baseline);
}

function normalizeWithdrawalReasonForMatch(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function mapWithdrawalReasonForDisplay(value: string): "의사철회" | "대상자 안전문제" | "프로토콜 위반" | null {
  const normalized = normalizeWithdrawalReasonForMatch(value);
  if (!normalized) return null;
  if (normalized.includes("의사철회")) return "의사철회";
  if (normalized.includes("대상자안전문제")) return "대상자 안전문제";
  if (normalized.includes("프로토콜위반")) return "프로토콜 위반";
  return null;
}

function isDateInRange(date: Date, start: Date, end: Date) {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function getLastFuDate(subject: SubjectRecord) {
  const fuDates = [subject.fu1, subject.fu2, subject.fu3, subject.fu4]
    .map((value) => parseComparableDate(value))
    .filter((value): value is Date => Boolean(value));
  if (!fuDates.length) return null;
  return fuDates.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest));
}

function getRecentFriday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRecentWeekday(referenceDate: Date, weekday: Weekday) {
  const d = new Date(referenceDate);
  const currentDay = d.getDay() as Weekday;
  const diff = (currentDay - weekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateSiteScheduledDayDelta(subjects: SubjectRecord[], weekdays: Weekday[], referenceDate: Date) {
  const comparisonDays = weekdays.map((weekday) => {
    const recentDay = getRecentWeekday(referenceDate, weekday);
    const previousDay = new Date(recentDay);
    previousDay.setDate(previousDay.getDate() - 7);

    return {
      weekday,
      currentDate: toDateKey(recentDay),
      previousDate: toDateKey(previousDay),
      currentBoundary: recentDay,
      previousBoundary: previousDay,
    };
  });

  const latestComparison = comparisonDays.sort((a, b) => a.currentBoundary.getTime() - b.currentBoundary.getTime()).at(-1);

  if (!latestComparison) {
    return {
      currentTotal: 0,
      previousTotal: 0,
      changeRate: 0,
      comparisonDays: [],
    };
  }

  const currentTotal = subjects.filter((subject) => {
      if (getIwrsStatusGroup(subject) === "error") return false;
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate) return false;
      return baselineDate.getTime() <= latestComparison.currentBoundary.getTime();
    }).length;

    const previousTotal = subjects.filter((subject) => {
      if (getIwrsStatusGroup(subject) === "error") return false;
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate) return false;
      return baselineDate.getTime() <= latestComparison.previousBoundary.getTime();
    }).length;

  return {
    currentTotal,
    previousTotal,
    changeRate: calculateDisplayRateFromTotals(currentTotal, previousTotal),
    comparisonDays: comparisonDays.map((day) => ({
      weekday: day.weekday,
      currentDate: day.currentDate,
      previousDate: day.previousDate,
    })),
  };
}

function determineStatusAtDate(subject: SubjectRecord, referenceDate: Date): SubjectStatus | null {
  const baselineDate = parseComparableDate(subject.baseline);
  if (!baselineDate || baselineDate.getTime() > referenceDate.getTime()) {
    return null;
  }

  if (getIwrsStatusGroup(subject) === "error") {
    return null;
  }

  return getIwrsStatusCategory(subject);
}

function FuScheduleCalendarCard({ rows }: { rows: FuItem[] }) {
  const validRows = useMemo(
    () =>
      rows
        .map((row) => ({ ...row, parsedDate: parseDateString(row.next_fu) }))
        .filter((row): row is FuItem & { parsedDate: Date } => Boolean(row.parsedDate))
        .sort((a, b) => {
          if (a.next_fu === b.next_fu) {
            return extractSubjectOrder(a.subject_id) - extractSubjectOrder(b.subject_id);
          }
          return a.next_fu.localeCompare(b.next_fu);
        }),
    [rows]
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!validRows.length) {
      setSelectedDate(undefined);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);
    const todayRow = validRows.find((row) => toDateKey(row.parsedDate) === todayKey);
    const defaultDate = todayRow?.parsedDate ?? today;

    if (!hasInitializedRef.current || !selectedDate || !validRows.some((row) => toDateKey(row.parsedDate) === toDateKey(selectedDate))) {
      setSelectedDate(defaultDate);
      hasInitializedRef.current = true;
    }
  }, [selectedDate, validRows]);

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of validRows) {
      const key = toDateKey(row.parsedDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [validRows]);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : "";
  const selectedDayRows = validRows
    .filter((row) => toDateKey(row.parsedDate) === selectedDateKey)
    .sort((a, b) => {
      const aOrder = extractSubjectOrder(a.subject_id);
      const bOrder = extractSubjectOrder(b.subject_id);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.subject_id.localeCompare(b.subject_id, undefined, { numeric: true, sensitivity: "base" });
    });

  const selectedDateLabel = selectedDate
    ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`
    : "날짜를 선택하세요";

  const defaultCalendarMonth = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>f/u 일정</CardTitle>
        <CardDescription>예정된 f/u 날짜 캘린더</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center rounded-xl border border-border/70 bg-background/50 p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            defaultMonth={defaultCalendarMonth}
            className="w-full"
            formatters={{
              formatDay: (date) => `${date.getDate()}`,
            }}
            components={{
              DayButton: ({ day, className, ...props }) => {
                const count = countsByDate.get(toDateKey(day.date)) ?? 0;
                return (
                  <CalendarDayButton {...props} day={day} className={`h-10 flex-col gap-0.5 py-1 ${className ?? ""}`}>
                    <span className="text-xs leading-none">{day.date.getDate()}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold leading-4 text-emerald-700">
                        {count}
                      </span>
                    )}
                  </CalendarDayButton>
                );
              },
            }}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-background/40 p-3">
          <p className="mb-2 text-sm font-semibold text-card-foreground">{selectedDateLabel}</p>
          <div className="space-y-1.5">
            {selectedDayRows.length === 0 && <p className="text-sm text-muted-foreground">선택된 날짜의 대상자 없음</p>}
            {selectedDayRows.map((row) => (
              <p key={`cal-${row.subject_id}-${row.next_fu}`} className="text-sm text-card-foreground">
                대상자 {row.subject_id} ({getFuVisitLabel(row.status)})
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FuTargetListCard({ rows }: { rows: FuItem[] }) {
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sortedRows = useMemo(
    () =>
      rows
        .filter((row) => {
          const parsed = parseDateString(row.next_fu);
          if (!parsed) return row.days_to_fu >= 0;
          return parsed.getTime() >= startOfToday.getTime();
        })
        .sort((a, b) => {
          const aDate = parseDateString(a.next_fu);
          const bDate = parseDateString(b.next_fu);
          if (aDate && bDate && aDate.getTime() !== bDate.getTime()) {
            return aDate.getTime() - bDate.getTime();
          }
          if (a.next_fu === b.next_fu) {
            return extractSubjectOrder(a.subject_id) - extractSubjectOrder(b.subject_id);
          }
          return a.next_fu.localeCompare(b.next_fu);
        }),
    [rows, startOfToday]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>이번 f/u 예정 대상자</CardTitle>
        <CardDescription>예정일 기준 대상자 목록</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {sortedRows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">대상자 없음</p>}
          {sortedRows.map((row) => (
            <div key={`fu-target-${row.subject_id}`} className="rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-card-foreground">{row.subject_id}</p>
                </div>
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                  D{row.days_to_fu > 0 ? `-${row.days_to_fu}` : row.days_to_fu === 0 ? "-day" : `+${Math.abs(row.days_to_fu)}`}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{row.next_fu || "-"}</span>
              </div>
              {row.remark && <p className="mt-1 text-xs text-muted-foreground">{row.remark}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EndReasonBarChart({ subjects, total }: { subjects: SubjectRecord[]; total: number }) {
  const withdrawnSubjects = subjects.filter((subject) => getIwrsStatusGroup(subject) === "withdrawn");

  const doctorWithdrawalIds: string[] = [];
  const safetyIssueIds: string[] = [];
  const protocolViolationIds: string[] = [];

  for (const subject of withdrawnSubjects) {
    const mappedReason = mapWithdrawalReasonForDisplay(subject.end_reason);
    if (mappedReason === "의사철회") doctorWithdrawalIds.push(subject.subject_id);
    if (mappedReason === "대상자 안전문제") safetyIssueIds.push(subject.subject_id);
    if (mappedReason === "프로토콜 위반") protocolViolationIds.push(subject.subject_id);
  }

  const doctorWithdrawalCount = doctorWithdrawalIds.length;
  const safetyIssueCount = safetyIssueIds.length;
  const protocolViolationCount = protocolViolationIds.length;

  const renderHoverList = (ids: string[]) => {
    if (!ids.length) return "해당 대상자 없음";
    return ids.join(", ");
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-slate-50/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">중도 탈락 사유</CardTitle>
        <CardDescription>탈락 사유별 요약</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <UiTooltip>
            <UiTooltipTrigger asChild>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">총 대상자</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{total}명</p>
              </div>
            </UiTooltipTrigger>
            <UiTooltipContent side="top" sideOffset={8} className="max-w-xs whitespace-normal text-left leading-relaxed">
              대상자: {renderHoverList(withdrawnSubjects.map((subject) => subject.subject_id))}
            </UiTooltipContent>
          </UiTooltip>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-cyan-700">의사철회</p>
                      <p className="mt-1 text-3xl font-bold text-cyan-900">{doctorWithdrawalCount}명</p>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 text-cyan-700 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </UiTooltipTrigger>
              <UiTooltipContent side="top" sideOffset={8} className="max-w-xs whitespace-normal text-left leading-relaxed">
                대상자: {renderHoverList(doctorWithdrawalIds)}
              </UiTooltipContent>
            </UiTooltip>

            <UiTooltip>
              <UiTooltipTrigger asChild>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-amber-700">대상자 안전문제</p>
                      <p className="mt-1 text-3xl font-bold text-amber-900">{safetyIssueCount}명</p>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 text-amber-700 shadow-sm">
                      <Footprints className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </UiTooltipTrigger>
              <UiTooltipContent side="top" sideOffset={8} className="max-w-xs whitespace-normal text-left leading-relaxed">
                대상자: {renderHoverList(safetyIssueIds)}
              </UiTooltipContent>
            </UiTooltip>

            <UiTooltip>
              <UiTooltipTrigger asChild>
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-rose-700">프로토콜 위반</p>
                      <p className="mt-1 text-3xl font-bold text-rose-900">{protocolViolationCount}명</p>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 text-rose-700 shadow-sm">
                      <TriangleAlert className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </UiTooltipTrigger>
              <UiTooltipContent side="top" sideOffset={8} className="max-w-xs whitespace-normal text-left leading-relaxed">
                대상자: {renderHoverList(protocolViolationIds)}
              </UiTooltipContent>
            </UiTooltip>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteCode | null>(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectStatusFilter, setSubjectStatusFilter] = useState("전체");

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/sheets");
        const raw = await res.json();
        const normalized = normalizeApiPayload(raw);
        if (normalized?.ok) setPayload(normalized);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDataUpdate = (data: ApiPayload) => {
    const normalized = normalizeApiPayload(data);
    if (normalized?.ok) setPayload(normalized);
  };

  const weekOverWeekChanges = useMemo(() => {
    const emptySummary: SummaryChangeSet = { total: 0, ongoing: 0, withdrawn: 0, completed: 0 };
    const emptySummaryCounts: SummaryCountSet = { total: 0, ongoing: 0, withdrawn: 0, completed: 0 };
    const emptyOngoingDeltaMeta: OngoingDeltaMeta = { delta: 0, newlyRegisteredCount: 0, withdrawnCount: 0, completedCount: 0 };
    const emptyHospitalChanges = { IJH: 0, EWH: 0, SCH: 0 };

    if (!payload) {
      return { summaryCounts: emptySummaryCounts, summaryChanges: emptySummary, hospitalChanges: emptyHospitalChanges, ongoingDeltaMeta: emptyOngoingDeltaMeta };
    }

    const allSubjects = Object.values(payload.dashboard.hospitals).flatMap((hospital) => hospital.subjects);
    const today = new Date();
    const todayEnd = endOfDay(today);
    const currentWeekStart = getStartOfWeek(new Date());
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const siteDeltas = {
      IJH: calculateSiteScheduledDayDelta(payload.dashboard.hospitals.IJH.subjects, SITE_SCREENING_WEEKDAYS.IJH, new Date()),
      EWH: calculateSiteScheduledDayDelta(payload.dashboard.hospitals.EWH.subjects, SITE_SCREENING_WEEKDAYS.EWH, new Date()),
      SCH: calculateSiteScheduledDayDelta(payload.dashboard.hospitals.SCH.subjects, SITE_SCREENING_WEEKDAYS.SCH, new Date()),
    };

    const hospitalChanges = {
      IJH: siteDeltas.IJH.changeRate,
      EWH: siteDeltas.EWH.changeRate,
      SCH: siteDeltas.SCH.changeRate,
    };

    const previousTotalRegistered = allSubjects.filter((subject) => {
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate) return false;
      if (getIwrsStatusGroup(subject) === "error") return false;
      return baselineDate.getTime() < currentWeekStart.getTime();
    }).length;

    const previousTotalWithdrawn = allSubjects.filter((subject) => {
      if (getIwrsStatusGroup(subject) !== "withdrawn") return false;
      const eventDate = getStatusEventDate(subject);
      if (!eventDate) return false;
      return eventDate.getTime() < currentWeekStart.getTime();
    }).length;

    const previousTotalCompleted = allSubjects.filter((subject) => {
      if (getIwrsStatusGroup(subject) !== "completed") return false;
      const eventDate = getStatusEventDate(subject);
      if (!eventDate) return false;
      return eventDate.getTime() < currentWeekStart.getTime();
    }).length;

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = endOfDay(new Date(currentWeekStart.getTime() - 1));
    const dayDiff = Math.max(0, Math.floor((todayEnd.getTime() - currentWeekStart.getTime()) / 86400000));
    const previousCompareEnd = endOfDay(new Date(previousWeekStart.getTime() + dayDiff * 86400000));

    const currentOngoingSnapshot = allSubjects.filter((subject) => {
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate || baselineDate.getTime() > todayEnd.getTime()) return false;
      return getIwrsStatusGroup(subject) === "ongoing";
    }).length;

    const previousOngoingSnapshot = allSubjects.filter((subject) => {
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate || baselineDate.getTime() > previousCompareEnd.getTime()) return false;
      return getIwrsStatusGroup(subject) === "ongoing";
    }).length;

    const countRegisteredInRange = (start: Date, end: Date) =>
      allSubjects.filter((subject) => {
        const baselineDate = parseComparableDate(subject.baseline);
        if (!baselineDate) return false;
        if (getIwrsStatusGroup(subject) === "error") return false;
        return isDateInRange(baselineDate, start, end);
      }).length;

    const countStatusEventsInRange = (group: Extract<IwrsStatusGroup, "withdrawn" | "completed">, start: Date, end: Date) =>
      allSubjects.filter((subject) => {
        if (getIwrsStatusGroup(subject) !== group) return false;
        const eventDate = getStatusEventDate(subject);
        if (!eventDate) return false;
        return isDateInRange(eventDate, start, end);
      }).length;

    const currentWeekNewlyRegistered = countRegisteredInRange(currentWeekStart, todayEnd);
    const currentWeekWithdrawn = countStatusEventsInRange("withdrawn", currentWeekStart, todayEnd);
    const currentWeekCompleted = countStatusEventsInRange("completed", currentWeekStart, todayEnd);

    const previousWeekNewlyRegistered = countRegisteredInRange(previousWeekStart, previousWeekEnd);
    const previousWeekWithdrawn = countStatusEventsInRange("withdrawn", previousWeekStart, previousWeekEnd);
    const previousWeekCompleted = countStatusEventsInRange("completed", previousWeekStart, previousWeekEnd);

    const findLatestCompletedCount = () => {
      if (currentWeekCompleted > 0 || currentWeekNewlyRegistered > 0) {
        return currentWeekCompleted;
      }

      let searchWeekStart = new Date(previousWeekStart);
      for (let i = 0; i < 52; i++) {
        const searchWeekEnd = endOfDay(new Date(searchWeekStart.getTime() + 6 * 86400000));
        const registered = countRegisteredInRange(searchWeekStart, searchWeekEnd);
        const completed = countStatusEventsInRange("completed", searchWeekStart, searchWeekEnd);
        if (registered > 0 || completed > 0) {
          return completed;
        }
        searchWeekStart = new Date(searchWeekStart.getTime() - 7 * 86400000);
      }

      return 0;
    };

    const hasCurrentWeekEvent = currentWeekNewlyRegistered + currentWeekWithdrawn + currentWeekCompleted > 0;
    const displayCompletedCount = findLatestCompletedCount();

    const ongoingDeltaMeta: OngoingDeltaMeta = {
      delta: currentOngoingSnapshot - previousOngoingSnapshot,
      newlyRegisteredCount: hasCurrentWeekEvent ? currentWeekNewlyRegistered : previousWeekNewlyRegistered,
      withdrawnCount: hasCurrentWeekEvent ? currentWeekWithdrawn : previousWeekWithdrawn,
      completedCount: displayCompletedCount,
    };

    const summaryCounts: SummaryCountSet = allSubjects.reduce(
      (acc, subject) => {
        const group = getIwrsStatusGroup(subject);
        if (group === "error") return acc;
        acc.total += 1;
        if (group === "ongoing") acc.ongoing += 1;
        if (group === "withdrawn") acc.withdrawn += 1;
        if (group === "completed") acc.completed += 1;
        return acc;
      },
      { total: 0, ongoing: 0, withdrawn: 0, completed: 0 }
    );

    const previousOngoingTotal = allSubjects.filter((subject) => {
      const baselineDate = parseComparableDate(subject.baseline);
      if (!baselineDate) return false;
      if (baselineDate.getTime() >= currentWeekStart.getTime()) return false;
      return getIwrsStatusGroup(subject) === "ongoing";
    }).length;

    const summaryChanges = {
      total: calculateDisplayRateFromTotals(summaryCounts.total, previousTotalRegistered),
      ongoing: calculateDisplayRateFromTotals(summaryCounts.ongoing, previousOngoingTotal),
      withdrawn: calculateDisplayRateFromTotals(summaryCounts.withdrawn, previousTotalWithdrawn),
      completed: calculateDisplayRateFromTotals(summaryCounts.completed, previousTotalCompleted),
    };

    if (process.env.NODE_ENV !== "production") {
      console.info("[Dashboard Metric Debug]", {
        range: {
          currentWeek: { start: toDateKey(currentWeekStart), end: toDateKey(currentWeekEnd) },
          weekToDate: {
            currentEnd: toDateKey(todayEnd),
            previousStart: toDateKey(previousWeekStart),
            previousEnd: toDateKey(previousCompareEnd),
          },
        },
        hospitalChanges: {
          IJH: {
            basis: "scheduled_weekdays_vs_previous_week_same_weekdays",
            weekdays: SITE_SCREENING_WEEKDAYS.IJH,
            previousTotal: siteDeltas.IJH.previousTotal,
            currentTotal: siteDeltas.IJH.currentTotal,
            details: siteDeltas.IJH.comparisonDays,
            changeRate: siteDeltas.IJH.changeRate,
          },
          EWH: {
            basis: "scheduled_weekdays_vs_previous_week_same_weekdays",
            weekdays: SITE_SCREENING_WEEKDAYS.EWH,
            previousTotal: siteDeltas.EWH.previousTotal,
            currentTotal: siteDeltas.EWH.currentTotal,
            details: siteDeltas.EWH.comparisonDays,
            changeRate: hospitalChanges.EWH,
          },
          SCH: {
            basis: "scheduled_weekdays_vs_previous_week_same_weekdays",
            weekdays: SITE_SCREENING_WEEKDAYS.SCH,
            previousTotal: siteDeltas.SCH.previousTotal,
            currentTotal: siteDeltas.SCH.currentTotal,
            details: siteDeltas.SCH.comparisonDays,
            changeRate: hospitalChanges.SCH,
          },
        },
        summaryChanges: {
          total: { previousTotal: previousTotalRegistered, currentTotal: summaryCounts.total, changeRate: summaryChanges.total },
          ongoing: { previousTotal: previousOngoingTotal, currentTotal: summaryCounts.ongoing, changeRate: summaryChanges.ongoing },
          withdrawn: { previousTotal: previousTotalWithdrawn, currentTotal: summaryCounts.withdrawn, changeRate: summaryChanges.withdrawn },
          completed: { previousTotal: previousTotalCompleted, currentTotal: summaryCounts.completed, changeRate: summaryChanges.completed },
        },
        ongoingDeltaMeta,
      });
    }

    return { summaryCounts, summaryChanges, hospitalChanges, ongoingDeltaMeta };
  }, [payload]);

  const selectedHospital = selectedSite ? payload?.dashboard.hospitals[selectedSite] : null;

  const kpiCounts = useMemo(() => {
    if (!selectedHospital) {
      return { total: 0, ongoing: 0, earlyStop: 0, completed: 0 };
    }

    const subjects = selectedHospital.subjects;
    const total = subjects.length;
    const ongoing = subjects.filter((subject) => getIwrsStatusGroup(subject) === "ongoing").length;
    const earlyStop = subjects.filter((subject) => getIwrsStatusGroup(subject) === "withdrawn").length;
    const completed = subjects.filter((subject) => normalizeIwrsStatusValue(subject.statusText) === "연구종료").length;

    return { total, ongoing, earlyStop, completed };
  }, [selectedHospital]);

  const fuStatusData = useMemo(() => {
    if (!selectedHospital) return [];
    return [
      { name: "진행", count: kpiCounts.ongoing },
      { name: "중도탈락", count: kpiCounts.earlyStop },
      { name: "연구종료", count: kpiCounts.completed },
    ].filter((item) => item.count > 0);
  }, [kpiCounts, selectedHospital]);

  const selectedHospitalTrendData = useMemo(() => {
    if (!selectedHospital) return [];

    let cumulative = 0;
    return [...selectedHospital.monthlyTrend]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((item) => {
        cumulative += item.count;
        return {
          period: item.period,
          monthly: item.count,
          cumulative,
        };
      });
  }, [selectedHospital]);

  const filteredSubjects = useMemo(() => {
    if (!selectedHospital) return [];

    const trimmedSearch = subjectSearch.trim().toLowerCase();
    const hasAll = subjectStatusFilter === "전체";

    return [...selectedHospital.subjects]
      .filter((subject) => {
        if (!trimmedSearch) return true;
        return subject.subject_id.toLowerCase().includes(trimmedSearch);
      })
      .filter((subject) => {
        if (hasAll) return true;
        return subjectStatusFilter === getSubjectBucket(subject);
      })
      .sort((a, b) => extractSubjectOrder(a.subject_id) - extractSubjectOrder(b.subject_id));
  }, [selectedHospital, subjectSearch, subjectStatusFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-card-foreground leading-tight text-balance">병원별 대상자 등록 대시보드</h1>
            <p className="text-sm text-muted-foreground">{selectedSite ? `${SITE_META[selectedSite].name} 상세 현황` : "2026년 등록 현황"}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <IWRSButton onDataUpdate={handleDataUpdate} />

        {!selectedSite && (
          <div className="flex flex-col gap-6">
            <StatCards
              counts={payload.counts}
              summary={payload.dashboard.overall.summary}
              hospitalChanges={weekOverWeekChanges.hospitalChanges}
              onHospitalClick={(site) => setSelectedSite(site)}
              variant="hospital"
            />
            <GoalProgress counts={payload.counts} />
            <StatCards
              counts={payload.counts}
              summary={weekOverWeekChanges.summaryCounts}
              summaryChanges={weekOverWeekChanges.summaryChanges}
              ongoingDeltaMeta={weekOverWeekChanges.ongoingDeltaMeta}
              variant="summary"
            />
            <LineChartSection weekData={payload.weekData} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BarChartSection counts={payload.counts} />
              <PieChartSection counts={payload.counts} />
            </div>
            <SummaryTable counts={payload.counts} monthData={payload.monthData} />
          </div>
        )}

        {selectedSite && selectedHospital && (
          <div className="flex flex-col gap-6">
            <Button variant="outline" className="w-fit" onClick={() => setSelectedSite(null)}>
              <ArrowLeft className="h-4 w-4" /> 기본 화면으로 돌아가기
            </Button>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailStatCard
                title="전체 등록자"
                value={kpiCounts.total}
                icon={<Users className="h-5 w-5" />}
                iconColorClass="bg-emerald-100 text-emerald-600"
              />
              <DetailStatCard
                title="진행 중 대상자"
                value={kpiCounts.ongoing}
                icon={<CalendarClock className="h-5 w-5" />}
                iconColorClass="bg-blue-100 text-blue-600"
              />
              <DetailStatCard
                title="중도탈락 대상자"
                value={kpiCounts.earlyStop}
                icon={<TriangleAlert className="h-5 w-5" />}
                iconColorClass="bg-amber-100 text-amber-700"
              />
              <DetailStatCard
                title="연구종료 대상자"
                value={kpiCounts.completed}
                icon={<CalendarCheck2 className="h-5 w-5" />}
                iconColorClass="bg-red-100 text-red-700"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>follow-up 진행 상태</CardTitle>
                  <CardDescription>진행 / 연구종료 / 중도탈락 대상자 요약</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fuStatusData}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={125}
                          labelLine={false}
                          label={({ value }) => (value && value > 0 ? `${value}명` : "")}
                        >
                          {fuStatusData.map((entry, index) => (
                            <Cell
                              key={`fu-cell-${index}`}
                              fill={entry.name === "진행" ? "#10b981" : entry.name === "연구종료" ? "#ef4444" : "#eab308"}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `${value}명`} />
                        <Legend wrapperStyle={{ padding: "0px", textAlign: "center", position: "relative", top: "-10px", left: "13px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <FuTargetListCard rows={selectedHospital.upcomingFu} />
              <FuScheduleCalendarCard rows={selectedHospital.upcomingFu} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-900">등록 추이 그래프</CardTitle>
                  <CardDescription className="text-slate-500">월별 등록 수 및 누적 등록 수</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[340px] w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={selectedHospitalTrendData} barCategoryGap="40%" margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid stroke="#111827" strokeOpacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          axisLine={{ stroke: "#E5E7EB" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          axisLine={{ stroke: "#E5E7EB" }}
                          tickLine={false}
                        />
                        <RechartsTooltip formatter={(value: number) => `${value}명`} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="cumulative" name="누적 등록 수" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={52} />
                        <Line
                          type="monotone"
                          dataKey="monthly"
                          name="월별 등록 수"
                          stroke="#0B1F3A"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#0B1F3A", strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#0B1F3A", stroke: "#fff", strokeWidth: 2 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <EndReasonBarChart subjects={selectedHospital.subjects} total={kpiCounts.earlyStop} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>대상자 리스트</CardTitle>
                <CardDescription>연구번호 검색, 상태 필터, 대상자 번호 오름차순</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="연구번호 검색"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between sm:w-[220px]">
                        상태 필터 ({subjectStatusFilter})
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>상태 선택</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={subjectStatusFilter} onValueChange={setSubjectStatusFilter}>
                        {["전체", "진행중", "연구종료", "중도탈락"].map((status) => (
                          <DropdownMenuRadioItem key={status} value={status}>
                            {status}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>subject_id</TableHead>
                      <TableHead>등록일 (baseline)</TableHead>
                      <TableHead>fu1</TableHead>
                      <TableHead>fu2</TableHead>
                      <TableHead>fu3</TableHead>
                      <TableHead>fu4</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>진행상황</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          조건에 맞는 대상자가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.subject_id}>
                        <TableCell className="font-medium">{subject.subject_id}</TableCell>
                        <TableCell>{subject.baseline || "-"}</TableCell>
                        <TableCell>{subject.fu1 || "-"}</TableCell>
                        <TableCell>{subject.fu2 || "-"}</TableCell>
                        <TableCell>{subject.fu3 || "-"}</TableCell>
                        <TableCell>{subject.fu4 || "-"}</TableCell>
                        <TableCell>
                          {(() => {
                            const bucket = getSubjectBucket(subject);
                            const badgeClassByBucket: Record<string, string> = {
                              진행중: "border-emerald-200 bg-emerald-50 text-emerald-700",
                              연구종료: "border-red-200 bg-red-50 text-red-700",
                              중도탈락: "border-amber-200 bg-amber-50 text-amber-700",
                            };
                            return (
                              <div>
                                <Badge variant="outline" className={badgeClassByBucket[bucket]}>
                                  {bucket}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const completedFu = getCompletedFuCount(subject);
                            const progress = getProgressPercent(completedFu);
                            return (
                              <div className="space-y-1.5">
                                <p className="text-xs text-muted-foreground">{completedFu} / 5</p>
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

