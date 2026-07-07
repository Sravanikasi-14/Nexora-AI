import xlsx from "xlsx";

export interface ExcelRow {
  [key: string]: string;
}

export function parseExcelBuffer(buffer: Buffer): ExcelRow[] {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert worksheet to JSON rows
  const jsonRows = xlsx.utils.sheet_to_json<any>(worksheet, { defval: "" });
  
  // Normalize keys to lowercase and trim
  return jsonRows.map((row) => {
    const normalized: ExcelRow = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      normalized[cleanKey] = val !== null && val !== undefined ? String(val).trim() : "";
    }
    return normalized;
  });
}
