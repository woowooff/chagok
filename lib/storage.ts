// T-03 저장소 — 브라우저 안에 넣고 뺀다 (FN-70)
//
// 🔑 저장은 여기 한 곳에서만 한다 (SPEC §4). 여기저기서 쓰면 데이터가 깨진다.
// ⚠️ 사진은 여기 넣지 않는다. localStorage는 약 5MB뿐이라 금방 찬다 → 사진은 IndexedDB (M3에서 추가)

import type { ChagokState } from "./types";
import { seedExercises } from "./seed";

const KEY = "chagok.v1";

export function emptyState(): ChagokState {
  return {
    version: 1,
    settings: { acorns: 0, createdAt: today() },
    exercises: seedExercises(),
    routines: [],
    sessions: [],
    meals: [],
    bodyPhotos: [],
  };
}

/** 오늘 날짜 'YYYY-MM-DD' (그 폰의 시간대 기준) */
export function today(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function loadState(): ChagokState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ChagokState>;
    // 저장된 게 깨졌거나 칸이 빠져 있어도 앱이 죽지 않게 기본값으로 메운다
    const base = emptyState();
    return {
      version: 1,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      exercises: parsed.exercises?.length ? parsed.exercises : base.exercises,
      routines: parsed.routines ?? [],
      sessions: parsed.sessions ?? [],
      meals: parsed.meals ?? [],
      bodyPhotos: parsed.bodyPhotos ?? [],
    };
  } catch {
    // 읽기 실패해도 앱은 열려야 한다. 기존 값은 덮어쓰지 않는다
    return emptyState();
  }
}

export function saveState(state: ChagokState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 공간이 찼을 때. M5에서 사용량 안내(FN-72)로 이어진다
    console.warn("[차곡] 저장 공간이 부족해요");
  }
}

/** 새 id 만들기 — 루틴·세션·끼니처럼 여러 개 생기는 것들에 쓴다 */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
