import { google } from "googleapis";

// helper to drop rows whose remark column contains the word "오류"
export function filterDuplicates(values: any[][]) {
  if (!values || values.length === 0) return values;
  return values.filter((row, idx) => {
    if (idx === 0) return true;
    return !row.some((cell) => String(cell ?? "").includes("오류"));
  });
}

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY");

  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");

  return sa as { client_email: string; private_key: string };
}

/**
 * Reads the IWRS sheet and returns counts per hospital site.
 */
export async function getHospitalCounts() {
  const { counts } = await getHospitalCountsAndHistory();
  return counts;
}

type SiteCode = "IJH" | "EWH" | "SCH";

type SubjectStatus = "ongoing" | "withdrawn" | "completed";

export interface SubjectRecord {
  subject_id: string;
  site: SiteCode;
  baseline: string;
  fu1: string;
  fu2: string;
  fu3: string;
  fu4: string;
  status: SubjectStatus;
  statusText: string;
  staff: string;
  end_reason: string;
  eos_date: string;
  remark: string;
}

interface HospitalSummary {
  total: number;
  ongoing: number;
  withdrawn: number;
  completed: number;
}

interface FuItem {
  subject_id: string;
  next_fu: string;
  days_to_fu: number;
  status: string;
  staff: string;
  remark: string;
}

interface StaffStat {
  staff: string;
  count: number;
}

interface WithdrawalReasonStat {
  reason: string;
  count: number;
}

interface HospitalDashboard {
  site: SiteCode;
  summary: HospitalSummary;
  upcomingFu: FuItem[];
  delayedFu: FuItem[];
  subjects: SubjectRecord[];
  monthlyTrend: Array<{ period: string; count: number }>;
  staffStats: StaffStat[];
  withdrawReasonStats: WithdrawalReasonStat[];
}

interface DashboardData {
  overall: {
    summary: HospitalSummary;
    hospitalCounts: Record<SiteCode, number>;
    monthlyTrend: Array<{ period: string; IJH: number; EWH: number; SCH: number }>;
    withdrawReasonStats: WithdrawalReasonStat[];
  };
  hospitals: Record<SiteCode, HospitalDashboard>;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[\s_\-]/g, "");
}

function findColumnIndex(headers: string[], candidates: string[], fallback = -1) {
  const normalizedHeaders = headers.map((h) => normalizeHeader(String(h ?? "")));
  for (const candidate of candidates) {
    const idx = normalizedHeaders.findIndex((h) => h === normalizeHeader(candidate));
    if (idx !== -1) return idx;
  }
  return fallback;
}

function toDate(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/[./]/g, "-");
  const ymd = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    const localDate = new Date(year, month, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = raw.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function weekStartMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeSite(value: string): SiteCode | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "IJH" || raw.includes("인제")) return "IJH";
  if (raw === "EWH" || raw.includes("이대") || raw.includes("목동")) return "EWH";
  if (raw === "SCH" || raw.includes("순천향")) return "SCH";
  return null;
}

function hasDateValue(value: string) {
  const trimmed = String(value ?? "").trim();
  return !!trimmed && trimmed !== "-";
}

function determineSubjectStatus(statusText: string): SubjectStatus {
  const statusRaw = String(statusText ?? "").replace(/\s+/g, "").toLowerCase();
  if (!statusRaw) return "ongoing";
  if (statusRaw.includes("중복")) return "ongoing";
  if (statusRaw === "중도탈락") return "withdrawn";
  if (statusRaw === "연구종료") return "completed";
  return "ongoing";
}

function normalizeWithdrawalReason(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function mapWithdrawalReason(reason: string) {
  const normalized = normalizeWithdrawalReason(reason);
  if (!normalized) return null;
  if (normalized.includes("의사철회")) return "의사철회";
  if (normalized.includes("대상자안전문제")) return "대상자 안전 문제";
  if (normalized.includes("프로토콜위반")) return "프로토콜 위반";
  return null;
}

function buildDashboardData(values: any[][]) {
  const headers = (values[0] ?? []).map((h) => String(h ?? ""));

  const subjectIdx = findColumnIndex(headers, ["subject_id", "subjectid", "id", "대상자", "대상자id"], 0);
  const siteIdx = findColumnIndex(headers, ["site", "hospital", "병원", "기관"], 1);
  const staffIdx = findColumnIndex(headers, ["staff", "staff_name", "staffname", "담당", "담당자", "coordinator", "crc"], -1);
  const baselineIdx = findColumnIndex(headers, ["baseline", "등록일", "등록일자", "visit1", "screening"], 6);
  const fu1Idx = findColumnIndex(headers, ["fu1", "fu_1", "followup1"], 7);
  const fu2Idx = findColumnIndex(headers, ["fu2", "fu_2", "followup2"], 8);
  const fu3Idx = findColumnIndex(headers, ["fu3", "fu_3", "followup3"], 9);
  const fu4Idx = findColumnIndex(headers, ["fu4", "fu_4", "followup4"], 10);
  const statusIdx = findColumnIndex(headers, ["status", "상태"], 11);
  const endReasonIdx = findColumnIndex(headers, ["사유", "reason", "종료사유", "종료 사유", "withdraw_reason", "withdrawreason", "탈락사유", "중도탈락사유"], -1);
  const eosDateIdx = findColumnIndex(headers, ["eos", "eos_date", "exit_date", "종료일"], -1);
  const remarkIdx = findColumnIndex(headers, ["비고", "remark", "note", "memo"], -1);

  const subjects: SubjectRecord[] = [];
  const seenSubjects = new Set<string>();
  const today = new Date();

  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const subject_id = String(row[subjectIdx] ?? "").trim();
    if (!subject_id || seenSubjects.has(subject_id)) continue;

    const site = normalizeSite(String(row[siteIdx] ?? ""));
    if (!site) continue;

    const baseline = String(row[baselineIdx] ?? "").trim();
    const fu1 = fu1Idx >= 0 ? String(row[fu1Idx] ?? "").trim() : "";
    const fu2 = fu2Idx >= 0 ? String(row[fu2Idx] ?? "").trim() : "";
    const fu3 = fu3Idx >= 0 ? String(row[fu3Idx] ?? "").trim() : "";
    const fu4 = fu4Idx >= 0 ? String(row[fu4Idx] ?? "").trim() : "";
    const statusText = statusIdx >= 0 ? String(row[statusIdx] ?? "").trim() : "";
    const end_reason = endReasonIdx >= 0 ? String(row[endReasonIdx] ?? "").trim() : "";
    const eos_date = eosDateIdx >= 0 ? String(row[eosDateIdx] ?? "").trim() : "";
    const remark = remarkIdx >= 0 ? String(row[remarkIdx] ?? "").trim() : "";
    const staff = staffIdx >= 0 ? String(row[staffIdx] ?? "").trim() : "";
    const status = determineSubjectStatus(statusText);

    subjects.push({
      subject_id,
      site,
      baseline,
      fu1,
      fu2,
      fu3,
      fu4,
      status,
      statusText,
      staff,
      end_reason,
      eos_date,
      remark,
    });
    seenSubjects.add(subject_id);
  }

  const counts = { IJH: 0, SCH: 0, EWH: 0, todayCount: 0, weekCount: 0 };
  const todayKey = formatDateKey(today);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const monthMap = new Map<string, { IJH: number; SCH: number; EWH: number }>();
  const weekMap = new Map<string, { IJH: number; SCH: number; EWH: number }>();

  const overallSummary: HospitalSummary = { total: 0, ongoing: 0, withdrawn: 0, completed: 0 };
  const overallReasonMap = new Map<string, number>();

  const siteSubjects: Record<SiteCode, SubjectRecord[]> = { IJH: [], EWH: [], SCH: [] };

  for (const subject of subjects) {
    counts[subject.site] += 1;
    overallSummary.total += 1;
    if (subject.status === "ongoing") overallSummary.ongoing += 1;
    if (subject.status === "withdrawn") overallSummary.withdrawn += 1;
    if (subject.status === "completed") overallSummary.completed += 1;

    siteSubjects[subject.site].push(subject);

    if (subject.status === "withdrawn") {
      const reason = mapWithdrawalReason(subject.end_reason);
      if (reason) {
        overallReasonMap.set(reason, (overallReasonMap.get(reason) ?? 0) + 1);
      }
    }

    const baselineDate = toDate(subject.baseline);
    if (!baselineDate) continue;

    if (formatDateKey(baselineDate) === todayKey) counts.todayCount += 1;
    if (baselineDate >= startOfWeek && baselineDate <= endOfWeek) counts.weekCount += 1;

    const mKey = monthKey(baselineDate);
    if (!monthMap.has(mKey)) monthMap.set(mKey, { IJH: 0, SCH: 0, EWH: 0 });
    monthMap.get(mKey)![subject.site] += 1;

    const wKey = formatDateKey(weekStartMonday(baselineDate));
    if (!weekMap.has(wKey)) weekMap.set(wKey, { IJH: 0, SCH: 0, EWH: 0 });
    weekMap.get(wKey)![subject.site] += 1;
  }

  const monthData = Array.from(monthMap.entries())
    .map(([period, c]) => ({ period, ...c }))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

  const weekData = Array.from(weekMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([period, c]) => ({ period, ...c }));

  const hospitals = (["IJH", "EWH", "SCH"] as SiteCode[]).reduce((acc, site) => {
    const rows = [...siteSubjects[site]].sort((a, b) => {
      const aDate = toDate(a.baseline)?.getTime() ?? 0;
      const bDate = toDate(b.baseline)?.getTime() ?? 0;
      return bDate - aDate;
    });

    const summary: HospitalSummary = { total: 0, ongoing: 0, withdrawn: 0, completed: 0 };
    const reasonMap = new Map<string, number>();
    const staffMap = new Map<string, number>();
    const hospitalMonthMap = new Map<string, number>();
    const upcomingFu: FuItem[] = [];
    const delayedFu: FuItem[] = [];

    for (const row of rows) {
      summary.total += 1;
      if (row.status === "ongoing") summary.ongoing += 1;
      if (row.status === "withdrawn") summary.withdrawn += 1;
      if (row.status === "completed") summary.completed += 1;

      const staffName = row.staff || "미지정";
      staffMap.set(staffName, (staffMap.get(staffName) ?? 0) + 1);

      const baselineDate = toDate(row.baseline);
      if (baselineDate) {
        const key = monthKey(baselineDate);
        hospitalMonthMap.set(key, (hospitalMonthMap.get(key) ?? 0) + 1);
      }

      if (row.status === "withdrawn") {
        const reason = mapWithdrawalReason(row.end_reason);
        if (reason) {
          reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
        }
      }

      if (row.status !== "ongoing") continue;
      const fuDates = [row.fu1, row.fu2, row.fu3, row.fu4]
        .map((v, idx) => ({ raw: v, parsed: toDate(v), visit: `fu#${idx + 1}` }))
        .filter((v): v is { raw: string; parsed: Date; visit: string } => Boolean(v.parsed));

      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      for (const fu of fuDates) {
        const fuStart = new Date(fu.parsed);
        fuStart.setHours(0, 0, 0, 0);
        const daysToFu = Math.floor((fuStart.getTime() - todayStart.getTime()) / 86400000);

        upcomingFu.push({
          subject_id: row.subject_id,
          next_fu: fu.raw,
          days_to_fu: daysToFu,
          status: fu.visit,
          staff: row.staff,
          remark: row.remark,
        });

        if (daysToFu < 0) {
          delayedFu.push({
            subject_id: row.subject_id,
            next_fu: fu.raw,
            days_to_fu: Math.abs(daysToFu),
            status: fu.visit,
            staff: row.staff,
            remark: row.remark,
          });
        }
      }
    }

    acc[site] = {
      site,
      summary,
      upcomingFu: upcomingFu.sort((a, b) => {
        const aDate = toDate(a.next_fu)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = toDate(b.next_fu)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDate === bDate) return a.subject_id.localeCompare(b.subject_id);
        return aDate - bDate;
      }),
      delayedFu: delayedFu.sort((a, b) => b.days_to_fu - a.days_to_fu),
      subjects: rows,
      monthlyTrend: Array.from(hospitalMonthMap.entries())
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0)),
      staffStats: Array.from(staffMap.entries())
        .map(([staff, count]) => ({ staff, count }))
        .sort((a, b) => b.count - a.count),
      withdrawReasonStats: Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    };
    return acc;
  }, {} as Record<SiteCode, HospitalDashboard>);

  const dashboard: DashboardData = {
    overall: {
      summary: overallSummary,
      hospitalCounts: { IJH: counts.IJH, EWH: counts.EWH, SCH: counts.SCH },
      monthlyTrend: monthData,
      withdrawReasonStats: Array.from(overallReasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    },
    hospitals,
  };

  return { counts, monthData, weekData, dashboard };
}

/**
 * Read sheet rows and return both the overall counts and a date-based
 * history suitable for charting.
 */
export async function getHospitalCountsAndHistory() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = "'IWRS'!A1:Z2000";
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");

  const sa = getServiceAccount();
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rawValues: any[][] = res.data.values ?? [];
  const values = filterDuplicates(rawValues);

  return buildDashboardData(values);
}
