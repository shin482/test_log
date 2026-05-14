import { NextResponse } from "next/server";
import { getHospitalCountsAndHistory } from "@/lib/sheets";
import { google } from "googleapis";

// helper reused by POST (service-account parsing)
function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY");

  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\n/g, "\n");

  return sa as { client_email: string; private_key: string };
}

// we keep POST logic here since it's only used by the client button

export async function GET() {
  try {
    const { counts, monthData, weekData, dashboard } = await getHospitalCountsAndHistory();
    return NextResponse.json({ ok: true, counts, monthData, weekData, dashboard });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// append or update values via POST from client
export async function POST(request: Request) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = "'IWRS'!A1:Z2000"; // fixed sheet/tab

    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
    console.log("using fixed range:", range);

    const body = await request.json();
    // expect { values: any[][] } or a single row
    let values = Array.isArray(body.values) ? body.values : [body.values];

    // drop rows that contain "오류" in any cell
    if (values.length > 0) {
      values = values.filter((row: any[], idx: number) => {
        if (idx === 0) return true;
        return !row.some((cell) => String(cell ?? "").includes("오류"));
      });
    }

    const sa = getServiceAccount();
    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    return NextResponse.json({ ok: true, result: res.data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}