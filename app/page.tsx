// T-10 홈 = 루틴 목록 (FN-01~06)
// 화면에서 진한 건 「오늘 할 루틴」 하나뿐이다 (NFR-12)
"use client";

import Link from "next/link";
import { useChagok } from "@/lib/chagok-store";
import { pickTodayRoutineId, routineSummary } from "@/lib/logic";
import { today } from "@/lib/storage";

export default function HomePage() {
  const { state } = useChagok();
  const acorns = state.settings.acorns;

  const routines = [...state.routines].sort((a, b) => a.order - b.order);
  const todayStr = today();
  const todayId = pickTodayRoutineId(routines, todayStr);

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
        <ul className="rt-list">
          {routines.map((r) => {
            const isToday = r.id === todayId;
            const doneToday = r.lastDoneAt === todayStr;
            return (
              <li key={r.id}>
                <Link
                  href={`/routine/${encodeURIComponent(r.id)}`}
                  className={`rt ${isToday ? "today" : ""}`}
                >
                  <span className="t">
                    <b>{r.name}</b>
                    <span>{routineSummary(r)}</span>
                  </span>
                  <span className="go">{doneToday ? "✓ 오늘 완료" : "›"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/routine/new" className="add-routine">
        ＋ 루틴 만들기
      </Link>
    </>
  );
}
