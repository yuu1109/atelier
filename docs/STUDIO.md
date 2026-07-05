# atelier. スタジオモード仕様（v2 — 案件完結型デザインスタジオ）

`#/studio` で動く案件パイプライン。HP制作ファクトリー（`~/Desktop/01_project/HP/`）の
`clients/{案件}/` を File System Access API で直接読み書きし、
ヒアリング → 要件定義 → WF → コンセプト → カンプ → 実装引き渡し → 微調整を1画面で回す。

## 設計思想

- **AIと壁打ちしながら作る（プリセットから選ばない）**。WFの構成もトーンも、AIが初案を出し、日本語の壁打ちで成果物（WfPlan / DesignSystem）ごと更新する。既存の目的別4型・トーン8種は AI のシステムプロンプトに注入する「参照知識」に格下げ
- **規律はバリデータで守る**。文字数バンド・ナビ規律・CTA配置（wf/rules.ts）、WCAGコントラスト・トークン契約（tone/validate.ts）は生成器で縛らず検証で担保。違反は修復リトライ→警告表示
- **進捗はファイル存在が正**（lib/project.ts derivePhases）。Claude Code 側のスキルで進めた案件も、開いた瞬間に正しい進捗になる。state.json は UI 復元用の補助にすぎない
- **全AI実行ポイントは AiRunButton 経由**。キーあり=ワンクリック実行、キーなし=同じプロンプトをコピーして外部AIに貼り、結果を貼り戻す（壁打ちも CoCreatePanel が JSON 貼り戻しに対応）

## フェーズとファイル契約（clients/{案件}/ 相対）

| フェーズ | 入力 | 出力 | 完了判定 |
|---|---|---|---|
| ヒアリング | メモ貼り付け / 36問フォーム / 既存md | hearing.md（SSOT） | hearing.md 非空 |
| 要件定義 | hearing.md | hearing.md の `## 分析` + state.json purposeType | `^## 分析` あり |
| WF壁打ち | hearing.md + 分析 | wireframe/index.html + CHANGELOG.md → wireframe/wireframe-fixed.html | fixed で frozen |
| コンセプト | hearing.md | moodboard/ + tone.md + tone-preview.html | tone.md あり |
| カンプ | WfPlan + DesignSystem | design/{NN}-{sectionId}.png + design/prompts.md | design/ に画像 |
| 引き渡し | fixed + tone.md | spec.md + キックオフコマンド | site/ で done |
| 微調整 | site/src/styles/tokens.css | 同ファイルへ書き戻し（backup付き） | — |

書き込みは既定で `_atelier/backups/` に旧内容を退避。wireframe-fixed.html の上書きは confirm 必須。

## ディレクトリ

- `src/studio/lib/` — fsa.ts（FileStore 抽象: Fsa / Memory）・idb.ts・project.ts（derivePhases）・markdown.ts
- `src/studio/ai/` — anthropic.ts（claude-opus-4-8 / json_schema / adaptive thinking）・gemini.ts・openaiImage.ts・keys.ts（atelier-keys-v1、エクスポート除外）・cost.ts（単価表 verifiedAt つき+当月カウンタ）・fallback.tsx（AiRunButton）
- `src/studio/cocreate/` — useCoCreation<T>（履歴+成果物+validate+修復リトライ+undo）・CoCreatePanel
- `src/studio/wf/` — schema.ts（WfPlan/LayoutSpec）・rules.ts・knowledge.ts・render.ts+partials/・idMap.ts（§8 ID/Astro対応）
- `src/studio/tone/` — schema.ts（DesignConcept/DesignSystem）・knowledge.ts・validate.ts・toneMd.ts
- `src/studio/design/` — prompt.ts（カンプ画像プロンプト。単発生成用+一括コピペ用）
- `src/studio/tuner/` — cssVars.ts（値だけ差し替える忠実シリアライズ）・TunerPanel.tsx
- `src/studio/phases/` — 各フェーズ画面（PhaseProps = {store, project, onToast}）

## AI・コスト

- テキスト: Anthropic（既定 claude-opus-4-8）。構造化は output_config json_schema、refusal 対応済み
- 画像: Gemini（既定 gemini-2.5-flash-image・無料枠第一）/ OpenAI（gpt-image-2。ブラウザCORS不可の環境ではエラーメッセージでコピペモードへ誘導）
- モデルIDは設定画面で上書き可能。単価は ai/cost.ts（根拠: docs/research/imagegen-models-2026-07.md）。当月生成枚数と概算USDを表示

## 縮退モード

- FSA非対応（Safari等）: connection = "unsupported" を表示し、スタジオは案内のみ（ツールモードは全機能動作）
- キー無し: 全AIポイントがプロンプトコピー+貼り戻しで成立
- 権限失効: ヘッダー「再接続」ボタン（ユーザージェスチャ）で requestPermission

## E2E フィクスチャ

`clients/_e2e/`（架空店舗「菓匠つばき堂」・来店型）は本物の関数群で生成した通し検証の成果物。
hearing.md（分析込み）→ WfPlan（バリデータ エラー0・警告0）→ wireframe 3点 → tone.md/preview →
spec.md → state.json が揃っていて、codingスキルのゲート
`test -f wireframe/wireframe-fixed.html && test -f tone.md` を通る。スタジオの動作確認にそのまま使える。
