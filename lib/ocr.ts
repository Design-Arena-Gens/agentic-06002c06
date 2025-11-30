import { createWorker } from 'tesseract.js';

export async function performOCR(imageData: string): Promise<string> {
  const worker = await createWorker('eng');

  try {
    const { data: { text } } = await worker.recognize(imageData);
    return text;
  } finally {
    await worker.terminate();
  }
}

export function extractMRZ(text: string): string[] {
  const lines = text.split('\n');
  const mrzLines: string[] = [];

  // MRZ lines typically contain only uppercase letters, digits, and < characters
  const mrzPattern = /^[A-Z0-9<]{30,}$/;

  for (const line of lines) {
    const cleaned = line.trim().replace(/[^A-Z0-9<]/g, '');
    if (mrzPattern.test(cleaned) && cleaned.length >= 30) {
      mrzLines.push(cleaned);
    }
  }

  return mrzLines;
}
