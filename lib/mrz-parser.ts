import { MRZData, ExtractedField } from '@/types/document';

function calculateCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    let value: number;
    if (input[i] === '<') {
      value = 0;
    } else if (/\d/.test(input[i])) {
      value = parseInt(input[i]);
    } else {
      value = input[i].charCodeAt(0) - 55; // A=10, B=11, etc.
    }
    sum += value * weights[i % 3];
  }

  return sum % 10;
}

function validateCheckDigit(data: string, checkDigit: string): boolean {
  const calculated = calculateCheckDigit(data);
  return calculated === parseInt(checkDigit);
}

function parseDate(dateStr: string): string {
  // Format: YYMMDD
  if (dateStr.length !== 6) return '';

  const year = parseInt(dateStr.substring(0, 2));
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);

  // Assume 20xx for years 00-40, 19xx for years 41-99
  const fullYear = year <= 40 ? 2000 + year : 1900 + year;

  return `${fullYear}-${month}-${day}`;
}

export function parseMRZ(mrzLines: string[]): MRZData | null {
  if (mrzLines.length < 2) return null;

  const line1 = mrzLines[0];
  const line2 = mrzLines[1];

  // Parse TD3 format (passport - 2 lines of 44 characters)
  if (line1.length === 44 && line2.length === 44) {
    return parseTD3(line1, line2);
  }

  // Parse TD1 format (ID cards - 3 lines of 30 characters)
  if (mrzLines.length === 3 && line1.length === 30) {
    return parseTD1(mrzLines[0], mrzLines[1], mrzLines[2]);
  }

  return null;
}

function parseTD3(line1: string, line2: string): MRZData {
  const documentType = line1.substring(0, 2).replace(/<+$/, '');
  const issuingCountry = line1.substring(2, 5).replace(/<+$/, '');

  const namePart = line1.substring(5).split('<<');
  const lastName = namePart[0].replace(/</g, ' ').trim();
  const firstName = namePart[1]?.replace(/</g, ' ').trim() || '';

  const documentNumber = line2.substring(0, 9).replace(/<+$/, '');
  const documentNumberCheck = line2.substring(9, 10);
  const nationality = line2.substring(10, 13).replace(/<+$/, '');
  const dob = line2.substring(13, 19);
  const dobCheck = line2.substring(19, 20);
  const sex = line2.substring(20, 21);
  const expiry = line2.substring(21, 27);
  const expiryCheck = line2.substring(27, 28);
  const personalNumber = line2.substring(28, 42).replace(/<+$/, '');
  const personalNumberCheck = line2.substring(42, 43);

  const checksumValid =
    validateCheckDigit(documentNumber, documentNumberCheck) &&
    validateCheckDigit(dob, dobCheck) &&
    validateCheckDigit(expiry, expiryCheck);

  const confidence = checksumValid ? 95 : 70;

  return {
    documentType: { value: documentType, confidence },
    issuingCountry: { value: issuingCountry, confidence },
    lastName: { value: lastName, confidence },
    firstName: { value: firstName, confidence },
    documentNumber: { value: documentNumber, confidence },
    nationality: { value: nationality, confidence },
    dateOfBirth: { value: parseDate(dob), confidence },
    sex: { value: sex, confidence },
    expiryDate: { value: parseDate(expiry), confidence },
    personalNumber: { value: personalNumber, confidence: personalNumber ? confidence : 0 },
    checksumValid
  };
}

function parseTD1(line1: string, line2: string, line3: string): MRZData {
  const documentType = line1.substring(0, 2).replace(/<+$/, '');
  const issuingCountry = line1.substring(2, 5).replace(/<+$/, '');
  const documentNumber = line1.substring(5, 14).replace(/<+$/, '');
  const documentNumberCheck = line1.substring(14, 15);

  const dob = line2.substring(0, 6);
  const dobCheck = line2.substring(6, 7);
  const sex = line2.substring(7, 8);
  const expiry = line2.substring(8, 14);
  const expiryCheck = line2.substring(14, 15);
  const nationality = line2.substring(15, 18).replace(/<+$/, '');

  const namePart = line3.split('<<');
  const lastName = namePart[0].replace(/</g, ' ').trim();
  const firstName = namePart[1]?.replace(/</g, ' ').trim() || '';

  const checksumValid =
    validateCheckDigit(documentNumber, documentNumberCheck) &&
    validateCheckDigit(dob, dobCheck) &&
    validateCheckDigit(expiry, expiryCheck);

  const confidence = checksumValid ? 95 : 70;

  return {
    documentType: { value: documentType, confidence },
    issuingCountry: { value: issuingCountry, confidence },
    lastName: { value: lastName, confidence },
    firstName: { value: firstName, confidence },
    documentNumber: { value: documentNumber, confidence },
    nationality: { value: nationality, confidence },
    dateOfBirth: { value: parseDate(dob), confidence },
    sex: { value: sex, confidence },
    expiryDate: { value: parseDate(expiry), confidence },
    personalNumber: { value: '', confidence: 0 },
    checksumValid
  };
}

export function extractFieldFromText(text: string, patterns: RegExp[]): ExtractedField {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return { value: match[1].trim(), confidence: 75 };
    }
  }
  return { value: '', confidence: 0 };
}
