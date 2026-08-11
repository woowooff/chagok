// T-18 · T-18b 운동 추가 (FN-11~13 · FN-16 · FN-17)
//
// 🔑 이 화면의 규칙
//  · 열면 커서가 검색칸에 바로 (중간 화면 없음)
//  · 아무것도 안 쳐도 그 루틴의 부위 운동이 이미 목록에 떠 있다 — 이름을 몰라도 고를 수 있게
//  · 누르면 즉시 담기고 화면은 안 닫힌다 → 연속으로 여러 개
//  · 없으면 그 자리에서 만든다. 새 화면으로 안 넘어간다
"use client";

import { useMemo, useState } from "react";
import { useChagok } from "@/lib/chagok-store";
import { mainPartOf } from "@/lib/logic";
import { PARTS, type LogType, type Part } from "@/lib/types";

const LOG_LABEL: Record<LogType, string> = {
  weight_reps: "무게×횟수",
  reps: "횟수만",
  time: "시간",
};

type Props = {
  /** 지금 담고 있는 운동들 (이미 담긴 건 회색으로) */
  pickedIds: string[];
  /** 어느 루틴에 담는가 — 기본 부위를 정하는 데만 쓴다 */
  routineId: string | null;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
};

export default function ExercisePicker({
  pickedIds,
  routineId,
  onPick,
  onClose,
}: Props) {
  const { state, update } = useChagok();
  const routine = state.routines.find((r) => r.id === routineId) ?? null;

  const [q, setQ] = useState("");
  // 기본 부위 = 그 루틴에서 가장 많은 부위. 루틴이 비어 있으면 자주 쓰는 순 전체
  const [part, setPart] = useState<Part | null>(() =>
    mainPartOf(routine, state.exercises)
  );

  // 새로 만들기 칸 (같은 화면에서 아래로 펼쳐진다)
  const [making, setMaking] = useState(false);
  const [newPart, setNewPart] = useState<Part>("엉덩이");
  const [newLog, setNewLog] = useState<LogType>("weight_reps");

  const query = q.trim();

  const list = useMemo(() => {
    if (query) {
      // 글자를 치면 부위와 상관없이 전체에서 찾는다
      return state.exercises.filter((e) => e.name.includes(query));
    }
    if (part) return state.exercises.filter((e) => e.part === part);
    return state.exercises; // seed 순서 = 자주 쓰는 순
  }, [state.exercises, query, part]);

  const exactExists = state.exercises.some((e) => e.name === query);
  const showCreate = query !== "" && !exactExists;

  function createAndPick() {
    const name = query;
    if (!name) return;
    update((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        {
          id: name,
          name,
          part: newPart,
          logType: newLog,
          isCustom: true,
          video: null,
        },
      ],
    }));
    // 만들면 바로 그 루틴에 담긴다 (FN-13)
    onPick(name);
    setQ("");
    setMaking(false);
  }

  return (
    <div className="sheet" role="dialog" aria-label="운동 추가">
      <div className="sheet-head">
        <b>운동 추가</b>
        <button type="button" className="x" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <input
        className="search"
        autoFocus
        value={q}
        placeholder="검색하거나 새로 만들기…"
        onChange={(e) => {
          setQ(e.target.value);
          setMaking(false);
        }}
      />

      {/* 부위 알약 — 지금 고른 것만 노랑, 나머지는 그냥 글자 (PRD 3-2) */}
      {!query && (
        <div className="pills">
          {PARTS.map((p) => (
            <button
              key={p}
              type="button"
              className={`pill ${part === p ? "on" : ""}`}
              onClick={() => setPart(part === p ? null : p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="picklist">
        {showCreate && (
          <>
            <button
              type="button"
              className="make-row"
              onClick={() => setMaking((v) => !v)}
            >
              ＋ 「{query}」 새로 만들기
            </button>

            {making && (
              <div className="make-form">
                <div className="make-label">부위</div>
                <div className="pills">
                  {PARTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`pill ${newPart === p ? "on" : ""}`}
                      onClick={() => setNewPart(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="make-label">기록</div>
                <div className="pills">
                  {(Object.keys(LOG_LABEL) as LogType[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`pill ${newLog === k ? "on" : ""}`}
                      onClick={() => setNewLog(k)}
                    >
                      {LOG_LABEL[k]}
                    </button>
                  ))}
                </div>

                <button type="button" className="primary" onClick={createAndPick}>
                  만들기
                </button>
              </div>
            )}
          </>
        )}

        {list.map((ex) => {
          const already = pickedIds.includes(ex.id);
          return (
            <button
              key={ex.id}
              type="button"
              className={`pick-row ${already ? "already" : ""}`}
              disabled={already}
              onClick={() => onPick(ex.id)}
            >
              <span className="nm">{ex.name}</span>
              <span className="mark">{already ? "✓ 담김" : "＋"}</span>
            </button>
          );
        })}

        {list.length === 0 && !showCreate && (
          <p className="picknone">이 부위에는 아직 운동이 없어요.</p>
        )}
      </div>
    </div>
  );
}
