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
}

export interface SimulationResult {
  valid: boolean;
  files: Map<string, string>;
  errors: SimulationError[];
}
