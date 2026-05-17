export type EditMode = "SEARCH" | "MATCH";

export interface EditBlock {
  mode: EditMode;
  searchText: string;
  replaceText: string;
}

export interface FileEdit {
  filePath: string;
  blocks: EditBlock[];
}

export interface SimulationError {
  filePath: string;
  error: string;
  /** The search/replace block index (1-based) */
  blockIndex?: number;
  /** Total blocks for this file */
  totalBlocks?: number;
  /** The SEARCH/MATCH text that was being looked for */
  searchText?: string;
  /** The virtual buffer content at the time of failure */
  currentContent?: string;
  /** The replace text (may be useful context) */
  replaceText?: string;
}

export interface SimulationResult {
  valid: boolean;
  files: Map<string, string>;
  errors: SimulationError[];
}
