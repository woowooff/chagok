// 구간 반복 재생기 (2026-08-13)
//
// 🔑 왜 만들었나 — 우경님: *"내가 지정한 영상 구간을 반복재생하게 할 순 없어?"*
//    운동 중엔 폰을 다시 만질 손이 없다. 찍어둔 구간이 알아서 계속 돌아야 한다.
//
// ⚠️ 유튜브 주소에 `loop=1`만 붙이는 방법은 쓰지 않았다.
//    그건 「영상 전체」를 반복하는 기능이라, 두 바퀴째부터 끝 지점을 무시하고 계속 흘러간다.
//    그래서 재생기에게 직접 「지금 몇 초냐」고 물어보고 끝에 닿으면 시작으로 되돌린다.
"use client";

import { useEffect, useRef, useState } from "react";
import { loadYouTubeApi, YT_ENDED, type YTPlayer } from "@/lib/yt";
import type { Video } from "@/lib/types";

type Props = {
  video: Video;
  title: string;
  /** 영상이 안 뜰 때 안내 같은 것 (FN-28). .player 안에 그대로 놓인다 */
  children?: React.ReactNode;
};

export default function LoopPlayer({ video, title, children }: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  // 구간이 정해져 있으면 반복이 기본이다 (설정을 묻지 않는다 — 설계 헌법 4)
  const hasRange = video.startSec !== null || video.endSec !== null;
  const [loop, setLoop] = useState(true);
  // 재생기 안에서 읽어야 해서 ref로도 들고 있는다 (다시 만들지 않으려고)
  const loopRef = useRef(true);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = video.startSec ?? 0;
  const end = video.endSec;

  useEffect(() => {
    let dead = false;
    let timer: number | null = null;

    function backToStart() {
      const p = playerRef.current;
      if (!p) return;
      p.seekTo(start, true);
      p.playVideo();
    }

    void loadYouTubeApi().then(() => {
      if (dead || !holderRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(holderRef.current, {
        videoId: video.videoId,
        playerVars: {
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          autoplay: 1,
          start: Math.floor(start),
          // 반복을 꺼도 끝에서 멈추게 — 첫 바퀴는 유튜브가 알아서 세워준다
          ...(end !== null ? { end: Math.ceil(end) } : {}),
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === YT_ENDED && loopRef.current && hasRange) {
              backToStart();
            }
          },
        },
      });

      // 끝 지점 감시. 두 바퀴째부터는 유튜브가 안 멈춰주기 때문에 우리가 본다
      if (end !== null) {
        timer = window.setInterval(() => {
          const p = playerRef.current;
          if (!p || !loopRef.current) return;
          try {
            if (p.getCurrentTime() >= end) backToStart();
          } catch {
            /* 재생기가 아직 준비 전이면 그냥 넘어간다 */
          }
        }, 250);
      }
    });

    return () => {
      dead = true;
      if (timer !== null) window.clearInterval(timer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video.videoId, start, end, hasRange]);

  return (
    <>
      <div className={`player ${video.isShorts ? "vertical" : ""}`}>
        <div ref={holderRef} title={title} />
        {children}
      </div>

      {/* 구간이 없으면 반복할 「구간」 자체가 없다 → 버튼도 안 띄운다 */}
      {hasRange && (
        <button
          type="button"
          className={`loop-btn ${loop ? "on" : ""}`}
          onClick={() => setLoop((v) => !v)}
        >
          🔁 구간 반복 {loop ? "켜짐" : "꺼짐"}
        </button>
      )}
    </>
  );
}
