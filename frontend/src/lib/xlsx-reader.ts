import * as XLSX from "xlsx";
import * as Zod from "zod";

function convertRowToObject(
  row: unknown[],
  headers: string[]
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  row.forEach((value, index) => {
    const key = headers[index];
    if (!key) return;

    // Handle hyperlink-style cell objects
    if (typeof value === "object" && value && "text" in value) {
      value = (value as any).text;
    }

    obj[key] = value;
  });

  return obj;
}

export async function readExcel<T extends Zod.ZodRawShape>(
  file: File,
  validator: Zod.ZodObject<T>
): Promise<[typeof validator._type[], { error: string; index: number }[]]> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onerror = () => reject("Error reading file");

    reader.onloadend = () => {
      const buffer = reader.result;
      if (!buffer || typeof buffer === "string") {
        return reject("Invalid file data");
      }

      // Parse workbook
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,   // <-- important! Returns JS Date instead of serial
        raw: false         // <-- allows proper date parsing
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) return reject("No worksheet found");

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
      });

      const headers: string[] = [];
      const data: Zod.infer<typeof validator>[] = [];
      const errors: { error: string; index: number }[] = [];

      rows.forEach((row, index) => {
        if (index === 0) {
            row.forEach((h) => headers.push(String(h)));
            return;
        }

        if (!Array.isArray(row)) return;

        const obj = convertRowToObject(row, headers);
        console.log({ obj });

        // Normalize phone number
        if (obj.phone !== undefined && obj.phone !== null) {
          obj.phone = String(obj.phone);
        }

        // Validate row
        const result = validator.safeParse(obj);

        if (!result.success) {
          errors.push({
            error: result.error.toString(),
            index: index - 1,
          });
        } else {
          data.push(result.data);
        }
      });

      resolve([data, errors]);
    };

    reader.readAsArrayBuffer(file);
  });

}
