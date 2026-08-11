// T-21 영상 제목·채널·썸네일 가져오기 (PRD 부록 A 규칙 4 · 위험 R2)
//
// 왜 서버를 한 번 거치나 — 브라우저에서 유튜브를 직접 부르면 막힐 수 있다(CORS).
// 우리 서버가 대신 물어보고 결과만 넘겨준다. ⚠️ API 키는 필요 없다.

import { NextResponse } from "next/server";

type Oembed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "주소가 없어요" }, { status: 400 });
  }

  // 🔒 아무 주소나 대신 불러주지 않는다 (우리 서버가 심부름꾼으로 악용되지 않게)
  let host: string;
  try {
    host = new URL(target).hostname.replace(/^www\./, "").replace(/^m\./, "");
  } catch {
    return NextResponse.json({ error: "주소를 못 읽었어요" }, { status: 400 });
  }
  const allowed = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com"];
  if (!allowed.some((h) => host === h || host.endsWith(`.${h}`))) {
    return NextResponse.json({ error: "지원하지 않는 주소예요" }, { status: 400 });
  }

  const endpoint =
    host.includes("tiktok")
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(target)}`
      : host.includes("instagram")
        ? null // 인스타는 열쇠 없이 못 가져온다 → 제목 없이 진행 (FN-26)
        : `https://www.youtube.com/oembed?url=${encodeURIComponent(
            target
          )}&format=json`;

  if (!endpoint) {
    return NextResponse.json({ title: null, channel: null, thumb: null });
  }

  try {
    const res = await fetch(endpoint, {
      // 같은 영상을 다시 물어보지 않게 하루 동안 기억해둔다
      next: { revalidate: 86400 },
      headers: { "user-agent": "chagok/1.0" },
    });
    if (!res.ok) {
      // 삭제·비공개·퍼가기 금지 영상 (FN-28)
      return NextResponse.json(
        { title: null, channel: null, thumb: null, unavailable: true },
        { status: 200 }
      );
    }
    const data = (await res.json()) as Oembed;
    return NextResponse.json({
      title: data.title ?? null,
      channel: data.author_name ?? null,
      thumb: data.thumbnail_url ?? null,
    });
  } catch {
    return NextResponse.json(
      { title: null, channel: null, thumb: null, unavailable: true },
      { status: 200 }
    );
  }
}
