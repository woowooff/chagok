// 차곡 데이터 구조 — SPEC.md §4 그대로
// 글자 기록은 localStorage(`chagok.v1`), 사진은 IndexedDB(`chagok-photos`)에 따로 넣는다.

/** 부위 7개. 순서도 이 순서로 화면에 나온다 (PRD 5-B) */
export const PARTS = [
  "엉덩이",
  "하체",
  "코어",
  "등",
  "어깨",
  "가슴",
  "스트레칭",
] as const;
export type Part = (typeof PARTS)[number];

/** 기록 방식 3가지 (FN-14) — 안 쓰는 칸은 화면에 띄우지 않는다 */
export type LogType = "weight_reps" | "reps" | "time";

export type VideoPlatform = "youtube" | "tiktok" | "instagram";

export type Video = {
  platform: VideoPlatform;
  /** 유튜브 영상 번호. ⚠️ list·index는 절대 저장하지 않는다 (FN-22) */
  videoId: string | null;
  /** 구간 시작(초). null이면 처음부터 */
  startSec: number | null;
  /** 구간 끝(초). null이면 끝까지 */
  endSec: number | null;
  /** 세로 영상(Shorts)이면 화면을 세로로 크게 (FN-25) */
  isShorts: boolean;
  title: string;
  channel: string;
  thumb: string | null;
  /** 틱톡·인스타는 원본 주소만 (FN-26) */
  url: string;
};

export type Exercise = {
  id: string;
  name: string;
  part: Part;
  logType: LogType;
  /** 내가 만든 운동인지 (기본 목록은 false) */
  isCustom: boolean;
  /** 붙여둔 가이드 영상. 없으면 null */
  video: Video | null;
};

export type Routine = {
  id: string;
  name: string;
  order: number;
  exerciseIds: string[];
  /** 마지막으로 끝낸 날 'YYYY-MM-DD'. 한 번도 안 했으면 null → 오늘 루틴 1순위 (FN-08) */
  lastDoneAt: string | null;
  lastDurationSec: number | null;
  /** 예: '8/8' */
  lastSetsDone: string | null;
};

export type SetRecord = {
  exerciseId: string;
  /** 그 운동 안에서 몇 번째 세트인지 (1부터) */
  no: number;
  weight: number | null;
  reps: number | null;
  sec: number | null;
  done: boolean;
};

/** 루틴 1회 = 도토리 1개 (FN-33) */
export type Session = {
  id: string;
  routineId: string;
  /** 'YYYY-MM-DD' */
  date: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  sets: SetRecord[];
  /** Hevy에서 가져온 기록이면 true → 도토리로 세지 않는다 (FN-75) */
  imported?: boolean;
};

export type Verdict = "good" | "notbad" | "bad";
export type JunkRisk = "slight" | "medium" | "high";

export type Meal = {
  id: string;
  /** 찍은 시각 (ISO). 끼니 이름은 고르지 않는다 (FN-41) */
  at: string;
  /** 밥인지 간식인지 — AI가 판별 (FN-41b) */
  kind: "meal" | "snack";
  /** 식사일 때만 센다. 간식은 null */
  nth: number | null;
  /** IndexedDB 열쇠 */
  photoKey: string | null;
  verdict: { carb: Verdict; protein: Verdict; fat: Verdict } | null;
  junkRisk: JunkRisk | null;
  comment: string | null;
  /** 판정이 실패해도 사진과 시각은 남는다 (FN-45) */
  status: "done" | "pending" | "failed";
};

/** 눈바디 — 🔒 사진은 절대 밖으로 안 나간다 (FN-55) */
export type BodyPhoto = {
  /** 'YYYY-MM-DD' */
  date: string;
  front: string | null;
  side: string | null;
  back: string | null;
};

export type Settings = {
  /** 도토리 총 개수. 상한 없음, 초기화 없음 (FN-06) */
  acorns: number;
  createdAt: string;
};

export type ChagokState = {
  /** 구조가 바뀌어도 옛 기록을 고쳐 읽을 수 있게 남긴다 */
  version: 1;
  settings: Settings;
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  meals: Meal[];
  bodyPhotos: BodyPhoto[];
};
