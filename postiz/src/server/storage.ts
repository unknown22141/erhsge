import { promises as fs } from 'fs';
import path from 'path';

// Everything the server keeps lives in .data/ next to package.json
export const dataDir = path.join(process.cwd(), '.data');
export const uploadsDir = path.join(dataDir, 'uploads');

export const readJson = async <T>(name: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8')) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = async (name: string, value: unknown) => {
  await fs.mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, name);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
};
