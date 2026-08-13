// T-12·14·15·16·17·19·19a 루틴 실행 화면
//
// 🔑 여기가 이 앱의 심장이다. 헬스장에서 실제로 쓰는 화면.
//  · 운동이 세로로 쭉. 한 번에 하나만 펼쳐진다 (FN-30)
//  · 순서를 강제하지 않는다. 4번부터 해도 된다 (FN-30b)
//  · 세트 줄은 지난번 값이 이미 채워져 있다 → ✓ 하나로 끝 (FN-31)
//  · 신기록이면 그 줄에 메달 (FN-35b)
//  · 「루틴 끝내기」 → 도토리 하나 (FN-33)
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ExercisePicker from "@/components/ExercisePicker";
import Stepper from "@/components/Stepper";
import VideoPicker from "@/components/VideoPicker";
import VideoRow from "@/components/VideoRow";
import { useChagok } from "@/lib/chagok-store";
import {
  fmtDuration,
  fmtNum,
  lastSetsFor,
  lastSummaryText,
  medalFor,
  medalLabel,
} from "@/lib/logic";
import { newId, today } from "@/lib/storage";
import type { Exercise, Session, SetRecord, Video } from "@/lib/types";

export default function RoutineRunPage() {
  const params = useParams<{ id: string }>();
  const routineId = decodeURIComponent(params.id);
  const router = useRouter();
  const { state, update } = useChagok();

  const routine = state.routines.find((r) => r.id === routineId) ?? null;

  const [openId, setOpenId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finished, setFinished] = useState<Session | null>(null);
  // 영상을 붙이거나 고칠 운동
  const [videoFor, setVideoFor] = useState<Exercise | null>(null);

  // 오늘 이 루틴의 진행 중인 세션 (끝내기 전까지 endedAt이 비어 있다)
  const session = useMemo(
    () =>
      state.sessions.find(
        (s) => s.routineId === routineId && s.endedAt === null && !s.imported
      ) ?? null,
    [state.sessions, routineId]
  );

  if (!routine) {
    return (
      <>
        <div className="topbar">
          <button type="button" onClick={() => router.push("/")} aria-label="뒤로">
            ‹
          </button>
          <b>루틴</b>
        </div>
        <p className="empty">이 루틴을 찾을 수 없어요.</p>
      </>
    );
  }

  const exercises = routine.exerciseIds
    .map((id) => state.exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e));

  /** 세션이 없으면 그때 만든다 (구경만 하고 나가면 빈 기록을 안 남기려고) */
  function ensureSession(s: typeof state): { next: typeof state; id: string } {
    const existing = s.sessions.find(
      (x) => x.routineId === routineId && x.endedAt === null && !x.imported
    );
    if (existing) return { next: s, id: existing.id };
    const id = newId("se");
    return {
      next: {
        ...s,
        sessions: [
          ...s.sessions,
          {
            id,
            routineId,
            date: today(),
            startedAt: new Date().toISOString(),
            endedAt: null,
            durationSec: null,
            sets: [],
          },
        ],
      },
      id,
    };
  }

  /** 화면에 깔아둘 세트 줄 — 기록된 게 없으면 지난번 만큼 미리 깔아준다 (FN-31) */
  function rowsFor(ex: Exercise): SetRecord[] {
    const mine = (session?.sets ?? [])
      .filter((s) => s.exerciseId === ex.id)
      .sort((a, b) => a.no - b.no);
    if (mine.length > 0) return mine;

    const last = lastSetsFor(state, ex.id, session?.id);
    if (last.length > 0) {
      return last.map((s, i) => ({
        exerciseId: ex.id,
        no: i + 1,
        weight: s.weight,
        reps: s.reps,
        sec: s.sec,
        done: false,
      }));
    }
    // 처음 하는 운동이면 한 줄부터
    return [
      {
        exerciseId: ex.id,
        no: 1,
        weight: ex.logType === "weight_reps" ? 20 : null,
        reps: ex.logType === "time" ? null : 12,
        sec: ex.logType === "time" ? 30 : null,
        done: false,
      },
    ];
  }

  /** 세트 하나를 고쳐 넣는다 (없으면 새로 만든다) */
  function writeSet(ex: Exercise, row: SetRecord, patch: Partial<SetRecord>) {
    update((s) => {
      const { next, id } = ensureSession(s);
      const sessions = next.sessions.map((se) => {
        if (se.id !== id) return se;

        // 아직 저장 안 된 줄들이 있으면 화면에 보이던 그대로 같이 넣는다
        const already = se.sets.filter((x) => x.exerciseId === ex.id);
        const base =
          already.length > 0
            ? se.sets
            : [...se.sets, ...rowsFor(ex).map((r) => ({ ...r }))];

        const merged = base.map((x) =>
          x.exerciseId === ex.id && x.no === row.no ? { ...x, ...patch } : x
        );
        return { ...se, sets: merged };
      });

      // 체크한 순간에 신기록인지 본다 (그 세트 자신은 빼고 비교)
      if (patch.done === true) {
        const se = sessions.find((x) => x.id === id)!;
        const target = se.sets.find(
          (x) => x.exerciseId === ex.id && x.no === row.no
        )!;
        const stateForCheck = { ...next, sessions };
        const medal = medalFor(stateForCheck, ex, target, id);
        return {
          ...next,
          sessions: sessions.map((x) =>
            x.id !== id
              ? x
              : {
                  ...x,
                  sets: x.sets.map((y) =>
                    y.exerciseId === ex.id && y.no === row.no
                      ? { ...y, medal }
                      : y
                  ),
                }
          ),
        };
      }

      return { ...next, sessions };
    });
  }

  function addSet(ex: Exercise) {
    update((s) => {
      const { next, id } = ensureSession(s);
      return {
        ...next,
        sessions: next.sessions.map((se) => {
          if (se.id !== id) return se;
          const mine = se.sets.filter((x) => x.exerciseId === ex.id);
          const base = mine.length > 0 ? se.sets : [...se.sets, ...rowsFor(ex)];
          const rows = base.filter((x) => x.exerciseId === ex.id);
          // 직전 세트 값을 그대로 가져온다 (FN-31)
          const prev = rows[rows.length - 1];
          return {
            ...se,
            sets: [
              ...base,
              {
                exerciseId: ex.id,
                no: rows.length + 1,
                weight: prev?.weight ?? null,
                reps: prev?.reps ?? null,
                sec: prev?.sec ?? null,
                done: false,
              },
            ],
          };
        }),
      };
    });
  }

  /** 영상은 운동에 붙는다 — 한 번 붙이면 그 운동을 쓰는 모든 루틴에서 보인다 */
  function saveVideo(exerciseId: string, video: Video | null) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exerciseId ? { ...e, video } : e
      ),
    }));
    setVideoFor(null);
  }

  function addExercise(exerciseId: string) {
    update((s) => ({
      ...s,
      routines: s.routines.map((r) =>
        r.id === routineId
          ? { ...r, exerciseIds: [...r.exerciseIds, exerciseId] }
          : r
      ),
    }));
  }

  /** 이 루틴에서만 뺀다 — 운동 목록과 지난 기록은 그대로 둔다 */
  function removeFromRoutine(ex: Exercise) {
    if (
      !window.confirm(
        `「${ex.name}」을(를) 이 루틴에서 뺄까요?\n운동 목록과 지난 기록은 그대로 남아요.`
      )
    )
      return;
    setOpenId(null);
    update((s) => ({
      ...s,
      routines: s.routines.map((r) =>
        r.id === routineId
          ? { ...r, exerciseIds: r.exerciseIds.filter((id) => id !== ex.id) }
          : r
      ),
    }));
  }

  /** T-17 루틴 끝내기 → 도토리 하나 */
  function finish() {
    if (!session) return;
    const started = new Date(session.startedAt).getTime();
    const durationSec = Math.max(60, Math.round((Date.now() - started) / 1000));
    const doneCount = session.sets.filter((s) => s.done).length;
    const totalCount = session.sets.length;

    const ended: Session = {
      ...session,
      endedAt: new Date().toISOString(),
      durationSec,
    };

    update((s) => ({
      ...s,
      settings: { ...s.settings, acorns: s.settings.acorns + 1 },
      sessions: s.sessions.map((x) => (x.id === session.id ? ended : x)),
      routines: s.routines.map((r) =>
        r.id === routineId
          ? {
              ...r,
              lastDoneAt: today(),
              lastDurationSec: durationSec,
              lastSetsDone: `${doneCount}/${totalCount}`,
            }
          : r
      ),
    }));
    setFinished(ended);
  }

  /* ── 끝낸 뒤 화면 (FN-35c 신기록 요약) ── */
  if (finished) {
    const medals = finished.sets.filter((s) => s.done && s.medal);
    return (
      <div className="done-card">
        <span className="big" aria-hidden="true">
          🌰
        </span>
        <h1>도토리 하나!</h1>
        <p className="sub">
          {routine.name} · {fmtDuration(finished.durationSec)}
        </p>

        {medals.length > 0 && (
          <div className="medal-summary">
            <b>🏅 오늘 신기록 {medals.length}개</b>
            <ul>
              {medals.map((m) => {
                const ex = state.exercises.find((e) => e.id === m.exerciseId);
                if (!ex) return null;
                return (
                  <li key={`${m.exerciseId}-${m.no}`}>
                    {ex.name} ·{" "}
                    {m.medal === "volume"
                      ? "최고 세트"
                      : ex.logType === "weight_reps"
                        ? `${fmtNum(m.weight)}kg`
                        : ex.logType === "reps"
                          ? `${m.reps}회`
                          : `${m.sec}초`}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Link href="/" className="primary as-btn">
          홈으로
        </Link>
      </div>
    );
  }

  const totalDone = (session?.sets ?? []).filter((s) => s.done).length;

  return (
    <>
      <div className="topbar">
        <button type="button" onClick={() => router.push("/")} aria-label="뒤로">
          ‹
        </button>
        <b>{routine.name}</b>
        <span className="sub">
          운동 {exercises.length}개
          {totalDone > 0 ? ` · ${totalDone}세트 완료` : ""}
        </span>
      </div>

      <ul className="ex-list">
        {exercises.map((ex, i) => {
          const rows = rowsFor(ex);
          const done = rows.filter((r) => r.done).length;
          const allDone = done === rows.length && rows.length > 0;
          const open = openId === ex.id;
          const lastText = lastSummaryText(state, ex, session?.id);

          return (
            <li key={ex.id} className={`ex ${open ? "open" : ""}`}>
              {/* 접힌 줄은 박스로 만들지 않는다 (PRD 3-1) */}
              <button
                type="button"
                className="ex-head"
                onClick={() => setOpenId(open ? null : ex.id)}
              >
                <span className="no">{allDone ? "✓" : i + 1}</span>
                <span className="nm">{ex.name}</span>
                <span className={`cnt ${allDone ? "ok" : ""}`}>
                  {done}/{rows.length}
                </span>
                <span className="chev">{open ? "⌄" : "›"}</span>
              </button>

              {open && (
                <div className="ex-body">
                  {/* 영상은 한 줄로 접혀 있다. 기록이 주인공 (FN-20) */}
                  <VideoRow video={ex.video} onEdit={() => setVideoFor(ex)} />

                  {lastText && <p className="last">{lastText}</p>}

                  {rows.map((row) => (
                    <div
                      className={`set ${row.done ? "done" : ""}`}
                      key={`${ex.id}-${row.no}`}
                    >
                      <span className="setno">{row.no}</span>

                      {ex.logType === "weight_reps" && (
                        <>
                          <Stepper
                            value={row.weight ?? 0}
                            step={2.5}
                            unit="kg"
                            onChange={(v) => writeSet(ex, row, { weight: v })}
                          />
                          <Stepper
                            value={row.reps ?? 0}
                            step={1}
                            unit="회"
                            onChange={(v) => writeSet(ex, row, { reps: v })}
                          />
                        </>
                      )}

                      {/* 안 쓰는 칸은 화면에 띄우지 않는다 (FN-14) */}
                      {ex.logType === "reps" && (
                        <Stepper
                          value={row.reps ?? 0}
                          step={1}
                          unit="회"
                          onChange={(v) => writeSet(ex, row, { reps: v })}
                        />
                      )}

                      {ex.logType === "time" && (
                        <Stepper
                          value={row.sec ?? 0}
                          step={5}
                          unit="초"
                          onChange={(v) => writeSet(ex, row, { sec: v })}
                        />
                      )}

                      <button
                        type="button"
                        className={`check ${row.done ? "on" : ""}`}
                        aria-label={`${row.no}세트 완료`}
                        aria-pressed={row.done}
                        onClick={() => writeSet(ex, row, { done: !row.done })}
                      >
                        ✓
                      </button>

                      {row.done && row.medal && (
                        <span className="medal">
                          🏅 {medalLabel(ex, row.medal)}
                        </span>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-row small"
                    onClick={() => addSet(ex)}
                  >
                    ＋ 세트 추가
                  </button>

                  <button
                    type="button"
                    className="del-row"
                    onClick={() => removeFromRoutine(ex)}
                  >
                    이 루틴에서 빼기
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="add-row"
        onClick={() => setPickerOpen(true)}
      >
        ＋ 운동 추가
      </button>

      <div className="bottom-cta">
        <button
          type="button"
          className="primary"
          disabled={!session || totalDone === 0}
          onClick={finish}
        >
          루틴 끝내기 🌰
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          pickedIds={routine.exerciseIds}
          routineId={routineId}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {videoFor && (
        <VideoPicker
          exerciseName={videoFor.name}
          current={videoFor.video}
          onSave={(v) => saveVideo(videoFor.id, v)}
          onClose={() => setVideoFor(null)}
        />
      )}
    </>
  );
}
