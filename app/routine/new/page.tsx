// T-11 루틴 만들기 (FN-05) — 이름은 자유 입력, 운동을 골라 담고, 끌어서 순서 변경
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ExercisePicker from "@/components/ExercisePicker";
import { useChagok } from "@/lib/chagok-store";
import { newId } from "@/lib/storage";

export default function NewRoutinePage() {
  const router = useRouter();
  const { state, update } = useChagok();

  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // 🔑 2026-08-13 ② — 이름만 있으면 만들어진다. 운동은 만든 뒤에 담아도 된다.
  //    (전에는 「이름 + 운동 1개 이상」이라, 이름만 친 상태에서 만들기가 꺼져 있었다.
  //     우경님: *"루틴이름을 치면 그다음 만들기 버튼도 비활성화... 이게 맞음?"*)
  const canSave = name.trim() !== "";

  function move(from: number, to: number) {
    if (to < 0 || to >= picked.length || from === to) return;
    const next = [...picked];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setPicked(next);
  }

  function save() {
    if (!canSave) return;
    const id = newId("rt");
    update((s) => ({
      ...s,
      routines: [
        ...s.routines,
        {
          id,
          name: name.trim(),
          order: s.routines.length,
          exerciseIds: picked,
          lastDoneAt: null,
          lastDurationSec: null,
          lastSetsDone: null,
        },
      ],
    }));
    // 운동을 아직 안 담았으면 담는 자리로 바로 데려간다 (홈으로 튕기지 않는다)
    router.push(
      picked.length > 0 ? "/" : `/routine/${encodeURIComponent(id)}`
    );
  }

  return (
    <>
      <div className="topbar">
        <button type="button" onClick={() => router.push("/")} aria-label="뒤로">
          ‹
        </button>
        <b>루틴 만들기</b>
      </div>

      <input
        className="search"
        autoFocus
        value={name}
        placeholder="루틴 이름 (예: 힙데이)"
        onChange={(e) => setName(e.target.value)}
      />

      <ul className="pick-order">
        {picked.map((id, i) => (
          <li
            key={id}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
            }}
          >
            <span className="grip" aria-hidden="true">
              ⠿
            </span>
            <span className="nm">{id}</span>
            {/* 끌기가 어려운 폰을 위해 화살표도 같이 둔다 */}
            <button type="button" onClick={() => move(i, i - 1)} aria-label="위로">
              ↑
            </button>
            <button type="button" onClick={() => move(i, i + 1)} aria-label="아래로">
              ↓
            </button>
            <button
              type="button"
              onClick={() => setPicked(picked.filter((x) => x !== id))}
              aria-label="빼기"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="add-row"
        onClick={() => setPickerOpen(true)}
      >
        ＋ 운동 추가
      </button>

      <div className="bottom-cta">
        {/* 꺼져 있을 땐 「왜 꺼졌는지」를 버튼이 스스로 말한다.
            이제 막히는 경우는 「이름이 비었을 때」 하나뿐이다 */}
        <button
          type="button"
          className="primary"
          disabled={!canSave}
          onClick={save}
        >
          {canSave ? "만들기" : "이름을 먼저 적어주세요"}
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          pickedIds={picked}
          routineId={null}
          onPick={(id) => setPicked((p) => (p.includes(id) ? p : [...p, id]))}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* 만들기 전에도 운동 개수는 보이게 */}
      {picked.length > 0 && (
        <p className="hint">운동 {picked.length}개 · 끌거나 화살표로 순서를 바꿔요</p>
      )}
      {state.routines.length === 0 && picked.length === 0 && (
        <p className="hint">
          Hevy에서 하시던 「하체」 「등」 같은 이름 그대로 붙이면 익숙해요.
        </p>
      )}
    </>
  );
}
