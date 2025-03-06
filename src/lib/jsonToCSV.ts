/* eslint-disable @typescript-eslint/no-explicit-any */
export function jsonToCsv(jsonData: Record<string, any>[]): string {
  if (!Array.isArray(jsonData) || jsonData.length === 0 || !jsonData[0]) {
    return "";
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [];

  csvRows.push(headers.join(","));

  for (const row of jsonData) {
    const values = headers.map((header) => {
      const cellValue = String(row[header] ?? "");
      return JSON.stringify(cellValue);
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}
