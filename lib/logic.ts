// 계산만 하는 곳. 화면도 저장도 건드리지 않는다.
import type {
  ChagokState,
  Exercise,
  Part,
  Routine,
  Session,
  SetRecord,
} from "./types";

/* ─────────────────────────────────────────────
   FN-08 「오늘 할 루틴」 — 가장 오래 안 한 것
   추천일 뿐이다. 다른 루틴을 눌러도 그냥 열린다.
   ───────────────────────────────────────────── */

export function pickTodayRoutineId(
  routines: Routine[],
  todayStr: string
): string | null {
  // 오늘 이미 끝낸 루틴은 빼고 → 그 다음으로 오래된 것을 추천
  // 🔴 2026-08-13 — 운동이 하나도 없는 루틴은 후보에서 뺀다.
  //    이름만 먼저 만들 수 있게 바꾼 뒤로(②), 빈 루틴이 「한 번도 안 함」이라
  //    1순위로 올라와 홈에서 강조돼 버렸다. 할 수 있는 게 없는데 강조되면 안 된다.
  const candidates = routines.filter(
    (r) => r.lastDoneAt !== todayStr && r.exerciseIds.length > 0
  );
  const pool = candidates.length > 0 ? candidates : [];
  if (pool.length === 0) return null;

  const sorted = [...pool].sort((a, b) => {
    // 한 번도 안 한 루틴이 1순위 (무한히 오래된 것으로 친다)
    if (a.lastDoneAt === null && b.lastDoneAt !== null) return -1;
    if (b.lastDoneAt === null && a.lastDoneAt !== null) return 1;
    if (a.lastDoneAt !== b.lastDoneAt) {
      return (a.lastDoneAt ?? "").localeCompare(b.lastDoneAt ?? "");
    }
    // 날짜가 같으면 목록에서 위에 있는 것
    return a.order - b.order;
  });
  return sorted[0].id;
}

/* ─────────────────────────────────────────────
   지난 기록 (FN-31 · FN-34)
   ───────────────────────────────────────────── */

/** 끝난 세션만, 최근 순으로 */
export function finishedSessions(state: ChagokState): Session[] {
  return state.sessions
    .filter((s) => s.endedAt !== null || s.imported)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** 그 운동을 마지막으로 한 세트들 (직전 값 미리 채우기에 쓴다) */
export function lastSetsFor(
  state: ChagokState,
  exerciseId: string,
  exceptSessionId?: string
): SetRecord[] {
  for (const s of finishedSessions(state)) {
    if (s.id === exceptSessionId) continue;
    const mine = s.sets.filter((x) => x.exerciseId === exerciseId && x.done);
    if (mine.length > 0) return [...mine].sort((a, b) => a.no - b.no);
  }
  return [];
}

/** `지난번 · 40kg × 12 × 3` 한 줄 (FN-34) */
export function lastSummaryText(
  state: ChagokState,
  ex: Exercise,
  exceptSessionId?: string
): string | null {
  const sets = lastSetsFor(state, ex.id, exceptSessionId);
  if (sets.length === 0) return null;
  const first = sets[0];
  const count = sets.length;
  if (ex.logType === "weight_reps") {
    return `지난번 · ${fmtNum(first.weight)}kg × ${first.reps} × ${count}`;
  }
  if (ex.logType === "reps") {
    return `지난번 · ${first.reps}회 × ${count}`;
  }
  return `지난번 · ${first.sec}초 × ${count}`;
}

/* ─────────────────────────────────────────────
   FN-35b 신기록 메달
   비교 대상이 없으면 메달을 띄우지 않는다.
   ───────────────────────────────────────────── */

export type Medal = "weight" | "volume" | null;

type Best = { hasAny: boolean; weight: number; volume: number; reps: number; sec: number };

/** 그 운동의 역대 최고. 지금 체크하는 세트는 빼고 센다 */
export function bestFor(
  state: ChagokState,
  exerciseId: string,
  exclude?: { sessionId: string; no: number }
): Best {
  const best: Best = { hasAny: false, weight: 0, volume: 0, reps: 0, sec: 0 };
  for (const s of state.sessions) {
    for (const set of s.sets) {
      if (set.exerciseId !== exerciseId || !set.done) continue;
      if (exclude && s.id === exclude.sessionId && set.no === exclude.no) continue;
      best.hasAny = true;
      const w = set.weight ?? 0;
      const r = set.reps ?? 0;
      best.weight = Math.max(best.weight, w);
      best.volume = Math.max(best.volume, w * r);
      best.reps = Math.max(best.reps, r);
      best.sec = Math.max(best.sec, set.sec ?? 0);
    }
  }
  return best;
}

/** 이 세트가 신기록인가. 둘 다면 「가장 무거운 중량」이 우선 */
export function medalFor(
  state: ChagokState,
  ex: Exercise,
  set: SetRecord,
  sessionId: string
): Medal {
  const best = bestFor(state, ex.id, { sessionId, no: set.no });
  // 첫 기록은 신기록이 아니다
  if (!best.hasAny) return null;

  if (ex.logType === "weight_reps") {
    const w = set.weight ?? 0;
    const vol = w * (set.reps ?? 0);
    if (w > best.weight) return "weight";
    if (vol > best.volume) return "volume";
    return null;
  }
  if (ex.logType === "reps") {
    return (set.reps ?? 0) > best.reps ? "weight" : null;
  }
  return (set.sec ?? 0) > best.sec ? "weight" : null;
}

export function medalLabel(ex: Exercise, medal: Medal): string {
  if (medal === "volume") return "최고 세트";
  if (ex.logType === "reps") return "가장 많은 횟수";
  if (ex.logType === "time") return "가장 오래";
  return "가장 무거운 중량";
}

/* ─────────────────────────────────────────────
   FN-16 운동 추가 화면의 기본 부위
   ───────────────────────────────────────────── */

/** 그 루틴에 담긴 운동 중 가장 많은 부위. 비어 있으면 null */
export function mainPartOf(
  routine: Routine | null,
  exercises: Exercise[]
): Part | null {
  if (!routine || routine.exerciseIds.length === 0) return null;
  const votes = new Map<Part, number>();
  for (const id of routine.exerciseIds) {
    const ex = exercises.find((e) => e.id === id);
    if (!ex) continue;
    votes.set(ex.part, (votes.get(ex.part) ?? 0) + 1);
  }
  let top: Part | null = null;
  let max = 0;
  for (const [part, n] of votes) {
    if (n > max) {
      max = n;
      top = part;
    }
  }
  return top;
}

/* ─────────────────────────────────────────────
   보여주기용 잔손질
   ───────────────────────────────────────────── */

/** 42.5 → "42.5", 40 → "40" (쓸데없는 .0을 안 붙인다) */
export function fmtNum(n: number | null): string {
  if (n === null) return "0";
  return Number.isInteger(n) ? String(n) : String(n);
}

/** 2520 → "42분" */
export function fmtDuration(sec: number | null): string {
  if (!sec || sec < 60) return "1분";
  return `${Math.round(sec / 60)}분`;
}

/** 홈 줄에 붙는 요약: `운동 4개 · 지난번 8/8 · 42분` (FN-04) */
export function routineSummary(r: Routine): string {
  // 「운동 0개」는 고장난 것처럼 보인다. 다음에 뭘 하면 되는지 말해준다
  if (r.exerciseIds.length === 0) return "운동을 담아주세요";
  const parts = [`운동 ${r.exerciseIds.length}개`];
  if (r.lastSetsDone) parts.push(`지난번 ${r.lastSetsDone}`);
  if (r.lastDurationSec) parts.push(fmtDuration(r.lastDurationSec));
  return parts.join(" · ");
}
