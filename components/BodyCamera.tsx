// T-41 눈바디 촬영 — 지난 사진을 흐리게 겹쳐 보여준다 (FN-51)
//
// 🔑 눈바디 비교가 실패하는 가장 큰 이유는 「각도가 달라서」다.
//    지난 실루엣에 몸을 맞추면 매번 같은 자세·거리로 찍힌다. 이 하나로 해결된다.
//
// ⚠️ 겹쳐 보기는 브라우저 카메라(getUserMedia)를 써야 하는데, 이건 **https 에서만** 허용된다.
//    폰에서 http://192.168.x.x 로 열면 막히므로, 그때는 폰 기본 카메라로 넘긴다(겹치기 없이).
//    → 배포(https)하면 겹쳐 보기가 살아난다.
//
// 🔒 여기서 찍은 사진은 어디로도 보내지 않는다 (FN-55). 이 파일에 fetch 가 하나도 없다.
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 겹쳐 보여줄 지난 사진 (없으면 안 겹친다) */
  ghostUrl: string | null;
  label: string;
  onShot: (blob: Blob) => void;
  onClose: () => void;
};

export default function BodyCamera({
  ghostUrl,
  label,
  onShot,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(0.3);

  useEffect(() => {
    let dead = false;

    async function start() {
      const secure =
        typeof window !== "undefined" &&
        window.isSecureContext &&
        navigator.mediaDevices?.getUserMedia;
      if (!secure) {
        setBlocked(
          "지금 주소(http)에서는 겹쳐 보기를 쓸 수 없어요. 인터넷에 올리면(https) 됩니다."
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1080 } },
          audio: false,
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setBlocked("카메라를 열 수 없어요. 브라우저에서 카메라 권한을 켜주세요.");
      }
    }
    void start();

    return () => {
      dead = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    // 긴 변 1080px로 맞춰서 저장 (NFR-09)
    const long = Math.max(video.videoWidth, video.videoHeight);
    const scale = long > 1080 ? 1080 / long : 1;
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // 겹쳐 보던 지난 사진은 찍히지 않는다 — 화면 안내일 뿐
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onShot(blob);
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <div className="cam-sheet" role="dialog" aria-label={`${label} 촬영`}>
      <div className="cam-top">
        <b>{label} 찍기</b>
        <button type="button" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      {blocked ? (
        <div className="cam-blocked">
          <p>{blocked}</p>
          <p className="sub">
            지금은 폰 기본 카메라로 찍어주세요. 겹쳐 보기 없이도 기록은 남습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="cam-view">
            <video ref={videoRef} playsInline muted />
            {/* 🔑 지난 사진이 아주 흐리게 겹친다 */}
            {ghostUrl && (
              // 폰 안에만 있는 사진
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ghost" src={ghostUrl} alt="" style={{ opacity: ghostOpacity }} />
            )}
          </div>

          {ghostUrl && (
            <label className="ghost-ctl">
              지난 사진 진하기
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.05}
                value={ghostOpacity}
                onChange={(e) => setGhostOpacity(Number(e.target.value))}
              />
            </label>
          )}

          <button
            type="button"
            className="shutter"
            disabled={!ready}
            onClick={shoot}
            aria-label="찍기"
          >
            <span />
          </button>
          <p className="cam-hint">
            {ghostUrl
              ? "지난번 실루엣에 몸을 맞추면 같은 각도로 찍혀요."
              : "첫 사진이에요. 다음부터 이 사진이 흐리게 겹쳐 보입니다."}
          </p>
        </>
      )}
    </div>
  );
}
