export type { EditEntry, EditResult } from "./types.js";
export { decodeBuffer, readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";
export { simulateEdits, applyEditsAtomic } from "./editor.js";
export { writeFileAtomic, randomSuffix } from "./atomic.js";
