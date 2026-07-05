# atelier.

つくるための、プロンプト工房。
6つのAIプロンプトジェネレーターを1画面で切り替えて使う、ゆうきくん専用のスタジオ。

## ツール

| id | 名前 | 出力 |
|---|---|---|
| slide | スライド | ChatGPT Images 2.0 向けデッキ生成プロンプト（1画像=1スライド） |
| thumb | サムネ・画像 | YouTubeサムネ/note/バナー等、クリック獲得1枚もののプロンプト |
| diagram | note図解 | 記事本文の文脈を同梱した挿入図解プロンプト |
| writer | ライティング | 記事執筆のトーン&ルールMD（法令ルール対応） |
| imagemd | 画像MD | Nanobanana向けMarkdown仕様書型の画像プロンプト |
| web | Webデザイン | FV+セクション別のモック画像プロンプト & 実装スペックMD |

## 開発

```bash
npm install
npm run dev      # http://localhost:5188
npm run build    # dist/ に静的ビルド（GitHub Pages配信可）
npm run check    # 型チェック
```

## 構造

- `src/lib/types.ts` — ToolDef 契約（フォームはスキーマ駆動で自動生成）
- `src/components/` — hishoトーンのUI部品（白カード on #F2F2F7・LINE Seed JP・フラット第一）
- `src/tools/<id>/` — 各ツール定義（index.ts = ToolDef、data.ts = プリセット）
- `docs/SPEC.md` — ツール実装の契約
- `docs/WORKFLOW.md` — 半自動HP制作ワークフローとの接続設計
- `docs/research/` — セクション体系・FVパターン・画像生成技法・HPトーンのリサーチ資産

## データの置き場所

入力は端末の localStorage にのみ保存。ヘッダーから設定JSONの書き出し/読み込みができる。
