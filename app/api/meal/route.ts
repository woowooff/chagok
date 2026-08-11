// T-33 식단 사진 판정 (FN-41b·42·43)
//
// 🔒 API 키는 서버에서만 쓴다. 화면 코드에는 절대 들어가지 않는다 (NFR-06).
// 🚫 칼로리·그램 숫자는 만들지 않는다. 사진으로는 양을 알 수 없어 어차피 틀린다 (PRD #6).
// 🌰 말투 규칙: 나무라지 않는다. 「배드입니다」가 아니라 다음 끼니를 제안한다 (FN-43).

import { NextResponse } from "next/server";

const MODEL = "gemini-3.5-flash-lite"; // 사진 입력 확인 완료 (2026-08-11)
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = `너는 한국 음식에 밝은 다정한 영양사다. 사진 한 장을 보고 아주 짧게 판정한다.

판정 규칙
1. 탄수화물·단백질·지방을 각각 good / notbad / bad 로 매긴다.
   - good: 그 영양소가 적절하거나 좋은 형태로 들어있다
   - notbad: 조금 많거나 조금 아쉽다
   - bad: 눈에 띄게 많거나 거의 없다
2. junkRisk 는 가공식품·튀김·단 음식의 비중으로 slight / medium / high.
3. kind 는 밥상·식사면 "meal", 과자·빵·음료·디저트처럼 곁들여 먹는 것이면 "snack".

🚫 절대 하지 말 것
- 칼로리, 그램, 영양소 숫자를 말하지 않는다. 사진으로는 양을 알 수 없다.
- 나무라지 않는다. "나쁩니다" "피하세요" "과했네요" 같은 표현 금지.
- 사진이 흐리다거나 판단이 어렵다는 말은 하지 않는다. 보이는 대로 정한다.

✅ comment 규칙 (가장 중요)
- 한국어 1~2문장, 40자 안팎. 반말 아닌 부드러운 존댓말.
- 배드가 있어도 죄책감을 주지 않는다. 대신 **다음 끼니에 할 작은 것 하나**를 제안한다.
- 좋은 점을 먼저 말하고, 제안을 뒤에 붙인다.
- 예) "밥이 좀 많긴 한데 단백질이 잘 들어갔어요. 차곡차곡 잘하고 있어요!"
- 예) "단 게 당기는 날이죠. 다음 끼에 단백질 한 번 챙겨봐요!"`;

type Body = { image?: string; mimeType?: string };

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "아직 판정 열쇠가 설정되지 않았어요." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 이상해요." }, { status: 400 });
  }

  const image = body.image;
  const mimeType = body.mimeType ?? "image/jpeg";
  if (!image) {
    return NextResponse.json({ error: "사진이 없어요." }, { status: 400 });
  }
  // 축소해서 보내므로 이보다 크면 뭔가 잘못된 것
  if (image.length > 3_000_000) {
    return NextResponse.json({ error: "사진이 너무 커요." }, { status: 413 });
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: image } },
              { text: "이 사진을 판정해줘." },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 400,
          // 글이 아니라 정해진 칸으로 받는다 — 말을 뜯어 읽다가 틀리는 일이 없게
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              kind: { type: "STRING", enum: ["meal", "snack"] },
              carb: { type: "STRING", enum: ["good", "notbad", "bad"] },
              protein: { type: "STRING", enum: ["good", "notbad", "bad"] },
              fat: { type: "STRING", enum: ["good", "notbad", "bad"] },
              junkRisk: { type: "STRING", enum: ["slight", "medium", "high"] },
              comment: { type: "STRING" },
            },
            required: ["kind", "carb", "protein", "fat", "junkRisk", "comment"],
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[차곡] 판정 오류:", res.status, detail.slice(0, 400));
      if (res.status === 429) {
        return NextResponse.json(
          { error: "오늘 판정을 많이 했어요. 잠시 후 다시 해볼까요?" },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "판정을 못 받았어요. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "판정을 못 받았어요. 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text) as Record<string, string>;
    return NextResponse.json({
      kind: parsed.kind === "snack" ? "snack" : "meal",
      verdict: {
        carb: parsed.carb,
        protein: parsed.protein,
        fat: parsed.fat,
      },
      junkRisk: parsed.junkRisk,
      comment: parsed.comment,
    });
  } catch (e) {
    console.error("[차곡] 판정 실패:", e);
    // 사진과 시각은 화면 쪽에서 이미 저장했다 (FN-45)
    return NextResponse.json(
      { error: "판정을 못 받았어요. 나중에 다시 시도해 주세요." },
      { status: 502 }
    );
  }
}
