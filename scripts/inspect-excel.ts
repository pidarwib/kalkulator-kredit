import * as XLSX from "xlsx";
import * as path from "path";

const excelPath = path.resolve(process.cwd(), "reference_source/original/KALKULATOR KREDIT.xlsx");
const workbook = XLSX.readFile(excelPath);

console.log("Workbook Sheet Names:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n--- SHEET: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total Rows: ${data.length}`);
  console.log("First 15 Rows:");
  console.log(data.slice(0, 15));
}
