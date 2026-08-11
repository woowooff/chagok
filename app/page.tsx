// 홈 = 루틴 목록 (FN-01). M0에서는 인사와 도토리 개수까지만 — 목록은 M1(T-10)에서.
"use client";

import { useEffect, useState } from "react";
import { loadState } from "@/lib/storage";
import type { ChagokState } from "@/lib/types";

export default function HomePage() {
  // 저장된 값은 브라우저에만 있으므로 화면이 뜬 뒤에 읽는다
  const [state, setState] = useState<ChagokState | null>(null);
  useEffect(() => setState(loadState()), []);

  const acorns = state?.settings.acorns ?? 0;
  const routines = state?.routines ?? [];

  return (
    <>
      <header className="greet">
        <span className="face" aria-hidden="true">
          🐿️
        </span>
        <div>
          <h1>오늘도 차곡차곡</h1>
          {/* 0개일 때는 「0개」라고 쓰지 않는다 (FN-06) */}
          <p className="acorns">
            {acorns > 0 ? (
              <>
                도토리 <b>{acorns}</b>개 모았어요
              </>
            ) : (
              "첫 도토리를 모아볼까요?"
            )}
          </p>
        </div>
      </header>

      {routines.length === 0 ? (
        <p className="empty">
          <span className="big" aria-hidden="true">
            🌰
          </span>
          아직 만든 루틴이 없어요.
          <br />
          「힙데이」처럼 이름을 붙여 운동을 담아두면
          <br />
          헬스장에서 한 번만 누르면 됩니다.
        </p>
      ) : (
        <div className="stub">루틴 목록은 M1에서 만듭니다 (T-10)</div>
      )}
    </>
  );
}
