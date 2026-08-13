// T-22·23·24·24b·25 영상 붙이기 + 구간 찍기 (FN-21~26)
//
// 🔑 흐름: 주소 붙여넣기 → 영상이 뜸 → 보다가 「시작 찍기」/「끝 찍기」 → ±1초로 다듬기 → 저장
//    Shorts도 똑같이 자른다 (FN-25). 한 동작이 10초라 미세조정(FN-24b)이 꼭 필요하다.
"use client";

import { useEffect, useRef, useState } from "react";
import { fmtClock, parseVideoUrl, platformLabel, youtubeThumb } from "@/lib/video";
import { loadYouTubeApi, type YTPlayer } from "@/lib/yt";
import type { Video } from "@/lib/types";

type Props = {
  exerciseName: string;
  current: Video | null;
  onSave: (v: Video | null) => void;
  onClose: () => void;
};

/* 유튜브 재생기 불러오기는 `lib/yt.ts` 한 곳으로 모았다 (2026-08-13).
   LoopPlayer(구간 반복)와 같은 스크립트를 쓰는데, 각자 부르면 두 번 뜬다 */

export default function VideoPicker({
  exerciseName,
  current,
  onSave,
  onClose,
}: Props) {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Video | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  /* 주소를 붙여넣으면 해석하고 제목·썸네일을 가져온다 */
  async function accept(raw: string) {
    setError(null);
    const parsed = parseVideoUrl(raw);
    if (!parsed) {
      setError("유튜브·틱톡·인스타 주소를 붙여넣어 주세요.");
      return;
    }

    if (parsed.platform !== "youtube") {
      setLoading(true);
      const meta = await fetchMeta(parsed.url);
      setLoading(false);
      setDraft({
        platform: parsed.platform,
        videoId: null,
        startSec: null,
        endSec: null,
        isShorts: false,
        title: meta.title ?? `${platformLabel(parsed.platform)} 영상`,
        channel: meta.channel ?? "",
        thumb: meta.thumb,
        url: parsed.url,
      });
      return;
    }

    const watchUrl = `https://www.youtube.com/watch?v=${parsed.videoId}`;
    setLoading(true);
    const meta = await fetchMeta(watchUrl);
    setLoading(false);
    setDraft({
      platform: "youtube",
      videoId: parsed.videoId,
      // 주소에 t=가 있었으면 시작 지점으로 미리 채운다 (FN-23)
      startSec: parsed.startSec,
      endSec: null,
      isShorts: parsed.isShorts,
      title: meta.title ?? "제목을 못 가져왔어요",
      channel: meta.channel ?? "",
      thumb: meta.thumb ?? youtubeThumb(parsed.videoId),
      url: watchUrl,
    });
  }

  async function fetchMeta(target: string) {
    try {
      const res = await fetch(`/api/oembed?url=${encodeURIComponent(target)}`);
      return (await res.json()) as {
        title: string | null;
        channel: string | null;
        thumb: string | null;
      };
    } catch {
      return { title: null, channel: null, thumb: null };
    }
  }

  /* 유튜브면 재생기를 띄운다 — 지금 몇 초인지 알아야 구간을 찍을 수 있다 */
  useEffect(() => {
    if (!draft || draft.platform !== "youtube" || !draft.videoId) return;
    let dead = false;

    loadYouTubeApi().then(() => {
      if (dead || !holderRef.current || !window.YT?.Player) return;
      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(holderRef.current, {
        videoId: draft.videoId,
        playerVars: {
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          start: draft.startSec ?? 0,
        },
        events: { onReady: () => !dead && setPlayerReady(true) },
      });
    });

    return () => {
      dead = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
    // 영상이 바뀔 때만 다시 만든다 (구간을 찍을 때마다 다시 만들면 안 된다)
  }, [draft?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  function markNow(which: "start" | "end") {
    const p = playerRef.current;
    if (!p || !draft) return;
    const t = Math.max(0, Math.round(p.getCurrentTime()));
    setDraft(
      which === "start" ? { ...draft, startSec: t } : { ...draft, endSec: t }
    );
  }

  /* FN-24b 미세조정 — 10초짜리 구간을 맞추려면 이게 있어야 한다 */
  function nudge(which: "start" | "end", delta: number) {
    if (!draft) return;
    const cur = which === "start" ? draft.startSec : draft.endSec;
    if (cur === null) return;
    const next = Math.max(0, cur + delta);
    setDraft(
      which === "start"
        ? { ...draft, startSec: next }
        : { ...draft, endSec: next }
    );
    playerRef.current?.seekTo(next, true);
  }

  const isYoutube = draft?.platform === "youtube" && draft.videoId;
  // 끝이 시작보다 앞이면 저장을 막는다
  const badRange =
    draft?.startSec !== null &&
    draft?.endSec !== null &&
    draft !== null &&
    (draft.endSec ?? 0) <= (draft.startSec ?? 0);

  return (
    <div className="sheet" role="dialog" aria-label="영상 붙이기">
      <div className="sheet-head">
        <b>{draft ? "영상 구간 정하기" : "영상 붙이기"}</b>
        <button type="button" className="x" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <p className="hint" style={{ marginTop: 0 }}>
        {exerciseName}
      </p>

      {!draft && (
        <>
          <input
            className="search"
            autoFocus
            value={url}
            placeholder="유튜브·틱톡·인스타 주소 붙여넣기"
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text");
              if (t) {
                e.preventDefault();
                setUrl(t);
                void accept(t);
              }
            }}
            // 폰 키보드의 「완료(엔터)」로도 넘어가게 — 확인 버튼을 못 찾는 일이 없도록
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim()) void accept(url);
            }}
          />
          {error && <p className="err">{error}</p>}
          <button
            type="button"
            className="primary"
            style={{ marginTop: 14 }}
            disabled={!url.trim() || loading}
            onClick={() => void accept(url)}
          >
            {loading ? "가져오는 중…" : "확인"}
          </button>
          <p className="hint">
            유튜브에서 <b>공유 → 링크 복사</b>한 걸 그대로 붙여넣으면 돼요.
            <br />
            재생목록에서 복사해도 <b>그 영상 하나만</b> 저장됩니다.
          </p>
        </>
      )}

      {draft && (
        <>
          {isYoutube ? (
            <div className={`player ${draft.isShorts ? "vertical" : ""}`}>
              <div ref={holderRef} />
            </div>
          ) : (
            <div className="tt-card">
              {draft.thumb && (
                // 남의 서버 이미지라 최적화 없이 그대로 띄운다
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.thumb} alt="" />
              )}
              <p className="tt-note">
                {platformLabel(draft.platform)}는 앱 안에서 구간 재생이 안 돼요.
                <br />
                눌러서 해당 앱에서 봐주세요.
              </p>
            </div>
          )}

          <p className="vtitle">
            <b>{draft.title}</b>
            {draft.channel && <span> · {draft.channel}</span>}
          </p>

          {isYoutube && (
            <>
              <div className="mark-row">
                <button
                  type="button"
                  className="mark-btn"
                  disabled={!playerReady}
                  onClick={() => markNow("start")}
                >
                  ⏱ 시작 찍기
                </button>
                <button
                  type="button"
                  className="mark-btn"
                  disabled={!playerReady}
                  onClick={() => markNow("end")}
                >
                  ⏱ 끝 찍기
                </button>
              </div>

              <div className="range">
                <RangeRow
                  label="시작"
                  value={draft.startSec}
                  onNudge={(d) => nudge("start", d)}
                  onClear={() => setDraft({ ...draft, startSec: null })}
                />
                <RangeRow
                  label="끝"
                  value={draft.endSec}
                  onNudge={(d) => nudge("end", d)}
                  onClear={() => setDraft({ ...draft, endSec: null })}
                />
              </div>

              {badRange && (
                <p className="err">끝이 시작보다 앞이에요. 다시 찍어주세요.</p>
              )}
              <p className="hint">
                재생하다가 원하는 순간에 누르면 돼요. 조금 늦게 눌렸으면{" "}
                <b>−1초</b>로 다듬으세요.
                {draft.isShorts && (
                  <>
                    <br />
                    Shorts는 한 동작이 10초쯤이라 <b>미세조정</b>이 특히 쓸모
                    있어요.
                  </>
                )}
              </p>
            </>
          )}

          <div className="bottom-cta">
            <button
              type="button"
              className="primary"
              disabled={badRange}
              onClick={() => onSave(draft)}
            >
              저장
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDraft(null);
                setUrl("");
              }}
            >
              다른 영상으로
            </button>
            {current && (
              <button
                type="button"
                className="ghost danger"
                onClick={() => onSave(null)}
              >
                영상 떼기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RangeRow({
  label,
  value,
  onNudge,
  onClear,
}: {
  label: string;
  value: number | null;
  onNudge: (d: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="range-row">
      <span className="rl">{label}</span>
      <b className="rv">{fmtClock(value)}</b>
      <button type="button" disabled={value === null} onClick={() => onNudge(-1)}>
        −1초
      </button>
      <button type="button" disabled={value === null} onClick={() => onNudge(1)}>
        ＋1초
      </button>
      <button
        type="button"
        className="rclear"
        disabled={value === null}
        onClick={onClear}
      >
        지우기
      </button>
    </div>
  );
}
