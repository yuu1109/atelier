import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// scripts/hp-cli.ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

// src/lib/prompt.ts
function bullets(lines) {
  return lines.filter((l) => typeof l === "string" && l.trim() !== "").map((l) => `- ${l}`).join("\n");
}

// src/lib/color.ts
function hexToRgb(hex) {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
}
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}
function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// src/tools/web/data.ts
var WEB_SECTIONS = [
  {
    id: "header-nav",
    name: "\u30D8\u30C3\u30C0\u30FC\u30FB\u30B0\u30ED\u30FC\u30D0\u30EB\u30CA\u30D3",
    purpose: "\u30B5\u30A4\u30C8\u5168\u4F53\u306E\u56DE\u904A\u5C0E\u7DDA\u3068\u4E3B\u8981CTA\u3078\u306E\u5E38\u6642\u30A2\u30AF\u30BB\u30B9\u3092\u63D0\u4F9B\u3059\u308B",
    slots: ["\u30ED\u30B4", "\u30B0\u30ED\u30FC\u30D0\u30EB\u30E1\u30CB\u30E5\u30FC", "\u96FB\u8A71\u756A\u53F7", "CTA\u30DC\u30BF\u30F3", "\u30CF\u30F3\u30D0\u30FC\u30AC\u30FC\u30E1\u30CB\u30E5\u30FC"],
    layout: "\u30ED\u30B4\u5DE6\u30FB\u30E1\u30CB\u30E5\u30FC\u53F3\u306E\u6A2A\u4E00\u5217\u3002\u53F3\u7AEF\u306B\u96FB\u8A71\u756A\u53F7\u3068\u5857\u308A\u306ECTA\u30DC\u30BF\u30F3\u3092\u7F6E\u304F\u9AD8\u3055\u306E\u7D30\u3044\u30D0\u30FC"
  },
  {
    id: "hero",
    name: "\u30D2\u30FC\u30ED\u30FC\uFF08\u30D5\u30A1\u30FC\u30B9\u30C8\u30D3\u30E5\u30FC\uFF09",
    purpose: "3\u79D2\u3067\u4FA1\u5024\u63D0\u6848\u3092\u4F1D\u3048\u3001\u30B9\u30AF\u30ED\u30FC\u30EB\u3068\u30B3\u30F3\u30D0\u30FC\u30B8\u30E7\u30F3\u306E\u52D5\u6A5F\u3092\u4F5C\u308B",
    slots: ["\u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC", "\u30B5\u30D6\u30B3\u30D4\u30FC", "\u30E1\u30A4\u30F3\u30D3\u30B8\u30E5\u30A2\u30EB", "CTA\u30DC\u30BF\u30F3", "\u6A29\u5A01\u4ED8\u3051\u30D0\u30C3\u30B8"],
    layout: "\u9078\u629E\u3057\u305FFV\u30EC\u30A4\u30A2\u30A6\u30C8\u306E\u914D\u7F6E\u8A18\u8FF0\u306B\u5F93\u3046"
  },
  {
    id: "problem",
    name: "\u8AB2\u984C\u63D0\u8D77\u30FB\u304A\u60A9\u307F\u5171\u611F",
    purpose: "\u8A2A\u554F\u8005\u306E\u60A9\u307F\u3092\u8A00\u8A9E\u5316\u3057\u3066\u81EA\u5206\u3054\u3068\u5316\u3055\u305B\u3001\u8AAD\u307F\u9032\u3081\u308B\u7406\u7531\u3092\u4F5C\u308B",
    slots: ["\u898B\u51FA\u3057\uFF08\u3053\u3093\u306A\u304A\u60A9\u307F\u3042\u308A\u307E\u305B\u3093\u304B\uFF09", "\u304A\u60A9\u307F\u30EA\u30B9\u30C8", "\u5171\u611F\u30A4\u30E9\u30B9\u30C8\u30FB\u5199\u771F", "\u5C0E\u5165\u6587"],
    layout: "\u30C1\u30A7\u30C3\u30AF\u30EA\u30B9\u30C8\u578B: \u30C1\u30A7\u30C3\u30AF\u30DC\u30C3\u30AF\u30B9\u98A8\u306E\u7B87\u6761\u66F8\u304D\u3067\u304A\u60A9\u307F\u30924\u301C6\u500B\u5217\u6319\u3057\u3001\u5171\u611F\u3092\u8A98\u3046\u5199\u771F\u304B\u30A4\u30E9\u30B9\u30C8\u30921\u70B9\u6DFB\u3048\u308B"
  },
  {
    id: "solution",
    name: "\u89E3\u6C7A\u7B56\u306E\u63D0\u793A",
    purpose: "\u63D0\u793A\u3057\u305F\u60A9\u307F\u3078\u306E\u7B54\u3048\u3068\u3057\u3066\u5546\u54C1\u30FB\u30B5\u30FC\u30D3\u30B9\u3092\u4F4D\u7F6E\u3065\u3051\u308B",
    slots: ["\u30D6\u30EA\u30C3\u30B8\u30B3\u30D4\u30FC", "\u30B5\u30FC\u30D3\u30B9\u6982\u8981", "\u30A4\u30E1\u30FC\u30B8\u753B\u50CF", "\u89E3\u6C7A\u3067\u304D\u308B\u6839\u62E0\u306E\u4E00\u8A00"],
    layout: "\u30D6\u30EA\u30C3\u30B8\u30D0\u30CA\u30FC\u578B: \u5E2F\u72B6\u306E\u8EE2\u63DB\u30B3\u30D4\u30FC\u3067\u8AB2\u984C\u30D1\u30FC\u30C8\u304B\u3089\u89E3\u6C7A\u30D1\u30FC\u30C8\u3078\u6A4B\u6E21\u3057\u3057\u3001\u30B5\u30FC\u30D3\u30B9\u753B\u50CF\u3068\u6839\u62E0\u306E\u4E00\u8A00\u3092\u7D9A\u3051\u308B"
  },
  {
    id: "features",
    name: "\u7279\u5FB4\u30FB\u9078\u3070\u308C\u308B\u7406\u7531",
    purpose: "\u4ED6\u3068\u9055\u3046\u5F37\u307F\u3092\u6574\u7406\u3057\u300C\u3053\u3053\u3092\u9078\u3076\u6839\u62E0\u300D\u3092\u4E0E\u3048\u308B",
    slots: ["\u898B\u51FA\u3057", "\u7279\u5FB4\u30AB\u30FC\u30C9\uFF08\u30A2\u30A4\u30B3\u30F3\uFF0B\u30BF\u30A4\u30C8\u30EB\uFF0B\u8AAC\u660E\uFF09\xD73\u301C6", "\u7406\u7531\u306E\u30CA\u30F3\u30D0\u30EA\u30F3\u30B0", "\u88DC\u8DB3\u753B\u50CF"],
    layout: "\u30A2\u30A4\u30B3\u30F3\u30B0\u30EA\u30C3\u30C9\u578B: \u30A2\u30A4\u30B3\u30F3\uFF0B\u30BF\u30A4\u30C8\u30EB\uFF0B\u77ED\u6587\u306E\u30AB\u30FC\u30C9\u30923\u5217\u3067\u4E26\u3079\u308B\u3002\u756A\u53F7\u306E\u5F37\u5F31\u3067\u9078\u3076\u6839\u62E0\u3092\u7ACB\u3066\u308B"
  },
  {
    id: "benefits",
    name: "\u30D9\u30CD\u30D5\u30A3\u30C3\u30C8\u30FB\u5C0E\u5165\u52B9\u679C",
    purpose: "\u6A5F\u80FD\u3067\u306F\u306A\u304F\u5F97\u3089\u308C\u308B\u672A\u6765\u30FB\u5909\u5316\u3092\u63D0\u793A\u3057\u6B32\u6C42\u3092\u9AD8\u3081\u308B",
    slots: ["\u5C0E\u5165\u524D\u2192\u5C0E\u5165\u5F8C\u306E\u5909\u5316", "\u52B9\u679C\u306E\u6570\u5024", "\u5229\u7528\u30B7\u30FC\u30F3\u753B\u50CF", "\u898B\u51FA\u3057"],
    layout: "\u5909\u5316\u5BFE\u6BD4\u578B: \u5C0E\u5165\u524D\u3068\u5C0E\u5165\u5F8C\u3092\u5DE6\u53F3\u3067\u5BFE\u6BD4\u3057\u3001\u52B9\u679C\u306E\u6570\u5024\u3092\u5927\u304D\u304F\u6DFB\u3048\u308B"
  },
  {
    id: "concept",
    name: "\u30B3\u30F3\u30BB\u30D7\u30C8\u30FB\u7406\u5FF5",
    purpose: "\u30D6\u30E9\u30F3\u30C9\u306E\u4E16\u754C\u89B3\u30FB\u4FA1\u5024\u89B3\u3092\u4F1D\u3048\u5171\u611F\u3068\u611B\u7740\u3092\u4F5C\u308B",
    slots: ["\u30B3\u30F3\u30BB\u30D7\u30C8\u30B3\u30D4\u30FC", "\u30B9\u30C6\u30FC\u30C8\u30E1\u30F3\u30C8\u672C\u6587", "\u30D6\u30E9\u30F3\u30C9\u5199\u771F", "\u30DF\u30C3\u30B7\u30E7\u30F3\u30FB\u30D3\u30B8\u30E7\u30F3\u30FB\u30D0\u30EA\u30E5\u30FC"],
    layout: "\u30B9\u30C6\u30FC\u30C8\u30E1\u30F3\u30C8\u578B: \u5927\u304D\u306A\u6587\u5B57\u7D44\u307F\u306E\u30B3\u30D4\u30FC\u3092\u4E3B\u5F79\u306B\u672C\u6587\u306F\u77ED\u304F\u3002\u9759\u304B\u3067\u54C1\u306E\u3042\u308B\u69CB\u6210"
  },
  {
    id: "message",
    name: "\u4EE3\u8868\u6328\u62F6\u30FB\u30E1\u30C3\u30BB\u30FC\u30B8",
    purpose: "\u4EE3\u8868\u30FB\u9662\u9577\u306E\u4EBA\u67C4\u3068\u60F3\u3044\u3092\u898B\u305B\u3001\u4EBA\u3078\u306E\u4FE1\u983C\u3092\u4F5C\u308B",
    slots: ["\u9854\u5199\u771F", "\u6328\u62F6\u6587", "\u6C0F\u540D\u30FB\u80A9\u66F8\u304D", "\u7D4C\u6B74\u30FB\u8CC7\u683C", "\u30B5\u30A4\u30F3"],
    layout: "\u5199\u771F\u6A2A\u4E26\u3073\u578B: \u4EE3\u8868\u306E\u30DD\u30FC\u30C8\u30EC\u30FC\u30C8\u3068\u6328\u62F6\u6587\u3092\u6A2A\u306B\u4E26\u3079\u3001\u6C0F\u540D\u30FB\u80A9\u66F8\u304D\u30FB\u7D4C\u6B74\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "about",
    name: "\u4F1A\u793E\u30FB\u4E8B\u52D9\u6240\u6982\u8981",
    purpose: "\u57FA\u672C\u60C5\u5831\u3092\u958B\u793A\u3057\u5B9F\u5728\u6027\u30FB\u4FE1\u983C\u6027\u3092\u62C5\u4FDD\u3059\u308B",
    slots: ["\u4F1A\u793E\u540D\u30FB\u5C4B\u53F7", "\u6240\u5728\u5730", "\u8A2D\u7ACB", "\u4EE3\u8868\u8005", "\u4E8B\u696D\u5185\u5BB9", "\u9023\u7D61\u5148", "\u8A31\u8A8D\u53EF\u30FB\u767B\u9332\u756A\u53F7"],
    layout: "\u5B9A\u7FA9\u30EA\u30B9\u30C8\u8868\u578B: \u4F1A\u793E\u540D\u30FB\u6240\u5728\u5730\u30FB\u8A2D\u7ACB\u306A\u3069\u30922\u5217\u306E\u30C6\u30FC\u30D6\u30EB\u3067\u6574\u7136\u3068\u958B\u793A\u3059\u308B"
  },
  {
    id: "history",
    name: "\u6CBF\u9769",
    purpose: "\u5275\u696D\u304B\u3089\u306E\u6B69\u307F\u3092\u793A\u3057\u7D99\u7D9A\u6027\u3068\u4FE1\u983C\u3092\u4F1D\u3048\u308B",
    slots: ["\u5E74\u8868\uFF08\u5E74\uFF0B\u51FA\u6765\u4E8B\uFF09", "\u7BC0\u76EE\u306E\u5199\u771F", "\u5275\u696D\u30B9\u30C8\u30FC\u30EA\u30FC"],
    layout: "\u7E26\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u578B: \u4E2D\u592E\u7DDA\u306B\u6CBF\u3063\u3066\u5E74\u3068\u51FA\u6765\u4E8B\u3092\u4E26\u3079\u3001\u7BC0\u76EE\u306B\u5199\u771F\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "service-list",
    name: "\u4E8B\u696D\u30FB\u30B5\u30FC\u30D3\u30B9\u4E00\u89A7",
    purpose: "\u63D0\u4F9B\u30B5\u30FC\u30D3\u30B9\u306E\u5168\u4F53\u50CF\u3092\u898B\u305B\u3001\u5404\u8A73\u7D30\u30DA\u30FC\u30B8\u3078\u8A98\u5C0E\u3059\u308B",
    slots: ["\u30B5\u30FC\u30D3\u30B9\u30AB\u30FC\u30C9\uFF08\u753B\u50CF\uFF0B\u540D\u79F0\uFF0B\u8AAC\u660E\uFF0B\u30EA\u30F3\u30AF\uFF09", "\u30AB\u30C6\u30B4\u30EA\u898B\u51FA\u3057", "\u8A73\u7D30\u3078\u306E\u30DC\u30BF\u30F3"],
    layout: "\u30AB\u30FC\u30C9\u30B0\u30EA\u30C3\u30C9\u578B: \u753B\u50CF\uFF0B\u540D\u79F0\uFF0B\u8AAC\u660E\uFF0B\u30EA\u30F3\u30AF\u306E\u30B5\u30FC\u30D3\u30B9\u30AB\u30FC\u30C9\u30922\u301C3\u5217\u3067\u4E26\u3079\u308B"
  },
  {
    id: "product-detail",
    name: "\u5546\u54C1\u30FB\u6A5F\u80FD\u8A73\u7D30",
    purpose: "\u4E3B\u529B\u5546\u54C1\u30FB\u6A5F\u80FD\u3092\u6DF1\u6398\u308A\u3057\u5177\u4F53\u7684\u306A\u7406\u89E3\u3068\u6B32\u6C42\u3092\u4F5C\u308B",
    slots: ["\u5546\u54C1\u30FB\u6A5F\u80FD\u540D", "\u8AAC\u660E\u6587", "\u5546\u54C1\u753B\u50CF\u30FB\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8", "\u30B9\u30DA\u30C3\u30AF\u8868", "\u7279\u9577\u30EA\u30B9\u30C8"],
    layout: "\u4EA4\u4E92\u7D39\u4ECB\u578B: \u6A5F\u80FD\u30FB\u5546\u54C1\u3054\u3068\u306B\u753B\u50CF\u3068\u30C6\u30AD\u30B9\u30C8\u3092\u5DE6\u53F3\u4EA4\u4E92\u306B\u5C55\u958B\u3057\u30011\u3064\u305A\u3064\u6DF1\u304F\u8AAC\u660E\u3059\u308B"
  },
  {
    id: "demo-video",
    name: "\u30C7\u30E2\u30FB\u52D5\u753B\u7D39\u4ECB",
    purpose: "\u52D5\u304D\u3067\u9B45\u529B\u3092\u76F4\u611F\u7684\u306B\u4F1D\u3048\u3001\u30C6\u30AD\u30B9\u30C8\u3067\u4F1D\u308F\u3089\u306A\u3044\u4F53\u9A13\u3092\u88DC\u3046",
    slots: ["\u52D5\u753B\u57CB\u3081\u8FBC\u307F", "\u518D\u751F\u30DC\u30BF\u30F3", "\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3", "\u30B5\u30E0\u30CD\u30A4\u30EB\u753B\u50CF"],
    layout: "\u52D5\u753B\u30FB\u8AAC\u660E\u4E26\u5217\u578B: \u30B5\u30E0\u30CD\u30A4\u30EB\uFF0B\u518D\u751F\u30DC\u30BF\u30F3\u306E\u52D5\u753B\u67A0\u306E\u96A3\u306B\u8981\u70B9\u30C6\u30AD\u30B9\u30C8\u3092\u7F6E\u3044\u3066\u7406\u89E3\u3092\u88DC\u52A9\u3059\u308B"
  },
  {
    id: "pricing",
    name: "\u6599\u91D1\u8868\u30FB\u30D7\u30E9\u30F3",
    purpose: "\u4FA1\u683C\u306E\u900F\u660E\u6027\u3067\u300C\u3044\u304F\u3089\u304B\u304B\u308B\u304B\u4E0D\u5B89\u300D\u3092\u89E3\u6D88\u3057\u6BD4\u8F03\u691C\u8A0E\u3092\u4FC3\u3059",
    slots: ["\u30D7\u30E9\u30F3\u540D", "\u4FA1\u683C", "\u671F\u9593\u30FB\u5358\u4F4D", "\u542B\u307E\u308C\u308B\u5185\u5BB9\u30EA\u30B9\u30C8", "\u304A\u3059\u3059\u3081\u30D0\u30C3\u30B8", "\u6CE8\u8A18\uFF08\u7A0E\u8FBC\u30FB\u521D\u56DE\u4FA1\u683C\uFF09"],
    layout: "\u30D7\u30E9\u30F3\u30AB\u30FC\u30C9\u578B: 2\u301C4\u30D7\u30E9\u30F3\u3092\u30AB\u30FC\u30C9\u3067\u6A2A\u4E26\u3073\u306B\u3057\u3001\u304A\u3059\u3059\u3081\u30D7\u30E9\u30F3\u3092\u4E2D\u592E\u3067\u5F37\u8ABF\u3002\u7A0E\u8FBC\u7B49\u306E\u6CE8\u8A18\u3092\u5C0F\u3055\u304F\u6DFB\u3048\u308B\uFF08\u30E1\u30CB\u30E5\u30FC\u6570\u304C\u591A\u3044\u696D\u7A2E\u306F\u6599\u91D1\u4E00\u89A7\u8868\u3067\u3082\u3088\u3044\uFF09"
  },
  {
    id: "menu",
    name: "\u30E1\u30CB\u30E5\u30FC\u4E00\u89A7",
    purpose: "\u65BD\u8853\u30FB\u6599\u7406\u306A\u3069\u306E\u63D0\u4F9B\u30E1\u30CB\u30E5\u30FC\u3092\u4FA1\u683C\u3064\u304D\u3067\u9B45\u529B\u7684\u306B\u4E00\u89A7\u5316\u3059\u308B",
    slots: ["\u30E1\u30CB\u30E5\u30FC\u540D", "\u4FA1\u683C", "\u8AAC\u660E\u6587", "\u5199\u771F", "\u30AB\u30C6\u30B4\u30EA", "\u304A\u3059\u3059\u3081\u30DE\u30FC\u30AF"],
    layout: "\u5199\u771F\u30AB\u30FC\u30C9\u578B: \u6599\u7406\u30FB\u65BD\u8853\u306E\u5199\u771F\u3092\u4E3B\u5F79\u306B\u3057\u305F\u30AB\u30FC\u30C9\u30B0\u30EA\u30C3\u30C9\u3002\u540D\u524D\u3068\u4FA1\u683C\u3092\u30BB\u30C3\u30C8\u3067\u8F09\u305B\u308B"
  },
  {
    id: "campaign",
    name: "\u30AD\u30E3\u30F3\u30DA\u30FC\u30F3\u30FB\u7279\u5178",
    purpose: "\u521D\u56DE\u7279\u5178\u30FB\u671F\u9593\u9650\u5B9A\u30AA\u30D5\u30A1\u30FC\u3067\u300C\u4ECA\u884C\u52D5\u3059\u308B\u7406\u7531\u300D\u3092\u4F5C\u308B",
    slots: ["\u7279\u5178\u5185\u5BB9", "\u901A\u5E38\u4FA1\u683C\u2192\u7279\u5225\u4FA1\u683C", "\u671F\u9650\u30FB\u6761\u4EF6", "CTA\u30DC\u30BF\u30F3"],
    layout: "\u30D0\u30CA\u30FC\u5E2F\u578B: \u76EE\u7ACB\u3064\u8272\u306E\u5E2F\u3067\u7279\u5178\u3068\u671F\u9650\u3092\u8A34\u6C42\u3057\u3001CTA\u30DC\u30BF\u30F3\u3078\u3064\u306A\u3050"
  },
  {
    id: "comparison",
    name: "\u6BD4\u8F03\u8868",
    purpose: "\u4ED6\u793E\u30FB\u4ED6\u624B\u6BB5\u3068\u306E\u9055\u3044\u3092\u4E00\u76EE\u3067\u793A\u3057\u512A\u4F4D\u6027\u3092\u8A3C\u660E\u3059\u308B",
    slots: ["\u6BD4\u8F03\u8EF8\uFF08\u9805\u76EE\uFF09", "\u81EA\u793E\u5217\uFF08\u5F37\u8ABF\uFF09", "\u4ED6\u793E\u30FB\u4ED6\u624B\u6BB5\u306E\u5217", "\u25EF\u2715\u25B3\u30DE\u30FC\u30AF"],
    layout: "\u81EA\u793E\u5F37\u8ABF\u6BD4\u8F03\u8868\u578B: \u6BD4\u8F03\u8EF8\xD7\u5404\u793E\u306E\u30DE\u30C8\u30EA\u30AF\u30B9\u3067\u81EA\u793E\u5217\u3092\u8272\u3068\u30B5\u30A4\u30BA\u3067\u5F37\u8ABF\u3059\u308B"
  },
  {
    id: "guarantee",
    name: "\u4FDD\u8A3C\u30FB\u5B89\u5FC3\u30B5\u30DD\u30FC\u30C8",
    purpose: "\u8FD4\u91D1\u30FB\u8FD4\u54C1\u30FB\u30B5\u30DD\u30FC\u30C8\u4F53\u5236\u3067CV\u76F4\u524D\u306E\u6700\u5F8C\u306E\u4E0D\u5B89\u3092\u9664\u53BB\u3059\u308B",
    slots: ["\u4FDD\u8A3C\u5185\u5BB9", "\u4FDD\u8A3C\u30D0\u30C3\u30B8", "\u9069\u7528\u6761\u4EF6\u306E\u6CE8\u8A18", "\u30B5\u30DD\u30FC\u30C8\u7A93\u53E3"],
    layout: "\u4FDD\u8A3C\u30AB\u30FC\u30C9\u578B: \u8FD4\u91D1\u30FB\u30B5\u30DD\u30FC\u30C8\u306A\u3069\u5404\u4FDD\u8A3C\u306E\u5185\u5BB9\u3092\u30AB\u30FC\u30C9\u3067\u4E01\u5BE7\u306B\u8AAC\u660E\u3057\u3001\u9069\u7528\u6761\u4EF6\u306E\u6CE8\u8A18\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "product-list",
    name: "\u5546\u54C1\u4E00\u89A7",
    purpose: "\u5546\u54C1\u3092\u56DE\u904A\u3057\u3084\u3059\u304F\u4E26\u3079\u3001\u5546\u54C1\u8A73\u7D30\u30FB\u8CFC\u5165\u3078\u8A98\u5C0E\u3059\u308B",
    slots: ["\u5546\u54C1\u30AB\u30FC\u30C9\uFF08\u753B\u50CF\uFF0B\u540D\u79F0\uFF0B\u4FA1\u683C\uFF09", "\u30AB\u30C6\u30B4\u30EA\u30D5\u30A3\u30EB\u30BF", "\u30E9\u30F3\u30AD\u30F3\u30B0\u30D0\u30C3\u30B8", "\u3082\u3063\u3068\u898B\u308B\u30EA\u30F3\u30AF"],
    layout: "\u30B0\u30EA\u30C3\u30C9\u578B: \u5546\u54C1\u30AB\u30FC\u30C9\uFF08\u753B\u50CF\uFF0B\u540D\u79F0\uFF0B\u4FA1\u683C\uFF09\u30923\u301C4\u5217\u306E\u5747\u7B49\u30B0\u30EA\u30C3\u30C9\u3067\u4E26\u3079\u3001\u3082\u3063\u3068\u898B\u308B\u30EA\u30F3\u30AF\u3078\u8A98\u5C0E\u3059\u308B"
  },
  {
    id: "case-study",
    name: "\u5C0E\u5165\u4E8B\u4F8B\u30FB\u5B9F\u7E3E",
    purpose: "\u7B2C\u4E09\u8005\u306E\u6210\u529F\u4F8B\u3067\u52B9\u679C\u3092\u8A3C\u660E\u3057\u300C\u81EA\u793E\u3067\u3082\u3067\u304D\u305D\u3046\u300D\u3068\u601D\u308F\u305B\u308B",
    slots: ["\u9867\u5BA2\u540D\u30FB\u696D\u7A2E", "\u8AB2\u984C\u2192\u65BD\u7B56\u2192\u6210\u679C", "\u6570\u5024\u6210\u679C", "\u62C5\u5F53\u8005\u30B3\u30E1\u30F3\u30C8", "\u9867\u5BA2\u30ED\u30B4\u30FB\u5199\u771F"],
    layout: "\u4E8B\u4F8B\u30AB\u30FC\u30C9\u578B: \u9867\u5BA2\u540D\u30FB\u696D\u7A2E\u3068\u6570\u5024\u6210\u679C\u3092\u8F09\u305B\u305F\u30AB\u30FC\u30C9\u3092\u4E26\u3079\u3001\u8A73\u7D30\u3078\u8A98\u5C0E\u3059\u308B"
  },
  {
    id: "before-after",
    name: "\u75C7\u4F8B\u30FB\u30D3\u30D5\u30A9\u30FC\u30A2\u30D5\u30BF\u30FC",
    purpose: "\u65BD\u8853\u30FB\u6539\u5584\u306E\u5909\u5316\u3092\u8996\u899A\u7684\u306B\u8A3C\u660E\u3057\u52B9\u679C\u3078\u306E\u78BA\u4FE1\u3092\u4F5C\u308B",
    slots: ["Before\u5199\u771F", "After\u5199\u771F", "\u75C7\u72B6\u30FB\u65BD\u8853\u5185\u5BB9", "\u671F\u9593\u30FB\u56DE\u6570", "\u6CE8\u610F\u66F8\u304D\uFF08\u52B9\u679C\u306B\u306F\u500B\u4EBA\u5DEE\u304C\u3042\u308A\u307E\u3059\uFF09"],
    layout: "\u5DE6\u53F3\u6BD4\u8F03\u578B: Before\u3068After\u306E\u5199\u771F\u3092\u5DE6\u53F3\u306B\u4E26\u3079\u3001\u65BD\u8853\u5185\u5BB9\u30FB\u671F\u9593\u3068\u300C\u52B9\u679C\u306B\u306F\u500B\u4EBA\u5DEE\u304C\u3042\u308A\u307E\u3059\u300D\u306E\u6CE8\u610F\u66F8\u304D\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "testimonials",
    name: "\u304A\u5BA2\u69D8\u306E\u58F0",
    purpose: "\u5B9F\u969B\u306E\u5229\u7528\u8005\u306E\u58F0\u3067\u4FE1\u983C\u3068\u5171\u611F\u3092\u7372\u5F97\u3057\u4E0D\u5B89\u3092\u6253\u3061\u6D88\u3059",
    slots: ["\u9854\u5199\u771F\u30FB\u30A4\u30CB\u30B7\u30E3\u30EB", "\u5C5E\u6027\uFF08\u5E74\u4EE3\u30FB\u8077\u696D\u30FB\u5730\u57DF\uFF09", "\u661F\u8A55\u4FA1", "\u611F\u60F3\u672C\u6587"],
    layout: "\u30AB\u30FC\u30C9\u4E26\u5217\u578B: \u9854\u5199\u771F\u304B\u30A4\u30CB\u30B7\u30E3\u30EB\uFF0B\u5C5E\u6027\uFF0B\u611F\u60F3\u672C\u6587\u306E\u58F0\u30AB\u30FC\u30C9\u30923\u4EF6\u524D\u5F8C\u4E26\u3079\u308B"
  },
  {
    id: "logos-media",
    name: "\u53D6\u5F15\u5148\u30FB\u30E1\u30C7\u30A3\u30A2\u63B2\u8F09\u30FB\u53D7\u8CDE",
    purpose: "\u53D6\u5F15\u5B9F\u7E3E\u30FB\u63B2\u8F09\u6B74\u30FB\u53D7\u8CDE\u3092\u30ED\u30B4\u3068\u30D0\u30C3\u30B8\u3067\u898B\u305B\u6A29\u5A01\u6027\u3092\u77AC\u6642\u306B\u4F1D\u3048\u308B",
    slots: ["\u4F01\u696D\u30ED\u30B4\u5217", "\u30E1\u30C7\u30A3\u30A2\u540D", "\u53D7\u8CDE\u30FB\u8A8D\u8A3C\u30D0\u30C3\u30B8", "\u5C0E\u5165\u793E\u6570\u30FB\u63B2\u8F09\u6570"],
    layout: "\u30ED\u30B4\u5E2F\u578B: \u30B0\u30EC\u30FC\u30B9\u30B1\u30FC\u30EB\u306E\u53D6\u5F15\u5148\u30FB\u63B2\u8F09\u30E1\u30C7\u30A3\u30A2\u306E\u30ED\u30B4\u30921\u301C2\u884C\u3067\u4E26\u3079\u308B"
  },
  {
    id: "stats",
    name: "\u6570\u5B57\u3067\u898B\u308B",
    purpose: "\u5B9F\u7E3E\u30FB\u898F\u6A21\u30FB\u7279\u5FB4\u3092\u6570\u5024\u5316\u3057\u77AC\u6642\u306B\u8AAC\u5F97\u529B\u3092\u6301\u305F\u305B\u308B",
    slots: ["\u6570\u5024\uFF08\u5927\u304D\u304F\u8868\u793A\uFF09", "\u5358\u4F4D", "\u30E9\u30D9\u30EB", "\u30A2\u30A4\u30B3\u30F3", "\u96C6\u8A08\u6642\u70B9\u306E\u6CE8\u8A18"],
    layout: "\u6570\u5024\u30B0\u30EA\u30C3\u30C9\u578B: \u5927\u304D\u306A\u6570\u5024\uFF0B\u5358\u4F4D\uFF0B\u30E9\u30D9\u30EB\u30924\u301C8\u500B\u30B0\u30EA\u30C3\u30C9\u3067\u4E26\u3079\u3001\u96C6\u8A08\u6642\u70B9\u306E\u6CE8\u8A18\u3092\u5C0F\u3055\u304F\u6DFB\u3048\u308B"
  },
  {
    id: "gallery",
    name: "\u30AE\u30E3\u30E9\u30EA\u30FC",
    purpose: "\u5E97\u5185\u30FB\u30B9\u30BF\u30A4\u30EB\u30FB\u6599\u7406\u30FB\u8A2D\u5099\u3092\u5199\u771F\u3067\u8FFD\u4F53\u9A13\u3055\u305B\u6765\u5E97\u30A4\u30E1\u30FC\u30B8\u3092\u4F5C\u308B",
    slots: ["\u5199\u771F\u30B0\u30EA\u30C3\u30C9", "\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3", "\u30AB\u30C6\u30B4\u30EA"],
    layout: "\u5747\u7B49\u30B0\u30EA\u30C3\u30C9\u578B: \u540C\u4E00\u30C8\u30FC\u30F3\u306B\u63C3\u3048\u305F\u5199\u771F\u3092\u6574\u7136\u3068\u6577\u304D\u8A70\u3081\u308B\u3002\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3\u306F\u6700\u5C0F\u9650"
  },
  {
    id: "works",
    name: "\u5236\u4F5C\u5B9F\u7E3E\u30FB\u4F5C\u54C1\u96C6",
    purpose: "\u5236\u4F5C\u7269\u30FB\u5B9F\u7E3E\u3092\u898B\u305B\u30B9\u30AD\u30EB\u3068\u30C6\u30A4\u30B9\u30C8\u3092\u8A3C\u660E\u3059\u308B",
    slots: ["\u4F5C\u54C1\u30B5\u30E0\u30CD\u30A4\u30EB", "\u30BF\u30A4\u30C8\u30EB", "\u62C5\u5F53\u9818\u57DF\u30FB\u4F7F\u7528\u6280\u8853", "\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u540D", "\u8A73\u7D30\u30EA\u30F3\u30AF"],
    layout: "\u30B5\u30E0\u30CD\u30A4\u30EB\u30B0\u30EA\u30C3\u30C9\u578B: \u4F5C\u54C1\u30B5\u30E0\u30CD\u30A4\u30EB\uFF0B\u30BF\u30A4\u30C8\u30EB\uFF0B\u62C5\u5F53\u9818\u57DF\u3092\u5747\u7B49\u30B0\u30EA\u30C3\u30C9\u3067\u4E00\u89A7\u3055\u305B\u308B"
  },
  {
    id: "team",
    name: "\u30B9\u30BF\u30C3\u30D5\u30FB\u30C1\u30FC\u30E0\u7D39\u4ECB",
    purpose: "\u300C\u8AB0\u304C\u5BFE\u5FDC\u3057\u3066\u304F\u308C\u308B\u306E\u304B\u300D\u3092\u898B\u305B\u4EBA\u3078\u306E\u5B89\u5FC3\u611F\u3092\u4F5C\u308B",
    slots: ["\u9854\u5199\u771F", "\u6C0F\u540D", "\u5F79\u8077\u30FB\u8CC7\u683C", "\u5F97\u610F\u5206\u91CE\u30FB\u4E00\u8A00\u30B3\u30E1\u30F3\u30C8"],
    layout: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u30AB\u30FC\u30C9\u578B: \u9854\u5199\u771F\uFF0B\u6C0F\u540D\uFF0B\u5F79\u8077\u30FB\u8CC7\u683C\uFF0B\u4E00\u8A00\u30B3\u30E1\u30F3\u30C8\u306E\u30AB\u30FC\u30C9\u3092\u4E26\u3079\u308B"
  },
  {
    id: "profile",
    name: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB",
    purpose: "\u500B\u4EBA\u306E\u7D4C\u6B74\u30FB\u30B9\u30AD\u30EB\u30FB\u5B9F\u7E3E\u3092\u4F1D\u3048\u6307\u540D\u30FB\u4F9D\u983C\u306B\u3064\u306A\u3052\u308B",
    slots: ["\u30DD\u30FC\u30C8\u30EC\u30FC\u30C8", "\u540D\u524D\u30FB\u80A9\u66F8\u304D", "\u7D4C\u6B74", "\u30B9\u30AD\u30EB\u30FB\u4F7F\u7528\u30C4\u30FC\u30EB", "\u53D7\u8CDE\u30FB\u767B\u58C7\u6B74"],
    layout: "\u5199\u771F\u30FB\u7D4C\u6B74\u4E26\u5217\u578B: \u30DD\u30FC\u30C8\u30EC\u30FC\u30C8\u3068\u81EA\u5DF1\u7D39\u4ECB\u6587\u3092\u4E26\u3079\u3001\u30B9\u30AD\u30EB\u3084\u53D7\u8CDE\u6B74\u3092\u30BF\u30B0\u3067\u6574\u7406\u3059\u308B"
  },
  {
    id: "interview",
    name: "\u30A4\u30F3\u30BF\u30D3\u30E5\u30FC",
    purpose: "\u793E\u54E1\u30FB\u751F\u5F92\u306E\u30EA\u30A2\u30EB\u306A\u58F0\u3067\u5165\u793E\u5F8C\u30FB\u5165\u4F1A\u5F8C\u306E\u5177\u4F53\u7684\u30A4\u30E1\u30FC\u30B8\u3092\u4F5C\u308B",
    slots: ["\u4EBA\u7269\u5199\u771F", "\u5C5E\u6027\uFF08\u90E8\u7F72\u30FB\u5165\u793E\u5E74\u6B21\u30FB\u30B3\u30FC\u30B9\uFF09", "Q&A\u672C\u6587", "\u4ED6\u30A4\u30F3\u30BF\u30D3\u30E5\u30FC\u3078\u306E\u30EA\u30F3\u30AF"],
    layout: "\u4E00\u89A7\u30AB\u30FC\u30C9\u578B: \u4EBA\u7269\u5199\u771F\uFF0B\u5370\u8C61\u7684\u306A\u4E00\u8A00\u306E\u30AB\u30FC\u30C9\u3092\u4E26\u3079\u3001\u5C5E\u6027\uFF08\u90E8\u7F72\u30FB\u5165\u793E\u5E74\u6B21\u306A\u3069\uFF09\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "culture",
    name: "\u50CD\u304F\u74B0\u5883\u30FB\u798F\u5229\u539A\u751F",
    purpose: "\u5236\u5EA6\u30FB\u74B0\u5883\u30FB\u793E\u98A8\u3092\u898B\u305B\u300C\u3053\u3053\u3067\u50CD\u304F\u81EA\u5206\u300D\u3092\u60F3\u50CF\u3055\u305B\u308B",
    slots: ["\u5236\u5EA6\u30EA\u30B9\u30C8\uFF08\u30A2\u30A4\u30B3\u30F3\uFF0B\u540D\u79F0\uFF0B\u8AAC\u660E\uFF09", "\u30AA\u30D5\u30A3\u30B9\u5199\u771F", "\u793E\u5185\u30A4\u30D9\u30F3\u30C8\u5199\u771F", "\u74B0\u5883\u30C7\u30FC\u30BF"],
    layout: "\u5236\u5EA6\u30A2\u30A4\u30B3\u30F3\u30B0\u30EA\u30C3\u30C9\u578B: \u798F\u5229\u539A\u751F\u30FB\u5236\u5EA6\u3092\u30A2\u30A4\u30B3\u30F3\u4ED8\u304D\u30AB\u30FC\u30C9\u3067\u7DB2\u7F85\u3057\u3001\u30AA\u30D5\u30A3\u30B9\u5199\u771F\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "recruit-message",
    name: "\u63A1\u7528\u30E1\u30C3\u30BB\u30FC\u30B8",
    purpose: "\u4F1A\u793E\u306E\u60F3\u3044\u3068\u6C42\u3081\u308B\u4EBA\u7269\u50CF\u3092\u4F1D\u3048\u5FDC\u52DF\u306E\u71B1\u91CF\u3092\u4E0A\u3052\u308B",
    slots: ["\u63A1\u7528\u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC", "\u30E1\u30C3\u30BB\u30FC\u30B8\u672C\u6587", "\u4EE3\u8868\u30FB\u4EBA\u4E8B\u306E\u5199\u771F", "\u6C42\u3081\u308B\u4EBA\u7269\u50CF"],
    layout: "\u5168\u9762\u5199\u771F\u578B: \u50CD\u304F\u4EBA\u306E\u5199\u771F\u3092\u5168\u9762\u306B\u6577\u304D\u3001\u63A1\u7528\u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC\u3092\u91CD\u306D\u3066\u611F\u60C5\u306B\u8A34\u3048\u308B"
  },
  {
    id: "job-openings",
    name: "\u52DF\u96C6\u8981\u9805",
    purpose: "\u8077\u7A2E\u30FB\u6761\u4EF6\u3092\u660E\u78BA\u306B\u63D0\u793A\u3057\u30DF\u30B9\u30DE\u30C3\u30C1\u306A\u304F\u5FDC\u52DF\u3078\u3064\u306A\u3052\u308B",
    slots: ["\u8077\u7A2E\u540D", "\u96C7\u7528\u5F62\u614B", "\u4ED5\u4E8B\u5185\u5BB9", "\u7D66\u4E0E\u30FB\u52E4\u52D9\u6642\u9593\u30FB\u4F11\u65E5", "\u5FDC\u52DF\u8CC7\u683C", "\u30A8\u30F3\u30C8\u30EA\u30FC\u30DC\u30BF\u30F3"],
    layout: "\u8981\u9805\u30C6\u30FC\u30D6\u30EB\u578B: \u8077\u7A2E\u30FB\u7D66\u4E0E\u30FB\u52E4\u52D9\u6642\u9593\u306A\u3069\u306E\u52B4\u50CD\u6761\u4EF6\u3092\u8868\u5F62\u5F0F\u3067\u6B63\u78BA\u306B\u8A18\u8F09\u3057\u3001\u30A8\u30F3\u30C8\u30EA\u30FC\u30DC\u30BF\u30F3\u3078\u3064\u306A\u3050"
  },
  {
    id: "curriculum",
    name: "\u30B3\u30FC\u30B9\u30FB\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0",
    purpose: "\u5B66\u3079\u308B\u5185\u5BB9\u3068\u6210\u9577\u30B9\u30C6\u30C3\u30D7\u3092\u5177\u4F53\u7684\u306B\u793A\u3057\u5165\u4F1A\u5F8C\u3092\u60F3\u50CF\u3055\u305B\u308B",
    slots: ["\u30B3\u30FC\u30B9\u540D", "\u5BFE\u8C61\u30EC\u30D9\u30EB", "\u5B66\u7FD2\u5185\u5BB9", "\u671F\u9593\u30FB\u56DE\u6570", "\u6599\u91D1\u3078\u306E\u30EA\u30F3\u30AF"],
    layout: "\u30B3\u30FC\u30B9\u30AB\u30FC\u30C9\u578B: \u30B3\u30FC\u30B9\u3054\u3068\u306E\u5BFE\u8C61\u30FB\u5185\u5BB9\u30FB\u671F\u9593\u30FB\u6599\u91D1\u3092\u30AB\u30FC\u30C9\u3067\u6BD4\u8F03\u3055\u305B\u308B"
  },
  {
    id: "flow",
    name: "\u3054\u5229\u7528\u306E\u6D41\u308C",
    purpose: "\u7533\u8FBC\u301C\u5229\u7528\u958B\u59CB\u307E\u3067\u306E\u624B\u9806\u3092\u53EF\u8996\u5316\u3057\u300C\u9762\u5012\u30FB\u4E0D\u5B89\u300D\u3092\u6D88\u3059",
    slots: ["\u30B9\u30C6\u30C3\u30D7\u756A\u53F7", "\u30B9\u30C6\u30C3\u30D7\u540D", "\u8AAC\u660E\u6587", "\u30A2\u30A4\u30B3\u30F3\u30FB\u5199\u771F", "\u6240\u8981\u6642\u9593"],
    layout: "\u756A\u53F7\u30AB\u30FC\u30C9\u578B: \u5927\u304D\u306A\u30B9\u30C6\u30C3\u30D7\u756A\u53F7\uFF0B\u5199\u771F\u306E\u30AB\u30FC\u30C9\u3067\u624B\u9806\u3092\u9806\u306B\u898B\u305B\u308B\uFF08\u77E2\u5370\u3067\u306F\u3064\u306A\u304C\u306A\u3044\uFF09"
  },
  {
    id: "faq",
    name: "\u3088\u304F\u3042\u308B\u8CEA\u554F",
    purpose: "\u7591\u554F\u3068\u4E0D\u5B89\u3092\u5148\u56DE\u308A\u3067\u89E3\u6D88\u3057\u96E2\u8131\u3068\u554F\u3044\u5408\u308F\u305B\u8CA0\u8377\u3092\u6E1B\u3089\u3059",
    slots: ["\u8CEA\u554F\u6587", "\u56DE\u7B54\u6587", "\u30AB\u30C6\u30B4\u30EA", "Q\u30FBA\u30A2\u30A4\u30B3\u30F3"],
    layout: "\u30A2\u30B3\u30FC\u30C7\u30A3\u30AA\u30F3\u578B: \u30AF\u30EA\u30C3\u30AF\u3067\u56DE\u7B54\u3092\u958B\u9589\u3059\u308BQ&A\u3092\u7E26\u306B\u4E26\u3079\u308B"
  },
  {
    id: "news",
    name: "\u304A\u77E5\u3089\u305B\u30FB\u30CB\u30E5\u30FC\u30B9",
    purpose: "\u6700\u65B0\u60C5\u5831\u306E\u767A\u4FE1\u3067\u300C\u4ECA\u3082\u6D3B\u52D5\u3057\u3066\u3044\u308B\u300D\u5B89\u5FC3\u611F\u3092\u4F1D\u3048\u308B",
    slots: ["\u65E5\u4ED8", "\u30AB\u30C6\u30B4\u30EA\u30E9\u30D9\u30EB", "\u30BF\u30A4\u30C8\u30EB", "\u4E00\u89A7\u30DA\u30FC\u30B8\u3078\u306E\u30EA\u30F3\u30AF"],
    layout: "\u30EA\u30B9\u30C8\u578B: \u65E5\u4ED8\uFF0B\u30AB\u30C6\u30B4\u30EA\u30E9\u30D9\u30EB\uFF0B\u30BF\u30A4\u30C8\u30EB\u306E\u884C\u3092\u7E26\u306B\u4E26\u3079\u3001\u4E00\u89A7\u30DA\u30FC\u30B8\u3078\u306E\u30EA\u30F3\u30AF\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "blog",
    name: "\u30D6\u30ED\u30B0\u30FB\u30B3\u30E9\u30E0",
    purpose: "\u5C02\u9580\u77E5\u8B58\u306E\u767A\u4FE1\u3067SEO\u6D41\u5165\u3068\u5C02\u9580\u6027\u3078\u306E\u4FE1\u983C\u3092\u7A4D\u307F\u4E0A\u3052\u308B",
    slots: ["\u8A18\u4E8B\u30AB\u30FC\u30C9\uFF08\u30B5\u30E0\u30CD\u30A4\u30EB\uFF0B\u30BF\u30A4\u30C8\u30EB\uFF0B\u65E5\u4ED8\uFF0B\u30AB\u30C6\u30B4\u30EA\uFF09", "\u4EBA\u6C17\u8A18\u4E8B", "\u30BF\u30B0\u4E00\u89A7"],
    layout: "\u30AB\u30FC\u30C9\u30B0\u30EA\u30C3\u30C9\u578B: \u30B5\u30E0\u30CD\u30A4\u30EB\uFF0B\u30BF\u30A4\u30C8\u30EB\uFF0B\u65E5\u4ED8\u306E\u8A18\u4E8B\u30AB\u30FC\u30C9\u30923\u4EF6\u524D\u5F8C\u3067\u4E26\u3079\u308B"
  },
  {
    id: "sns-feed",
    name: "SNS\u30D5\u30A3\u30FC\u30C9",
    purpose: "\u65E5\u3005\u306E\u6295\u7A3F\u3092\u898B\u305B\u3066\u9BAE\u5EA6\u3068\u89AA\u8FD1\u611F\u3092\u4F1D\u3048\u30D5\u30A9\u30ED\u30FC\u306B\u3064\u306A\u3052\u308B",
    slots: ["Instagram\u30FBX\u306E\u57CB\u3081\u8FBC\u307F\u30B0\u30EA\u30C3\u30C9", "\u30A2\u30AB\u30A6\u30F3\u30C8\u540D", "\u30D5\u30A9\u30ED\u30FC\u30DC\u30BF\u30F3"],
    layout: "Instagram\u30B0\u30EA\u30C3\u30C9\u578B: \u6700\u65B0\u6295\u7A3F\u3092\u6B63\u65B9\u5F62\u30B0\u30EA\u30C3\u30C9\u3067\u898B\u305B\u3001\u30A2\u30AB\u30A6\u30F3\u30C8\u540D\u3068\u30D5\u30A9\u30ED\u30FC\u30DC\u30BF\u30F3\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "access",
    name: "\u30A2\u30AF\u30BB\u30B9\u30FB\u5E97\u8217\u60C5\u5831",
    purpose: "\u5834\u6240\u30FB\u884C\u304D\u65B9\u30FB\u55B6\u696D\u6642\u9593\u3092\u660E\u78BA\u306B\u4F1D\u3048\u6765\u5E97\u306E\u969C\u58C1\u3092\u4E0B\u3052\u308B",
    slots: ["\u5730\u56F3", "\u4F4F\u6240", "\u6700\u5BC4\u308A\u99C5\u30FB\u9053\u9806", "\u55B6\u696D\u6642\u9593\u30FB\u5B9A\u4F11\u65E5", "\u99D0\u8ECA\u5834\u60C5\u5831", "\u96FB\u8A71\u756A\u53F7"],
    layout: "\u5730\u56F3\u30FB\u60C5\u5831\u4E26\u5217\u578B: \u5730\u56F3\u3068\u4F4F\u6240\u30FB\u6700\u5BC4\u308A\u99C5\u30FB\u55B6\u696D\u6642\u9593\u30FB\u99D0\u8ECA\u5834\u306E\u30C6\u30FC\u30D6\u30EB\u3092\u5DE6\u53F3\u306B\u4E26\u3079\u308B"
  },
  {
    id: "reservation",
    name: "\u4E88\u7D04\u30FB\u7533\u8FBC",
    purpose: "\u4E88\u7D04\u624B\u6BB5\u30921\u304B\u6240\u306B\u96C6\u7D04\u3057\u300C\u4ECA\u3059\u3050\u306E\u884C\u52D5\u300D\u306B\u3064\u306A\u3052\u308B",
    slots: ["\u96FB\u8A71\u756A\u53F7\uFF08\u30BF\u30C3\u30D7\u767A\u4FE1\uFF09", "Web\u4E88\u7D04\u30DC\u30BF\u30F3", "LINE\u4E88\u7D04", "\u53D7\u4ED8\u6642\u9593\u306E\u6CE8\u8A18"],
    layout: "\u96FB\u8A71\u30FBWeb\u30FBLINE\u4E26\u5217\u578B: 3\u3064\u306E\u4E88\u7D04\u624B\u6BB5\u3092\u5927\u304D\u306A\u30DC\u30BF\u30F3\u3067\u4E26\u3079\u3001\u53D7\u4ED8\u6642\u9593\u306E\u6CE8\u8A18\u3092\u6DFB\u3048\u308B"
  },
  {
    id: "cta",
    name: "CTA\u30FB\u30B3\u30F3\u30D0\u30FC\u30B8\u30E7\u30F3\u30A8\u30EA\u30A2",
    purpose: "\u30DA\u30FC\u30B8\u306E\u8981\u6240\u3067\u884C\u52D5\u3092\u4FC3\u3059\u7DE0\u3081\u306E\u8A98\u5C0E\u30BB\u30AF\u30B7\u30E7\u30F3",
    slots: ["\u8A34\u6C42\u30B3\u30D4\u30FC", "CTA\u30DC\u30BF\u30F3\uFF08\u6700\u59272\u7A2E\uFF09", "\u96FB\u8A71\u756A\u53F7", "\u7279\u5178\u30FB\u4FDD\u8A3C\u306E\u518D\u63B2"],
    layout: "\u30AF\u30ED\u30FC\u30B8\u30F3\u30B0\u578B: \u8A34\u6C42\u30B3\u30D4\u30FC\uFF0B\u4E3B\u8981CTA\u30DC\u30BF\u30F3\u306B\u7279\u5178\u30FB\u4FDD\u8A3C\u306E\u518D\u63B2\u3092\u6DFB\u3048\u3066\u80CC\u4E2D\u3092\u62BC\u3059"
  },
  {
    id: "contact",
    name: "\u304A\u554F\u3044\u5408\u308F\u305B\u30D5\u30A9\u30FC\u30E0",
    purpose: "\u554F\u3044\u5408\u308F\u305B\u306E\u30CF\u30FC\u30C9\u30EB\u3092\u4E0B\u3052\u78BA\u5B9F\u306B\u9001\u4FE1\u307E\u3067\u5B8C\u4E86\u3055\u305B\u308B",
    slots: ["\u5165\u529B\u30D5\u30A3\u30FC\u30EB\u30C9\uFF08\u540D\u524D\u30FB\u9023\u7D61\u5148\u30FB\u5185\u5BB9\uFF09", "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC\u540C\u610F", "\u9001\u4FE1\u30DC\u30BF\u30F3", "\u96FB\u8A71\u306E\u4EE3\u66FF\u5C0E\u7DDA"],
    layout: "\u30B7\u30F3\u30D7\u30EB1\u30AB\u30E9\u30E0\u578B: \u9805\u76EE\u6700\u5C0F\u9650\u306E\u7E261\u5217\u30D5\u30A9\u30FC\u30E0\uFF0B\u540C\u610F\u30C1\u30A7\u30C3\u30AF\uFF0B\u9001\u4FE1\u30DC\u30BF\u30F3\u3002\u96FB\u8A71\u306E\u4EE3\u66FF\u5C0E\u7DDA\u3092\u96A3\u306B\u6DFB\u3048\u308B"
  },
  {
    id: "newsletter",
    name: "\u30E1\u30EB\u30DE\u30AC\u30FBLINE\u767B\u9332",
    purpose: "\u4ECA\u3059\u3050\u8CB7\u308F\u306A\u3044\u5C64\u3068\u63A5\u70B9\u3092\u4F5C\u308A\u518D\u8A2A\u30FB\u518D\u8CFC\u5165\u3092\u4FC3\u3059",
    slots: ["\u767B\u9332\u7279\u5178\u306E\u63D0\u793A", "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u5165\u529B", "LINE\u53CB\u3060\u3061\u8FFD\u52A0\u30DC\u30BF\u30F3", "QR\u30B3\u30FC\u30C9"],
    layout: "\u7279\u5178\u30AB\u30FC\u30C9\u578B: \u767B\u9332\u30E1\u30EA\u30C3\u30C8\u3092\u524D\u9762\u306B\u51FA\u3057\u3001\u30E1\u30FC\u30EB\u5165\u529B\u6B04\u3068LINE\u53CB\u3060\u3061\u8FFD\u52A0\u30DC\u30BF\u30F3\u3092\u4E26\u3079\u308B"
  },
  {
    id: "integration",
    name: "\u9023\u643A\u30FB\u5BFE\u5FDC\u74B0\u5883",
    purpose: "\u65E2\u5B58\u30C4\u30FC\u30EB\u30FB\u74B0\u5883\u3068\u306E\u89AA\u548C\u6027\u3092\u793A\u3057\u5C0E\u5165\u306E\u969C\u58C1\u3092\u4E0B\u3052\u308B",
    slots: ["\u9023\u643A\u30B5\u30FC\u30D3\u30B9\u306E\u30ED\u30B4", "\u9023\u643A\u30AB\u30C6\u30B4\u30EA", "\u5BFE\u5FDCOS\u30FB\u30D6\u30E9\u30A6\u30B6"],
    layout: "\u30ED\u30B4\u30BF\u30A4\u30EB\u578B: \u9023\u643A\u30B5\u30FC\u30D3\u30B9\u306E\u30ED\u30B4\u3092\u30BF\u30A4\u30EB\u72B6\u306B\u4E26\u3079\u3001\u5BFE\u5FDC\u74B0\u5883\u3092\u77ED\u304F\u8A00\u53CA\u3059\u308B"
  },
  {
    id: "footer",
    name: "\u30D5\u30C3\u30BF\u30FC",
    purpose: "\u5168\u30DA\u30FC\u30B8\u5171\u901A\u306E\u60C5\u5831\u6574\u7406\u3068\u8FF7\u3063\u305F\u30E6\u30FC\u30B6\u30FC\u306E\u6700\u5F8C\u306E\u53D7\u3051\u76BF",
    slots: ["\u30ED\u30B4", "\u30B5\u30A4\u30C8\u30DE\u30C3\u30D7\u30EA\u30F3\u30AF", "\u4F1A\u793E\u60C5\u5831\u30FB\u4F4F\u6240\u30FB\u96FB\u8A71", "SNS\u30A2\u30A4\u30B3\u30F3", "\u6CD5\u7684\u30EA\u30F3\u30AF", "\u30B3\u30D4\u30FC\u30E9\u30A4\u30C8"],
    layout: "\u30DE\u30EB\u30C1\u30AB\u30E9\u30E0\u578B: \u30B5\u30A4\u30C8\u30DE\u30C3\u30D7\u30EA\u30F3\u30AF\u30923\u301C4\u5217\u3067\u6574\u7406\u3057\u3001\u4F1A\u793E\u60C5\u5831\u30FBSNS\u30FB\u6CD5\u7684\u30EA\u30F3\u30AF\u30FB\u30B3\u30D4\u30FC\u30E9\u30A4\u30C8\u3092\u53CE\u3081\u308B\uFF08LP\u306F\u30ED\u30B4\u3068\u6700\u5C0F\u30EA\u30F3\u30AF\u306E\u4E2D\u592E\u5BC4\u305B\u3067\u3088\u3044\uFF09"
  }
];
var SECTION_MAP = Object.fromEntries(
  WEB_SECTIONS.map((s) => [s.id, s])
);

// src/studio/wf/idMap.ts
var KIND_TO_ID = {
  hero: "fv",
  features: "reasons",
  "pricing-table": "pricing",
  pricing: "pricing",
  "service-list": "services",
  menu: "menu",
  flow: "flow",
  team: "staff",
  access: "access",
  faq: "faq",
  cta: "cta",
  testimonials: "voice",
  contact: "contact",
  gallery: "gallery",
  stats: "stats"
};
function toKebab(raw) {
  const kebab = raw.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  return kebab;
}
function toSectionId(kind, index, used) {
  const base = KIND_TO_ID[kind] ?? toKebab(kind) ?? "";
  const fallback = base !== "" ? base : `section-${index + 1}`;
  let id = fallback;
  let n = 2;
  while (used.has(id)) {
    id = `${fallback}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}
var ID_TO_COMPONENT = {
  fv: "Hero.astro",
  reasons: "Reasons.astro",
  services: "Services.astro",
  menu: "Services.astro",
  pricing: "Pricing.astro",
  flow: "Flow.astro",
  staff: "Staff.astro",
  access: "Access.astro",
  faq: "Faq.astro",
  cta: "Cta.astro",
  voice: "Testimonials.astro",
  contact: "Contact.astro",
  gallery: "Gallery.astro",
  stats: "Stats.astro"
};
function toAstroComponentName(sectionId) {
  const known = ID_TO_COMPONENT[sectionId];
  if (known) return known;
  const base = sectionId.replace(/-\d+$/, "");
  const pascal = base.split("-").filter((part) => part !== "").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return `${pascal !== "" ? pascal : "Section"}.astro`;
}

// src/tools/web/build.ts
function pickFact(hearingMd, keywords) {
  for (const rawLine of hearingMd.split("\n")) {
    const line = rawLine.trim();
    const kw = keywords.find((k) => line.includes(k));
    if (!kw) continue;
    if (line.startsWith("|")) {
      const cells = line.split("|").map((cell) => cell.trim()).filter((cell) => cell !== "");
      const i = cells.findIndex((cell) => cell.includes(kw));
      const value = i >= 0 ? cells[i + 1] : void 0;
      if (value && !/^[-:ー–—\s]+$/.test(value)) return value;
      continue;
    }
    const m = line.match(new RegExp(`${kw}[^:\uFF1A]*[:\uFF1A]\\s*(.+)$`));
    if (m && m[1].trim() !== "") return m[1].trim();
  }
  return null;
}
function extractRootBlock(toneMd) {
  const m = toneMd.match(/:root\s*\{[^}]*\}/);
  return m ? m[0] : null;
}
var MOBILE_NAV_LABEL = {
  "bottom-bar": "\u4E0B\u90E8\u56FA\u5B9A\u30D0\u30FC\uFF08\u4E3B\u8981CTA\u5E38\u8A2D\uFF09",
  hamburger: "\u30CF\u30F3\u30D0\u30FC\u30AC\u30FC\uFF0B\u30C9\u30ED\u30EF\u30FC",
  both: "\u4E0B\u90E8\u56FA\u5B9A\u30D0\u30FC\uFF0B\u30CF\u30F3\u30D0\u30FC\u30AC\u30FC\u306E\u4F75\u7528"
};
function buildStudioSpecMd(input) {
  const { project, hearingMd, designSystem, toneMd, wfPlan, designFiles } = input;
  const md = [];
  const siteName = wfPlan?.siteName || pickFact(hearingMd, ["\u5C4B\u53F7", "\u5E97\u540D", "\u4F1A\u793E\u540D", "\u4E8B\u696D\u8005\u540D"]) || project;
  md.push(
    `# ${siteName} \u5B9F\u88C5\u30B9\u30DA\u30C3\u30AF`,
    "",
    `clients/${project}/ \u306E\u5B9F\u88C5\u4ED5\u69D8\u66F8\uFF08atelier \u30B9\u30BF\u30B8\u30AA\u751F\u6210\uFF09\u3002\u3053\u306E\u5185\u5BB9\u306B\u5F93\u3063\u3066 site/ \u306B\u9759\u7684\u30B5\u30A4\u30C8\u3092\u5B9F\u88C5\u3059\u308B\u3002`,
    "",
    bullets([
      "\u60C5\u5831\u306E\u6B63\u5178\u306F3\u3064\u3002\u4E8B\u5B9F\u30FB\u6570\u5B57 = hearing.md / \u69CB\u9020\u3068\u30B3\u30D4\u30FC = wireframe/wireframe-fixed.html / \u30C7\u30B6\u30A4\u30F3 = tone.md",
      "hearing.md \u306B\u7121\u3044\u6570\u5B57\u30FB\u5B9F\u7E3E\u30FB\u4E8B\u5B9F\uFF08\u4EF6\u6570\u3001\u5E74\u6570\u3001\u4FA1\u683C\u3001\u4F4F\u6240\u306A\u3069\uFF09\u3092\u634F\u9020\u3057\u306A\u3044\u3002\u4E0D\u660E\u306A\u7B87\u6240\u306F TODO \u30B3\u30E1\u30F3\u30C8\u3067\u6B8B\u3059",
      "\u30E2\u30C3\u30AF\u753B\u50CF\uFF08design/\uFF09\u306F\u96F0\u56F2\u6C17\u306E\u53C2\u8003\u306B\u3068\u3069\u3081\u308B\u3002\u8272\u30FB\u6570\u5024\u30FB\u6587\u8A00\u306F\u3053\u306E\u30B9\u30DA\u30C3\u30AF\u3068\u4E0A\u306E\u6B63\u5178\u304C\u6B63"
    ])
  );
  md.push("", "## 1. \u30C7\u30B6\u30A4\u30F3\u30C8\u30FC\u30AF\u30F3", "");
  if (designSystem) {
    md.push(
      `\u30C7\u30B6\u30A4\u30F3\u30B7\u30B9\u30C6\u30E0\u300C${designSystem.name}\u300D\uFF08${designSystem.slug}\uFF09\u2014 ${designSystem.personality}`,
      "",
      "`:root` \u306B\u6B21\u306ECSS\u5909\u6570\u3092\u5B9A\u7FA9\u3057\u3001\u8272\u306F\u5FC5\u305A\u5909\u6570\u7D4C\u7531\u3067\u4F7F\u3046\uFF08HEX\u76F4\u66F8\u304D\u7981\u6B62\uFF09\u3002",
      "",
      "```css",
      ":root {",
      `  --color-bg: ${designSystem.colors.bg};`,
      `  --color-bg-alt: ${designSystem.colors.bgAlt};`,
      `  --color-surface: ${designSystem.colors.surface};`,
      `  --color-ink: ${designSystem.colors.ink};`,
      `  --color-ink-muted: ${designSystem.colors.inkMuted};`,
      `  --color-heading: ${designSystem.colors.heading};`,
      `  --color-primary: ${designSystem.colors.primary};`,
      `  --color-on-primary: ${designSystem.colors.onPrimary};`,
      `  --color-accent: ${designSystem.colors.accent};`,
      `  --color-border: ${designSystem.colors.border};`,
      ...(designSystem.derived ?? []).map((d) => `  --color-${d.name}: ${d.value};`),
      `  --font-heading: ${designSystem.fonts.heading};`,
      `  --font-body: ${designSystem.fonts.body};`,
      `  --font-accent: ${designSystem.fonts.accent};`,
      "}",
      "```",
      ""
    );
    md.push(
      bullets([
        `Google Fonts: ${designSystem.fonts.googleFontsUrl}`,
        designSystem.fonts.headingLetterSpacing && `\u898B\u51FA\u3057\u306E\u5B57\u9593: letter-spacing ${designSystem.fonts.headingLetterSpacing}`,
        `\u30BB\u30AF\u30B7\u30E7\u30F3\u4E0A\u4E0B\u4F59\u767D\u306E\u57FA\u6E96: ${designSystem.spacing.sectionDefault}\uFF08${designSystem.spacing.philosophy}\uFF09`,
        `\u89D2\u4E38\u306E\u614B\u5EA6: ${designSystem.radius.attitude}`,
        `\u30BF\u30A4\u30C8\u30EB\u88C5\u98FE\u30EC\u30B7\u30D4: ${designSystem.decorations.titleRecipes.join(" / ")}`,
        `\u30DC\u30BF\u30F3\u30EC\u30B7\u30D4: ${designSystem.decorations.buttonRecipes.join(" / ")}`,
        `\u30C8\u30FC\u30F3\u56FA\u6709\u306E\u6F14\u51FA: ${designSystem.decorations.extras.join(" / ")}`,
        `\u5199\u771F\u30C8\u30FC\u30F3: \u88AB\u5199\u4F53=${designSystem.photoTone.subject} / \u5149=${designSystem.photoTone.light} / \u8272=${designSystem.photoTone.color}`,
        `\u5168\u5199\u771F\u306B\u5171\u901A\u30D5\u30A3\u30EB\u30BF: filter: ${designSystem.photoTone.filterCss}\uFF08\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3\u30AF\u30E9\u30B9\u5316\u3057\u3066\u9069\u7528\uFF09`
      ])
    );
  } else if (toneMd) {
    const root = extractRootBlock(toneMd);
    if (root) {
      md.push(
        "tone.md \u306E\u30C8\u30FC\u30AF\u30F3\u5B9A\u7FA9\u3092\u305D\u306E\u307E\u307E\u4F7F\u3046\u3002`:root` \u306F\u6B21\u306E\u901A\u308A\uFF08tone.md \u304B\u3089\u5F15\u7528\u3002\u6539\u5909\u3057\u306A\u3044\uFF09\u3002",
        "",
        "```css",
        root,
        "```"
      );
    } else {
      md.push("tone.md \u3092\u30C7\u30B6\u30A4\u30F3\u306E\u6B63\u3068\u3059\u308B\u3002tone.md \u5185\u306E\u914D\u8272\u30FB\u66F8\u4F53\u30FB\u4F59\u767D\u306E\u5B9A\u7FA9\u304B\u3089 `:root` \u306ECSS\u5909\u6570\u3092\u7D44\u3080\u3053\u3068\u3002");
    }
  } else {
    md.push("\u30C7\u30B6\u30A4\u30F3\u30C8\u30FC\u30AF\u30F3\u672A\u78BA\u5B9A\u3002\u5B9F\u88C5\u524D\u306B tone.md\uFF08\u30B3\u30F3\u30BB\u30D7\u30C8\u30D5\u30A7\u30FC\u30BA\uFF09\u3092\u78BA\u5B9A\u3055\u305B\u308B\u3053\u3068\u3002");
  }
  md.push("", "## 2. \u30DA\u30FC\u30B8\u69CB\u9020", "");
  if (wfPlan) {
    md.push(
      "wireframe/wireframe-fixed.html \u306E\u30BB\u30AF\u30B7\u30E7\u30F3\u5217\u304C\u6B63\u3002\u9806\u5E8F\u306E\u5165\u308C\u66FF\u3048\u30FB\u30BB\u30AF\u30B7\u30E7\u30F3\u306E\u8FFD\u52A0\u524A\u9664\u3092\u3057\u306A\u3044\u3002",
      "\u898B\u51FA\u3057\u30FB\u672C\u6587\u30FB\u30DC\u30BF\u30F3\u306E\u30B3\u30D4\u30FC\u3082 wireframe-fixed.html \u306E\u6587\u8A00\u3092\u305D\u306E\u307E\u307E\u4F7F\u3046\uFF08\u3053\u306E\u30B9\u30DA\u30C3\u30AF\u306B\u30B3\u30D4\u30FC\u306F\u518D\u63B2\u3057\u306A\u3044\uFF09\u3002",
      "",
      "| # | \u30BB\u30AF\u30B7\u30E7\u30F3ID | \u540D\u524D | \u7A2E\u5225 | Astro\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8 |",
      "| --- | --- | --- | --- | --- |",
      ...wfPlan.sections.map(
        (sec, i) => `| ${i + 1} | ${sec.key} | ${sec.label} | ${sec.kind}${sec.isCta ? "\uFF08CTA\uFF09" : ""} | ${toAstroComponentName(sec.key)} |`
      ),
      "",
      bullets([
        `\u30B0\u30ED\u30FC\u30D0\u30EB\u30CA\u30D3: ${wfPlan.nav.map((n) => `\u300C${n.label}\u300D\u2192 #${n.sectionKey}`).join(" / ")}`,
        `\u30E2\u30D0\u30A4\u30EB\u30CA\u30D3: ${MOBILE_NAV_LABEL[wfPlan.mobileNav]}`,
        `\u30B5\u30A4\u30C8\u306E\u4E00\u756A\u306E\u76EE\u7684: ${wfPlan.purposeType}\u3002\u5168\u30BB\u30AF\u30B7\u30E7\u30F3\u306E\u5C0E\u7DDA\u3092\u6700\u7D42CTA\u3078\u53CE\u675F\u3055\u305B\u308B`
      ])
    );
  } else {
    md.push(
      bullets([
        "WF\u30D7\u30E9\u30F3\uFF08state.json\uFF09\u304C\u7121\u3044\u305F\u3081\u3001wireframe/wireframe-fixed.html \u306E <section id> \u5217\u3092\u305D\u306E\u307E\u307E\u69CB\u9020\u306E\u6B63\u3068\u3059\u308B",
        "1\u3064\u306E <section id> \u306B\u3064\u304D1\u3064\u306EAstro\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3092 src/components/sections/ \u306B\u5207\u308B\uFF08ID\u3092PascalCase\u5316\u3057\u305F\u540D\u524D\uFF09",
        "\u898B\u51FA\u3057\u30FB\u672C\u6587\u30FB\u30DC\u30BF\u30F3\u306E\u30B3\u30D4\u30FC\u306F wireframe-fixed.html \u306E\u6587\u8A00\u3092\u305D\u306E\u307E\u307E\u4F7F\u3046"
      ])
    );
  }
  md.push("", "## 3. \u30EC\u30A4\u30A2\u30A6\u30C8\u6307\u793A", "");
  md.push(
    bullets([
      "\u30EC\u30A4\u30A2\u30A6\u30C8\uFF08\u30AB\u30E9\u30E0\u69CB\u6210\u30FB\u753B\u50CF\u4F4D\u7F6E\u30FB\u975E\u5BFE\u79F0\uFF09\u306F wireframe-fixed.html \u306E\u30B0\u30EC\u30FC\u30B9\u30B1\u30FC\u30EB\u8A2D\u8A08\u3092\u5FE0\u5B9F\u306B\u518D\u73FE\u3059\u308B",
      "\u305D\u306E\u4E0A\u306B tone.md / \u4E0A\u8A18\u30C8\u30FC\u30AF\u30F3\u306E\u914D\u8272\u30FB\u66F8\u4F53\u30FB\u88C5\u98FE\u3092\u7740\u305B\u308B\u3002WF\u306B\u7121\u3044\u88C5\u98FE\u8981\u7D20\u3092\u52DD\u624B\u306B\u8DB3\u3055\u306A\u3044",
      "\u30B3\u30F3\u30C6\u30F3\u30C4\u6700\u5927\u5E451200px\u30FB12\u30AB\u30E9\u30E0\u30B0\u30EA\u30C3\u30C9\u57FA\u6E96\u3002\u30BB\u30AF\u30B7\u30E7\u30F3\u306F\u5168\u5E45\u306E\u80CC\u666F\uFF0B\u4E2D\u592E\u5BC4\u305B\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u3067\u7D44\u3080",
      "\u753B\u50CF\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u306F\u540C\u3058\u4F4D\u7F6E\u30FB\u540C\u3058\u6BD4\u7387\u306E\u307E\u307E\u5B9F\u5199\uFF08\u307E\u305F\u306F\u30C0\u30DF\u30FC\u753B\u50CF\uFF09\u306B\u5DEE\u3057\u66FF\u3048\u308B"
    ])
  );
  md.push("", "### \u53C2\u8003\u30D3\u30B8\u30E5\u30A2\u30EB\uFF08design/\uFF09", "");
  if (designFiles.length > 0) {
    md.push(
      bullets([
        "\u4EE5\u4E0B\u306E\u30C7\u30B6\u30A4\u30F3\u30AB\u30F3\u30D7\u753B\u50CF\u306F\u96F0\u56F2\u6C17\uFF08\u5BC6\u5EA6\u30FB\u5199\u771F\u30C8\u30FC\u30F3\u30FB\u88C5\u98FE\u306E\u7A7A\u6C17\u611F\uFF09\u306E\u53C2\u8003\u3002\u6B63\u306F\u3053\u306E\u30B9\u30DA\u30C3\u30AF\u3068 wireframe-fixed.html",
        "\u753B\u50CF\u5185\u306E\u65E5\u672C\u8A9E\u306F\u5D29\u308C\u3066\u3044\u308B\u3053\u3068\u304C\u3042\u308B\u305F\u3081\u3001\u753B\u50CF\u304B\u3089\u6587\u5B57\u3092\u66F8\u304D\u8D77\u3053\u3055\u306A\u3044"
      ]),
      "",
      bullets(designFiles.map((f) => `design/${f}`))
    );
  } else {
    md.push("design/ \u306B\u30AB\u30F3\u30D7\u753B\u50CF\u306A\u3057\u3002wireframe-fixed.html \u3068\u30C8\u30FC\u30AF\u30F3\u3060\u3051\u3067\u5B9F\u88C5\u3059\u308B\u3002");
  }
  md.push("", "## 4. \u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u65B9\u91DD", "");
  md.push(
    bullets([
      "\u30E2\u30D0\u30A4\u30EB\u30D5\u30A1\u30FC\u30B9\u30C8\u3067\u66F8\u304F\u3002\u30D6\u30EC\u30FC\u30AF\u30DD\u30A4\u30F3\u30C8: SP <768px / TAB 768\u301C1023px / PC \u22651024px",
      "\u5DE6\u53F3\u5206\u5272\u306F\u4E0A\u4E0B\u7A4D\u307F\u3078\uFF08\u539F\u5247\u30C6\u30AD\u30B9\u30C8\u4E0A\u30FB\u753B\u50CF\u4E0B\uFF09\u3002\u30AB\u30FC\u30C9\u5217\u306FSP\u30671\u30AB\u30E9\u30E0\u304B\u6A2A\u30B9\u30AF\u30ED\u30FC\u30EB",
      wfPlan ? `SP\u306E\u30CA\u30D3\u306F\u300C${MOBILE_NAV_LABEL[wfPlan.mobileNav]}\u300D\u3002\u30C9\u30ED\u30EF\u30FC\u3092\u4F7F\u3046\u5834\u5408\u306F\u4E2D\u306B\u3082\u4E3B\u8981CTA\u3092\u7F6E\u304F` : "\u30CA\u30D3\u306FSP\u3067\u30CF\u30F3\u30D0\u30FC\u30AC\u30FC\uFF0B\u30C9\u30ED\u30EF\u30FC\u3002\u30C9\u30ED\u30EF\u30FC\u5185\u306B\u3082\u4E3B\u8981CTA\u3092\u7F6E\u304F",
      "\u898B\u51FA\u3057\u306Fclamp\u3067\u6D41\u52D5\u5316\u3057\u3001\u30BB\u30AF\u30B7\u30E7\u30F3\u4E0A\u4E0B\u4F59\u767D\u306FSP\u3067\u7D0460%\u306B\u7E2E\u3081\u308B",
      "\u96FB\u8A71\u756A\u53F7\u306FSP\u3067 tel: \u30EA\u30F3\u30AF\u306E\u30BF\u30C3\u30D7\u767A\u4FE1\u306B\u3059\u308B"
    ])
  );
  md.push("", "## 5. \u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3", "");
  md.push(
    bullets([
      "\u30C6\u30AD\u30B9\u30C8\u3068\u80CC\u666F\u306E\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4\u306F\u672C\u65874.5:1\u4EE5\u4E0A\u30FB\u5927\u304D\u306A\u898B\u51FA\u30573:1\u4EE5\u4E0A\u3092\u5FC5\u305A\u6E80\u305F\u3059",
      "\u30BF\u30C3\u30D7\u30BF\u30FC\u30B2\u30C3\u30C8\u306F44\xD744px\u4EE5\u4E0A\u3002\u96A3\u63A5\u3059\u308B\u30EA\u30F3\u30AF\u30FB\u30DC\u30BF\u30F3\u306E\u9593\u9694\u3092\u78BA\u4FDD\u3059\u308B",
      "\u30AD\u30FC\u30DC\u30FC\u30C9\u3060\u3051\u3067\u5168\u64CD\u4F5C\u3067\u304D\u308B\u3088\u3046\u306B\u3057\u3001:focus-visible \u30672px\u306E\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3\uFF08--color-primary\uFF09\u3092\u8868\u793A\u3059\u308B",
      '\u3059\u3079\u3066\u306E img \u306B alt \u3092\u4ED8\u3051\u308B\u3002\u88C5\u98FE\u753B\u50CF\u306F alt=""\u3002\u898B\u51FA\u3057\u30EC\u30D9\u30EB\u306F\u968E\u5C64\u9806\uFF08h1\u306F1\u30DA\u30FC\u30B81\u3064\uFF09',
      "prefers-reduced-motion \u306E\u6307\u5B9A\u6642\u306F\u30B9\u30AF\u30ED\u30FC\u30EB\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u3092\u7121\u52B9\u5316\u3059\u308B"
    ])
  );
  if (designSystem && designSystem.forbidden.length > 0) {
    md.push("", "\u3053\u306E\u30C7\u30B6\u30A4\u30F3\u3067\u3084\u3063\u3066\u306F\u3044\u3051\u306A\u3044\u3053\u3068\uFF08tone\u56FA\u6709\u306E\u7981\u6B62\u4E8B\u9805\uFF09:", "");
    md.push(bullets(designSystem.forbidden));
  }
  md.push("", "## 6. \u6280\u8853\u524D\u63D0", "");
  md.push(
    bullets([
      "Astro + Tailwind CSS v4\u3002\u30C8\u30FC\u30AF\u30F3\u306F global.css \u306E :root / @theme \u3067\u5B9A\u7FA9\u3057\u3001\u8272\u306F\u5FC5\u305ACSS\u5909\u6570\u7D4C\u7531\u3067\u4F7F\u3046\uFF08\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3\u3078\u306EHEX\u76F4\u66F8\u304D\u30FB\u4EFB\u610F\u5024\u306E\u76F4\u66F8\u304D\u7981\u6B62\uFF09",
      "1\u30BB\u30AF\u30B7\u30E7\u30F3\uFF1D1\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\uFF08src/components/sections/Hero.astro \u306A\u3069\u3002\u4E0A\u306E\u5BFE\u5FDC\u8868\u306B\u5F93\u3046\uFF09\u3002\u30DA\u30FC\u30B8\u306F\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3092\u4E26\u3079\u308B\u3060\u3051\u306B\u3059\u308B",
      'FV\u753B\u50CF\u306FLCP\u306B\u306A\u308B\u305F\u3081 loading="eager"\u30FBfetchpriority="high"\u3002\u305D\u308C\u4EE5\u5916\u306E\u753B\u50CF\u306Flazy\u3067\u6700\u9069\u5316\u3059\u308B',
      "\u30D5\u30A9\u30FC\u30E0\u306E\u9001\u4FE1\u5148\u306F\u5B9A\u6570\u306B\u5207\u308A\u51FA\u3057\u3066\u5B9F\u88C5\u3059\u308B\uFF08\u9001\u4FE1\u5148\u306F\u5F8C\u65E5\u5DEE\u3057\u66FF\u3048\uFF09",
      "\u30E1\u30BF\u60C5\u5831: title\u30FBdescription\u30FBOGP\u3092 hearing.md \u306E\u4E8B\u5B9F\u304B\u3089\u8A2D\u5B9A\u3059\u308B",
      "\u76EE\u6A19: Lighthouse\uFF08\u30E2\u30D0\u30A4\u30EB\uFF09\u3067 Performance / Accessibility / Best Practices / SEO \u3059\u3079\u306690\u4EE5\u4E0A"
    ])
  );
  md.push("", "### \u69CB\u9020\u5316\u30C7\u30FC\u30BF\uFF08LocalBusiness JSON-LD\uFF09", "");
  const facts = [
    { label: "\u5C4B\u53F7\uFF08name\uFF09", value: pickFact(hearingMd, ["\u5C4B\u53F7", "\u5E97\u540D", "\u4F1A\u793E\u540D", "\u4E8B\u696D\u8005\u540D"]) },
    { label: "\u4F4F\u6240\uFF08address\uFF09", value: pickFact(hearingMd, ["\u4F4F\u6240", "\u6240\u5728\u5730"]) },
    { label: "\u55B6\u696D\u6642\u9593\uFF08openingHours\uFF09", value: pickFact(hearingMd, ["\u55B6\u696D\u6642\u9593", "\u8A3A\u7642\u6642\u9593", "\u53D7\u4ED8\u6642\u9593"]) },
    { label: "\u96FB\u8A71\uFF08telephone\uFF09", value: pickFact(hearingMd, ["\u96FB\u8A71", "TEL"]) }
  ].filter((f) => f.value !== null && f.value !== "");
  if (facts.length > 0) {
    md.push(
      "hearing.md \u304B\u3089\u62FE\u3048\u305F\u4E8B\u5B9F\u306F\u6B21\u306E\u901A\u308A\u3002\u3053\u308C\u3060\u3051\u3067 LocalBusiness JSON-LD \u3092\u69CB\u6210\u3057\u3001\u7121\u3044\u9805\u76EE\u306F\u5165\u308C\u306A\u3044\uFF08\u634F\u9020\u7981\u6B62\uFF09\u3002",
      "",
      bullets(facts.map((f) => `${f.label}: ${f.value}`))
    );
  } else {
    md.push("hearing.md \u304B\u3089\u5C4B\u53F7\u30FB\u4F4F\u6240\u30FB\u55B6\u696D\u6642\u9593\u30FB\u96FB\u8A71\u3092\u6A5F\u68B0\u62BD\u51FA\u3067\u304D\u306A\u304B\u3063\u305F\u3002hearing.md \u3092\u76F4\u63A5\u8AAD\u307F\u3001\u66F8\u304B\u308C\u3066\u3044\u308B\u4E8B\u5B9F\u3060\u3051\u3067 JSON-LD \u3092\u69CB\u6210\u3059\u308B\uFF08\u7121\u3044\u9805\u76EE\u306F\u5165\u308C\u306A\u3044\uFF09\u3002");
  }
  return md.join("\n");
}

// src/studio/tone/toneMd.ts
function derivedVarName(name) {
  const bare = name.replace(/^--/, "").replace(/^c-/, "");
  return `--c-${bare}`;
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function cssSafe(s) {
  return s.replace(/[<>]/g, "").replace(/\*\//g, "");
}
function buildRootCss(ds) {
  const c = ds.colors;
  const derivedLines = (ds.derived ?? []).map((d) => `  ${derivedVarName(d.name)}: ${cssSafe(d.value)};`).join("\n");
  const headingLs = ds.fonts.headingLetterSpacing ? `
  /* \u898B\u51FA\u3057\u5B57\u9593\uFF08\u30C8\u30FC\u30F3\u306E\u614B\u5EA6\uFF09 */
  --heading-letter-spacing: ${cssSafe(ds.fonts.headingLetterSpacing)};` : "";
  return `:root {
  /* \u5730\u8272 */
  --c-bg:         ${c.bg};  /* \u30DA\u30FC\u30B8\u57FA\u672C\u306E\u5730\u8272 */
  --c-bg-alt:     ${c.bgAlt};  /* \u4EA4\u4E92\u30BB\u30AF\u30B7\u30E7\u30F3\u30FB\u5E2F\u306E\u5730\u8272 */
  --c-surface:    ${c.surface};  /* \u30AB\u30FC\u30C9\u30FB\u30D1\u30CD\u30EB\u306E\u5730\u8272 */

  /* \u30C6\u30AD\u30B9\u30C8 */
  --c-ink:        ${c.ink};  /* \u672C\u6587 */
  --c-ink-muted:  ${c.inkMuted};  /* \u88DC\u8DB3\u30FB\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3 */
  --c-heading:    ${c.heading};  /* \u898B\u51FA\u3057 */

  /* \u30D6\u30E9\u30F3\u30C9 */
  --c-primary:    ${c.primary};  /* \u4E3B\u8272\u3002CTA\u306E\u80CC\u666F\u306A\u3069\u300C\u62BC\u3057\u3066\u307B\u3057\u3044\u8272\u300D */
  --c-on-primary: ${c.onPrimary};  /* primary\u306E\u4E0A\u306B\u8F09\u305B\u308B\u6587\u5B57\u8272 */
  --c-accent:     ${c.accent};  /* \u5F37\u8ABF\u30FB\u30DE\u30FC\u30AB\u30FC\u30FB\u88C5\u98FE\u7DDA */

  /* \u69CB\u9020 */
  --c-border:     ${c.border};  /* \u7F6B\u7DDA\u30FB\u533A\u5207\u308A */
${derivedLines ? `
  /* \u6D3E\u751F\u8272\uFF08\u6700\u59273\uFF09 */
${derivedLines}
` : ""}
  /* \u30D5\u30A9\u30F3\u30C8\u30D5\u30A1\u30DF\u30EA\u30FC */
  --font-heading: ${cssSafe(ds.fonts.heading)};
  --font-body:    ${cssSafe(ds.fonts.body)};
  --font-accent:  ${cssSafe(ds.fonts.accent)};${headingLs}

  /* \u30B5\u30A4\u30BA5\u6BB5\u968E\uFF08DESIGN.md \xA71.2 \u6A19\u6E96\u5024\u3002\u30E2\u30D0\u30A4\u30EB\u2192PC\u3067\u6D41\u52D5\uFF09 */
  --text-xl:   clamp(1.75rem, 1.3rem + 2.2vw, 3rem);      /* \u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC\u30FBH1 */
  --text-lg:   clamp(1.375rem, 1.15rem + 1.1vw, 2rem);    /* \u30BB\u30AF\u30B7\u30E7\u30F3\u898B\u51FA\u3057\u30FBH2 */
  --text-md:   clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem);/* \u5C0F\u898B\u51FA\u3057\u30FBH3 */
  --text-base: 1rem;                                       /* \u672C\u6587\uFF0816px\u3002\u3053\u308C\u672A\u6E80\u306B\u3057\u306A\u3044\uFF09 */
  --text-sm:   0.875rem;                                   /* \u88DC\u8DB3\u30FB\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3\u30FB\u6CE8\u8A18 */

  /* \u884C\u9593\u30FB\u884C\u9577 */
  --leading-tight: 1.35;   /* \u898B\u51FA\u3057\u7528 */
  --leading-body:  1.9;    /* \u65E5\u672C\u8A9E\u672C\u6587\u306F\u6B27\u6587\u3088\u308A\u5E83\u304F */
  --measure:       36em;   /* \u672C\u65871\u884C\u306E\u6700\u5927\u9577 */

  /* \u4F59\u767D\uFF088px\u30B0\u30EA\u30C3\u30C9\uFF09 */
  --space-1:  0.5rem;   /*   8px */
  --space-2:  1rem;     /*  16px */
  --space-3:  1.5rem;   /*  24px */
  --space-4:  2rem;     /*  32px */
  --space-6:  3rem;     /*  48px */
  --space-8:  4rem;     /*  64px */
  --space-12: 6rem;     /*  96px */
  --space-16: 8rem;     /* 128px */

  /* \u5F62\u30FB\u5F71\u30FB\u7DDA */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-full: 999px;
  --shadow-soft:  0 2px 12px rgba(0, 0, 0, 0.06);
  --shadow-lift:  0 8px 24px rgba(0, 0, 0, 0.10);
  --border-width: 1px;
}`;
}
function buildFontLinkTags(ds) {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${ds.fonts.googleFontsUrl}" rel="stylesheet">`;
}
function contrastRows(c) {
  return [
    { label: "ink \xD7 bg\uFF08\u672C\u6587\uFF09", fg: c.ink, bg: c.bg, min: 4.5 },
    { label: "on-primary \xD7 primary\uFF08CTA\u6587\u5B57\uFF09", fg: c.onPrimary, bg: c.primary, min: 4.5 },
    { label: "ink-muted \xD7 bg\uFF08\u88DC\u8DB3\uFF09", fg: c.inkMuted, bg: c.bg, min: 3 },
    { label: "heading \xD7 bg\uFF08\u898B\u51FA\u3057\uFF09", fg: c.heading, bg: c.bg, min: 3 },
    { label: "ink \xD7 surface\uFF08\u30AB\u30FC\u30C9\u672C\u6587\uFF09", fg: c.ink, bg: c.surface, min: 4.5 },
    { label: "ink \xD7 bg-alt\uFF08\u5E2F\u306E\u672C\u6587\uFF09", fg: c.ink, bg: c.bgAlt, min: 4.5 },
    { label: "accent \xD7 bg\uFF08\u88C5\u98FE\u3002\u53C2\u8003\uFF09", fg: c.accent, bg: c.bg, min: null }
  ];
}
function contrastTableMd(c) {
  const header = "| \u7D44\u307F\u5408\u308F\u305B | \u5B9F\u6E2C\u6BD4 | \u57FA\u6E96 | \u5224\u5B9A |\n|---|---|---|---|";
  const rows = contrastRows(c).map((row) => {
    const ratio = contrastRatio(row.fg, row.bg);
    const measured = ratio === null ? "\u2014" : `${ratio.toFixed(2)}:1`;
    const standard = row.min === null ? "\u2014" : `${row.min}:1`;
    const verdict = row.min === null || ratio === null ? "\u53C2\u8003" : ratio >= row.min ? "OK" : "NG";
    return `| ${row.label} | ${measured} | ${standard} | ${verdict} |`;
  });
  return [header, ...rows].join("\n");
}
function renderToneMd(project, concept, ds) {
  const refTones = concept.referenceTones.length > 0 ? `\u53C2\u7167\u3057\u305F\u65E2\u5B58\u30C8\u30FC\u30F3: ${concept.referenceTones.join(", ")}` : "\u53C2\u7167\u3057\u305F\u65E2\u5B58\u30C8\u30FC\u30F3: \u306A\u3057\uFF08\u5B8C\u5168\u30AB\u30B9\u30BF\u30E0\uFF09";
  const lines = [
    "# \u30C8\u30FC\u30F3\u9078\u5B9A",
    "",
    `\u6848\u4EF6: ${project}`,
    `\u9078\u5B9A\u30C8\u30FC\u30F3: ${ds.slug}\uFF08${ds.name}\uFF09`,
    `\u4EBA\u683C: ${ds.personality}`,
    "",
    "## \u9078\u5B9A\u7406\u7531",
    "",
    concept.statement,
    "",
    `\u30AD\u30FC\u30EF\u30FC\u30C9: ${concept.keywords.join(" / ")}`,
    refTones,
    "",
    "## \u30B3\u30F3\u30BB\u30D7\u30C8",
    "",
    `\u30B3\u30F3\u30BB\u30D7\u30C8\u540D: ${concept.title}`,
    "",
    `\u8CEA\u611F\u306E\u8A00\u8A9E\u5316:`,
    ...concept.textures.map((t) => `- ${t}`),
    "",
    `\u30E0\u30FC\u30C9\u30DC\u30FC\u30C9\u306E\u65B9\u5411\u6027: ${concept.moodDirection}`,
    "",
    "## \u30C7\u30B6\u30A4\u30F3\u30C8\u30FC\u30AF\u30F3",
    "",
    "```css",
    buildRootCss(ds),
    "```",
    "",
    "\u30D5\u30A9\u30F3\u30C8\u8AAD\u307F\u8FBC\u307F\u30BF\u30B0:",
    "",
    "```html",
    buildFontLinkTags(ds),
    "```",
    "",
    ...ds.fonts.headingLetterSpacing ? [`\u898B\u51FA\u3057\u5B57\u9593: ${ds.fonts.headingLetterSpacing}`, ""] : [],
    `\u30BB\u30AF\u30B7\u30E7\u30F3\u6A19\u6E96\u4F59\u767D: var(--${ds.spacing.sectionDefault})\uFF08${ds.spacing.philosophy}\uFF09`,
    `\u89D2\u4E38\u306E\u614B\u5EA6: ${ds.radius.attitude}`,
    "",
    "## \u88C5\u98FE\u65B9\u91DD",
    "",
    "\u30BF\u30A4\u30C8\u30EB\u88C5\u98FE\uFF08DESIGN.md \xA74 \u306ET\u756A\u53F7\uFF09:",
    ...ds.decorations.titleRecipes.map((r) => `- ${r}`),
    "",
    "\u30DC\u30BF\u30F3\uFF08DESIGN.md \xA75 \u306EB\u756A\u53F7\uFF09:",
    ...ds.decorations.buttonRecipes.map((r) => `- ${r}`),
    "",
    "\u30C8\u30FC\u30F3\u56FA\u6709\u306E\u6F14\u51FA\uFF08\u6700\u4F4E2\u3064\u30FB\u5FC5\u305A\u5B9F\u88C5\u3059\u308B\uFF09:",
    ...ds.decorations.extras.map((r) => `- ${r}`),
    "",
    "## \u5199\u771F\u306E\u30C8\u30FC\u30F3",
    "",
    `- \u88AB\u5199\u4F53: ${ds.photoTone.subject}`,
    `- \u5149: ${ds.photoTone.light}`,
    `- \u8272: ${ds.photoTone.color}`,
    `- \u7D71\u4E00\u30D5\u30A3\u30EB\u30BF: \`filter: ${ds.photoTone.filterCss};\``,
    "",
    "## \u3084\u3063\u3066\u306F\u3044\u3051\u306A\u3044\u3053\u3068",
    "",
    ...ds.forbidden.map((f) => `- ${f}`),
    "",
    "## \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u691C\u8A3C",
    "",
    contrastTableMd(ds.colors),
    ""
  ];
  return lines.join("\n");
}
function recipeNumbers(recipes) {
  const nums = /* @__PURE__ */ new Set();
  for (const r of recipes) {
    for (const m of r.matchAll(/\d+/g)) {
      nums.add(Number(m[0]));
    }
  }
  return nums;
}
function primaryButtonStyle(buttonRecipes) {
  const nums = recipeNumbers(buttonRecipes);
  const has = (...ns) => ns.some((n) => nums.has(n));
  if (has(10, 11, 38)) {
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-full); box-shadow: 0 4px 0 color-mix(in srgb, var(--c-primary) 60%, black); }
.btn-primary:active { transform: translateY(3px); box-shadow: 0 1px 0 color-mix(in srgb, var(--c-primary) 60%, black); }`,
      needsInnerSpan: false
    };
  }
  if (has(7, 13)) {
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%); }`,
      needsInnerSpan: false
    };
  }
  if (has(15)) {
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); transform: skewX(-8deg); }
.btn-primary > span { display: inline-block; transform: skewX(8deg); }`,
      needsInnerSpan: true
    };
  }
  if (has(5, 37)) {
    return {
      css: `.btn-primary { background: var(--c-bg); color: var(--c-ink); border: 1.5px dashed var(--c-ink); border-radius: var(--radius-md); }`,
      needsInnerSpan: false
    };
  }
  if (has(3)) {
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: 0; }`,
      needsInnerSpan: false
    };
  }
  if (has(9)) {
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-full); }`,
      needsInnerSpan: false
    };
  }
  return {
    css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-md); }`,
    needsInnerSpan: false
  };
}
function secondaryRadius(buttonRecipes) {
  const nums = recipeNumbers(buttonRecipes);
  if (nums.has(3) || nums.has(7) || nums.has(13) || nums.has(15)) return "0";
  if (nums.has(9) || nums.has(10) || nums.has(11) || nums.has(38)) return "var(--radius-full)";
  return "var(--radius-md)";
}
function paletteChipsHtml(c) {
  const chips = [
    { varName: "--c-bg", role: "\u30DA\u30FC\u30B8\u5730\u8272", value: c.bg },
    { varName: "--c-bg-alt", role: "\u5E2F\u30FB\u4EA4\u4E92\u30BB\u30AF\u30B7\u30E7\u30F3", value: c.bgAlt },
    { varName: "--c-surface", role: "\u30AB\u30FC\u30C9\u30FB\u30D1\u30CD\u30EB", value: c.surface },
    { varName: "--c-ink", role: "\u672C\u6587", value: c.ink },
    { varName: "--c-ink-muted", role: "\u88DC\u8DB3", value: c.inkMuted },
    { varName: "--c-heading", role: "\u898B\u51FA\u3057", value: c.heading },
    { varName: "--c-primary", role: "\u4E3B\u8272\uFF08CTA\uFF09", value: c.primary },
    { varName: "--c-on-primary", role: "CTA\u6587\u5B57", value: c.onPrimary },
    { varName: "--c-accent", role: "\u5F37\u8ABF\u30FB\u88C5\u98FE", value: c.accent },
    { varName: "--c-border", role: "\u7F6B\u7DDA", value: c.border }
  ];
  return chips.map(
    (chip) => `      <div class="chip">
        <div class="chip-swatch" style="background: ${esc(chip.value)};"></div>
        <div class="chip-meta">
          <span class="chip-name">${esc(chip.varName)}</span>
          <span class="chip-role">${esc(chip.role)}</span>
          <span class="chip-hex">${esc(chip.value.toUpperCase())}</span>
        </div>
      </div>`
  ).join("\n");
}
function renderTonePreviewHtml(concept, ds) {
  const btn = primaryButtonStyle(ds.decorations.buttonRecipes);
  const ctaLabel = "\u7121\u6599\u76F8\u8AC7\u3092\u4E88\u7D04\u3059\u308B";
  const ctaInner = btn.needsInnerSpan ? `<span>${ctaLabel}</span>` : ctaLabel;
  const headingLs = ds.fonts.headingLetterSpacing ? `letter-spacing: ${cssSafe(ds.fonts.headingLetterSpacing)};` : "";
  const bodySample = "\u3053\u306E\u6BB5\u843D\u306F\u672C\u6587\u306E\u898B\u3048\u65B9\u3092\u78BA\u8A8D\u3059\u308B\u305F\u3081\u306E\u30B5\u30F3\u30D7\u30EB\u30C6\u30AD\u30B9\u30C8\u3002\u66F8\u4F53\u30FB\u5B57\u9593\u30FB\u884C\u9593\u30FB\u884C\u9577\u304C\u3001\u60F3\u5B9A\u3057\u305F\u8AAD\u307F\u5FC3\u5730\u306B\u306A\u3063\u3066\u3044\u308B\u304B\u3092\u78BA\u304B\u3081\u308B\u3002\u65E5\u672C\u8A9E\u306E\u672C\u6587\u306F\u6B27\u6587\u3088\u308A\u884C\u9593\u3092\u5E83\u304F\u53D6\u308A\u3001\u4E00\u884C\u306E\u9577\u3055\u3092\u5168\u89D236\u5B57\u524D\u5F8C\u306B\u6291\u3048\u308B\u3068\u8AAD\u307F\u3084\u3059\u3044\u3002";
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ds.name)} \u2014 \u30C8\u30FC\u30F3\u30D7\u30EC\u30D3\u30E5\u30FC</title>
${buildFontLinkTags(ds)}
<style>
${buildRootCss(ds)}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-body);
}
.wrap { max-width: 860px; margin-inline: auto; padding: var(--space-8) var(--space-3); }
section + section { margin-top: var(--space-8); }

.eyebrow {
  font-family: var(--font-accent);
  font-size: var(--text-sm);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-ink-muted);
  margin-bottom: var(--space-2);
}
.section-label {
  font-size: var(--text-sm);
  color: var(--c-ink-muted);
  letter-spacing: 0.08em;
  border-bottom: var(--border-width) solid var(--c-border);
  padding-bottom: var(--space-1);
  margin-bottom: var(--space-3);
}

h1, h2, h3 { font-family: var(--font-heading); color: var(--c-heading); line-height: var(--leading-tight); ${headingLs} }
.spec-xl { font-size: var(--text-xl); }
.spec-lg { font-size: var(--text-lg); margin-top: var(--space-3); }
.spec-md { font-size: var(--text-md); margin-top: var(--space-2); }
.spec-body { max-width: var(--measure); margin-top: var(--space-2); }
.spec-sm { font-size: var(--text-sm); color: var(--c-ink-muted); margin-top: var(--space-2); }

.statement {
  max-width: var(--measure);
  margin-top: var(--space-2);
}
.personality { font-size: var(--text-sm); color: var(--c-ink-muted); margin-top: var(--space-2); }

.band {
  background: var(--c-bg-alt);
  border-block: var(--border-width) solid var(--c-border);
  padding: var(--space-6) var(--space-3);
  margin-inline: calc(var(--space-3) * -1);
}
.btn-row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-top: var(--space-3); }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  min-height: 48px;
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}
.btn:focus-visible { outline: 3px solid var(--c-accent); outline-offset: 2px; }
${btn.css}
.btn-secondary {
  background: transparent;
  color: var(--c-primary);
  border: var(--border-width) solid currentColor;
  border-radius: ${secondaryRadius(ds.decorations.buttonRecipes)};
}

.chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-2); }
.chip { background: var(--c-surface); border: var(--border-width) solid var(--c-border); border-radius: var(--radius-md); overflow: hidden; }
.chip-swatch { height: 56px; border-bottom: var(--border-width) solid var(--c-border); }
.chip-meta { display: flex; flex-direction: column; padding: var(--space-1) var(--space-2) var(--space-2); }
.chip-name { font-size: var(--text-sm); font-weight: 600; }
.chip-role { font-size: var(--text-sm); color: var(--c-ink-muted); }
.chip-hex { font-size: var(--text-sm); color: var(--c-ink-muted); font-family: monospace; }

.accent-line { color: var(--c-accent); font-family: var(--font-accent); font-size: var(--text-lg); }
footer { margin-top: var(--space-8); padding-top: var(--space-3); border-top: var(--border-width) solid var(--c-border); font-size: var(--text-sm); color: var(--c-ink-muted); }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <p class="eyebrow">Design Tone Preview</p>
    <h1 class="spec-xl">${esc(concept.title)}</h1>
    <p class="statement">${esc(concept.statement)}</p>
    <p class="personality">${esc(ds.personality)} \uFF0F ${esc(ds.name)}\uFF08${esc(ds.slug)}\uFF09</p>
  </header>

  <section>
    <p class="section-label">\u30BF\u30A4\u30DD\u30B0\u30E9\u30D5\u30A3\u6A19\u672C</p>
    <h1 class="spec-xl">\u898B\u51FA\u3057XL\u30FB${esc(concept.keywords[0] ?? "\u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC")}</h1>
    <h2 class="spec-lg">\u898B\u51FA\u3057LG\u30FB\u30BB\u30AF\u30B7\u30E7\u30F3\u306E\u898B\u51FA\u3057\u306F\u3053\u306E\u5927\u304D\u3055</h2>
    <h3 class="spec-md">\u898B\u51FA\u3057MD\u30FB\u5C0F\u898B\u51FA\u3057\u306F\u3053\u306E\u5927\u304D\u3055</h3>
    <p class="spec-body">${esc(bodySample)}</p>
    <p class="spec-sm">\u88DC\u8DB3\u30FB\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3\u30FB\u6CE8\u8A18\u306F\u3053\u306E\u5927\u304D\u3055\uFF08--text-sm\uFF09\u3002\u672C\u6587\u306F16px\u672A\u6E80\u306B\u3057\u306A\u3044\u3002</p>
    <p class="accent-line">Atelier \u2014 accent typeface specimen</p>
  </section>

  <section class="band">
    <p class="section-label">\u30DC\u30BF\u30F3\uFF08CTA\u968E\u5C64\uFF09</p>
    <p class="spec-body">\u30D7\u30E9\u30A4\u30DE\u30EA\uFF1D\u5857\u308A\u3001\u30BB\u30AB\u30F3\u30C0\u30EA\uFF1D\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3\u30021\u753B\u9762\u306E\u30D7\u30E9\u30A4\u30DE\u30EA\u306F1\u7A2E\u985E\u3002</p>
    <div class="btn-row">
      <button type="button" class="btn btn-primary">${ctaInner}</button>
      <button type="button" class="btn btn-secondary">\u6599\u91D1\u30D7\u30E9\u30F3\u3092\u898B\u308B</button>
    </div>
  </section>

  <section>
    <p class="section-label">\u914D\u8272\u30C8\u30FC\u30AF\u30F3\uFF0810\u5909\u6570\uFF09</p>
    <div class="chips">
${paletteChipsHtml(ds.colors)}
    </div>
  </section>

  <section>
    <p class="section-label">\u8CEA\u611F\u30AD\u30FC\u30EF\u30FC\u30C9</p>
    <p class="spec-body">${concept.textures.map((t) => esc(t)).join(" \uFF0F ")}</p>
  </section>

  <footer>
    <p>\u5199\u771F\u306E\u7D71\u4E00\u30D5\u30A3\u30EB\u30BF: ${esc(ds.photoTone.filterCss)} \uFF0F \u30BB\u30AF\u30B7\u30E7\u30F3\u6A19\u6E96\u4F59\u767D: var(--${esc(
    ds.spacing.sectionDefault
  )}) \uFF0F \u89D2\u4E38: ${esc(ds.radius.attitude)}</p>
  </footer>

</div>
</body>
</html>
`;
}

// src/studio/tone/validate.ts
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
var COLOR_KEYS = [
  "bg",
  "bgAlt",
  "surface",
  "ink",
  "inkMuted",
  "heading",
  "primary",
  "onPrimary",
  "accent",
  "border"
];
var CONTRAST_RULES = [
  { fg: "ink", bg: "bg", min: 4.5, label: "\u672C\u6587 ink \xD7 \u80CC\u666F bg" },
  { fg: "onPrimary", bg: "primary", min: 4.5, label: "CTA\u6587\u5B57 on-primary \xD7 primary" },
  { fg: "inkMuted", bg: "bg", min: 3, label: "\u88DC\u8DB3 ink-muted \xD7 \u80CC\u666F bg" },
  { fg: "heading", bg: "bg", min: 3, label: "\u898B\u51FA\u3057 heading \xD7 \u80CC\u666F bg" }
];
var FORBIDDEN_MIN = 5;
var EXTRAS_MIN = 2;
var GOOGLE_FONTS_CSS2_PREFIX = "https://fonts.googleapis.com/css2";
function validateDesignSystem(ds) {
  const errors = [];
  for (const key of COLOR_KEYS) {
    const value = ds.colors[key];
    if (!HEX_RE.test(value)) {
      errors.push(`colors.${key} \u304C #RRGGBB \u5F62\u5F0F\u3067\u306A\u3044\uFF08\u73FE\u5728\u5024: ${value}\uFF09`);
    }
  }
  for (const rule of CONTRAST_RULES) {
    const ratio = contrastRatio(ds.colors[rule.fg], ds.colors[rule.bg]);
    if (ratio !== null && ratio < rule.min) {
      errors.push(
        `${rule.label} \u306E\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4\u304C ${ratio.toFixed(2)}:1 \u3067\u57FA\u6E96 ${rule.min}:1 \u672A\u6E80\u3002\u8272\u3092\u8ABF\u6574\u3059\u308B`
      );
    }
  }
  if (ds.forbidden.length < FORBIDDEN_MIN) {
    errors.push(
      `forbidden\uFF08\u3084\u3063\u3066\u306F\u3044\u3051\u306A\u3044\u3053\u3068\uFF09\u304C${ds.forbidden.length}\u4EF6\u3057\u304B\u306A\u3044\u3002\u6CD5\u898F\u5236\u30FB\u914D\u8272\u4E8B\u6545\u30FB\u30C8\u30FC\u30F3\u5D29\u58CA\u306E\u89B3\u70B9\u3067${FORBIDDEN_MIN}\u4EF6\u4EE5\u4E0A\u6319\u3052\u308B`
    );
  }
  if (ds.decorations.extras.length < EXTRAS_MIN) {
    errors.push(
      `decorations.extras\uFF08\u30C8\u30FC\u30F3\u56FA\u6709\u306E\u6F14\u51FA\uFF09\u304C${ds.decorations.extras.length}\u4EF6\u3057\u304B\u306A\u3044\u3002\u900F\u304B\u3057\u82F1\u5B57\u30FBgrain\u30FB\u659C\u3081\u5883\u754C\u306A\u3069\u3092${EXTRAS_MIN}\u4EF6\u4EE5\u4E0A\u6319\u3052\u308B`
    );
  }
  if (!ds.fonts.googleFontsUrl.startsWith(GOOGLE_FONTS_CSS2_PREFIX)) {
    errors.push(
      `fonts.googleFontsUrl \u306F ${GOOGLE_FONTS_CSS2_PREFIX} \u3067\u59CB\u307E\u308BURL\u306B\u3059\u308B\uFF08\u73FE\u5728\u5024: ${ds.fonts.googleFontsUrl}\uFF09`
    );
  }
  return errors.length > 0 ? errors.join("\n") : null;
}

// src/studio/wf/partials/index.ts
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitizeCustomHtml(html) {
  let out = html;
  out = out.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  out = out.replace(/\b(href|src)\s*=\s*(["'])(?:https?:)?\/\/[^"']*\2/gi, '$1="#"');
  out = out.replace(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi, "none");
  return out;
}
function imgPlaceholder(desc, aspect = "16/9") {
  return `<div class="wf-img" style="aspect-ratio:${aspect}"><span>${escapeHtml(desc)}</span></div>`;
}
function isBandSection(section) {
  return section.isCta === true || section.kind === "cta";
}
function pad(index) {
  return String(index + 1).padStart(2, "0");
}
function gridCols(count) {
  if (count >= 4) return "wf-cols-4";
  if (count === 3) return "wf-cols-3";
  if (count === 2) return "wf-cols-2";
  return "";
}
function headerBlock(copy) {
  const parts = [];
  if (copy.sub) parts.push(`<p class="wf-sub">${escapeHtml(copy.sub)}</p>`);
  if (copy.heading) parts.push(`<h2>${escapeHtml(copy.heading)}</h2>`);
  if (copy.lead) parts.push(`<p class="wf-lead">${escapeHtml(copy.lead)}</p>`);
  return parts.length > 0 ? `<div class="wf-head">${parts.join("")}</div>` : "";
}
function bodyBlock(copy) {
  return copy.body ? `<p class="wf-body">${escapeHtml(copy.body)}</p>` : "";
}
function ctaBlock(copy, size = "md") {
  if (!copy.buttonLabel) return "";
  const note = copy.buttonNote ? `<p class="wf-btn-note">${escapeHtml(copy.buttonNote)}</p>` : "";
  return `<div class="wf-cta${size === "lg" ? " wf-cta--lg" : ""}"><span class="wf-btn">${escapeHtml(copy.buttonLabel)}</span>${note}</div>`;
}
function cardList(items, numbered = false) {
  return items.slice(0, 6).map((item, i) => {
    const num = numbered ? `<div class="wf-num">${pad(i)}</div>` : "";
    const text = item.text ? `<p>${escapeHtml(item.text)}</p>` : "";
    return `<div class="wf-card">${num}<h3>${escapeHtml(item.title)}</h3>${text}</div>`;
  }).join("");
}
function withTrailingCta(html, copy) {
  if (!copy.buttonLabel) return html;
  return `${html}<div class="wf-center">${ctaBlock(copy)}</div>`;
}
function renderHero(section) {
  const { copy, layout } = section;
  const text = [
    copy.sub ? `<p class="wf-sub">${escapeHtml(copy.sub)}</p>` : "",
    copy.heading ? `<h1>${escapeHtml(copy.heading)}</h1>` : "",
    copy.lead ? `<p class="wf-lead">${escapeHtml(copy.lead)}</p>` : "",
    bodyBlock(copy),
    ctaBlock(copy, "lg")
  ].join("");
  const desc = copy.imageDesc?.[0] ?? "\u30E1\u30A4\u30F3\u30D3\u30B8\u30E5\u30A2\u30EB\uFF08\u8AB0\u306E\u30FB\u4F55\u306E\u5E97\u304B\u304C\u4F1D\u308F\u308B\u5199\u771F\uFF09";
  if (layout.variant === "background" || layout.mediaPosition === "background") {
    return `<div class="wf-fv-bg"><p class="wf-img-note">\u80CC\u666F\u5199\u771F: ${escapeHtml(desc)}</p>${text}</div>`;
  }
  const img = imgPlaceholder(desc, "4/3");
  const imgLeft = layout.mediaPosition === "left";
  const cols = imgLeft ? "5fr 7fr" : "7fr 5fr";
  const cells = imgLeft ? `${img}<div>${text}</div>` : `<div>${text}</div>${img}`;
  return `<div class="wf-grid" style="grid-template-columns:${cols};align-items:center">${cells}</div>`;
}
function renderCtaBand(section) {
  const { copy } = section;
  const parts = [
    copy.heading ? `<h2>${escapeHtml(copy.heading)}</h2>` : "",
    copy.lead ? `<p class="wf-lead wf-lead--center">${escapeHtml(copy.lead)}</p>` : "",
    ctaBlock(copy.buttonLabel ? copy : { ...copy, buttonLabel: "\u304A\u554F\u3044\u5408\u308F\u305B" }, "lg")
  ].join("");
  return parts;
}
function renderFeatures(section) {
  const { copy, layout } = section;
  const items = copy.items ?? [];
  let content = "";
  if (items.length > 0) {
    if (layout.variant === "list") {
      content = items.slice(0, 6).map(
        (item, i) => `<div class="wf-card wf-rowcard"><div class="wf-num wf-num--big">${pad(i)}</div><div><h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div></div>`
      ).join("");
    } else {
      content = `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cardList(items, true)}</div>`;
    }
  }
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderPricing(section) {
  const { copy, layout } = section;
  const items = copy.items ?? [];
  let content = "";
  if (items.length > 0) {
    if (layout.variant === "table") {
      const rows = items.map(
        (item) => `<tr><th scope="row">${escapeHtml(item.title)}</th><td>${escapeHtml(item.text ?? "")}</td></tr>`
      ).join("");
      content = `<table class="wf-table"><thead><tr><th>\u30E1\u30CB\u30E5\u30FC\u30FB\u30D7\u30E9\u30F3</th><th>\u6599\u91D1\u30FB\u5185\u5BB9</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      content = `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cardList(items)}</div>`;
    }
  }
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderFlow(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const steps = items.slice(0, 6).map(
    (item, i) => `<div class="wf-card"><div class="wf-num">STEP ${pad(i)}</div><h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`
  ).join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 4))}">${steps}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderTeam(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items.slice(0, 6).map((item, i) => {
    const desc = copy.imageDesc?.[i] ?? `${item.title}\u306E\u9854\u5199\u771F\uFF08\u7B11\u9854\u30FB\u81EA\u7136\u5149\uFF09`;
    return `<div class="wf-card">${imgPlaceholder(desc, "1/1")}<h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`;
  }).join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderTestimonials(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items.slice(0, 6).map((item) => {
    const quote = item.text ?? item.title;
    return `<div class="wf-card"><p class="wf-quote">\u300C${escapeHtml(quote)}\u300D</p><p class="wf-attr">\u2014 ${escapeHtml(item.title)}</p></div>`;
  }).join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderFaq(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const rows = items.map(
    (item) => `<div class="wf-qa"><dt>Q. ${escapeHtml(item.title)}</dt><dd>A. ${escapeHtml(item.text ?? "")}</dd></div>`
  ).join("");
  const content = items.length > 0 ? `<dl class="wf-faq">${rows}</dl>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderAccess(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const mapDesc = copy.imageDesc?.[0] ?? "\u5468\u8FBA\u5730\u56F3\uFF08\u6700\u5BC4\u308A\u99C5\u304B\u3089\u306E\u9053\u9806\u304C\u5206\u304B\u308B\u7BC4\u56F2\uFF09";
  const info = items.length > 0 ? `<dl class="wf-def">${items.map(
    (item) => `<div><dt>${escapeHtml(item.title)}</dt><dd>${escapeHtml(item.text ?? "")}</dd></div>`
  ).join("")}</dl>` : bodyBlock(copy);
  return `${headerBlock(copy)}<div class="wf-grid" style="grid-template-columns:3fr 2fr">${imgPlaceholder(mapDesc, "4/3")}<div>${info}</div></div>`;
}
function renderMenu(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items.slice(0, 6).map((item, i) => {
    const desc = copy.imageDesc?.[i] ?? `${item.title}\u306E\u5199\u771F`;
    return `<div class="wf-card">${imgPlaceholder(desc, "4/3")}<h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`;
  }).join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderGallery(section) {
  const { copy } = section;
  const descs = copy.imageDesc && copy.imageDesc.length > 0 ? copy.imageDesc : (copy.items ?? []).map((item) => item.title);
  const fallback = ["\u5E97\u5185\u306E\u96F0\u56F2\u6C17\u304C\u4F1D\u308F\u308B\u5199\u771F", "\u65BD\u8853\u30FB\u4F5C\u696D\u4E2D\u306E\u5199\u771F", "\u5916\u89B3\u306E\u5199\u771F"];
  const list = descs.length > 0 ? descs : fallback;
  const grid = list.slice(0, 9).map((desc) => imgPlaceholder(desc, "1/1")).join("");
  return `${headerBlock(copy)}<div class="wf-grid ${gridCols(Math.min(list.length, 3))}">${grid}</div>`;
}
function renderStats(section) {
  const { copy } = section;
  const items = copy.items ?? [];
  const cells = items.slice(0, 8).map(
    (item) => `<div class="wf-stat"><div class="wf-stat-num">${escapeHtml(item.title)}</div><div class="wf-stat-label">${escapeHtml(item.text ?? "")}</div></div>`
  ).join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 4))}">${cells}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}
function renderContact(section) {
  const { copy } = section;
  const labels = copy.items && copy.items.length > 0 ? copy.items.map((item) => item.title) : ["\u304A\u540D\u524D", "\u3054\u9023\u7D61\u5148", "\u3054\u76F8\u8AC7\u5185\u5BB9"];
  const fields = labels.map((label, i) => {
    const isLast = i === labels.length - 1;
    return `<div class="wf-field"><label>${escapeHtml(label)}</label><div class="wf-input${isLast ? " wf-input--area" : ""}"></div></div>`;
  }).join("");
  const button = ctaBlock(copy.buttonLabel ? copy : { ...copy, buttonLabel: "\u9001\u4FE1\u3059\u308B" });
  return `${headerBlock(copy)}${bodyBlock(copy)}<div class="wf-form">${fields}${button}</div>`;
}
function customHtmlFrame(html) {
  return `<div class="wf-custom-frame"><p class="wf-custom-note">AI\u76F4\u66F8\u304D\u30BB\u30AF\u30B7\u30E7\u30F3\uFF08\u30B5\u30CB\u30BF\u30A4\u30BA\u6E08\u307F\u30FB\u30B0\u30EC\u30FC\u30B9\u30B1\u30FC\u30EB\u691C\u8A3C\u67A0\uFF09</p>${sanitizeCustomHtml(html)}</div>`;
}
function renderColumns(section) {
  const { copy } = section;
  const columns = section.layout.columns ?? [];
  const colsCss = columns.map((col) => `${col.ratio}fr`).join(" ");
  let imgIndex = 0;
  let textUsed = false;
  const cells = columns.map((col) => {
    const parts = col.content.map((slot) => {
      switch (slot) {
        case "text": {
          if (!textUsed) {
            textUsed = true;
            return headerBlock(copy) + bodyBlock(copy);
          }
          return bodyBlock(copy);
        }
        case "image": {
          const desc = copy.imageDesc?.[imgIndex] ?? "\u5185\u5BB9\u304C\u4F1D\u308F\u308B\u5199\u771F";
          imgIndex += 1;
          return imgPlaceholder(desc, "4/3");
        }
        case "items":
          return copy.items && copy.items.length > 0 ? `<div class="wf-grid" style="gap:16px">${cardList(copy.items)}</div>` : "";
        case "button":
          return ctaBlock(copy);
      }
    }).join("");
    return `<div>${parts}</div>`;
  }).join("");
  return `<div class="wf-grid" style="grid-template-columns:${colsCss}">${cells}</div>`;
}
function renderGeneric(section) {
  const { copy, layout } = section;
  if (layout.columns && layout.columns.length > 0) {
    const consumesButton = layout.columns.some((col) => col.content.includes("button"));
    const html = renderColumns(section);
    return consumesButton ? html : withTrailingCta(html, copy);
  }
  const head = headerBlock(copy);
  const body = bodyBlock(copy);
  const itemsHtml = copy.items && copy.items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(copy.items.length, 3))}" style="margin-top:24px">${cardList(copy.items)}</div>` : "";
  const base = head + body + itemsHtml;
  const mp = layout.mediaPosition ?? (copy.imageDesc && copy.imageDesc.length > 0 ? "right" : "none");
  if (mp === "none") {
    const fallback = base !== "" ? base : `<p class="wf-body wf-muted">\uFF08\u5185\u5BB9\u672A\u5B9A\u306E\u30BB\u30AF\u30B7\u30E7\u30F3\uFF09</p>`;
    return withTrailingCta(fallback, copy);
  }
  const desc = copy.imageDesc?.[0] ?? "\u30BB\u30AF\u30B7\u30E7\u30F3\u306E\u5185\u5BB9\u304C\u4F1D\u308F\u308B\u5199\u771F";
  if (mp === "background") {
    return withTrailingCta(`<div class="wf-fv-bg"><p class="wf-img-note">\u80CC\u666F\u5199\u771F: ${escapeHtml(desc)}</p>${base}</div>`, copy);
  }
  if (mp === "top") {
    return withTrailingCta(`${imgPlaceholder(desc, "21/9")}<div class="wf-after-img">${base}</div>`, copy);
  }
  if (mp === "bottom") {
    return withTrailingCta(`${base}<div class="wf-after-img">${imgPlaceholder(desc, "21/9")}</div>`, copy);
  }
  const [textRatio, imgRatio] = layout.asymmetric ? layout.emphasis === "visual" ? ["2fr", "3fr"] : ["3fr", "2fr"] : ["1fr", "1fr"];
  const img = imgPlaceholder(desc, "4/3");
  const cols = mp === "left" ? `${imgRatio} ${textRatio}` : `${textRatio} ${imgRatio}`;
  const cells = mp === "left" ? `${img}<div>${base}</div>` : `<div>${base}</div>${img}`;
  return withTrailingCta(
    `<div class="wf-grid" style="grid-template-columns:${cols};align-items:center">${cells}</div>`,
    copy
  );
}
function renderSectionInner(section) {
  const { layout, copy } = section;
  if (layout.customHtml) {
    return withTrailingCta(customHtmlFrame(layout.customHtml), copy);
  }
  if (section.kind === "hero" || section.kind.startsWith("hero-")) {
    return renderHero(section);
  }
  if (isBandSection(section)) {
    return renderCtaBand(section);
  }
  if (layout.type === "custom") {
    return renderGeneric(section);
  }
  switch (section.kind) {
    case "features":
      return withTrailingCta(renderFeatures(section), copy);
    case "pricing":
    case "pricing-table":
      return withTrailingCta(renderPricing(section), copy);
    case "flow":
      return withTrailingCta(renderFlow(section), copy);
    case "team":
      return withTrailingCta(renderTeam(section), copy);
    case "testimonials":
      return withTrailingCta(renderTestimonials(section), copy);
    case "faq":
      return withTrailingCta(renderFaq(section), copy);
    case "access":
      return withTrailingCta(renderAccess(section), copy);
    case "menu":
    case "service-list":
      return withTrailingCta(renderMenu(section), copy);
    case "gallery":
      return withTrailingCta(renderGallery(section), copy);
    case "stats":
      return withTrailingCta(renderStats(section), copy);
    case "contact":
      return renderContact(section);
    default:
      return renderGeneric(section);
  }
}

// src/studio/wf/render.ts
function escapeComment(text) {
  return text.replace(/--/g, "\u2014").replace(/>/g, "\uFF1E");
}
var WF_STYLE = `
    /* --- \u30B0\u30EC\u30FC\u968E\u8ABF\u30C8\u30FC\u30AF\u30F3\uFF08wireframe-spec.md \xA71.2 \u306E6\u5909\u6570\uFF09 --- */
    :root {
      --wf-ink:   #111111; /* \u898B\u51FA\u3057\u30FB\u5F37\u3044\u6587\u5B57 */
      --wf-text:  #444444; /* \u672C\u6587 */
      --wf-muted: #888888; /* \u88DC\u8DB3\u30FB\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u8AAC\u660E\u6587 */
      --wf-line:  #CCCCCC; /* \u7F6B\u7DDA\u30FB\u533A\u5207\u308A */
      --wf-fill:  #E4E4E4; /* \u753B\u50CF\u30DC\u30C3\u30AF\u30B9\u30FB\u5E2F\u306E\u5730\u8272 */
      --wf-bg:    #F5F5F5; /* \u30DA\u30FC\u30B8\u5730\u8272 */
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; color: var(--wf-text); background: #fff; line-height: 1.8; }
    h1, h2, h3 { color: var(--wf-ink); line-height: 1.4; }
    h1 { font-size: 32px; }
    h2 { font-size: 24px; }
    h3 { font-size: 17px; margin-bottom: 6px; }
    /* --- \u30EC\u30A4\u30A2\u30A6\u30C8\u306E\u9AA8\u683C --- */
    .wf-container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
    .wf-section { padding: 72px 0; }
    .wf-section--fv { background: var(--wf-bg); padding: 88px 0; }
    .wf-section--band { background: var(--wf-fill); padding: 56px 0; text-align: center; }
    .wf-center { text-align: center; }
    .wf-muted { color: var(--wf-muted); }
    .wf-after-img { margin-top: 28px; }
    /* --- \u30D8\u30C3\u30C0\u30FC --- */
    .wf-header { border-bottom: 1px solid var(--wf-line); background: #fff; position: sticky; top: 0; z-index: 10; }
    .wf-header .wf-container { display: flex; align-items: center; justify-content: space-between; min-height: 64px; gap: 16px; }
    .wf-logo { font-weight: 700; color: var(--wf-ink); font-size: 18px; }
    .wf-nav { display: flex; gap: 20px; font-size: 14px; flex-wrap: wrap; }
    .wf-nav a { text-decoration: none; color: var(--wf-text); }
    .wf-menu-btn { display: none; border: 1px solid var(--wf-line); padding: 6px 12px; font-size: 13px; color: var(--wf-ink); }
    /* --- \u30B0\u30EA\u30C3\u30C9\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3 --- */
    .wf-grid { display: grid; gap: 28px; align-items: start; }
    .wf-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .wf-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .wf-cols-4 { grid-template-columns: repeat(4, 1fr); }
    /* --- \u753B\u50CF\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\uFF08\u659C\u7DDA\u30DC\u30C3\u30AF\u30B9 + \u88AB\u5199\u4F53\u8AAC\u660E\u3002aspect-ratio\u3067CLS\u5BFE\u7B56\uFF09 --- */
    .wf-img {
      width: 100%;
      background-color: var(--wf-fill);
      background-image:
        linear-gradient(to top right, transparent calc(50% - 0.5px), var(--wf-line) calc(50% - 0.5px), var(--wf-line) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
        linear-gradient(to bottom right, transparent calc(50% - 0.5px), var(--wf-line) calc(50% - 0.5px), var(--wf-line) calc(50% + 0.5px), transparent calc(50% + 0.5px));
      border: 1px dashed var(--wf-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--wf-muted); font-size: 13px; text-align: center; padding: 12px;
    }
    .wf-img span { background: var(--wf-fill); padding: 2px 8px; }
    .wf-img-note { font-size: 12px; color: var(--wf-muted); margin-bottom: 20px; }
    .wf-fv-bg { background: var(--wf-fill); border: 1px dashed var(--wf-line); padding: 64px 32px; }
    /* --- \u30AB\u30FC\u30C9\u30FB\u898B\u51FA\u3057\u30D6\u30ED\u30C3\u30AF --- */
    .wf-card { border: 1px solid var(--wf-line); background: #fff; padding: 24px; font-size: 14px; }
    .wf-card .wf-img { margin-bottom: 14px; }
    .wf-rowcard { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
    .wf-num { font-size: 12px; color: var(--wf-muted); letter-spacing: 0.12em; margin-bottom: 8px; }
    .wf-num--big { font-size: 24px; font-weight: 700; color: var(--wf-ink); margin-bottom: 0; }
    .wf-head { margin-bottom: 36px; }
    .wf-sub { font-size: 12px; letter-spacing: 0.14em; color: var(--wf-muted); text-transform: uppercase; margin-bottom: 8px; }
    .wf-lead { margin-top: 12px; max-width: 640px; }
    .wf-lead--center { margin-left: auto; margin-right: auto; }
    .wf-body { margin-top: 16px; max-width: 680px; }
    .wf-section--band .wf-head { margin-bottom: 8px; }
    /* --- CTA --- */
    .wf-cta { margin-top: 24px; }
    .wf-btn { display: inline-block; background: var(--wf-ink); color: #fff; padding: 14px 40px; font-size: 15px; }
    .wf-cta--lg .wf-btn { padding: 18px 56px; font-size: 17px; }
    .wf-btn-note { font-size: 13px; color: var(--wf-muted); margin-top: 8px; }
    /* --- \u8868\u30FBFAQ\u30FB\u5B9A\u7FA9\u30EA\u30B9\u30C8 --- */
    .wf-table { width: 100%; border-collapse: collapse; background: #fff; }
    .wf-table th, .wf-table td { border: 1px solid var(--wf-line); padding: 14px 16px; text-align: left; font-size: 14px; }
    .wf-table thead th { background: var(--wf-fill); color: var(--wf-ink); white-space: nowrap; }
    .wf-faq { max-width: 760px; }
    .wf-qa { border-bottom: 1px solid var(--wf-line); padding: 18px 0; }
    .wf-qa dt { color: var(--wf-ink); font-weight: 700; margin-bottom: 6px; }
    .wf-def { font-size: 14px; }
    .wf-def > div { display: grid; grid-template-columns: 120px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--wf-line); }
    .wf-def dt { color: var(--wf-ink); font-weight: 700; }
    /* --- \u6570\u5B57\u30FB\u304A\u5BA2\u69D8\u306E\u58F0 --- */
    .wf-stat { text-align: center; padding: 24px 8px; border: 1px solid var(--wf-line); background: #fff; }
    .wf-stat-num { font-size: 34px; font-weight: 700; color: var(--wf-ink); line-height: 1.2; }
    .wf-stat-label { font-size: 13px; color: var(--wf-muted); margin-top: 6px; }
    .wf-quote { color: var(--wf-ink); }
    .wf-attr { font-size: 13px; color: var(--wf-muted); margin-top: 10px; }
    /* --- \u30D5\u30A9\u30FC\u30E0\u30E2\u30C3\u30AF --- */
    .wf-form { max-width: 560px; }
    .wf-field { margin-bottom: 16px; }
    .wf-field label { display: block; font-size: 13px; color: var(--wf-ink); margin-bottom: 6px; }
    .wf-input { height: 44px; border: 1px solid var(--wf-line); background: #fff; }
    .wf-input--area { height: 120px; }
    /* --- customHtml\u691C\u8A3C\u67A0 --- */
    .wf-custom-frame { border: 1px dashed var(--wf-muted); padding: 20px; }
    .wf-custom-note { font-size: 11px; color: var(--wf-muted); margin-bottom: 12px; }
    /* --- \u30D5\u30C3\u30BF\u30FC --- */
    .wf-footer { border-top: 1px solid var(--wf-line); background: var(--wf-bg); padding: 40px 0; }
    .wf-footer-name { font-weight: 700; color: var(--wf-ink); }
    .wf-copy { font-size: 12px; color: var(--wf-muted); margin-top: 8px; }
    /* --- \u4E0B\u90E8\u56FA\u5B9A\u30D0\u30FC\uFF08SP\u306E\u307F\u8868\u793A\uFF09 --- */
    .wf-bottom-bar { display: none; position: fixed; left: 0; right: 0; bottom: 0; background: var(--wf-ink); z-index: 20; }
    .wf-bottom-bar a { flex: 1; color: #fff; text-align: center; padding: 14px 8px; font-size: 14px; text-decoration: none; border-left: 1px solid var(--wf-muted); }
    .wf-bottom-bar a:first-child { border-left: none; }
    /* --- SP\uFF08\u30E2\u30D0\u30A4\u30EB\u30D5\u30A1\u30FC\u30B9\u30C8\u691C\u8A3C\u7528\uFF09 --- */
    @media (max-width: 640px) {
      h1 { font-size: 24px; }
      h2 { font-size: 20px; }
      .wf-section { padding: 48px 0; }
      .wf-section--fv { padding: 56px 0; }
      .wf-grid, .wf-cols-2, .wf-cols-3, .wf-cols-4 { grid-template-columns: 1fr !important; }
      .wf-header--sp-menu .wf-nav { display: none; }
      .wf-header--sp-menu .wf-menu-btn { display: inline-block; }
      .wf-bottom-bar { display: flex; }
      body.has-bottom-bar { padding-bottom: 52px; }
    }
`;
function renderBottomBar(purposeType, entries) {
  if (entries.length === 0) return "";
  const lastCta = [...entries].reverse().find((e) => isBandSection(e.section)) ?? entries[entries.length - 1];
  const ctaHref = `#${lastCta.id}`;
  const access = entries.find((e) => e.id === "access" || e.section.kind === "access");
  const mapHref = access ? `#${access.id}` : ctaHref;
  const buttons = {
    inquiry: [
      { label: "\u96FB\u8A71\u3059\u308B", href: ctaHref },
      { label: "\u76F8\u8AC7\u3059\u308B", href: ctaHref }
    ],
    visit: [
      { label: "\u96FB\u8A71\u3059\u308B", href: ctaHref },
      { label: "\u5730\u56F3\u3092\u898B\u308B", href: mapHref }
    ],
    reserve: [
      { label: "\u96FB\u8A71\u3059\u308B", href: ctaHref },
      { label: "\u4E88\u7D04\u3059\u308B", href: ctaHref }
    ],
    recruit: [
      { label: "\u96FB\u8A71\u3059\u308B", href: ctaHref },
      { label: "\u5FDC\u52DF\u3059\u308B", href: ctaHref }
    ]
  };
  const links = buttons[purposeType].map((b) => `<a href="${b.href}">${escapeHtml(b.label)}</a>`).join("");
  return `  <!-- \u4E0B\u90E8\u56FA\u5B9A\u30D0\u30FC\uFF08SP\u5E45\u306E\u307F\u8868\u793A\u3002\u5B9F\u88C5\u6642\u306F\u96FB\u8A71= tel: \u30EA\u30F3\u30AF\uFF09 -->
  <nav class="wf-bottom-bar">${links}</nav>`;
}
function renderWireframe(plan) {
  const used = /* @__PURE__ */ new Set();
  const entries = plan.sections.map((section, i) => ({
    section,
    id: toSectionId(section.kind === "custom" ? section.key : section.kind, i, used)
  }));
  const keyToId = new Map(entries.map((e) => [e.section.key, e.id]));
  const siteName = escapeHtml(plan.siteName);
  const useBottomBar = plan.mobileNav === "bottom-bar" || plan.mobileNav === "both";
  const useHamburger = plan.mobileNav === "hamburger" || plan.mobileNav === "both";
  const navLinks = plan.nav.map((item) => `<a href="#${keyToId.get(item.sectionKey) ?? ""}">${escapeHtml(item.label)}</a>`).join("");
  const menuBtn = useHamburger ? `<span class="wf-menu-btn">\u2261 \u30E1\u30CB\u30E5\u30FC</span>` : "";
  const headerCls = useHamburger ? "wf-header wf-header--sp-menu" : "wf-header";
  const sectionsHtml = entries.map(({ section, id }, i) => {
    const band = isBandSection(section);
    const cls = ["wf-section", i === 0 ? "wf-section--fv" : "", band ? "wf-section--band" : ""].filter((c) => c !== "").join(" ");
    const noteComment = section.note ? `
  <!-- \u610F\u56F3: ${escapeComment(section.note)} -->` : "";
    return `  <!-- ${escapeComment(section.label)}\uFF08kind: ${escapeComment(section.kind)} \u2192 \u5B9F\u88C5\u60F3\u5B9A: ${toAstroComponentName(id)}\uFF09 -->${noteComment}
  <section id="${id}" class="${cls}">
    <div class="wf-container">
      ${renderSectionInner(section)}
    </div>
  </section>`;
  }).join("\n\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}\uFF5C\u30EF\u30A4\u30E4\u30FC\u30D5\u30EC\u30FC\u30E0</title>
  <style>${WF_STYLE}  </style>
</head>
<body${useBottomBar ? ` class="has-bottom-bar"` : ""}>
  <!-- \u30D8\u30C3\u30C0\u30FC: \u30B5\u30A4\u30C8\u540D + \u30B0\u30ED\u30FC\u30D0\u30EB\u30CA\u30D3\uFF08\u30A2\u30F3\u30AB\u30FC\u30EA\u30F3\u30AF\uFF09 -->
  <header class="${headerCls}">
    <div class="wf-container">
      <div class="wf-logo">${siteName}</div>
      <nav class="wf-nav">${navLinks}</nav>
      ${menuBtn}
    </div>
  </header>

  <main>
${sectionsHtml}
  </main>

  <!-- \u30D5\u30C3\u30BF\u30FC: \u30B5\u30A4\u30C8\u540D + \u30B3\u30D4\u30FC\u30E9\u30A4\u30C8 -->
  <footer class="wf-footer">
    <div class="wf-container">
      <p class="wf-footer-name">${siteName}</p>
      <p class="wf-copy">&copy; ${siteName}</p>
    </div>
  </footer>

${useBottomBar ? renderBottomBar(plan.purposeType, entries) : ""}
</body>
</html>
`;
}

// src/studio/wf/rules.ts
function countChars(text) {
  return [...text].length;
}
var BANDS = {
  catch: { min: 13, max: 25, label: "\u30AD\u30E3\u30C3\u30C1\u30B3\u30D4\u30FC" },
  heading: { min: 8, max: 15, label: "\u30BB\u30AF\u30B7\u30E7\u30F3\u898B\u51FA\u3057" },
  lead: { min: 40, max: 70, label: "\u30EA\u30FC\u30C9\u6587" },
  body: { min: 100, max: 200, label: "\u672C\u6587" },
  buttonLabel: { min: 2, max: 8, label: "\u30DC\u30BF\u30F3\u30E9\u30D9\u30EB" },
  navLabel: { min: 2, max: 6, label: "\u30CA\u30D3\u30E9\u30D9\u30EB" }
};
var NAV_MIN = 3;
var NAV_MAX = 7;
var CTA_GAP_MAX = 3;
function isHeroLike(section) {
  return section.kind === "hero" || section.kind.startsWith("hero-") || section.key === "fv";
}
function hasCta(section) {
  return section.isCta === true || section.kind === "cta" || !!section.copy.buttonLabel;
}
function isCardGrid(section) {
  const items = section.copy.items;
  return section.layout.type === "standard" && !section.layout.asymmetric && !!items && items.length >= 3;
}
function findCustomHtmlIssue(html) {
  if (/<\s*script/i.test(html)) return "<script>\u30BF\u30B0\u306F\u4F7F\u7528\u7981\u6B62";
  if (/\bjavascript\s*:/i.test(html)) return "javascript: URL\u306F\u4F7F\u7528\u7981\u6B62";
  if (/https?:\/\//i.test(html)) return "\u5916\u90E8URL\u53C2\u7167\u306F\u7981\u6B62\uFF08WF\u306F1\u30D5\u30A1\u30A4\u30EB\u5B8C\u7D50\uFF09";
  if (/(?:src|href)\s*=\s*["']\s*\/\//i.test(html)) return "\u30D7\u30ED\u30C8\u30B3\u30EB\u76F8\u5BFEURL\uFF08//\uFF09\u306F\u7981\u6B62";
  return null;
}
function checkBand(where, text, band) {
  if (text === void 0 || text === "") return null;
  const len = countChars(text);
  if (len < band.min || len > band.max) {
    return {
      level: "warn",
      where,
      message: `${band.label}\u304C${len}\u5B57\uFF08\u76EE\u5B89${band.min}\u301C${band.max}\u5B57\uFF09: \u300C${text.length > 30 ? `${text.slice(0, 30)}\u2026` : text}\u300D`
    };
  }
  return null;
}
function validateWfPlan(plan) {
  const errors = [];
  const warns = [];
  const sections = plan.sections ?? [];
  const nav = plan.nav ?? [];
  if (sections.length === 0) {
    errors.push({ level: "error", where: "sections", message: "\u30BB\u30AF\u30B7\u30E7\u30F3\u304C1\u3064\u3082\u306A\u3044" });
  } else {
    const first = sections[0];
    if (!isHeroLike(first)) {
      errors.push({
        level: "error",
        where: `sections[0] ${first.label}`,
        message: `\u5148\u982D\u30BB\u30AF\u30B7\u30E7\u30F3\u306FFV\uFF08kind: "hero"\uFF09\u306B\u3059\u308B\uFF08\u73FE\u5728: ${first.kind}\uFF09`
      });
    }
  }
  const seenKeys = /* @__PURE__ */ new Set();
  sections.forEach((s, i) => {
    if (seenKeys.has(s.key)) {
      errors.push({
        level: "error",
        where: `sections[${i}] ${s.label}`,
        message: `\u30BB\u30AF\u30B7\u30E7\u30F3key\u300C${s.key}\u300D\u304C\u91CD\u8907\u3057\u3066\u3044\u308B`
      });
    }
    seenKeys.add(s.key);
  });
  const keySet = new Set(sections.map((s) => s.key));
  nav.forEach((item, i) => {
    if (!keySet.has(item.sectionKey)) {
      errors.push({
        level: "error",
        where: `nav[${i}] ${item.label}`,
        message: `sectionKey\u300C${item.sectionKey}\u300D\u306B\u5BFE\u5FDC\u3059\u308B\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u7121\u3044`
      });
    }
  });
  if (nav.length < NAV_MIN || nav.length > NAV_MAX) {
    errors.push({
      level: "error",
      where: "nav",
      message: `\u30CA\u30D3\u306F${NAV_MIN}\u301C${NAV_MAX}\u500B\u306B\u3059\u308B\uFF08\u73FE\u5728: ${nav.length}\u500B\uFF09`
    });
  }
  sections.forEach((s, i) => {
    const html = s.layout.customHtml;
    if (html) {
      const issue = findCustomHtmlIssue(html);
      if (issue) {
        errors.push({
          level: "error",
          where: `sections[${i}] ${s.label}`,
          message: `customHtml: ${issue}`
        });
      }
    }
  });
  nav.forEach((item, i) => {
    const v = checkBand(`nav[${i}]`, item.label, BANDS.navLabel);
    if (v) warns.push(v);
  });
  sections.forEach((s, i) => {
    const where = `sections[${i}] ${s.label}`;
    const headingBand = i === 0 || isHeroLike(s) ? BANDS.catch : BANDS.heading;
    const checks = [
      checkBand(where, s.copy.heading, headingBand),
      checkBand(where, s.copy.lead, BANDS.lead),
      checkBand(where, s.copy.body, BANDS.body),
      checkBand(where, s.copy.buttonLabel, BANDS.buttonLabel)
    ];
    for (const v of checks) if (v) warns.push(v);
  });
  if (sections.length > 0) {
    const first = sections[0];
    if (isHeroLike(first) && !first.copy.buttonLabel) {
      warns.push({
        level: "warn",
        where: `sections[0] ${first.label}`,
        message: "FV\u5185\u306BCTA\u30DC\u30BF\u30F3\u304C\u7121\u3044\uFF08spec\xA76: FV\u306B\u5FC5\u305A1\u3064\u7F6E\u304F\uFF09"
      });
    }
    let gap = 0;
    sections.forEach((s, i) => {
      if (hasCta(s)) {
        gap = 0;
        return;
      }
      gap += 1;
      if (gap === CTA_GAP_MAX + 1) {
        warns.push({
          level: "warn",
          where: `sections[${i}] ${s.label}`,
          message: `CTA\u7121\u3057\u306E\u30BB\u30AF\u30B7\u30E7\u30F3\u304C${CTA_GAP_MAX}\u3064\u3092\u8D85\u3048\u3066\u7D9A\u3044\u3066\u3044\u308B\uFF08spec\xA76: 2\u301C3\u30BB\u30AF\u30B7\u30E7\u30F3\u3054\u3068\u306B1\u3064\uFF09`
        });
      }
    });
  }
  if (sections.length > 0 && !sections.some((s) => s.layout.asymmetric === true)) {
    warns.push({
      level: "warn",
      where: "sections",
      message: "\u975E\u5BFE\u79F0\u30EC\u30A4\u30A2\u30A6\u30C8\u306E\u30BB\u30AF\u30B7\u30E7\u30F3\u304C1\u3064\u3082\u7121\u3044\uFF08spec\xA79: \u975E\u5BFE\u79F0\u30FB\u65AD\u3061\u843D\u3068\u3057\u30FB\u91CD\u306A\u308A\u3092\u6700\u4F4E1\u7B87\u6240\uFF09"
    });
  }
  for (let i = 1; i < sections.length; i += 1) {
    if (isCardGrid(sections[i - 1]) && isCardGrid(sections[i])) {
      warns.push({
        level: "warn",
        where: `sections[${i}] ${sections[i].label}`,
        message: `\u300C\u898B\u51FA\u3057\uFF0B\u30AB\u30FC\u30C9\u4E26\u3073\u300D\u306E\u540C\u578B\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u9023\u7D9A\u3057\u3066\u3044\u308B\uFF08\u524D: ${sections[i - 1].label}\uFF09\u3002\u30EC\u30A4\u30A2\u30A6\u30C8\u3092\u5909\u3048\u308B`
      });
    }
  }
  return [...errors, ...warns];
}

// scripts/hp-cli.ts
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}
function reportWf(plan) {
  const violations = validateWfPlan(plan);
  const errors = violations.filter((v) => v.level === "error");
  const warns = violations.filter((v) => v.level === "warn");
  for (const e of errors) console.log(`ERROR [${e.where}] ${e.message}`);
  for (const w of warns) console.log(`WARN  [${w.where}] ${w.message}`);
  console.log(`\u7D50\u679C: \u30A8\u30E9\u30FC${errors.length}\u4EF6 / \u8B66\u544A${warns.length}\u4EF6`);
  return errors.length === 0;
}
var [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "validate-wf": {
    const plan = readJson(args[0] ?? fail("usage: validate-wf <plan.json>"));
    if (!reportWf(plan)) process.exit(1);
    break;
  }
  case "render-wf": {
    if (args.length < 2) fail("usage: render-wf <plan.json> <out.html>");
    const plan = readJson(args[0]);
    if (!reportWf(plan)) fail("\u30A8\u30E9\u30FC\u304C\u3042\u308B\u305F\u3081\u66F8\u304D\u51FA\u3057\u4E2D\u6B62\u3002WfPlan\u3092\u76F4\u3057\u3066\u304B\u3089\u518D\u5B9F\u884C\u3057\u3066");
    writeFileSync(args[1], renderWireframe(plan), "utf-8");
    console.log(`\u66F8\u304D\u51FA\u3057: ${args[1]}`);
    break;
  }
  case "validate-ds": {
    const ds = readJson(args[0] ?? fail("usage: validate-ds <ds.json>"));
    const violation = validateDesignSystem(ds);
    if (violation) {
      console.log(violation);
      console.log("\u7D50\u679C: NG");
      process.exit(1);
    }
    console.log("\u7D50\u679C: OK\uFF0810\u8272HEX\u30FBWCAG\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u30FB\u30D5\u30A9\u30F3\u30C8URL\u30FB\u7981\u6B625+\u30FB\u6F14\u51FA2+ \u3059\u3079\u3066\u9069\u5408\uFF09");
    break;
  }
  case "render-tone": {
    if (args.length < 5) {
      fail("usage: render-tone <\u6848\u4EF6\u540D> <concept.json> <ds.json> <tone.md\u51FA\u529B> <preview.html\u51FA\u529B>");
    }
    const [project, conceptPath, dsPath, toneOut, previewOut] = args;
    const concept = readJson(conceptPath);
    const ds = readJson(dsPath);
    const violation = validateDesignSystem(ds);
    if (violation) fail(`DesignSystem\u304C\u691C\u8A3CNG\u3002\u5148\u306B\u76F4\u3057\u3066:
${violation}`);
    writeFileSync(toneOut, renderToneMd(project, concept, ds), "utf-8");
    writeFileSync(previewOut, renderTonePreviewHtml(concept, ds), "utf-8");
    console.log(`\u66F8\u304D\u51FA\u3057: ${toneOut} / ${previewOut}`);
    break;
  }
  case "build-spec": {
    if (args.length < 2) fail("usage: build-spec <input.json> <out.md>");
    const input = readJson(args[0]);
    const designFiles = input.designDir && existsSync(input.designDir) ? readdirSync(input.designDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
    const md = buildStudioSpecMd({
      project: input.project,
      hearingMd: readFileSync(input.hearingMdPath, "utf-8"),
      wfPlan: input.wfPlanJsonPath ? readJson(input.wfPlanJsonPath) : null,
      designSystem: input.dsJsonPath ? readJson(input.dsJsonPath) : null,
      toneMd: input.toneMdPath ? readFileSync(input.toneMdPath, "utf-8") : null,
      designFiles
    });
    writeFileSync(args[1], md, "utf-8");
    console.log(`\u66F8\u304D\u51FA\u3057: ${args[1]}\uFF08design\u53C2\u7167 ${designFiles.length}\u679A\uFF09`);
    break;
  }
  default:
    console.log(
      [
        "atelier \u54C1\u8CEA\u30B2\u30FC\u30C8CLI\uFF08HP\u5DE5\u5834\u30B9\u30AD\u30EB\u7528\uFF09",
        "",
        "  validate-wf <plan.json>",
        "  render-wf   <plan.json> <out.html>",
        "  validate-ds <ds.json>",
        "  render-tone <\u6848\u4EF6\u540D> <concept.json> <ds.json> <tone.md\u51FA\u529B> <preview.html\u51FA\u529B>",
        "  build-spec  <input.json> <out.md>",
        "",
        "\u578B\u306E\u6B63\u5178: src/studio/wf/schema.ts\uFF08WfPlan\uFF09/ src/studio/tone/schema.ts\uFF08DesignSystem/DesignConcept\uFF09"
      ].join("\n")
    );
    process.exit(cmd ? 2 : 0);
}
