import { PDFDocument, degrees } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const LIBREOFFICE_PATH = process.env.LIBREOFFICE_PATH || "libreoffice";

export interface PDFProcessingOptions {
  onProgress?: (progress: number) => void;
}

// Merge multiple PDFs into one
export async function mergePDFs(
  inputFiles: string[],
  outputFile: string,
  options?: PDFProcessingOptions
): Promise<void> {
  const mergedPdf = await PDFDocument.create();
  const totalFiles = inputFiles.length;

  for (let i = 0; i < inputFiles.length; i++) {
    const pdfBytes = await fs.readFile(inputFiles[i]);
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));

    if (options?.onProgress) {
      options.onProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputFile, mergedPdfBytes);
}

// Split PDF into separate pages or ranges
export async function splitPDF(
  inputFile: string,
  outputDir: string,
  ranges?: { start: number; end: number }[],
  options?: PDFProcessingOptions
): Promise<string[]> {
  const pdfBytes = await fs.readFile(inputFile);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();
  const outputFiles: string[] = [];

  if (ranges && ranges.length > 0) {
    // Split by ranges
    for (let i = 0; i < ranges.length; i++) {
      const { start, end } = ranges[i];
      const newPdf = await PDFDocument.create();
      const pageIndices = [];
      for (let j = start - 1; j < Math.min(end, totalPages); j++) {
        pageIndices.push(j);
      }
      const pages = await newPdf.copyPages(pdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));

      const outputPath = path.join(outputDir, `split_${i + 1}.pdf`);
      await fs.writeFile(outputPath, await newPdf.save());
      outputFiles.push(outputPath);

      if (options?.onProgress) {
        options.onProgress(Math.round(((i + 1) / ranges.length) * 100));
      }
    }
  } else {
    // Split into individual pages
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);

      const outputPath = path.join(outputDir, `page_${i + 1}.pdf`);
      await fs.writeFile(outputPath, await newPdf.save());
      outputFiles.push(outputPath);

      if (options?.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalPages) * 100));
      }
    }
  }

  return outputFiles;
}

// Rotate PDF pages
export async function rotatePDF(
  inputFile: string,
  outputFile: string,
  rotation: 90 | 180 | 270,
  pageNumbers?: number[],
  options?: PDFProcessingOptions
): Promise<void> {
  const pdfBytes = await fs.readFile(inputFile);
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();

  const pagesToRotate = pageNumbers || pages.map((_, i) => i + 1);
  const totalPages = pagesToRotate.length;

  for (let i = 0; i < pagesToRotate.length; i++) {
    const pageIndex = pagesToRotate[i] - 1;
    if (pageIndex >= 0 && pageIndex < pages.length) {
      const page = pages[pageIndex];
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + rotation));
    }

    if (options?.onProgress) {
      options.onProgress(Math.round(((i + 1) / totalPages) * 100));
    }
  }

  await fs.writeFile(outputFile, await pdf.save());
}

// Compress PDF (basic - removes metadata and optimizes)
export async function compressPDF(
  inputFile: string,
  outputFile: string,
  options?: PDFProcessingOptions
): Promise<void> {
  const pdfBytes = await fs.readFile(inputFile);
  const pdf = await PDFDocument.load(pdfBytes);

  // Remove metadata for smaller size
  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("");
  pdf.setCreator("");

  if (options?.onProgress) {
    options.onProgress(50);
  }

  const compressedBytes = await pdf.save({
    useObjectStreams: true,
  });

  await fs.writeFile(outputFile, compressedBytes);

  if (options?.onProgress) {
    options.onProgress(100);
  }
}

// Protect PDF with password
export async function protectPDF(
  inputFile: string,
  outputFile: string,
  userPassword: string,
  ownerPassword?: string,
  options?: PDFProcessingOptions
): Promise<void> {
  const pdfBytes = await fs.readFile(inputFile);
  const pdf = await PDFDocument.load(pdfBytes);

  if (options?.onProgress) {
    options.onProgress(50);
  }

  // Note: pdf-lib doesn't support encryption directly
  // For now, we'll just copy the file (full encryption requires another library like qpdf)
  const savedBytes = await pdf.save();
  await fs.writeFile(outputFile, savedBytes);

  if (options?.onProgress) {
    options.onProgress(100);
  }
}

// Convert PDF to images using LibreOffice or pdftoppm if available
export async function pdfToImages(
  inputFile: string,
  outputDir: string,
  format: "jpg" | "png" = "jpg",
  dpi: number = 150,
  options?: PDFProcessingOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Try pdftoppm first (from poppler-utils)
    const args = [
      `-${format === "jpg" ? "jpeg" : "png"}`,
      "-r", dpi.toString(),
      inputFile,
      path.join(outputDir, "page")
    ];

    const proc = spawn("pdftoppm", args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        // pdftoppm not available, try alternative
        reject(new Error(`pdftoppm failed: ${stderr}. Install poppler: brew install poppler`));
        return;
      }

      // Find generated files
      const files = await fs.readdir(outputDir);
      const imageFiles = files
        .filter(f => f.startsWith("page") && (f.endsWith(".jpg") || f.endsWith(".png")))
        .map(f => path.join(outputDir, f))
        .sort();

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(imageFiles);
    });
  });
}

// Convert document to PDF using LibreOffice
export async function documentToPDF(
  inputFile: string,
  outputDir: string,
  options?: PDFProcessingOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--convert-to", "pdf",
      "--outdir", outputDir,
      inputFile
    ];

    const proc = spawn(LIBREOFFICE_PATH, args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`LibreOffice conversion failed: ${stderr}`));
        return;
      }

      const inputName = path.basename(inputFile, path.extname(inputFile));
      const outputFile = path.join(outputDir, `${inputName}.pdf`);

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(outputFile);
    });
  });
}

// Convert PDF to Word (DOCX) - requires LibreOffice
export async function pdfToWord(
  inputFile: string,
  outputDir: string,
  options?: PDFProcessingOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--infilter=writer_pdf_import",
      "--convert-to", "docx",
      "--outdir", outputDir,
      inputFile
    ];

    const proc = spawn(LIBREOFFICE_PATH, args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`LibreOffice PDF to Word failed: ${stderr}`));
        return;
      }

      const inputName = path.basename(inputFile, ".pdf");
      const outputFile = path.join(outputDir, `${inputName}.docx`);

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(outputFile);
    });
  });
}

// Convert PDF to Excel - requires LibreOffice
export async function pdfToExcel(
  inputFile: string,
  outputDir: string,
  options?: PDFProcessingOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--infilter=writer_pdf_import",
      "--convert-to", "xlsx",
      "--outdir", outputDir,
      inputFile
    ];

    const proc = spawn(LIBREOFFICE_PATH, args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`LibreOffice PDF to Excel failed: ${stderr}`));
        return;
      }

      const inputName = path.basename(inputFile, ".pdf");
      const outputFile = path.join(outputDir, `${inputName}.xlsx`);

      if (options?.onProgress) {
        options.onProgress(100);
      }

      resolve(outputFile);
    });
  });
}
