/**
 * HP工場のスキル（Claude Code）から atelier のTS純関数を呼ぶための品質ゲートCLI。
 * 使い方: node scripts/hp-cli.mjs <command> [args...]
 * ソースを変更したら `npm run build:cli` で hp-cli.mjs を再生成すること。
 *
 * コマンド:
 *   validate-wf <plan.json>                              WfPlanを検証（エラーで exit 1）
 *   render-wf   <plan.json> <out.html>                   検証+グレースケールWF書き出し
 *   validate-ds <ds.json>                                DesignSystemを検証（WCAG等）
 *   render-tone <案件名> <concept.json> <ds.json> <tone.md出力> <preview.html出力>
 *   build-spec  <input.json> <out.md>                    spec.md生成
 *     input.json: { project, hearingMdPath, wfPlanJsonPath?, dsJsonPath?, toneMdPath?, designDir? }
 *   tool-list                                            v1ツール一覧
 *   tool-defaults <toolId>                               ツールの入力state雛形をJSON出力
 *   tool-prompt <toolId> <state.json>                    GUIと同じプロンプトを生成して標準出力
 *   comp-prompts <input.json> <outDir>                   HPカンプ画像プロンプトをセクション別に書き出し
 *     input.json: { wfPlanJsonPath, dsJsonPath, viewport?("pc"|"sp"), extraNote?, sections?(key配列) }
 *   gen-image <prompt.txt> <out.png> [--model <id>]      Gemini APIで画像生成（環境変数 GEMINI_API_KEY）
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildStudioSpecMd } from "../src/tools/web/build";
import { TOOLS } from "../src/tools";
import type { ToolState } from "../src/lib/types";
import { buildCompImagePrompt, type CompViewport } from "../src/studio/design/prompt";
import type { DesignConcept, DesignSystem } from "../src/studio/tone/schema";
import { renderToneMd, renderTonePreviewHtml } from "../src/studio/tone/toneMd";
import { validateDesignSystem } from "../src/studio/tone/validate";
import { toSectionId } from "../src/studio/wf/idMap";
import { renderWireframe } from "../src/studio/wf/render";
import { validateWfPlan } from "../src/studio/wf/rules";
import type { WfPlan } from "../src/studio/wf/schema";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

/** WfPlanの検証結果を人間可読で出力。エラーが1つでもあれば false */
function reportWf(plan: WfPlan): boolean {
  const violations = validateWfPlan(plan);
  const errors = violations.filter((v) => v.level === "error");
  const warns = violations.filter((v) => v.level === "warn");
  for (const e of errors) console.log(`ERROR [${e.where}] ${e.message}`);
  for (const w of warns) console.log(`WARN  [${w.where}] ${w.message}`);
  console.log(`結果: エラー${errors.length}件 / 警告${warns.length}件`);
  return errors.length === 0;
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "validate-wf": {
    const plan = readJson<WfPlan>(args[0] ?? fail("usage: validate-wf <plan.json>"));
    if (!reportWf(plan)) process.exit(1);
    break;
  }

  case "render-wf": {
    if (args.length < 2) fail("usage: render-wf <plan.json> <out.html>");
    const plan = readJson<WfPlan>(args[0]);
    if (!reportWf(plan)) fail("エラーがあるため書き出し中止。WfPlanを直してから再実行して");
    writeFileSync(args[1], renderWireframe(plan), "utf-8");
    console.log(`書き出し: ${args[1]}`);
    break;
  }

  case "validate-ds": {
    const ds = readJson<DesignSystem>(args[0] ?? fail("usage: validate-ds <ds.json>"));
    const violation = validateDesignSystem(ds);
    if (violation) {
      console.log(violation);
      console.log("結果: NG");
      process.exit(1);
    }
    console.log("結果: OK（10色HEX・WCAGコントラスト・フォントURL・禁止5+・演出2+ すべて適合）");
    break;
  }

  case "render-tone": {
    if (args.length < 5) {
      fail("usage: render-tone <案件名> <concept.json> <ds.json> <tone.md出力> <preview.html出力>");
    }
    const [project, conceptPath, dsPath, toneOut, previewOut] = args;
    const concept = readJson<DesignConcept>(conceptPath);
    const ds = readJson<DesignSystem>(dsPath);
    const violation = validateDesignSystem(ds);
    if (violation) fail(`DesignSystemが検証NG。先に直して:\n${violation}`);
    writeFileSync(toneOut, renderToneMd(project, concept, ds), "utf-8");
    writeFileSync(previewOut, renderTonePreviewHtml(concept, ds), "utf-8");
    console.log(`書き出し: ${toneOut} / ${previewOut}`);
    break;
  }

  case "build-spec": {
    if (args.length < 2) fail("usage: build-spec <input.json> <out.md>");
    interface SpecCliInput {
      project: string;
      hearingMdPath: string;
      wfPlanJsonPath?: string;
      dsJsonPath?: string;
      toneMdPath?: string;
      designDir?: string;
    }
    const input = readJson<SpecCliInput>(args[0]);
    const designFiles =
      input.designDir && existsSync(input.designDir)
        ? readdirSync(input.designDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        : [];
    const md = buildStudioSpecMd({
      project: input.project,
      hearingMd: readFileSync(input.hearingMdPath, "utf-8"),
      wfPlan: input.wfPlanJsonPath ? readJson<WfPlan>(input.wfPlanJsonPath) : null,
      designSystem: input.dsJsonPath ? readJson<DesignSystem>(input.dsJsonPath) : null,
      toneMd: input.toneMdPath ? readFileSync(input.toneMdPath, "utf-8") : null,
      designFiles,
    });
    writeFileSync(args[1], md, "utf-8");
    console.log(`書き出し: ${args[1]}（design参照 ${designFiles.length}枚）`);
    break;
  }

  case "tool-list": {
    for (const t of TOOLS) console.log(`${t.id}\t${t.name}`);
    break;
  }

  case "tool-defaults": {
    const tool = TOOLS.find((t) => t.id === args[0]);
    if (!tool) fail(`不明なツールID: ${args[0]}（tool-list で確認）`);
    console.log(JSON.stringify(tool.defaults, null, 2));
    break;
  }

  case "tool-prompt": {
    if (args.length < 2) fail("usage: tool-prompt <toolId> <state.json>");
    const tool = TOOLS.find((t) => t.id === args[0]);
    if (!tool) fail(`不明なツールID: ${args[0]}（tool-list で確認）`);
    // defaultsに上書きマージ（未指定フィールドは雛形の値のまま）
    const state = { ...tool.defaults, ...readJson<ToolState>(args[1]) };
    const built = tool.build(state);
    for (const w of built.warnings ?? []) console.error(`WARN ${w}`);
    for (const m of built.meta ?? []) console.error(`META ${m.label}: ${m.value}`);
    console.log(built.text);
    break;
  }

  case "comp-prompts": {
    if (args.length < 2) fail("usage: comp-prompts <input.json> <outDir>");
    interface CompCliInput {
      wfPlanJsonPath: string;
      dsJsonPath: string;
      viewport?: CompViewport;
      extraNote?: string;
      /** 対象セクションkey（省略時は全セクション） */
      sections?: string[];
    }
    const input = readJson<CompCliInput>(args[0]);
    const plan = readJson<WfPlan>(input.wfPlanJsonPath);
    const ds = readJson<DesignSystem>(input.dsJsonPath);
    const violation = validateDesignSystem(ds);
    if (violation) fail(`DesignSystemが検証NG。先に直して:\n${violation}`);
    const outDir = args[1];
    mkdirSync(outDir, { recursive: true });
    // ファイル名はGUI/spec.mdと同じ採番（toSectionIdを同順で呼ぶ）
    const used = new Set<string>();
    let written = 0;
    plan.sections.forEach((section, i) => {
      const id = toSectionId(section.kind === "custom" ? section.key : section.kind, i, used);
      if (input.sections && !input.sections.includes(section.key)) return;
      const prompt = buildCompImagePrompt({
        ds,
        plan,
        section,
        viewport: input.viewport ?? "pc",
        extraNote: input.extraNote,
      });
      const name = `${String(i + 1).padStart(2, "0")}-${id}.txt`;
      writeFileSync(join(outDir, name), prompt, "utf-8");
      console.log(`${name}\t${section.label}`);
      written++;
    });
    console.log(`書き出し: ${written}件 → ${outDir}`);
    break;
  }

  case "gen-image": {
    if (args.length < 2) fail("usage: gen-image <prompt.txt> <out.png> [--model <id>]");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      fail(
        "環境変数 GEMINI_API_KEY が未設定。~/.zshrc に export GEMINI_API_KEY=... を追加してターミナルを開き直して",
      );
    }
    const modelIdx = args.indexOf("--model");
    const model = modelIdx >= 0 ? args[modelIdx + 1] : "gemini-2.5-flash-image";
    const prompt = readFileSync(args[0], "utf-8");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) fail("Geminiのレート制限。少し待って再実行して");
      fail(`Gemini画像生成に失敗（HTTP ${res.status}）: ${body.slice(0, 300)}`);
    }
    interface GeminiRes {
      candidates?: { content?: { parts?: { text?: string; inlineData?: { data?: string } }[] } }[];
    }
    const json = (await res.json()) as GeminiRes;
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const b64 = parts.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!b64) {
      const text = parts.map((p) => p.text ?? "").join(" ").trim();
      fail(text ? `画像が返らなかった: ${text.slice(0, 300)}` : "画像が返らなかった（応答に画像データ無し）");
    }
    writeFileSync(args[1], Buffer.from(b64, "base64"));
    console.log(`生成: ${args[1]}（${model}）`);
    break;
  }

  default:
    console.log(
      [
        "atelier 品質ゲートCLI（HP工場スキル用）",
        "",
        "  validate-wf <plan.json>",
        "  render-wf   <plan.json> <out.html>",
        "  validate-ds <ds.json>",
        "  render-tone <案件名> <concept.json> <ds.json> <tone.md出力> <preview.html出力>",
        "  build-spec  <input.json> <out.md>",
        "  tool-list / tool-defaults <toolId> / tool-prompt <toolId> <state.json>",
        "  comp-prompts <input.json> <outDir>",
        "  gen-image <prompt.txt> <out.png> [--model <id>]   ※要 GEMINI_API_KEY",
        "",
        "型の正典: src/studio/wf/schema.ts（WfPlan）/ src/studio/tone/schema.ts（DesignSystem/DesignConcept）",
      ].join("\n"),
    );
    process.exit(cmd ? 2 : 0);
}
