// T-20 주소 해석기 (FN-22·23·25, PRD 부록 A)
//
// 🚨 이 파일이 차곡에서 가장 위험한 곳이다.
//    유튜브 주소에 붙어 오는 `list=`(재생목록)를 안 버리면,
//    4:05에서 멈춰야 할 영상이 다음 영상으로 계속 넘어간다 → 핵심 기능이 통째로 망가진다.

import type { Video, VideoPlatform } from "./types";

export type ParsedUrl =
  | {
      platform: "youtube";
      videoId: string;
      /** 주소에 t=가 있었으면 시작 지점 기본값으로 쓴다 (FN-23) */
      startSec: number | null;
      /** 세로 영상이면 화면을 세로로 크게 (FN-25). 구간 자르기는 똑같이 된다 */
      isShorts: boolean;
    }
  | { platform: "tiktok" | "instagram"; url: string }
  | null;

/** `2s` `90` `1m30s` `1h2m3s` → 초 */
export function parseTimeParam(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** 유튜브 영상 번호는 11글자 */
function looksLikeId(s: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(s);
}

export function parseVideoUrl(input: string): ParsedUrl {
  const raw = input.trim();
  if (!raw) return null;

  let u: URL;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const path = u.pathname;

  // ── 유튜브 ───────────────────────────────
  if (host === "youtu.be") {
    const id = path.slice(1).split("/")[0];
    if (!looksLikeId(id)) return null;
    return {
      platform: "youtube",
      videoId: id,
      startSec: parseTimeParam(u.searchParams.get("t")),
      isShorts: false,
    };
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    // /shorts/ID — 세로 영상. watch?v=ID 와 똑같이 다룬다
    if (path.startsWith("/shorts/")) {
      const id = path.split("/")[2];
      if (!looksLikeId(id)) return null;
      return {
        platform: "youtube",
        videoId: id,
        startSec: parseTimeParam(u.searchParams.get("t")),
        isShorts: true,
      };
    }

    if (path.startsWith("/embed/")) {
      const id = path.split("/")[2];
      if (!looksLikeId(id)) return null;
      return {
        platform: "youtube",
        videoId: id,
        startSec: parseTimeParam(u.searchParams.get("start")),
        isShorts: false,
      };
    }

    if (path === "/watch") {
      const id = u.searchParams.get("v");
      if (!id || !looksLikeId(id)) return null;
      // 🚨 여기가 핵심 — v 만 챙기고 list·index 는 쳐다보지도 않는다
      return {
        platform: "youtube",
        videoId: id,
        startSec: parseTimeParam(u.searchParams.get("t")),
        isShorts: false,
      };
    }
    return null;
  }

  // ── 틱톡 · 인스타 — 구간 재생이 막혀 있어 주소만 보관 (FN-26) ──
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return { platform: "tiktok", url: u.toString() };
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return { platform: "instagram", url: u.toString() };
  }

  return null;
}

/** 썸네일 — API 키 없이 주소만으로 가져온다 (PRD 부록 A 규칙 4) */
export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** 재생용 주소. 구간이 있으면 그 구간만 틀고 끝에서 멈춘다 */
export function youtubeEmbedUrl(
  v: Video,
  opts: { autoplay?: boolean } = {}
): string {
  const p = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  if (v.startSec !== null) p.set("start", String(Math.floor(v.startSec)));
  if (v.endSec !== null) p.set("end", String(Math.ceil(v.endSec)));
  if (opts.autoplay) p.set("autoplay", "1");
  return `https://www.youtube.com/embed/${v.videoId}?${p.toString()}`;
}

/** 3:20 처럼 보여주기 */
export function fmtClock(sec: number | null): string {
  if (sec === null) return "—";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function platformLabel(p: VideoPlatform): string {
  return p === "tiktok" ? "틱톡" : p === "instagram" ? "인스타" : "유튜브";
}
