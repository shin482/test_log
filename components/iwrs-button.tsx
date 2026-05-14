"use client"

import { useState } from "react";

interface IWRSButtonProps {
  onDataUpdate: (data: any) => void;
}

export function IWRSButton({ onDataUpdate }: IWRSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sheets");
      const data = await res.json();
      console.log(data);

      if (data.ok) {
        setMessage("시트 조회 완료.");
        if (data.counts && data.monthData && data.weekData && data.dashboard) {
          // 전체 대시보드 데이터를 한 번에 갱신합니다.
          onDataUpdate(data);
        }
      } else {
        setMessage(`오류: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`네트워크 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-white"
      >
        {loading ? "전송 중…" : "IWRS 업데이트"}
      </button>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
