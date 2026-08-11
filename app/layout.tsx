import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import TabBar from "@/components/TabBar";
import { ChagokProvider } from "@/lib/chagok-store";
import "./globals.css";

// 주아체 — 배달의민족이 무료로 푼 둥글둥글한 글씨체 (PRD 0장)
const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
  display: "swap",
});

export const metadata: Metadata = {
  title: "차곡 🌰",
  description: "루틴을 차곡차곡 쌓는 운동·식단·눈바디 기록",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 폰에서 두 손가락으로 확대하는 건 막지 않는다 (접근성)
  themeColor: "#fff8ea",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={jua.variable}>
      <body>
        <ChagokProvider>
          <div className="app">{children}</div>
          <TabBar />
        </ChagokProvider>
      </body>
    </html>
  );
}
