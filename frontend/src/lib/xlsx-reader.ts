import * as XLSX from "xlsx";
import * as Zod from "zod";

function sanitizeCell(value: unknown): unknown {
	if (typeof value === "string") {
		const trimmed = value.trim();

		// treat empty or whitespace-only as undefined
		return trimmed === "" ? undefined : trimmed;
	}

	return value;
}

function convertRowToObject(
	row: unknown[],
	headers: string[]
): Record<string, unknown> {
	const obj: Record<string, unknown> = {};

	row.forEach((value, index) => {
		const key = headers[index];
		if (!key) return;


		// hyperlink-like objects (ExcelJS style)
		if (typeof value === "object" && value && "text" in value) {
			value = (value as any).text;
		}

		if (value instanceof Date) {
			// Round to the nearest minute to handle floating point precision issues
			// and off-by-one-minute errors
			value = new Date(Math.round(value.getTime() / 60000) * 60000);
		}

		obj[key] = sanitizeCell(value);
	});

	return obj;
}

export async function readExcel<T extends Zod.ZodRawShape>(
	file: File,
	validator: Zod.ZodObject<T>
): Promise<[typeof validator._type[], { error: string; index: number; row: Record<string, unknown> }[]]> {
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
			const errors: { error: string; index: number; row: Record<string, unknown> }[] = [];

			for (let index = 0; index < rows.length; index++) {
				const row = rows[index];
				if (index === 0) {
					row.forEach((h) => headers.push(String(h)));
					continue;
				}

				if (!Array.isArray(row)) return;

				const obj = convertRowToObject(row, headers);
				if (!Object.keys(obj).length) {
					break;
				} 
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
						row: obj,
					});
				} else {
					data.push(result.data);
				}
			}

			resolve([data, errors]);
		};

		reader.readAsArrayBuffer(file);
	});

}