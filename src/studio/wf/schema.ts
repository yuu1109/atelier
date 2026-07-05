import type { PurposeType } from "../lib/types";

/**
 * WF壁打ちの成果物スキーマ。
 * 「構造はAIが決め、規律はバリデータで守る」ためのデータモデル。
 * TS型とjson_schema（WF_PLAN_SCHEMA）を必ず同期させること。
 */

export interface SectionCopy {
  /** セクション見出し（8〜15字目安） */
  heading?: string;
  /** 欧文サブ or 小ラベル（1〜2語） */
  sub?: string;
  /** リード文（40〜70字目安） */
  lead?: string;
  /** 本文ブロック（100〜200字目安） */
  body?: string;
  /** 箇条書き・カード類（最大6） */
  items?: { title: string; text?: string }[];
  /** CTAボタン（2〜8字）+ 補足1行 */
  buttonLabel?: string;
  buttonNote?: string;
  /** 画像プレースホルダの被写体説明（例: "施術中の手元のクローズアップ"） */
  imageDesc?: string[];
}

export interface LayoutSpec {
  /** standard=既知パーシャル / custom=汎用レンダラ or customHtml */
  type: "standard" | "custom";
  /** standard のバリアント名（パーシャル側で解釈。例: "cards" | "table" | "split"） */
  variant?: string;
  /** custom: カラム構成（比率合計は任意。content はカラム内の要素順） */
  columns?: { ratio: number; content: ("text" | "image" | "items" | "button")[] }[];
  /** 画像の位置 */
  mediaPosition?: "left" | "right" | "top" | "bottom" | "background" | "none";
  /** 主役 */
  emphasis?: "text" | "visual" | "balanced";
  /** 非対称レイアウト（§9: 1ページ最低1箇所） */
  asymmetric?: boolean;
  /** 逃げ道: セクション内HTMLをAIが直接書く（グレースケール限定・検証枠で描画） */
  customHtml?: string;
}

export interface WfSection {
  /** ページ内一意キー。セクションID（<section id>）の元。例: fv, reasons, pricing */
  key: string;
  /** 種別: sections.json の id（hero, pricing-table 等）または "custom" */
  kind: string;
  /** 日本語名（アウトライン表示用。例: 選ばれる理由） */
  label: string;
  layout: LayoutSpec;
  copy: SectionCopy;
  /** CTAバンド（FV以外の途中CTA） */
  isCta?: boolean;
  /** 設計意図メモ */
  note?: string;
}

export interface WfPlan {
  /** サイト名/屋号（headerとtitleに使う） */
  siteName: string;
  purposeType: PurposeType;
  /** グローバルナビ（3〜7個・ラベル2〜6字・sectionKeyは sections[].key を参照） */
  nav: { label: string; sectionKey: string }[];
  mobileNav: "bottom-bar" | "hamburger" | "both";
  /** 先頭は必ず FV（kind: "hero"）、末尾は最終CTA（isCta or kind: "cta"） */
  sections: WfSection[];
}

/** json_schema（Anthropic output_config用）。TS型と同期を保つこと */
export const WF_PLAN_SCHEMA = {
  type: "object",
  properties: {
    siteName: { type: "string" },
    purposeType: { type: "string", enum: ["inquiry", "visit", "reserve", "recruit"] },
    nav: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, sectionKey: { type: "string" } },
        required: ["label", "sectionKey"],
        additionalProperties: false,
      },
    },
    mobileNav: { type: "string", enum: ["bottom-bar", "hamburger", "both"] },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          kind: { type: "string" },
          label: { type: "string" },
          layout: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["standard", "custom"] },
              variant: { type: "string" },
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ratio: { type: "number" },
                    content: {
                      type: "array",
                      items: { type: "string", enum: ["text", "image", "items", "button"] },
                    },
                  },
                  required: ["ratio", "content"],
                  additionalProperties: false,
                },
              },
              mediaPosition: {
                type: "string",
                enum: ["left", "right", "top", "bottom", "background", "none"],
              },
              emphasis: { type: "string", enum: ["text", "visual", "balanced"] },
              asymmetric: { type: "boolean" },
              customHtml: { type: "string" },
            },
            required: ["type"],
            additionalProperties: false,
          },
          copy: {
            type: "object",
            properties: {
              heading: { type: "string" },
              sub: { type: "string" },
              lead: { type: "string" },
              body: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, text: { type: "string" } },
                  required: ["title"],
                  additionalProperties: false,
                },
              },
              buttonLabel: { type: "string" },
              buttonNote: { type: "string" },
              imageDesc: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
          isCta: { type: "boolean" },
          note: { type: "string" },
        },
        required: ["key", "kind", "label", "layout", "copy"],
        additionalProperties: false,
      },
    },
  },
  required: ["siteName", "purposeType", "nav", "mobileNav", "sections"],
  additionalProperties: false,
} as const;
