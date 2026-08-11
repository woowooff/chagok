// T-46·47 기록 달력 (FN-60~63)
//
// 🔑 왜 탭 3개 안에 각각 넣지 않았나 — 그러면 "그날 뭐 했지"를 보려고 세 군데를 뒤져야 한다.
//    한 곳에 모으면 한 번에 답이 나온다.
// 🌰 루틴을 끝낸 날은 도토리. 식단·눈바디는 작은 점. 흩어져 있어야 「쌓인 그림」이 된다.
// 🚫 연속 일수(스트릭)는 만들지 않는다 (FN-63). 빈 날을 지적하지 않는다.
"use client";

import { useMemo, useState } from "react";
import { useChagok } from "@/lib/chagok-store";
import { getPhoto } from "@/lib/photos";
import { fmtDuration, fmtNum } from "@/lib/logic";
import { today } from "@/lib/storage";
import type { ChagokState } from "@/lib/types";
import { useEffect } from "react";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const VERDICT_LABEL: Record<string, string> = {
  good: "굿",
  notbad: "낫뱃",
  bad: "배드",
};

export default function LogPage() {
  const { state } = useChagok();
  const todayStr = today();
  const [cursor, setCursor] = useState(() => todayStr.slice(0, 7)); // 'YYYY-MM'
  const [picked, setPicked] = useState<string | null>(todayStr);

  const marks = useMemo(() => buildMarks(state), [state]);

  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = first.getDay();

  const monthAcorns = Object.entries(marks)
    .filter(([d, v]) => d.startsWith(cursor) && v.acorns > 0)
    .reduce((sum, [, v]) => sum + v.acorns, 0);

  function shiftMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${cursor}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  return (
    <>
      <div className="cal-head">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="지난 달">
          ‹
        </button>
        <b>
          {y}년 {m}월
        </b>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="다음 달">
          ›
        </button>
        {/* FN-62 — 목표가 아니라 그냥 센 값이다 */}
        <span className="cal-count">🌰 이번 달 {monthAcorns}개</span>
      </div>

      <div className="cal">
        {WEEK.map((w) => (
          <div key={w} className="cal-w">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`x${i}`} />;
          const mk = marks[date];
          const day = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              className={`cal-d ${picked === date ? "on" : ""} ${date === todayStr ? "today" : ""}`}
              onClick={() => setPicked(date)}
            >
              <span className="d">{day}</span>
              <span className="mk">
                {mk?.acorns ? (
                  <span className="acorn">
                    🌰{mk.acorns > 1 ? mk.acorns : ""}
                  </span>
                ) : null}
                <span className="dots">
                  {mk?.meal ? <i className="dot meal" /> : null}
                  {mk?.body ? <i className="dot body" /> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {picked && <DayDetail date={picked} />}
    </>
  );
}

/* ── 날짜별 표시 계산 ───────────────────────── */

type Mark = { acorns: number; meal: boolean; body: boolean };

function buildMarks(state: ChagokState): Record<string, Mark> {
  const out: Record<string, Mark> = {};
  const touch = (d: string) =>
    (out[d] ??= { acorns: 0, meal: false, body: false });

  for (const s of state.sessions) {
    // 도토리는 「루틴 끝내기」로 끝난 것만. 스트레칭·가져온 기록은 세지 않는다
    if (s.endedAt && !s.imported && s.routineId !== "__stretch__") {
      touch(s.date).acorns += 1;
    }
  }
  for (const m of state.meals) touch(m.at.slice(0, 10)).meal = true;
  for (const b of state.bodyPhotos) {
    if (b.front || b.side || b.back) touch(b.date).body = true;
  }
  return out;
}

/* ── 그날 한 걸 한꺼번에 (FN-61) ────────────── */

function DayDetail({ date }: { date: string }) {
  const { state } = useChagok();

  const sessions = state.sessions.filter(
    (s) => s.date === date && (s.endedAt || s.imported)
  );
  const meals = state.meals
    .filter((m) => m.at.slice(0, 10) === date)
    .sort((a, b) => a.at.localeCompare(b.at));
  const body = state.bodyPhotos.find((b) => b.date === date) ?? null;
  const bodyCount = body
    ? [body.front, body.side, body.back].filter(Boolean).length
    : 0;

  const nothing = sessions.length === 0 && meals.length === 0 && bodyCount === 0;

  return (
    <section className="day">
      <h2>
        {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일 (
        {WEEK[new Date(date).getDay()]})
      </h2>

      {nothing && <p className="day-none">이날은 기록이 없어요.</p>}

      {sessions.map((s) => {
        const routine = state.routines.find((r) => r.id === s.routineId);
        const byEx = new Map<string, typeof s.sets>();
        for (const set of s.sets) {
          if (!set.done) continue;
          const arr = byEx.get(set.exerciseId) ?? [];
          arr.push(set);
          byEx.set(set.exerciseId, arr);
        }
        const isStretch = s.routineId === "__stretch__";
        return (
          <div className="drow" key={s.id}>
            <span className="ic">{isStretch ? "🧘" : "🌰"}</span>
            <div>
              <b>
                {isStretch ? "스트레칭" : `루틴 「${routine?.name ?? "?"}」 완료`}
                {s.durationSec ? ` · ${fmtDuration(s.durationSec)}` : ""}
              </b>
              {[...byEx.entries()].map(([exId, sets]) => {
                const ex = state.exercises.find((e) => e.id === exId);
                if (!ex) return null;
                const f = sets[0];
                const text =
                  ex.logType === "weight_reps"
                    ? `${fmtNum(f.weight)}kg × ${f.reps} × ${sets.length}`
                    : ex.logType === "reps"
                      ? `${f.reps}회 × ${sets.length}`
                      : `${f.sec}초 × ${sets.length}`;
                return (
                  <p key={exId}>
                    {ex.name} {text}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}

      {meals.length > 0 && (
        <div className="drow">
          <span className="ic">🍚</span>
          <div>
            <b>식단 {meals.length}번</b>
            {meals.map((m) => (
              <MealLine key={m.id} meal={m} />
            ))}
          </div>
        </div>
      )}

      {bodyCount > 0 && (
        <div className="drow">
          <span className="ic">📸</span>
          <div>
            <b>눈바디 {bodyCount}장</b>
            <p>
              {[
                body?.front && "앞",
                body?.side && "옆",
                body?.back && "뒤",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** 그날 식단 한 줄 — 시각 · 판정 · 사진 (우경님 지적: "식단도 기록에 쌓일 수 없나") */
function MealLine({ meal }: { meal: ChagokState["meals"][number] }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    if (meal.photoKey) {
      getPhoto(meal.photoKey).then((blob) => {
        if (!blob) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      });
    }
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [meal.photoKey]);

  const time = new Date(meal.at).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <p className="mealline">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      )}
      <span>
        {time} · {meal.kind === "snack" ? "간식" : "식사"}
        {meal.verdict && (
          <>
            {" — 탄 "}
            {VERDICT_LABEL[meal.verdict.carb]} · 단{" "}
            {VERDICT_LABEL[meal.verdict.protein]} · 지{" "}
            {VERDICT_LABEL[meal.verdict.fat]}
          </>
        )}
        {meal.status === "failed" && " — 판정 실패"}
      </span>
    </p>
  );
}
