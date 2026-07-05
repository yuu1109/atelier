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
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { buildStudioSpecMd } from "../src/tools/web/build";
import type { DesignConcept, DesignSystem } from "../src/studio/tone/schema";
import { renderToneMd, renderTonePreviewHtml } from "../src/studio/tone/toneMd";
import { validateDesignSystem } from "../src/studio/tone/validate";
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
        "",
        "型の正典: src/studio/wf/schema.ts（WfPlan）/ src/studio/tone/schema.ts（DesignSystem/DesignConcept）",
      ].join("\n"),
    );
    process.exit(cmd ? 2 : 0);
}
