// T-27 스트레칭 보관함 (FN-07 · 36~38)
//
// 🔀 근력운동과 정반대다.
//    근력운동 — 사용법을 아니까 거의 안 본다 → 영상은 한 줄로 접힘, 기록이 주인공
//    스트레칭 — 저장해두고 골라서 본다     → 썸네일 격자, 영상이 주인공
//
// 🚫 고정된 「매일 세트」를 만들지 않는다 (FN-38). 그날 필요한 걸 그때 고른다.
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import VideoPicker from "@/components/VideoPicker";
import { useChagok } from "@/lib/chagok-store";
import { fmtClock, youtubeEmbedUrl, youtubeThumb } from "@/lib/video";
import { newId, today } from "@/lib/storage";
import type { Exercise, Video } from "@/lib/types";

/** 스트레칭 기록은 루틴이 아니므로 도토리를 주지 않는다 (도토리는 「루틴 끝내기」에서만) */
const STRETCH_KEY = "__stretch__";

export default function StretchPage() {
  const router = useRouter();
  const { state, update } = useChagok();

  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // 🐛 2026-08-12 기본 제공 스트레칭(밴드·골반교정)은 영상이 비어 있는데 붙일 길이 없었다.
  //    replaceVideo를 만들어놓고 화면에 연결을 안 해서, 눌러도 아무 일이 없었음.
  const [editFor, setEditFor] = useState<Exercise | null>(null);
  // 재생을 시작한 시각 — 「했어요」를 누르면 그동안 흐른 시간이 기록된다
  const startedAt = useRef<number | null>(null);

  const items = useMemo(
    () => state.exercises.filter((e) => e.part === "스트레칭"),
    [state.exercises]
  );

  /** 그 스트레칭을 마지막으로 한 날 */
  function lastDayOf(exId: string): string | null {
    const days = state.sessions
      .filter((s) => s.routineId === STRETCH_KEY)
      .filter((s) => s.sets.some((x) => x.exerciseId === exId))
      .map((s) => s.date)
      .sort();
    return days.length ? days[days.length - 1] : null;
  }

  /** 영상에 구간이 정해져 있으면 그 길이를 보여준다 (유튜브가 전체 길이는 안 알려준다) */
  function rangeLen(v: Video | null): string | null {
    if (!v || v.startSec === null || v.endSec === null) return null;
    return fmtClock(Math.max(0, v.endSec - v.startSec));
  }

  function addFromVideo(video: Video | null) {
    setAdding(false);
    if (!video) return;
    // 영상이 곧 항목이다. 이름은 영상 제목을 쓴다
    let name = video.title || "스트레칭";
    if (state.exercises.some((e) => e.name === name)) name = `${name} (2)`;
    update((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        {
          id: name,
          name,
          part: "스트레칭",
          logType: "time",
          isCustom: true,
          video,
        },
      ],
    }));
  }

  /** 스트레칭 지우기 — 기본 제공(밴드·골반교정)도 지울 수 있다 */
  function removeStretch(ex: Exercise) {
    const logged = state.sessions.filter((s) =>
      s.sets.some((x) => x.exerciseId === ex.id)
    ).length;
    const lines = [`「${ex.name}」을(를) 지울까요?`];
    if (logged > 0) {
      lines.push(`지난 기록 ${logged}개도 기록 탭에서 안 보이게 돼요.`);
    }
    if (!window.confirm(lines.join("\n"))) return;

    if (openId === ex.id) setOpenId(null);
    update((s) => ({
      ...s,
      exercises: s.exercises.filter((e) => e.id !== ex.id),
      // 어느 루틴에 담겨 있었다면 거기서도 같이 뺀다 (없는 운동이 남지 않게)
      routines: s.routines.map((r) => ({
        ...r,
        exerciseIds: r.exerciseIds.filter((id) => id !== ex.id),
      })),
    }));
  }

  function replaceVideo(exId: string, video: Video | null) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exId ? { ...e, video } : e
      ),
    }));
  }

  /** 「했어요」 — 재생한 만큼을 그날 기록으로 남긴다 */
  function markDone(ex: Exercise) {
    const sec = startedAt.current
      ? Math.max(5, Math.round((Date.now() - startedAt.current) / 1000))
      : 30;
    startedAt.current = null;

    update((s) => {
      const day = today();
      const existing = s.sessions.find(
        (x) => x.routineId === STRETCH_KEY && x.date === day
      );
      if (existing) {
        return {
          ...s,
          sessions: s.sessions.map((x) =>
            x.id !== existing.id
              ? x
              : {
                  ...x,
                  sets: [
                    ...x.sets,
                    {
                      exerciseId: ex.id,
                      no: x.sets.length + 1,
                      weight: null,
                      reps: null,
                      sec,
                      done: true,
                    },
                  ],
                }
          ),
        };
      }
      return {
        ...s,
        sessions: [
          ...s.sessions,
          {
            id: newId("st"),
            routineId: STRETCH_KEY,
            date: day,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            durationSec: sec,
            sets: [
              {
                exerciseId: ex.id,
                no: 1,
                weight: null,
                reps: null,
                sec,
                done: true,
              },
            ],
          },
        ],
      };
    });
    setOpenId(null);
  }

  return (
    <>
      <div className="topbar">
        <button type="button" onClick={() => router.push("/")} aria-label="뒤로">
          ‹
        </button>
        <b>스트레칭</b>
        <span className="sub">{items.length}개</span>
      </div>

      <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
        필요한 걸 그때그때 골라서 하세요. 정해진 순서는 없어요.
      </p>

      <div className="st-grid">
        {items.map((ex) => {
          const open = openId === ex.id;
          const last = lastDayOf(ex.id);
          const len = rangeLen(ex.video);
          const thumb =
            ex.video?.thumb ??
            (ex.video?.videoId ? youtubeThumb(ex.video.videoId) : null);

          return (
            <div key={ex.id} className={`st-card ${open ? "open" : ""}`}>
              {/* 접혀 있을 때만 ✕ — 영상을 보는 중엔 눌릴 일이 없게 */}
              {!open && (
                <button
                  type="button"
                  className="st-del"
                  aria-label={`${ex.name} 삭제`}
                  onClick={() => removeStretch(ex)}
                >
                  ✕
                </button>
              )}
              {open && ex.video?.videoId ? (
                <>
                  <div
                    className={`player ${ex.video.isShorts ? "vertical" : ""}`}
                  >
                    <iframe
                      src={youtubeEmbedUrl(ex.video, { autoplay: true })}
                      title={ex.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                  <div className="st-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => markDone(ex)}
                    >
                      했어요
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        startedAt.current = null;
                        setOpenId(null);
                        setEditFor(ex);
                      }}
                    >
                      영상 바꾸기
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        startedAt.current = null;
                        setOpenId(null);
                      }}
                    >
                      닫기
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="st-face"
                  onClick={() => {
                    // 영상이 없으면 「붙이는 창」을 연다. 막다른 길을 만들지 않는다
                    if (!ex.video) {
                      setEditFor(ex);
                      return;
                    }
                    startedAt.current = Date.now();
                    setOpenId(ex.id);
                  }}
                >
                  <span className="st-thumb">
                    {thumb ? (
                      // 남의 서버 이미지라 최적화 없이 그대로
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" />
                    ) : (
                      // 「영상 없음」은 막힌 느낌을 준다. 누르면 된다고 말해준다
                      <span className="st-nothumb">＋ 영상 붙이기</span>
                    )}
                    {len && <span className="st-len">{len}</span>}
                  </span>
                  <span className="st-name">{ex.name}</span>
                  <span className="st-meta">
                    {ex.video?.channel || " "}
                    {last && ` · ${last.slice(5).replace("-", "/")}`}
                  </span>
                </button>
              )}
            </div>
          );
        })}

        {/* 맨 끝에 영상 추가 칸 */}
        <button
          type="button"
          className="st-card st-add"
          onClick={() => setAdding(true)}
        >
          ＋<br />
          영상 추가
        </button>
      </div>

      {items.length === 0 && (
        <p className="hint">
          유튜브에서 스트레칭 영상 링크를 복사해 <b>＋ 영상 추가</b>에 넣어두면,
          <br />
          운동 끝나고 골라서 바로 볼 수 있어요.
        </p>
      )}

      {adding && (
        <VideoPicker
          exerciseName="새 스트레칭"
          current={null}
          onSave={addFromVideo}
          onClose={() => setAdding(false)}
        />
      )}

      {/* 이미 있는 스트레칭에 영상을 붙이거나 갈아끼운다 (이름은 그대로 둔다) */}
      {editFor && (
        <VideoPicker
          exerciseName={editFor.name}
          current={editFor.video ?? null}
          onSave={(v) => {
            replaceVideo(editFor.id, v);
            setEditFor(null);
          }}
          onClose={() => setEditFor(null)}
        />
      )}
    </>
  );
}
