// T-04 기본 운동 목록 (FN-10)
//
// 🔑 이 목록은 지어낸 게 아니라 **우경님의 실제 Hevy 기록에서 뽑았다.**
//    hevy_workout_data.csv · 858행 · 50세션 · 2025-10-22 ~ 2026-08-03
//    부위는 그 운동이 나온 루틴 이름으로 정하고, 이름에 「힙」이 들어가면 엉덩이로 (엉덩이를 따로 두기로 한 PRD 결정).
//    자동 배정이 틀린 6건은 03_Hevy가져오기_분석.md 에 근거를 적고 손으로 고쳤다.
//
// 맨 아래 「기본 제공」 4개만 CSV에 없던 것 — 엉덩이 맨몸 운동과 스트레칭이 비어 있어서 채웠다.

import type { Exercise, LogType, Part } from "./types";

type SeedRow = { name: string; part: Part; logType: LogType };

const SEED: SeedRow[] = [
  { name: "렛 풀다운 (케이블)", part: "등", logType: "weight_reps" },
  { name: "시티드 로우 (머신)", part: "등", logType: "weight_reps" },
  { name: "벤트 오버 로우 (덤벨)", part: "등", logType: "weight_reps" },
  { name: "레터럴 레이즈 (덤벨)", part: "어깨", logType: "weight_reps" },
  { name: "스모 스쿼트 (바벨)", part: "하체", logType: "weight_reps" },
  { name: "숄더 프레스 (덤벨)", part: "어깨", logType: "weight_reps" },
  { name: "리버스 펙덱 플라이 (머신)", part: "어깨", logType: "weight_reps" },
  { name: "불가리안 스플릿 스쿼트", part: "하체", logType: "weight_reps" },
  { name: "힙 쓰러스트 (바벨)", part: "엉덩이", logType: "weight_reps" },
  { name: "힙 어브덕션 (머신)", part: "엉덩이", logType: "weight_reps" },
  { name: "스쿼트 (스미스 머신)", part: "하체", logType: "weight_reps" },
  { name: "시티드 케이블 로우", part: "등", logType: "weight_reps" },
  { name: "인클라인 푸쉬 업", part: "가슴", logType: "reps" },
  { name: "스티프 데드 리프트", part: "하체", logType: "weight_reps" },
  { name: "레그 프레스 (머신)", part: "하체", logType: "weight_reps" },
  { name: "레그 익스텐션 (머신)", part: "하체", logType: "weight_reps" },
  { name: "프론트 레이즈 (덤벨)", part: "어깨", logType: "weight_reps" },
  { name: "T 바 로우", part: "등", logType: "weight_reps" },
  { name: "밴드스트레칭", part: "스트레칭", logType: "reps" },
  { name: "프론트 스쿼트", part: "하체", logType: "weight_reps" },
  { name: "루마니안 데드리프트 (덤벨)", part: "하체", logType: "weight_reps" },
  { name: "원암로우", part: "등", logType: "weight_reps" },
  { name: "벤치 프레스 (덤벨)", part: "가슴", logType: "weight_reps" },
  { name: "렛 풀다운 - 좁은 그립 (케이블)", part: "등", logType: "weight_reps" },
  { name: "스쿼트 (바벨)", part: "하체", logType: "weight_reps" },
  { name: "데드리프트 (바벨)", part: "하체", logType: "weight_reps" },
  { name: "체스트 플라이 (덤벨)", part: "가슴", logType: "weight_reps" },
  { name: "힙 어덕션 (머신)", part: "엉덩이", logType: "weight_reps" },
  { name: "스트레이트 암 풀다운 (케이블)", part: "등", logType: "weight_reps" },
  { name: "리버스 브이스쿼트", part: "하체", logType: "weight_reps" },
  { name: "로프 푸쉬 다운", part: "가슴", logType: "weight_reps" },
  { name: "트라이셉스 익스텐션 (덤벨)", part: "가슴", logType: "weight_reps" },
  { name: "하이로우", part: "등", logType: "weight_reps" },
  { name: "풀 업 (어시스트)", part: "등", logType: "weight_reps" },
  { name: "페이스 풀", part: "어깨", logType: "weight_reps" },
  { name: "트라이셉스 킥 백", part: "어깨", logType: "weight_reps" },
  { name: "케이블로우", part: "등", logType: "weight_reps" },
  { name: "컬시 런지", part: "하체", logType: "weight_reps" },
  { name: "수평 레그 프레스 (머신)", part: "하체", logType: "weight_reps" },
  { name: "굿 모닝 (바벨)", part: "하체", logType: "weight_reps" },
  { name: "원 레그 데드리프트", part: "하체", logType: "weight_reps" },
  { name: "시티드 레그 컬 (머신)", part: "하체", logType: "weight_reps" },
  { name: "라잉 레그 레이즈", part: "코어", logType: "reps" },
  { name: "사이드 밴드", part: "코어", logType: "reps" },
  { name: "덤벨 로우", part: "등", logType: "weight_reps" },
  { name: "핵 스쿼트 (머신)", part: "하체", logType: "weight_reps" },
  { name: "핵 스쿼트", part: "하체", logType: "weight_reps" },
  { name: "스쿼트 (머신)", part: "하체", logType: "weight_reps" },
  { name: "데드리프트 (덤벨)", part: "하체", logType: "weight_reps" },
  { name: "백 익스텐션 (중량 하이퍼익스텐션)", part: "코어", logType: "weight_reps" },
  { name: "바이셉스 컬 (덤벨)", part: "가슴", logType: "weight_reps" },
  { name: "아이소 레터럴 로우 (머신)", part: "등", logType: "weight_reps" },
  { name: "런지 (덤벨)", part: "하체", logType: "weight_reps" },
  { name: "체스트 프레스 (밴드)", part: "가슴", logType: "weight_reps" },
  { name: "스모 데드리프트", part: "하체", logType: "weight_reps" },
  { name: "백 익스텐션 (하이퍼익스텐션)", part: "코어", logType: "reps" },
  { name: "하이 로우 원암", part: "등", logType: "weight_reps" },

  // ↓ CSV에 없어서 채워 넣은 기본 제공 4개 (엉덩이 맨몸 · 스트레칭이 비어 있었다)
  { name: "클램쉘", part: "엉덩이", logType: "reps" },
  { name: "사이드 킥백", part: "엉덩이", logType: "reps" },
  { name: "골반교정 스트레칭", part: "스트레칭", logType: "time" },
  { name: "플랭크", part: "코어", logType: "time" },
];

/** 기본 운동 목록. 이름이 곧 id다 (Hevy 가져오기에서 이름으로 맞추기 때문) */
export function seedExercises(): Exercise[] {
  return SEED.map((row) => ({
    id: row.name,
    name: row.name,
    part: row.part,
    logType: row.logType,
    isCustom: false,
    video: null,
  }));
}
