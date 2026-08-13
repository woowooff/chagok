// 유튜브 재생기(IFrame API) 불러오기 — VideoPicker(구간 찍기)와 LoopPlayer(구간 반복)가 같이 쓴다.
//
// 왜 그냥 <iframe>이 아니라 API인가:
//  · 지금 몇 초인지 물어봐야 「시작·끝 찍기」가 된다
//  · 끝에 닿았는지 봐야 「구간 반복」이 된다
// 두 화면이 각자 불러오면 스크립트가 두 번 뜨므로, 여기 한 곳에서만 부른다.

export type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

/** onStateChange가 알려주는 상태값 중 우리가 쓰는 것 */
export const YT_ENDED = 0;

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoading: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiLoading;
}
