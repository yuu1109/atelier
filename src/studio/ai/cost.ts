import type { CostEstimate } from "./types";

/**
 * 画像生成コストの概算と当月カウンタ。
 * 単価の根拠は docs/research/imagegen-models-2026-07.md（WebSearch確認日つき）。
 * モデルIDが表に無い場合は「単価未登録」として扱い、実行は止めない。
 */

/** 単価の最終確認日 */
export const COST_VERIFIED_AT = "2026-07-05";

export type ImageProviderId = "gemini" | "openai";

interface PriceEntry {
  /** 1枚あたりの概算USD（1024px基準） */
  perImageUsd: number;
  note?: string;
}

/** Gemini系（無料枠あり。超過時の従量単価） */
const GEMINI_PRICES: Record<string, PriceEntry> = {
  "gemini-2.5-flash-image": { perImageUsd: 0.039 },
  "gemini-3.1-flash-image": { perImageUsd: 0.067 },
  "gemini-3-pro-image": { perImageUsd: 0.134, note: "4K出力は$0.24/枚" },
  "imagen-4": { perImageUsd: 0.04 },
};

/** OpenAI系（出力トークン課金のため品質・解像度で変動。値は中品質1024pxの目安） */
const OPENAI_PRICES: Record<string, PriceEntry> = {
  "gpt-image-2": { perImageUsd: 0.07, note: "実際は$0.005〜$0.21（品質・解像度で変動）" },
  "gpt-image-1.5": { perImageUsd: 0.06, note: "実際は$0.009〜$0.20" },
  "gpt-image-1-mini": { perImageUsd: 0.02, note: "実際は$0.005〜$0.052" },
};

function priceOf(provider: ImageProviderId, modelId: string): PriceEntry | null {
  const table = provider === "gemini" ? GEMINI_PRICES : OPENAI_PRICES;
  return table[modelId] ?? null;
}

function fmtUsd(usd: number): string {
  return `$${usd.toFixed(usd < 0.1 ? 3 : 2)}`;
}

/** 実行前に表示する概算 */
export function estimateImageCost(
  provider: ImageProviderId,
  modelId: string,
  count: number,
): CostEstimate {
  const entry = priceOf(provider, modelId);
  if (!entry) {
    return { usd: 0, note: `単価未登録のモデル（${modelId}）。docs/research の単価表を更新してね` };
  }
  const total = entry.perImageUsd * count;
  if (provider === "gemini") {
    return {
      usd: 0,
      note: `無料枠内の見込み。超過時 ${fmtUsd(entry.perImageUsd)}×${count}枚 ≒ ${fmtUsd(total)}`,
    };
  }
  return {
    usd: total,
    note: `${fmtUsd(entry.perImageUsd)}×${count}枚 ≒ ${fmtUsd(total)}${entry.note ? `。${entry.note}` : ""}`,
  };
}

/* ===== 当月概算カウンタ（localStorage・エクスポート対象外キー） ===== */

const SPEND_KEY = "atelier-cost-v1";

export interface MonthlySpend {
  /** "2026-07" 形式 */
  month: string;
  byProvider: Record<ImageProviderId, { images: number; usd: number }>;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptySpend(): MonthlySpend {
  return {
    month: currentMonth(),
    byProvider: { gemini: { images: 0, usd: 0 }, openai: { images: 0, usd: 0 } },
  };
}

export function getMonthlySpend(): MonthlySpend {
  try {
    const raw = localStorage.getItem(SPEND_KEY);
    if (!raw) return emptySpend();
    const parsed = JSON.parse(raw) as MonthlySpend;
    // 月が変わっていたらリセット
    if (parsed.month !== currentMonth()) return emptySpend();
    return {
      month: parsed.month,
      byProvider: {
        gemini: parsed.byProvider?.gemini ?? { images: 0, usd: 0 },
        openai: parsed.byProvider?.openai ?? { images: 0, usd: 0 },
      },
    };
  } catch {
    return emptySpend();
  }
}

/** 生成成功後に呼ぶ。Geminiは無料枠前提でもリスト単価で積む（"最大でこのくらい"の把握用） */
export function addImageSpend(provider: ImageProviderId, modelId: string, count: number): void {
  if (count <= 0) return;
  const spend = getMonthlySpend();
  const entry = priceOf(provider, modelId);
  spend.byProvider[provider].images += count;
  spend.byProvider[provider].usd += (entry?.perImageUsd ?? 0) * count;
  try {
    localStorage.setItem(SPEND_KEY, JSON.stringify(spend));
  } catch {
    /* 保存できない環境では諦める */
  }
}

/** ヘッダー表示用の1行サマリ */
export function monthlySpendSummary(): string {
  const s = getMonthlySpend();
  const g = s.byProvider.gemini;
  const o = s.byProvider.openai;
  const parts: string[] = [];
  if (g.images > 0) parts.push(`Gemini ${g.images}枚（無料枠外なら最大${fmtUsd(g.usd)}）`);
  if (o.images > 0) parts.push(`OpenAI ${o.images}枚 ≒ ${fmtUsd(o.usd)}`);
  return parts.length > 0 ? `今月の生成: ${parts.join(" ／ ")}` : "今月の生成: まだなし";
}
