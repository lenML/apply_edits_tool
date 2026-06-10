export interface EditEntry {
  filePath: string;
  oldText: string;
  newText: string;
}

export interface EditResult {
  success: boolean;
  filePath: string;
  error?: string;
}
