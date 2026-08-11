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
