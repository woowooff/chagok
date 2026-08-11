// T-13 스테퍼 (FN-32) — 무게 2.5kg씩, 횟수 1씩, 시간 5초씩.
// 드롭다운·스크롤휠은 쓰지 않는다. 숫자를 직접 누르면 그때만 키보드가 올라온다.
"use client";

import { useState } from "react";
import { fmtNum } from "@/lib/logic";

type Props = {
  value: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
};

export default function Stepper({
  value,
  step,
  unit,
  onChange,
  disabled,
}: Props) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const n = Number(draft.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(n) && draft.trim() !== "") onChange(clamp(n));
    setTyping(false);
  }

  function clamp(n: number) {
    return Math.max(0, Math.round(n * 100) / 100);
  }

  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`${unit} 줄이기`}
        disabled={disabled}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>

      {typing ? (
        <input
          className="stepper-input"
          type="text"
          inputMode="decimal"
          autoFocus
          value={draft}
          aria-label={unit}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setTyping(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="stepper-value"
          disabled={disabled}
          onClick={() => {
            setDraft(String(value));
            setTyping(true);
          }}
        >
          {fmtNum(value)}
          <span className="unit">{unit}</span>
        </button>
      )}

      <button
        type="button"
        aria-label={`${unit} 늘리기`}
        disabled={disabled}
        onClick={() => onChange(clamp(value + step))}
      >
        ＋
      </button>
    </div>
  );
}
