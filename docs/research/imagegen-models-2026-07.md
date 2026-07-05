# 画像生成モデル調査メモ（2026-07-05 WebSearch確認）

M6実装とcost.tsの単価表の根拠。モデルIDと単価は設定画面で上書き可能にしてあるので、変動したらここを更新して差し替える。

## Google Gemini（第一候補・無料枠あり）

| モデル | 通称 | 単価目安（1024px） |
|---|---|---|
| gemini-2.5-flash-image | Nano Banana | $0.039/枚 |
| gemini-3.1-flash-image | Nano Banana 2 | $0.067/枚（1K）・$0.045（512px） |
| gemini-3-pro-image | Nano Banana Pro | $0.134/枚（1K-2K）・$0.24（4K） |
| imagen-4 | Imagen 4 | Fast $0.02 / Standard $0.04 / Ultra $0.06 |

- AI Studioの無料枠あり（レート制限つき）。個人利用のムードボード/カンプ用途なら無料枠でかなり回せる
- バッチ（24時間ウィンドウ）で50%割引（当面ツールでは未対応）
- ブラウザCORS: generativelanguage.googleapis.com は対応（キーはクエリパラメータ）

## OpenAI Images

| モデル | 位置づけ | 単価目安 |
|---|---|---|
| gpt-image-2 | 現行フラッグシップ | $0.005〜$0.211/枚（品質・解像度で変動） |
| gpt-image-1.5 | 前世代 | $0.009〜$0.20/枚 |
| gpt-image-1-mini | 最安 | $0.005〜$0.052/枚 |
| gpt-image-1 | 2026-10-23廃止予定 | 使わない |

- DALL·E 2/3 は2026-05-12にAPIから削除済み
- 課金は「出力画像トークン」制（1024×1024は品質Tierごとに固定トークン）
- ブラウザCORS: 要実地検証（M6でCORSエラー時はコピペモードに降格する実装にする）

## ツールへの反映

- DEFAULT_MODELS: gemini=gemini-2.5-flash-image（無料枠・最安定ID）/ openai=gpt-image-2
- cost.ts の verifiedAt: 2026-07-05

Sources:
- [AI Image Pricing 2026: Google Gemini vs. OpenAI GPT Cost Analysis](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini Image Generation Cost Calculator](https://www.aifreeapi.com/en/posts/gemini-image-generation-api-pricing)
- [OpenAI Image Generation API Pricing in 2026](https://www.aifreeapi.com/en/posts/openai-image-generation-api-pricing)
- [AI Image Generation API Pricing (July 2026)](https://www.buildmvpfast.com/api-costs/ai-image)
- [Pricing | OpenAI API](https://developers.openai.com/api/docs/pricing)
