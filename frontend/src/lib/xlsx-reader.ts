import Excel from 'exceljs';
import * as Zod from 'zod';

function convertToObject(data: Array<unknown>, headers: Array<string>): Record<string, unknown>{
    const obj = {} as Record<string, unknown>;
    data.forEach((value, index) => {
        const headerValue = headers[index];
        if (typeof value === 'object' && value && 'text' in value) {
            value = value.text;
        }
        if (headerValue) {
            obj[headerValue] = value;
        }
    });
    return obj;
}

export async function readExcel<T extends Zod.ZodRawShape>(
    file: File,
    validatorFunction: Zod.ZodObject<T>
): Promise<[Array<Zod.infer<typeof validatorFunction>>, Array<{ error: string; index: number }>]> {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onerror = () => reject('Error while reading file');

        reader.onloadend = async () => {
            const arrayBuffer = reader.result;
            if (!arrayBuffer || typeof arrayBuffer === 'string') {
                return reject('Invalid file data');
            }

            const book = new Excel.Workbook();
            await book.xlsx.load(arrayBuffer);

            const worksheet = book.worksheets[0];
            if (!worksheet) {
                return reject('No worksheet found in the file');
            }

            const headers: string[] = [];
            const data: Array<Zod.infer<typeof validatorFunction>> = [];
            const errors: Array<{ error: string; index: number }> = [];
            console.log("Number of rows: ", worksheet.rowCount);
            for (let index = 0; index < worksheet.rowCount; index++) {
                const row = worksheet.getRow(index);
                if (index == 0) {
                    continue;
                }
                if (index === 1) {
                    headers.push(...(row.values as string[]).slice(1));
                    continue;
                }
                if (!row?.values) {
                    continue;
                }
                const currentDataArray =  (row.values as Array<unknown>).slice(1);
                const obj = convertToObject(currentDataArray, headers);
                if (!Object.keys(obj).length) {
                    break;
                }
                if (obj && obj.startTime && typeof obj.startTime === 'number') {
                    obj.startTime = new Date(obj.startTime + 18000000);
                }
                if (obj && obj.endTime && typeof obj.endTime === 'number') {
                    obj.endTime = new Date(obj.endTime + 18000000);
                }
                if (obj.phone) {
                    obj.phone = obj.phone.toString();
                }
                const parsedObj = validatorFunction.safeParse(obj);

                if (!parsedObj.success) {
                    errors.push({
                        error: JSON.stringify(parsedObj.error.format(), null, 2),
                        index,
                    });
                } else {
                    data.push(parsedObj.data);
                }
            }
            resolve([data, errors]);
        };

        reader.readAsArrayBuffer(file);
    });
}
