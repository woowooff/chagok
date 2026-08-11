// T-40·41·42·43·44·45 눈바디 (FN-50~55)
//
// 🔒 이 화면의 사진은 절대 밖으로 나가지 않는다 (FN-55).
//    이 파일에도 BodyCamera 에도 fetch 가 하나도 없다. 판정할 게 없으니 보낼 이유도 없다.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BodyCamera from "@/components/BodyCamera";
import { useChagok } from "@/lib/chagok-store";
import { getPhoto, putPhoto, shrinkImage } from "@/lib/photos";
import { today } from "@/lib/storage";
import type { BodyPhoto } from "@/lib/types";

type Side = "front" | "side" | "back";
const SIDES: { key: Side; label: string }[] = [
  { key: "front", label: "앞" },
  { key: "side", label: "옆" },
  { key: "back", label: "뒤" },
];

const PERIODS = [
  { key: "1m", label: "1달", days: 30 },
  { key: "2w", label: "2주", days: 14 },
  { key: "1w", label: "1주", days: 7 },
  { key: "all", label: "처음부터", days: null },
] as const;

export default function BodyPage() {
  const { state, update } = useChagok();
  const todayStr = today();
  const [tab, setTab] = useState<"shoot" | "compare">("shoot");
  const [shooting, setShooting] = useState<Side | null>(null);
  const [ghostUrl, setGhostUrl] = useState<string | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);

  const todayRow = state.bodyPhotos.find((b) => b.date === todayStr) ?? null;

  /** 그 방향의 가장 최근 사진 열쇠 (오늘 것 빼고) — 겹쳐 보기용 */
  function lastKeyOf(side: Side): string | null {
    const rows = [...state.bodyPhotos]
      .filter((b) => b.date !== todayStr && b[side])
      .sort((a, b) => b.date.localeCompare(a.date));
    return rows[0]?.[side] ?? null;
  }

  async function openCamera(side: Side) {
    const key = lastKeyOf(side);
    if (key) {
      const blob = await getPhoto(key);
      setGhostUrl(blob ? URL.createObjectURL(blob) : null);
    } else {
      setGhostUrl(null);
    }
    setShooting(side);
  }

  function closeCamera() {
    if (ghostUrl) URL.revokeObjectURL(ghostUrl);
    setGhostUrl(null);
    setShooting(null);
  }

  /** 그날 그 방향 사진을 저장한다. 다시 찍으면 덮어쓴다 (FN-52) */
  async function saveShot(side: Side, blob: Blob) {
    const small = await shrinkImage(blob);
    const key = `body_${todayStr.replace(/-/g, "")}_${side}`;
    await putPhoto(key, small);
    update((s) => {
      const exists = s.bodyPhotos.some((b) => b.date === todayStr);
      const rows: BodyPhoto[] = exists
        ? s.bodyPhotos.map((b) =>
            b.date === todayStr ? { ...b, [side]: key } : b
          )
        : [
            ...s.bodyPhotos,
            { date: todayStr, front: null, side: null, back: null, [side]: key },
          ];
      return { ...s, bodyPhotos: rows };
    });
    closeCamera();
  }

  async function onFallbackPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const side = shooting;
    e.target.value = "";
    if (!file || !side) return;
    await saveShot(side, file);
  }

  return (
    <>
      <h1 className="page-title">📸 눈바디</h1>

      <div className="pills seg">
        <button
          type="button"
          className={`pill ${tab === "shoot" ? "on" : ""}`}
          onClick={() => setTab("shoot")}
        >
          오늘 찍기
        </button>
        <button
          type="button"
          className={`pill ${tab === "compare" ? "on" : ""}`}
          onClick={() => setTab("compare")}
        >
          비교
        </button>
      </div>

      {tab === "shoot" ? (
        <>
          <div className="body-slots">
            {SIDES.map(({ key, label }) => (
              <Slot
                key={key}
                label={label}
                photoKey={todayRow?.[key] ?? null}
                onClick={() => void openCamera(key)}
              />
            ))}
          </div>
          <p className="hint">
            세 장을 다 안 찍어도 돼요. 다시 찍으면 오늘 사진이 바뀝니다.
            <br />
            🔒 눈바디 사진은 <b>폰 안에만</b> 있어요. 어디로도 보내지 않습니다.
          </p>

          <input
            ref={fallbackRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onFallbackPick}
          />
        </>
      ) : (
        <Compare />
      )}

      {shooting && (
        <BodyCamera
          label={SIDES.find((s) => s.key === shooting)!.label}
          ghostUrl={ghostUrl}
          onShot={(blob) => void saveShot(shooting, blob)}
          onClose={closeCamera}
        />
      )}
    </>
  );
}

/* ── 오늘 세 칸 ─────────────────────────────── */

function Slot({
  label,
  photoKey,
  onClick,
}: {
  label: string;
  photoKey: string | null;
  onClick: () => void;
}) {
  const url = usePhotoUrl(photoKey);
  return (
    <button type="button" className="slot" onClick={onClick}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span className="slot-empty">＋</span>
      )}
      <span className="slot-label">{label}</span>
    </button>
  );
}

/* ── 비교 (FN-53·54) ────────────────────────── */

function Compare() {
  const { state } = useChagok();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("1m");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => [...state.bodyPhotos].sort((a, b) => a.date.localeCompare(b.date)),
    [state.bodyPhotos]
  );

  const latest = rows[rows.length - 1] ?? null;
  const target = useMemo(() => {
    if (!latest || rows.length < 2) return null;
    const p = PERIODS.find((x) => x.key === period)!;
    if (p.days === null) return rows[0];
    const cut = new Date(latest.date);
    cut.setDate(cut.getDate() - p.days);
    const cutStr = today(cut);
    // 기준일 이전 중 가장 가까운 날. 없으면 가장 오래된 날
    const before = rows.filter((r) => r.date <= cutStr);
    return before.length ? before[before.length - 1] : rows[0];
  }, [rows, latest, period]);

  if (!latest || !target || target.date === latest.date) {
    return (
      <p className="empty">
        <span className="big" aria-hidden="true">
          📸
        </span>
        아직 비교할 사진이 부족해요.
        <br />
        며칠 더 쌓이면 나란히 보여드릴게요.
      </p>
    );
  }

  const days = Math.round(
    (new Date(latest.date).getTime() - new Date(target.date).getTime()) / 86400000
  );

  async function saveCollage() {
    setSaving(true);
    try {
      const blob = await buildCollage(target!, latest!);
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `차곡_눈바디_${target!.date}_${latest!.date}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="pills">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`pill ${period === p.key ? "on" : ""}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <CompareRow row={target} caption={`${fmtDay(target.date)} · 처음`} />
      <CompareRow row={latest} caption={`${fmtDay(latest.date)} · 오늘`} />

      <p className="diff">🌰 {days}일 차이!</p>

      <button
        type="button"
        className="primary"
        disabled={saving}
        onClick={() => void saveCollage()}
      >
        {saving ? "만드는 중…" : "이미지로 저장"}
      </button>
      <p className="hint">
        한 장으로 합쳐서 폰에 저장돼요. 남에게 보여주는 건 우경님이 직접 정하세요.
      </p>
    </>
  );
}

function CompareRow({ row, caption }: { row: BodyPhoto; caption: string }) {
  return (
    <div className="cmp-row">
      <p className="cmp-cap">{caption}</p>
      <div className="cmp-imgs">
        {SIDES.map(({ key, label }) => (
          <CmpCell key={key} photoKey={row[key]} label={label} />
        ))}
      </div>
    </div>
  );
}

function CmpCell({
  photoKey,
  label,
}: {
  photoKey: string | null;
  label: string;
}) {
  const url = usePhotoUrl(photoKey);
  return (
    <div className="cmp-cell">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} />
      ) : (
        <span className="cmp-none">사진 없음</span>
      )}
    </div>
  );
}

/* ── 콜라주 한 장 만들기 (FN-54) ─────────────── */

async function buildCollage(a: BodyPhoto, b: BodyPhoto): Promise<Blob | null> {
  const cellW = 360;
  const cellH = 480;
  const pad = 12;
  const capH = 34;
  const canvas = document.createElement("canvas");
  canvas.width = pad + (cellW + pad) * 3;
  canvas.height = pad + (capH + cellH + pad) * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFF8EA";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3D2B1C";
  ctx.font = "20px sans-serif";

  const rows = [a, b];
  for (let r = 0; r < 2; r++) {
    const y0 = pad + r * (capH + cellH + pad);
    ctx.fillText(`${fmtDay(rows[r].date)}`, pad, y0 + 22);
    for (let c = 0; c < 3; c++) {
      const key = rows[r][SIDES[c].key];
      const x = pad + c * (cellW + pad);
      const y = y0 + capH;
      ctx.fillStyle = "#EFE0C6";
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = "#3D2B1C";
      if (!key) continue;
      const blob = await getPhoto(key);
      if (!blob) continue;
      const bmp = await createImageBitmap(blob);
      // 칸을 채우도록 잘라 넣는다
      const scale = Math.max(cellW / bmp.width, cellH / bmp.height);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();
      ctx.drawImage(bmp, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
      ctx.restore();
      bmp.close?.();
    }
  }

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
  );
}

/* ── 도우미 ─────────────────────────────────── */

function usePhotoUrl(key: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    if (key) {
      getPhoto(key).then((blob) => {
        if (!blob) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      });
    } else {
      setUrl(null);
    }
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [key]);
  return url;
}

function fmtDay(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
}
