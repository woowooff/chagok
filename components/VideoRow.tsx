// T-26 · T-24c 운동 안의 영상 한 줄 (FN-20 · 28)
//
// 🔑 영상은 「매번 보는 것」이 아니라 「저장해두고 가끔 꺼내보는 것」이다.
//    그래서 한 줄로 접혀 있고, 누를 때만 펼쳐진다. 기록이 주인공이다.
// 🔑 영상이 죽어도 기록은 절대 막지 않는다 — 헬스장에서 기록을 못 하면 그날이 통째로 날아간다.
"use client";

import { useEffect, useState } from "react";
import LoopPlayer from "@/components/LoopPlayer";
import { fmtClock, platformLabel } from "@/lib/video";
import { loadYouTubeApi } from "@/lib/yt";
import type { Video } from "@/lib/types";

type Props = {
  video: Video | null;
  onEdit: () => void;
};

export default function VideoRow({ video, onEdit }: Props) {
  const [open, setOpen] = useState(false);

  // ⏱ 재생기를 미리 받아둔다. 누른 뒤에 받아오면 그 사이에 「손가락으로 눌렀다」는 신호가
  //    풀려서 브라우저가 자동재생을 막는다 (= 눌러도 검은 화면).
  useEffect(() => {
    void loadYouTubeApi();
  }, []);

  if (!video) {
    return (
      <button type="button" className="vrow vadd" onClick={onEdit}>
        ＋ 영상 붙이기
      </button>
    );
  }

  const hasRange = video.startSec !== null || video.endSec !== null;
  const isYoutube = video.platform === "youtube" && video.videoId;

  return (
    <div className="vwrap">
      <div className="vrow">
        <button
          type="button"
          className="vmain"
          onClick={() => {
            if (isYoutube) setOpen((v) => !v);
            else window.open(video.url, "_blank", "noopener,noreferrer");
          }}
        >
          <span className="vplay" aria-hidden="true">
            ▶
          </span>
          <span className="vtext">
            <span className="vt">{video.title}</span>
            <span className="vs">
              {video.channel && `${video.channel}`}
              {hasRange && (
                <>
                  {video.channel ? " · " : ""}
                  {fmtClock(video.startSec ?? 0)} → {fmtClock(video.endSec)}
                </>
              )}
              {!isYoutube && ` · ${platformLabel(video.platform)}에서 열기`}
            </span>
          </span>
          {isYoutube && <span className="vchev">{open ? "⌄" : "›"}</span>}
        </button>
        <button
          type="button"
          className="vmore"
          onClick={onEdit}
          aria-label="영상 교체 또는 구간 다시"
        >
          ⋯
        </button>
      </div>

      {open && isYoutube && (
        <LoopPlayer video={video} title={video.title}>
          {/* 삭제·비공개·퍼가기 금지 영상일 수 있다 (FN-28) */}
          <p className="vfallback">
            영상이 안 나오나요?{" "}
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              유튜브에서 열기
            </a>{" "}
            ·{" "}
            <button type="button" className="linklike" onClick={onEdit}>
              다시 붙이기
            </button>
          </p>
        </LoopPlayer>
      )}
    </div>
  );
}
