import { parse } from "csv-parse/sync";

export interface ParsedRow {
  [key: string]: string;
}

export function parseCsvBuffer(buffer: Buffer): ParsedRow[] {
  const records = parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });
  return records as ParsedRow[];
}

export function pick(row: ParsedRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}
