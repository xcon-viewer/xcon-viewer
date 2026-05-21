import { maybeWriteOutput, readXconFile, serialize, type CommandResult, type OutputOptions, type XconOutputSyntax } from './common.js';

export interface ConvertOptions extends OutputOptions {
  to: XconOutputSyntax;
}

export async function convertFile(file: string, options: ConvertOptions): Promise<CommandResult> {
  try {
    const { document } = await readXconFile(file);
    const output = serialize(document, options.to);
    await maybeWriteOutput(output, options);
    return { exitCode: 0, output };
  } catch (error) {
    return { exitCode: 1, output: '', error: (error as Error).message };
  }
}
