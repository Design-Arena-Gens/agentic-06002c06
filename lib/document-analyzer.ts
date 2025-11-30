import { ExtractedDocument, ExtractedField } from '@/types/document';
import { performOCR, extractMRZ } from './ocr';
import { parseMRZ, extractFieldFromText } from './mrz-parser';

export async function analyzeDocument(imageData: string): Promise<ExtractedDocument> {
  // Perform OCR on the image
  const ocrText = await performOCR(imageData);

  // Extract MRZ if present
  const mrzLines = extractMRZ(ocrText);
  const mrzData = mrzLines.length > 0 ? parseMRZ(mrzLines) : null;

  // Extract fields from OCR text with fallback to MRZ
  const extractedDoc: ExtractedDocument = {
    documentType: mrzData?.documentType || extractDocumentType(ocrText),
    documentNumber: mrzData?.documentNumber || extractFieldFromText(ocrText, [
      /(?:passport|document|card)\s*(?:no|number|#)[:\s]*([A-Z0-9]{6,12})/i,
      /\b([A-Z]{1,2}\d{7,9})\b/
    ]),
    issuingCountry: mrzData?.issuingCountry || extractFieldFromText(ocrText, [
      /(?:issuing\s*country|country\s*of\s*issue)[:\s]*([A-Z]{2,3})/i,
      /\b(USA|GBR|CAN|AUS|IND|CHN|JPN|DEU|FRA|ITA|ESP|BRA)\b/
    ]),
    firstName: mrzData?.firstName || extractFieldFromText(ocrText, [
      /(?:given\s*names?|first\s*name)[:\s]*([A-Z\s]+)/i,
      /surname[:\s]*[A-Z\s]+[,\s]+([A-Z\s]+)/i
    ]),
    lastName: mrzData?.lastName || extractFieldFromText(ocrText, [
      /(?:surname|last\s*name|family\s*name)[:\s]*([A-Z\s]+)/i,
      /^([A-Z\s]+),\s*[A-Z]/m
    ]),
    dateOfBirth: mrzData?.dateOfBirth || extractDateField(ocrText, [
      /(?:date\s*of\s*birth|dob)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(?:date\s*of\s*birth|dob)[:\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i
    ]),
    nationality: mrzData?.nationality || extractFieldFromText(ocrText, [
      /nationality[:\s]*([A-Z]{2,3})/i,
      /citizen\s*of[:\s]*([A-Z\s]+)/i
    ]),
    sex: mrzData?.sex || extractFieldFromText(ocrText, [
      /(?:sex|gender)[:\s]*([MF])/i
    ]),
    issueDate: extractDateField(ocrText, [
      /(?:date\s*of\s*issue|issue\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(?:date\s*of\s*issue|issue\s*date)[:\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i
    ]),
    expiryDate: mrzData?.expiryDate || extractDateField(ocrText, [
      /(?:date\s*of\s*expir(?:y|ation)|expir(?:y|ation)\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(?:date\s*of\s*expir(?:y|ation)|expir(?:y|ation)\s*date)[:\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i
    ]),
    placeOfBirth: extractFieldFromText(ocrText, [
      /(?:place\s*of\s*birth)[:\s]*([A-Z\s,]+)/i
    ]),
    mrzData: mrzData || undefined
  };

  return extractedDoc;
}

function extractDocumentType(text: string): ExtractedField {
  const upperText = text.toUpperCase();

  if (upperText.includes('PASSPORT')) {
    return { value: 'P', confidence: 85 };
  } else if (upperText.includes('IDENTITY CARD') || upperText.includes('ID CARD')) {
    return { value: 'ID', confidence: 85 };
  } else if (upperText.includes('VISA')) {
    return { value: 'V', confidence: 85 };
  } else if (upperText.includes('DRIVING') && (upperText.includes('LICENSE') || upperText.includes('LICENCE'))) {
    return { value: 'DL', confidence: 85 };
  }

  return { value: 'UNKNOWN', confidence: 40 };
}

function extractDateField(text: string, patterns: RegExp[]): ExtractedField {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const normalized = normalizeDateToISO(match[1].trim());
      if (normalized) {
        return { value: normalized, confidence: 75 };
      }
    }
  }
  return { value: '', confidence: 0 };
}

function normalizeDateToISO(dateStr: string): string {
  // Try different date formats
  const formats = [
    /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/, // YYYY-MM-DD
    /^(\d{1})[\/\-](\d{1,2})[\/\-](\d{4})$/, // D/M/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[1]) {
        // Already YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        // Assume DD/MM/YYYY format (European standard)
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
    }
  }

  return '';
}
