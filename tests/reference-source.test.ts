import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("TASK-007: Reference Source Directory Structure", () => {
  const rootDir = process.cwd();
  const refDir = path.resolve(rootDir, "reference_source");

  it("should have all required subdirectories and README.md", () => {
    expect(fs.existsSync(refDir)).toBe(true);

    const readmePath = path.join(refDir, "README.md");
    const originalDir = path.join(refDir, "original");
    const validatedDir = path.join(refDir, "validated");
    const importDir = path.join(refDir, "import");

    expect(fs.existsSync(readmePath)).toBe(true);
    expect(fs.existsSync(originalDir)).toBe(true);
    expect(fs.existsSync(validatedDir)).toBe(true);
    expect(fs.existsSync(importDir)).toBe(true);

    expect(fs.statSync(originalDir).isDirectory()).toBe(true);
    expect(fs.statSync(validatedDir).isDirectory()).toBe(true);
    expect(fs.statSync(importDir).isDirectory()).toBe(true);
  });

  it("should contain the official Excel workbook in the original subdirectory", () => {
    const originalDir = path.join(refDir, "original");
    const files = fs.readdirSync(originalDir);
    const excelFiles = files.filter(
      (f) => f.endsWith(".xlsx") || f.endsWith(".xls")
    );

    expect(excelFiles.length).toBeGreaterThan(0);
    expect(excelFiles).toContain("KALKULATOR KREDIT.xlsx");
  });

  it("should have governance protocol documentation in README.md", () => {
    const readmePath = path.join(refDir, "README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("reference_source/");
    expect(content).toContain("original/");
    expect(content).toContain("validated/");
    expect(content).toContain("import/");
    expect(content).toContain("Immutability");
  });
});
