# hp-tones.json 補足メモ

生成元: `/Users/yuu_design2022/Desktop/Project/HP/design-system/tones/`（01〜08の8ファイル、2026-07-05時点）

## 転記ルール

- `colors` は各ファイル §9（または §3）の `:root` スニペットからHEXをそのまま転記。全72値をスクリプトで元ファイルと突合済み（全一致）
- カラーキーの対応: `bg=--c-bg / bgAlt=--c-bg-alt / surface=--c-surface / ink=--c-ink / inkMuted=--c-ink-muted / primary=--c-primary / onPrimary=--c-on-primary / accent=--c-accent / border=--c-border`
- `--c-heading` と派生変数（`--c-primary-soft` 等）はスキーマ外のため収録していない。必要なら元ファイル参照
- `buttonRecipes` の `"B-19/22"` は元ファイルの表記そのまま（アウトライン系の19/22どちらでも可、の意）
- 07 アーバン・ボールドは primary と accent が同一HEX（#E8FF3C）。役割分担（primary=面/CTA、accent=線・点）は元ファイル §3 参照
- 06 ラグジュアリーには黒地×金のダーク派生案あり（元ファイル §7 末尾）。JSONには白磁版のみ収録

## 早見表

| id | 名前 | 主業種 | 余白 | 角丸 |
|---|---|---|---|---|
| wa-modern | 和モダン | 整骨院・和食店 | space-12 | 0 |
| clean-trust | クリーン&トラスト | 士業・クリニック | space-12 | 4px |
| warm-craft | ウォーム&クラフト | カフェ・工房 | space-8 | 8px〜ピル |
| editorial-minimal | エディトリアル・ミニマル | デザイン事務所 | space-16 | 0 |
| pop-friendly | ポップ&フレンドリー | 子ども向け教室 | space-8 | ピル多用 |
| luxury | ラグジュアリー | 高単価サロン | space-16 | 0 |
| urban-bold | アーバン・ボールド | ジム | space-8 | 0 |
| local-simple | ローカル・シンプル | 商店・町工場 | space-12 | 0 |
