export type { EditMode, EditBlock, FileEdit, SimulationResult, SimulationError } from "./types.js";
export { autofixInput } from "./autofixer.js";
export { readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";
export { parseCommand } from "./parser.js";
export { findSearchMatch, findMatchMatch } from "./matcher.js";
export { simulateEdits, applyEditsAtomic } from "./editor.js";
