# Webデザインモックアップ画像生成 技法集
## ChatGPT Images 2.0 / Nanobanana (Gemini) 向けプロンプトエンジニアリング

作成日: 2026-07-05
用途: atelier のモック生成ツールで使うプロンプトテンプレの材料。そのままコピペして組み立てられる具体度で記述する。

対象モデルの前提:

| モデル | 特性 | 注意点 |
|---|---|---|
| ChatGPT Images 2.0 (gpt-image-2) | テキスト描画精度が高い。編集時の一貫性が高い。「変更点＋維持点」の指示が効く | アスペクト比はプロンプト内明示＋API では size 指定を併用 |
| Nanobanana / Nano Banana Pro (Gemini系) | 構造化プロンプト（レイアウト・デバイス枠・内容制約の列挙）に強い。参照画像による編集・スタイル維持が得意 | Pro は Thinking モード必須（Fast だと日本語が高確率で崩れる）。文字は「短く・大きく・配置とフォントを明確に」 |

---

## 1. フレーミング（画像の「体裁」を決める言い回し）

### 1-1. 基本原則

- 最初の1文で **「これはWebサイトUIのスクリーンショットである」というモード宣言** をする。これが無いと「Webサイトが写った写真」「PCのある机の写真」になりやすい。
- プロンプトは物語調ではなく **ラベル付きの短いブロック** で書く（背景/被写体 → レイアウト → 詳細 → 制約 の順）。
- 用途（UI mock / ad / infographic）を明示するとポリッシュの度合いが変わる。

### 1-2. モード宣言フレーズ集（英語推奨・冒頭に置く）

```
High-fidelity website UI design mockup, full-width desktop screenshot,
flat 2D digital rendering, pixel-perfect, modern web design.
```

バリエーション:

| 目的 | フレーズ |
|---|---|
| デスクトップ全幅 | `full-width desktop website screenshot, 1440px width layout` |
| LPのファーストビュー | `hero section of a landing page, above-the-fold view` |
| セクション単体 | `a single content section of a website, cropped screenshot, no header, no footer` |
| モバイル画面 | `mobile web page screenshot, 390px width, vertical scroll layout` |
| ワイヤーフレーム | `grayscale low-fidelity wireframe, boxes and placeholder lines, annotation-free` |
| デザインカンプ風 | `professional web design mockup as seen on Behance / Dribbble, clean presentation` |

### 1-3. ブラウザ枠・デバイスフレームの制御

デフォルトでは勝手にブラウザクロームや斜めのMacBookが付くことがあるため、**あり/なしを必ず明示** する。

- 枠なし（実装参照用・推奨デフォルト）:
```
No browser chrome, no device frame, no surrounding desk or background.
The web page fills the entire image edge-to-edge.
```
- 枠あり（プレゼン用）:
```
Displayed inside a minimal browser window mockup (thin light-gray toolbar,
three traffic-light dots, URL bar showing "example.com"), straight-on view, no perspective.
```
- デバイスモック（営業資料用）:
```
Displayed on a front-facing iPhone 16 mockup, flat lay, soft studio background.
```
- 遠近・写真化の禁止（枠なし時に必ず添える）:
```
Strictly flat, orthographic, straight-on view. No perspective tilt, no 3D angle,
no reflections, no photo of a monitor.
```

### 1-4. 忠実度の指定

- 高忠実度: `high-fidelity, production-ready visual design, realistic UI components (buttons, forms, cards, nav bar)`
- 構成検討用: `mid-fidelity mockup, simplified content, greeked body text`
- 質感の底上げ: `crisp typography, consistent spacing, subtle shadows, professional art direction`

---

## 2. アスペクト比の使い分け

両モデルとも任意比率は不完全（プリセットに吸われる）。**プロンプト文中に比率を書く＋生成設定でも指定** の二重指定が安定。

| 生成対象 | 推奨比率 | 理由・備考 |
|---|---|---|
| FV（ファーストビュー） | **16:9** または **3:2** | 実際のデスクトップ表示域（1440×810前後）に近い。3:2 は下のコンテンツの「チラ見せ」まで入る |
| 縦長LP全体 | **9:16 を複数枚に分割** | 1枚に全ページを詰めると各セクションが潰れる。「FV＋2セクション」程度ずつ 9:16 で数枚生成し縦に連結する |
| セクション単体 | **16:9**（浅いセクション）/ **4:3**（カード群・料金表など高さのあるもの） | 1:1 は「バナー」に寄りやすいので避ける |
| モバイル画面 | **9:16** | `mobile screenshot, 390px width` と併記 |
| ヘッダー/フッターのみ | **21:9 相当の横長**（無ければ16:9で上下トリミング前提） | `thin horizontal strip, header only` を併記 |
| OGP・サムネ | 16:9 (1200×630 は 1.91:1 → 16:9 で作り左右トリム) | |

分割生成の指示例（縦長LP）:

```
This is part 2 of 5 of one continuous landing page.
This image contains ONLY the "features" section and the "testimonials" section,
stacked vertically. Do not include header, hero, or footer.
Vertical 9:16 composition. The page continues below; do not add an ending.
```

ポイント:
- 「全ページを1枚で」と頼まない。**1枚あたり最大2〜3セクション** に制限する。
- 各分割画像に「これは連続ページの一部。上端/下端で途切れてよい」と書くと、勝手にフッターやCTAで締められるのを防げる。
- gpt-image-2 は生成後の編集一貫性が高いので、「1枚目を参照画像にして続きを生成」する運用が可能。Nanobanana も参照画像編集が得意なので同様。

---

## 3. 日本語テキストの描画精度・文字化け対策

### 3-1. 原因と大方針

日本語グリフの学習不足により、長文・小サイズ・複雑な漢字ほど崩れる。方針は **「描かせる文字を最小限に絞り、残りはダミー化する」**。

### 3-2. 具体テクニック

1. **入れる文字はダブルクォートで明示列挙**（これが最重要）:
```
Render the following Japanese text EXACTLY as written, no other Japanese text anywhere:
- Headline: 「地域の暮らしを、デザインで支える」
- CTA button: 「無料相談はこちら」
- Nav items: 「サービス」「実績」「会社概要」「お問い合わせ」
```
2. **文字数を絞る**: 見出し15字以内・ボタン8字以内・ナビ各4字以内が目安。長いリード文は描かせない。
3. **本文はグリーキング（ダミー化）指示**:
```
All body/paragraph text must be greeked: render as soft gray placeholder lines
(blurred illegible text), NOT as real characters. Do not attempt to render
Japanese body copy.
```
   ※「架空の日本語で埋めて」は謎漢字を生むので禁止。「線・ぼかしで置き換え」が正解。
4. **フォントスタイルを具体的に指示**: `bold Japanese gothic (sans-serif) typeface, like Noto Sans JP` / `elegant Japanese mincho (serif) typeface`。スタイル未指定だと崩れやすい。
5. **文字は大きく・背景はシンプルに**: 小さな文字ほど崩れる。文字の背後に写真や複雑な模様を置かない（`headline on a plain background area` ）。
6. **ひらがな・カタカナ優先**: 画数の多い漢字（「響」「議」等）は崩れやすい。コピー段階で表記を調整できるなら仮名に開く。
7. **Nano Banana Pro は Thinking モードで生成**（Fast は文字理解が弱い）。
8. **数字と英語は比較的安全**: 価格・電話番号・英語ロゴは描かせてよい。ただし桁数を絞る。
9. **リカバリは再生成より部分編集**: 崩れた箇所だけ `Fix only the headline text to exactly 「…」. Keep everything else unchanged.` と編集指示する（両モデルとも編集の方が歩留まりが良い）。
10. **最終手段は「文字なし生成→実装/Figmaで載せる」**: `Leave the headline area as empty space for text overlay` として文字領域を空けさせる。

### 3-3. テキスト制約の定型ブロック（テンプレ組込み用）

```
TEXT RULES:
- Render ONLY the quoted Japanese strings listed above. 
- Any other text areas: greeked placeholder lines (gray bars), never fake kanji.
- No English lorem ipsum visible as body copy.
- Text must be horizontal, left-aligned unless specified.
- Minimum visual font size: headline large, UI labels medium. No tiny captions.
```

---

## 4. 複数セクション生成での世界観統一（共通スタイルブロック）

### 4-1. 考え方

セクションごとに別画像を生成すると、色・角丸・影・密度がドリフトする。対策は **全プロンプト先頭に同一の STYLE ブロックを機械的に貼る** こと＋ **1枚目を参照画像として渡す** こと（Nanobanana はスタイル参照が特に強い。gpt-image-2 も編集/参照の一貫性が高い）。

### 4-2. 共通スタイルブロックの書式（テンプレ）

```
=== GLOBAL STYLE (identical for all sections of this site) ===
Brand: 「アトリエ設計事務所」— 建築設計事務所のコーポレートサイト
Mood: 静かで上質、余白の多いミニマルデザイン、和モダン

COLORS (use HEX exactly):
- Background: #FAF8F5 (warm off-white)
- Text: #1A1A1A
- Primary accent: #2E5E4E (deep green) — buttons, links, small accents only
- Secondary: #C9B896 (muted gold) — thin lines and icons only
- NO other hues. No purple, no blue gradients.

TYPOGRAPHY:
- Headings: elegant Japanese mincho (serif), large, generous letter-spacing
- Body: clean Japanese gothic (sans-serif) — rendered as greeked gray lines
- English accents: small uppercase sans-serif labels (e.g. "WORKS", "ABOUT")

LAYOUT & DENSITY:
- 12-column grid feel, max content width ~1200px, centered
- Very generous whitespace: large padding above/below each section
- Decoration density: LOW. Flat design, hairline dividers,
  corner radius 8px on cards, very subtle shadows only
- Photography style: natural light, architectural photos, muted tones

=== END GLOBAL STYLE ===
```

### 4-3. 運用ルール

1. **HEXは3〜4色に絞って毎回同じ文字列を貼る**（「青系で」等の曖昧指定はドリフトの元）。
2. **「使わない色」も書く**（`NO other hues. No purple gradients.`）。除外指定は同一性維持に効く。
3. **装飾密度を LOW/MEDIUM/HIGH の3段階で宣言** し、全セクションで固定する。
4. **角丸・影・線の太さ** のような「地味なパラメータ」こそ明記する（ここが一番ドリフトする）。
5. **1枚目（FV）を先に確定** させ、以降は `Match the exact visual style, colors, and typography of the attached reference image.` を付けて参照生成する。
6. 写真素材のトーン（`natural light, muted tones` 等）も固定しないと、セクションごとに写真の世界観が割れる。
7. セクション固有の指示は STYLE ブロックの **後ろ** に `=== THIS SECTION ===` として分離する。混ぜない。

### 4-4. セクション指示部の例

```
=== THIS SECTION: 料金プラン ===
Layout: 3 pricing cards in a row, middle card slightly emphasized
Content:
- Section label: "PRICING" + heading 「料金プラン」
- Card titles: 「ライト」「スタンダード」「フルサポート」
- Prices: "¥50,000" "¥120,000" "¥250,000"
- Each card: 3 greeked feature lines + a primary button 「相談する」
Constraints: cards share identical corner radius and shadow; only the middle
card uses the primary accent as background.
```

---

## 5. 「モック画像」＋「実装用スペックMD」の2出力設計

1ツールで「見せる画像」と「コーディングエージェントが読む仕様」を同時に出す場合、画像は雰囲気の正、スペックMDは数値の正、と役割を分ける。**画像から読み取れない/読み取ると誤差が出る情報こそスペック側に書く**。

### 5-1. スペックMDの必須セクション

```markdown
# {サイト名} 実装スペック

## 1. デザイントークン
- colors: background / surface / text / text-muted / primary / secondary /
  border （すべてHEX。モック画像と同一の値をここに正として記載）
- typography: フォントファミリー（実装で使う実フォント名: 例 "Noto Serif JP",
  "Noto Sans JP"）、見出しスケール（h1: 40/48px, h2: 32px, ...）、
  letter-spacing、line-height
- spacing scale: 4/8/16/24/40/64/96 のような段階表
- radius: card 8px / button 9999px（pill）等
- shadow: 使用する影の定義（例: 0 2px 8px rgba(0,0,0,.06)）
- breakpoints: sp <768 / tab 768–1023 / pc ≥1024

## 2. ページ構造（セクション一覧）
番号付きで上から順に。各セクションに:
- id（実装のアンカー名: hero / features / pricing ...）
- 対応するモック画像ファイル名（section-02.png 等）← 画像との対応付けが重要
- 目的（1行）

## 3. セクション別レイアウト仕様
各セクションについて:
- グリッド構造（例: 2カラム 6/6、カード3列→SPで1列）
- コンテンツ要素の階層（label > h2 > lead > cards[] > cta）
- 確定テキスト（見出し・CTA文言はここが正。画像内の文字化けは無視してよい旨を明記）
- 画像/イラストのプレースホルダ指定（比率・alt方針）

## 4. レスポンシブ方針
- モバイルでの並び替えルール（row → column、ナビ→ハンバーガー）
- フォントスケールの縮小率、セクション余白の縮小率
- 画像モックはPC版のみである旨と、SP変換の一般則

## 5. インタラクション（画像に写らない情報）
- hover / focus スタイル、トランジション時間
- スクロールアニメーションの有無と方針
- フォームのバリデーション・送信先

## 6. 実装ノート
- 推奨スタック（例: Astro + Tailwind。トークンは tailwind.config / CSS variables 化）
- アクセシビリティ最低線（コントラスト比、フォーカスリング、alt）
- 「画像はビジュアルの参考。数値・文言はこのMDが正」という優先順位の宣言
```

### 5-2. 2出力の整合を保つコツ

- **先にトークンを決めてから** 画像プロンプト（§4のSTYLEブロック）とスペックMDの両方へ同じ値を展開する。「画像→後からトークン起こし」は誤差が出る。
- 画像プロンプト内のHEX・フォント指示は、スペックMDのトークン表と **同一ソースから機械的に生成** する（テンプレ変数化）。
- 画像1枚 ↔ スペックのセクション項目を **ファイル名で1対1対応** させる（`section-03-pricing.png` ↔ `## section: pricing`）。
- スペックMDに「画像内テキストは崩れている可能性があるため文言はMDを正とする」と必ず書く（コーディングエージェントがOCR的に画像の文字を写す事故を防ぐ）。

---

## 6. ありがちな失敗モードと抑止プロンプト

| # | 失敗モード | 症状 | 抑止プロンプト |
|---|---|---|---|
| 1 | グリッド一覧化 | 1枚に複数画面/複数案がタイル状に並ぶ | `ONE single web page only. Do NOT create a grid of multiple screens, variations, or a UI kit sheet.` |
| 2 | テキスト潰れ・謎漢字 | 小さい文字が崩れる、存在しない漢字 | §3参照。`Only render the quoted strings; all other text as greeked gray lines.` |
| 3 | AIっぽい紫グラデ | 根拠なく紫〜青のグラデ背景、ネオン発光 | `No purple, no neon, no blue-violet gradients, no glowing effects. Use ONLY the listed HEX colors.` |
| 4 | 不自然なUI要素 | 意味不明のアイコン、ボタンの重複、崩れたナビ | `Use standard, realistic UI components. Every button and nav item must be plausible and non-duplicated. No decorative fake widgets.` |
| 5 | 写真化・3D化 | 机上のモニター写真、斜めのMacBookに表示 | `Flat 2D screenshot, straight-on, no device, no desk, no perspective, no reflections.` |
| 6 | 勝手なフッター/CTA締め | セクション単体を頼んだのにページとして完結させる | `This is a cropped mid-page section. The page continues above and below. No header, no footer, no closing CTA.` |
| 7 | 過剰装飾（AI盛り） | 無数のバッジ・星・キラキラ・抽象3Dオブジェ | `Decoration density: LOW. Minimal flat design. No 3D abstract shapes, no confetti, no floating badges.` |
| 8 | ダークUIへの勝手な反転 | 指定外のダークモードで出てくる | `Light theme. Background is #FAF8F5. Do not use a dark background.` |
| 9 | 実在ブランド混入 | 実在ロゴ・実在サイトのコピー | `Fictional brand only. Do not include any real company logos or trademarks.` |
| 10 | ストック写真顔問題 | 不気味な人物写真、視線が合わない集合写真 | `Photos: natural candid style, or replace people with architectural/product photography.`（人物が不要なら `no human faces`） |
| 11 | 密度ドリフト | セクションごとに余白・情報量がバラバラ | §4の共通STYLEブロック＋参照画像。`Match the whitespace and density of the reference image.` |
| 12 | lorem ipsum の露出 | 英語ダミー文がそのまま見える | `No visible lorem ipsum; body copy must be greeked as gray placeholder lines.` |

### 6-1. ネガティブ制約の定型ブロック（全プロンプト末尾に貼る用）

```
NEGATIVE CONSTRAINTS:
- No purple/neon gradients, no glow, no 3D abstract shapes
- No multiple screens or variations in one image — one page/section only
- No device frame, no desk photo, no perspective (unless requested)
- No fake kanji; non-specified text = greeked gray lines
- No real brand logos; fictional content only
- No dark theme unless specified
```

---

## 7. 統合テンプレート（コピペ用の完成形）

```
[MODE]
High-fidelity website UI design mockup, full-width desktop screenshot,
flat 2D digital rendering, straight-on view, no browser chrome, no device frame.
Aspect ratio 16:9.

[GLOBAL STYLE]
（§4-2 のブロックをそのまま挿入 — 全セクション共通・変更禁止）

[THIS SECTION]
（§4-4 の形式でセクション固有のレイアウト・確定テキストを記述）

[TEXT RULES]
（§3-3 のブロックを挿入）

[NEGATIVE CONSTRAINTS]
（§6-1 のブロックを挿入）
```

運用フロー（推奨）:
1. トークン決定（HEX/フォント/密度）→ STYLEブロックとスペックMDへ同時展開
2. FVを16:9で生成 → 確定させ参照画像化
3. 各セクションを参照画像付きで個別生成（1枚2〜3セクションまで）
4. 崩れた文字は部分編集で修正（全再生成しない）
5. スペックMDに画像ファイル名を紐付けて2出力を納品

---

## 参考ソース

- [Ultimate prompting guide for Nano Banana — Google Cloud Blog](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana)
- [Nano Banana Pro image generation in Gemini: Prompt tips — Google](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/)
- [GPT Image Generation Models Prompting Guide — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- [nano-banana special prompt achieved rapid Mobile UI Mockups — DEV Community](https://dev.to/oikon/nano-banana-special-prompt-achieved-rapid-mobile-ui-mockups-1mif)
- [AI-Generated UI Mockups in Your Coding Workflow — paddo.dev](https://paddo.dev/blog/nano-banana-ux-design-workflow/)
- [Nano Bananaは日本語対応してる？文字化けを防ぐプロンプトのコツ — romptn Magazine](https://romptn.com/article/92880)
- [Nano Bananaは日本語に対応している？ — SHIFT AI TIMES](https://shift-ai.co.jp/blog/37147/)
- [Nano Banana Proが優秀すぎる…日本語が崩れない神プロンプト10選 — ビジネス+IT](https://www.sbbit.jp/article/cont1/178931)
- [GPT Image 2 Review: 80 Prompts, API Tips — PixVerse](https://pixverse.ai/en/blog/gpt-image-2-review-and-prompt-guide)
- [GPT Image — realistic UI mockups — explainx.ai](https://explainx.ai/generate/prompts/image/design/ui-mockups)
