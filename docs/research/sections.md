# Webサイト セクション体系（タクソノミー）

atelier のマスターデータ `sections.json` の解説。セクション単位でAI画像生成プロンプトや実装スペックを出すための土台となる分類。

作成日: 2026-07-05 / 収録: セクション 45種・サイト種別 11種

## データ構造

```
{ siteTypes: [...], sections: [...] }
```

### siteTypes（サイト種別）

| フィールド | 説明 |
|---|---|
| id | 機械可読ID（ケバブケース） |
| name / en / desc | 日本語名・英語名・1行説明 |
| preset | 推奨セクション構成の順序付き配列（section id を参照） |

11種: `lp` / `corporate` / `clinic` / `restaurant` / `salon` / `professional` / `recruit` / `portfolio` / `saas` / `ec` / `school`

※ 依頼上の「店舗」カテゴリは、プリセットの実用性を優先して 治療院・クリニック（clinic）/ 飲食店（restaurant）/ 美容室・サロン（salon）の3種に分割した。そのため種別数は11になっている。

### sections（セクション）

| フィールド | 説明 |
|---|---|
| id | 機械可読ID（ケバブケース、全体でユニーク） |
| name / en | 日本語名・英語名 |
| purpose | このセクションが果たす役割（1行） |
| slots | 中に入る内容要素（コピー・画像・ボタン等の部品リスト） |
| variants | レイアウトバリエーション2〜4種（id / name / desc） |
| fits | 適合するサイト種別IDの配列（preset で使われる種別を必ず含む） |
| priority | core / common / niche |

### priority の意味

- **core**（8種）: ほぼ全サイトで必須。header-nav, hero, features, pricing, testimonials, faq, cta, contact, footer
- **common**: 多くのサイト種別で使う汎用セクション（問題提起、事例、スタッフ紹介、アクセスなど）
- **niche**: 特定業種に特化（症例ビフォーアフター、カリキュラム、連携一覧、商品グリッドなど）

## 分類の考え方

45セクションはおおまかに次のグループで設計している。

1. **構造系**: header-nav / hero / cta / contact / footer — どのサイトにもある骨格
2. **ストーリー系**: problem → solution → features → benefits — LPの説得の流れ（PASONA等の定石に対応）
3. **ブランド・会社系**: concept / message / about / history / service-list
4. **オファー系**: pricing / menu / campaign / comparison / guarantee / product-list / product-detail / demo-video
5. **証拠（社会的証明）系**: case-study / before-after / testimonials / logos-media / stats / gallery / works
6. **人物系**: team / profile / interview / culture
7. **採用系**: recruit-message / job-openings（+ stats / interview / culture を併用）
8. **教育系**: curriculum（時間割はvariantで表現）
9. **サポート・情報系**: flow / faq / news / blog / sns-feed / access / reservation / newsletter / integration

## ツールでの使い方（想定）

1. ユーザーの業種 → `siteTypes` から該当種別を特定
2. `preset` をそのまま初期構成として提示（並び順は説得ストーリーの定石順）
3. 各セクションの `slots` からコピー・素材の入力欄を生成
4. `variants` からレイアウトを選ばせ、画像生成プロンプト／実装スペックの分岐に使う
5. 構成のカスタマイズ時は `fits` と `priority` で候補セクションを絞り込む

## 主な参考情報

- 日本語LPの定番構成（ファーストビュー→ボディ→クロージング、問題提起・共感・実証・信頼・安心の5パーツ）
- コーポレートサイトの必須コンテンツ（会社概要・事業紹介・実績・採用・ニュース・問い合わせ）
- 海外のlanding page anatomy（hero / USP / benefits / social proof / CTA、ヒーロー内proof配置の潮流）
- Relume等のコンポーネントライブラリのカテゴリ体系（Hero / Feature / CTA / Blog / Product List / Footer 等）
- 治療院・クリニック集客サイトの定番（施術メニュー＋料金の明示、症例、初回特典、施術の流れ、アクセス）
- 採用サイトの定番（採用メッセージ、数字で見る、社員インタビュー、働く環境、募集要項）
