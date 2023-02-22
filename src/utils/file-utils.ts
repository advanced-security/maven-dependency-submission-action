import * as fs from 'fs';

export function loadFileContents(file: string): string | undefined {
  if (!fileExists(file)) {
    return undefined;
  }

  try {
    const data: Buffer = fs.readFileSync(file);
    return data.toString('utf8');
  } catch (err: any) {
    throw new Error(`Failed to load file contents ${file}: ${err}`);
  }
}

export function fileExists(file?: string): boolean {
  if (!file) {
    return false;
  }

  try {
    const wrapperFileStats = fs.statSync(file);
    // TODO might need to deal with a linked file, but ingoring that for now
    return wrapperFileStats && wrapperFileStats.isFile();
  } catch (err: any) {
    if (err.code == 'ENOENT') {
      return false;
    }
    throw err;
  }
}