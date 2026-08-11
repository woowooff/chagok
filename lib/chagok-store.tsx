// 앱 전체가 같은 데이터를 보게 하는 통로.
// 🔑 저장은 여기 한 곳에서만 일어난다 (SPEC §4) — 화면들은 update()만 부른다.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { loadState, saveState } from "./storage";
import type { ChagokState } from "./types";

type Ctx = {
  state: ChagokState;
  update: (fn: (draft: ChagokState) => ChagokState) => void;
};

const ChagokContext = createContext<Ctx | null>(null);

export function ChagokProvider({ children }: { children: React.ReactNode }) {
  // 저장된 값은 브라우저에만 있으므로 화면이 뜬 뒤에 읽는다 (서버와 화면이 어긋나지 않게)
  const [state, setState] = useState<ChagokState | null>(null);

  useEffect(() => setState(loadState()), []);

  // 🔒 브라우저에게 "이 저장 내용은 함부로 지우지 말아달라"고 부탁한다.
  //
  // 왜 필요한가 — 로그인이 없어서 기록이 폰 안에만 있다. 그런데 브라우저는
  // 공간이 모자라거나 오래 안 들어온 사이트의 저장 내용을 스스로 지운다.
  // (특히 아이폰 사파리는 「7일 동안 안 들어간 사이트」의 내용을 지운다)
  //
  // ⚠️ 부탁일 뿐 보장은 아니다. 홈화면에 추가하면 승낙될 확률이 크게 오르고,
  //    그래도 최후의 안전장치는 「내보내기」(FN-71)다.
  useEffect(() => {
    const s = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!s?.persist || !s.persisted) return;
    s.persisted()
      .then((already) => (already ? true : s.persist()))
      .catch(() => {
        /* 안 되는 브라우저도 있다. 앱은 그냥 돌아가야 한다 */
      });
  }, []);

  const update = useCallback((fn: (draft: ChagokState) => ChagokState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  // 읽는 동안은 잠깐 비워둔다 (보통 한 순간)
  if (!state) return null;

  return (
    <ChagokContext.Provider value={{ state, update }}>
      {children}
    </ChagokContext.Provider>
  );
}

export function useChagok(): Ctx {
  const ctx = useContext(ChagokContext);
  if (!ctx) throw new Error("ChagokProvider 안에서만 쓸 수 있어요");
  return ctx;
}
