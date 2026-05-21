import { renderDocument } from '@xcon-viewer/viewer';
import { maybeWriteOutput, readXconFile, type CommandResult, type OutputOptions } from './common.js';

export async function renderFile(file: string, options: OutputOptions = {}): Promise<CommandResult> {
  try {
    const { document } = await readXconFile(file);
    const output = renderDocument(document);
    await maybeWriteOutput(output, options);
    return { exitCode: 0, output };
  } catch (error) {
    return { exitCode: 1, output: '', error: (error as Error).message };
  }
}
