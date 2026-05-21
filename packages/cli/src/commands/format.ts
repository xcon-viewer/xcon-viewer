import { maybeWriteOutput, readXconFile, serialize, type CommandResult, type OutputOptions } from './common.js';

export async function formatFile(file: string, options: OutputOptions = {}): Promise<CommandResult> {
  try {
    const { document, syntax } = await readXconFile(file);
    const output = serialize(document, syntax);
    await maybeWriteOutput(output, options.out ? options : { out: file });
    return { exitCode: 0, output };
  } catch (error) {
    return { exitCode: 1, output: '', error: (error as Error).message };
  }
}
