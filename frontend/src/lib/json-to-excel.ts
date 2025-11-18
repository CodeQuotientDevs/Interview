import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function jsonToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn[],
  filename: string,
  rowFormatter: (item: T, columns: ExcelColumn[]) => Record<string, string | number | Date>
): void {
  console.log({data})
  if (!data || data.length === 0) {
    throw new Error("No data provided for Excel export");
  }

  // Create a worksheet data array: first row = headers
  const sheetData: (string | number | Date)[][] = [];

  // Headers
  sheetData.push(columns.map(col => col.header));

  // Rows
  data.forEach(item => {
    console.log("Processing item: %o", item);
    const formatted = rowFormatter(item, columns);

    const row = columns.map<string | number | Date>(col => {
      let v = formatted[col.key];
      console.log("key: %s, value: %o", col.key, v);

      // XLSX supports JS Date objects directly
      if (typeof v === "string" && !isNaN(Date.parse(v))) {
        v = new Date(v);
      }

      return v;
    });

    sheetData.push(row);
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths (XLSX stores widths in a special field)
  worksheet["!cols"] = columns.map(col => ({
    wch: col.width ?? 20
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Create file & download it
  XLSX.writeFile(workbook, filename);
}
