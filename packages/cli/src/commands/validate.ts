import { readXconFile, validationResult, type CommandResult } from './common.js';

export async function validateFile(file: string): Promise<CommandResult> {
  try {
    const { document } = await readXconFile(file);
    return validationResult(document);
  } catch (error) {
    return {
      exitCode: 1,
      output: '',
      error: (error as Error).message,
    };
  }
}
