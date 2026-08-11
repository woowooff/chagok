// T-31·32·34·35·36 식단 (FN-40~45)
//
// 🔑 사용자가 고르는 것은 아무것도 없다.
//    · 끼니 이름 안 고름 — 찍은 시각이 자동 (FN-41)
//    · 식사/간식도 안 고름 — AI가 사진 보고 판별 (FN-41b)
// 🚫 칼로리·그램 숫자를 절대 보여주지 않는다.
"use client";

import { useEffect, useRef, useState } from "react";
import { useChagok } from "@/lib/chagok-store";
import { blobToBase64, getPhoto, putPhoto, shrinkImage } from "@/lib/photos";
import { newId, today } from "@/lib/storage";
import type { JunkRisk, Meal, Verdict } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  good: "굿",
  notbad: "낫뱃",
  bad: "배드",
};
const JUNK_LABEL: Record<JunkRisk, string> = {
  slight: "약간",
  medium: "보통",
  high: "많음",
};

export default function MealPage() {
  const { state, update } = useChagok();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const todayStr = today();
  const todayMeals = state.meals
    .filter((m) => m.at.slice(0, 10) === todayStr)
    .sort((a, b) => a.at.localeCompare(b.at));

  /** 판정을 서버에 물어보고 그 끼니를 갱신한다 */
  async function judge(mealId: string, blob: Blob) {
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch("/api/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) throw new Error("판정 실패");
      const data = await res.json();

      update((s) => {
        // 간식은 식사 번호를 올리지 않는다 (FN-41b)
        const isSnack = data.kind === "snack";
        const day = todayStr;
        const mealsBefore = s.meals.filter(
          (m) =>
            m.at.slice(0, 10) === day &&
            m.kind === "meal" &&
            m.id !== mealId &&
            m.at < (s.meals.find((x) => x.id === mealId)?.at ?? "")
        ).length;

        return {
          ...s,
          meals: s.meals.map((m) =>
            m.id !== mealId
              ? m
              : {
                  ...m,
                  kind: isSnack ? "snack" : "meal",
                  nth: isSnack ? null : mealsBefore + 1,
                  verdict: data.verdict,
                  junkRisk: data.junkRisk,
                  comment: data.comment,
                  status: "done",
                }
          ),
        };
      });
    } catch {
      // FN-45 — 판정이 실패해도 사진과 시각은 남는다
      update((s) => ({
        ...s,
        meals: s.meals.map((m) =>
          m.id === mealId ? { ...m, status: "failed" } : m
        ),
      }));
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 동작하게
    if (!file) return;

    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      const id = newId("ml");
      const photoKey = `meal_${id}`;
      await putPhoto(photoKey, blob);

      // 사진과 시각을 먼저 저장한다. 판정은 그 다음 (실패해도 기록은 남게)
      const meal: Meal = {
        id,
        at: new Date().toISOString(),
        kind: "meal",
        nth: null,
        photoKey,
        verdict: null,
        junkRisk: null,
        comment: null,
        status: "pending",
      };
      update((s) => ({ ...s, meals: [...s.meals, meal] }));

      await judge(id, blob);
    } finally {
      setBusy(false);
    }
  }

  async function retry(meal: Meal) {
    if (!meal.photoKey) return;
    const blob = await getPhoto(meal.photoKey);
    if (!blob) return;
    update((s) => ({
      ...s,
      meals: s.meals.map((m) =>
        m.id === meal.id ? { ...m, status: "pending" } : m
      ),
    }));
    await judge(meal.id, blob);
  }

  /* FN-44 하루 요약 — 저녁 이후, 또는 세 번 이상 먹었을 때 */
  const done = todayMeals.filter((m) => m.status === "done");
  const mealsOnly = done.filter((m) => m.kind === "meal");
  const snacks = done.filter((m) => m.kind === "snack");
  const okCount = mealsOnly.filter(
    (m) => m.verdict && m.verdict.protein !== "bad" && m.verdict.carb !== "bad"
  ).length;
  const showSummary =
    done.length > 0 && (new Date().getHours() >= 18 || done.length >= 3);

  return (
    <>
      <h1 className="page-title">🍚 식단</h1>

      {showSummary && (
        <p className="day-summary">
          오늘 {mealsOnly.length}끼 중 {okCount}끼 괜찮았어요
          {snacks.length > 0 && ` · 간식 ${snacks.length}번`}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
      <button
        type="button"
        className="cam"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <span className="cam-ico" aria-hidden="true">
          📷
        </span>
        {busy ? "판정하는 중…" : "사진 찍기 / 앨범에서 고르기"}
      </button>

      {todayMeals.length === 0 ? (
        <p className="empty">
          <span className="big" aria-hidden="true">
            🍚
          </span>
          밥이든 간식이든 그냥 찍으세요.
          <br />
          시각도 끼니도 앱이 알아서 세어드려요.
        </p>
      ) : (
        <ul className="meal-list">
          {[...todayMeals].reverse().map((m) => (
            <MealCard key={m.id} meal={m} onRetry={() => retry(m)} />
          ))}
        </ul>
      )}
    </>
  );
}

function MealCard({ meal, onRetry }: { meal: Meal; onRetry: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    if (meal.photoKey) {
      getPhoto(meal.photoKey).then((blob) => {
        if (!blob) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      });
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [meal.photoKey]);

  const time = new Date(meal.at).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <li className="meal-card">
      <div className="meal-head">
        <b>{time}</b>
        <span>
          {meal.kind === "snack"
            ? "간식"
            : meal.nth
              ? `오늘 ${["첫", "두", "세", "네", "다섯", "여섯"][meal.nth - 1] ?? meal.nth} 번째 식사`
              : "식사"}
        </span>
      </div>

      {url && (
        // 폰 안에만 있는 사진이라 최적화 대상이 아니다
        // eslint-disable-next-line @next/next/no-img-element
        <img className="meal-photo" src={url} alt="" />
      )}

      {meal.status === "pending" && <p className="meal-wait">판정하는 중…</p>}

      {meal.status === "failed" && (
        <div className="meal-fail">
          <p>판정을 못 받았어요. 사진은 저장돼 있어요.</p>
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}

      {meal.status === "done" && meal.verdict && (
        <>
          <div className="verdicts">
            <VerdictRow label="탄수화물" v={meal.verdict.carb} />
            <VerdictRow label="단백질" v={meal.verdict.protein} />
            <VerdictRow label="지방" v={meal.verdict.fat} />
          </div>
          {meal.comment && (
            <p className="meal-comment">
              <span aria-hidden="true">🐿️</span> {meal.comment}
            </p>
          )}
          {meal.junkRisk && (
            <p className="junk">
              정크푸드 위험도 — <b>{JUNK_LABEL[meal.junkRisk]}</b>
            </p>
          )}
        </>
      )}
    </li>
  );
}

/** 색만으로 뜻을 전하지 않는다 — 글자도 같이 (NFR-11) */
function VerdictRow({ label, v }: { label: string; v: Verdict }) {
  return (
    <div className="vrow-j">
      <span className="vlabel">{label}</span>
      <span className={`vbadge ${v}`}>{VERDICT_LABEL[v]}</span>
    </div>
  );
}
