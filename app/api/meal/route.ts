// T-33 식단 사진 판정 (FN-41b·42·43)
//
// 🔒 API 키는 서버에서만 쓴다. 화면 코드에는 절대 들어가지 않는다 (NFR-06).
// 🚫 칼로리·그램 숫자는 만들지 않는다. 사진으로는 양을 알 수 없어 어차피 틀린다 (PRD #6).
// 🌰 말투 규칙: 나무라지 않는다. 「배드입니다」가 아니라 다음 끼니를 제안한다 (FN-43).

import { NextResponse } from "next/server";

const MODEL = "gemini-3.5-flash-lite"; // 사진 입력 확인 완료 (2026-08-11)
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = `너는 한국 음식에 밝은 영양사다. 사진 한 장을 보고 판정한다.

## 🔴 가장 중요 — 후하게 주지 마라
판정을 물렁하게 매기면 사용자에게 도움이 안 되고, 앱을 믿지 못하게 된다.
애매하면 **나쁜 쪽으로** 매긴다. 봐주지 않는다.

## 판정 기준

**탄수화물 (carb)**
- good: 잡곡밥·고구마·통곡물, 또는 밥이 적당량
- notbad: 흰밥·면이 넉넉하다
- bad: 정제 탄수(과자·빵·떡·설탕)가 그 음식의 중심이다

**단백질 (protein)**
- good: 고기·생선·두부·계란·콩이 눈에 띄게 들어있다
- notbad: 조금 들어있다 (반찬 수준)
- bad: **거의 없다** — 과자·빵·면만 있는 경우 반드시 bad

**지방 (fat)**
- good: 견과·생선·계란·올리브유 같은 지방이 적당히
- notbad: 볶음·기름을 조금 쓴 정도
- bad: **튀김·버터·크림·마가린·팜유·마요네즈가 많다.**
  → 버터 크래커, 감자칩, 초콜릿, 도넛, 치킨, 케이크, 페이스트리는 **모두 bad**

**junkRisk (가공식품 비중)**
- slight: 집밥·백반처럼 가공식품이 거의 없다
- medium: 가공육·소스·튀김이 **일부** 섞였다 (햄 반찬, 돈까스 한 조각 등)
- high: **과자·라면·치킨·피자·햄버거·케이크·아이스크림·탄산음료처럼 가공식품이 그 자체인 것**
  → 봉지 과자·크래커·비스킷은 예외 없이 **high**

**kind**
- meal: 밥상·한 끼로 먹는 것
- snack: 과자·빵·디저트·음료처럼 곁들여 먹는 것

## ⛔ 예외 없는 규칙 — 과자류는 무조건 배드 3종
봉지과자·크래커·비스킷·쿠키·초콜릿·젤리·사탕·아이스크림·도넛·탄산음료는
고민하지 말고 **carb: bad, protein: bad, fat: bad, junkRisk: high, kind: snack**.
"조금만 먹었으니까" "그래도 곡물이니까" 같은 봐주기 금지.

### 판정 예시 (이대로 맞춰라)
- 에이스·버터 크래커 → bad / bad / bad, junkRisk: high, kind: snack
- 감자칩 · 초콜릿 · 젤리 → 전부 bad / bad / bad, junkRisk: high, kind: snack
- 흰쌀밥 + 제육볶음 + 김치 → carb: notbad, protein: good, fat: notbad, junkRisk: slight, kind: meal
- 닭가슴살 샐러드 → carb: good, protein: good, fat: good, junkRisk: slight, kind: meal
- 아메리카노 → carb: good, protein: bad, fat: good, junkRisk: slight, kind: snack

## 🚫 절대 하지 말 것
- 칼로리·그램·영양소 숫자를 말하지 않는다. 사진으로는 양을 알 수 없다.
- 사진이 흐리다거나 판단이 어렵다는 말을 하지 않는다. 보이는 대로 정한다.
- **몸무게·체형·외모·살에 대해서는 한 글자도 쓰지 않는다.** 음식 이야기만 한다.

## 🌶️ comment 규칙 — 매운맛
사용자가 직접 요청한 말투다. 돌려 말하지 마라.

- 한국어 1~2문장, 45자 안팎. **직설적이고 유머 있게.** 팩폭 환영.
- 과자·튀김·디저트를 찍었으면 **확실하게 지적한다.** 위로하거나 포장하지 않는다.
- 그래도 **끝에는 뭘 하면 되는지** 한 마디 붙인다. 비꼬기만 하고 끝내지 않는다.
- 잘 먹었을 땐 **짧고 시원하게** 인정한다. 길게 칭찬하지 않는다.
- ⚠️ **아래 예시를 그대로 베끼지 마라.** 말투만 참고하고, **사진에 실제로 보이는 음식**으로 새로 쓴다.
  (크래커를 보고 "튀긴 감자"라고 하면 안 된다)
- 예) 에이스 → "이건 밥이 아니라 버터예요. 다음 끼는 단백질로 갚으셔야겠는데요?"
- 예) 감자칩 → "기름에 튀긴 감자를 드셨네요. 물 한 컵이랑 단백질 챙기세요."
- 예) 치킨 → "치킨은 죄가 없죠. 근데 오늘은 여기까지 하시죠."
- 예) 제육볶음+밥 → "단백질 확실하네요. 밥만 조금 줄이면 완벽해요."
- 예) 닭가슴살 샐러드 → "이게 바로 그거죠. 오늘 잘하셨어요."`;

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
