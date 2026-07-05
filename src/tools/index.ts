import type { ToolDef } from "../lib/types";
import { def as slide } from "./slide";
import { def as thumb } from "./thumb";
import { def as diagram } from "./diagram";
import { def as writer } from "./writer";
import { def as imagemd } from "./imagemd";
import { def as web } from "./web";

/** タブの並び順 = この配列の順 */
export const TOOLS: ToolDef[] = [slide, thumb, diagram, writer, imagemd, web];
