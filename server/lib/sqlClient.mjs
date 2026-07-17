import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const sqlcmd = process.env.LAZA_SQLCMD ?? 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const instance = process.env.LAZA_SQL_INSTANCE ?? '.\\SQLEXPRESS';

export const database = process.env.LAZA_SQL_DATABASE ?? 'LAZA_DATA_PLATFORM_DEV';

export async function runJsonQuery(query) {
  const { stdout } = await execFileAsync(
    sqlcmd,
    [
      '-S', instance,
      '-E',
      '-C',
      '-b',
      '-d', database,
      '-y', '0',
      '-Q', query,
    ],
    { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
  );

  const jsonText = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('');

  if (!jsonText) return [];
  return JSON.parse(jsonText);
}
