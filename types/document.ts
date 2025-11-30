export interface ExtractedField {
  value: string;
  confidence: number;
}

export interface MRZData {
  documentType: ExtractedField;
  issuingCountry: ExtractedField;
  lastName: ExtractedField;
  firstName: ExtractedField;
  documentNumber: ExtractedField;
  nationality: ExtractedField;
  dateOfBirth: ExtractedField;
  sex: ExtractedField;
  expiryDate: ExtractedField;
  personalNumber: ExtractedField;
  checksumValid: boolean;
}

export interface ExtractedDocument {
  documentType: ExtractedField;
  documentNumber: ExtractedField;
  issuingCountry: ExtractedField;
  firstName: ExtractedField;
  lastName: ExtractedField;
  dateOfBirth: ExtractedField;
  nationality: ExtractedField;
  sex: ExtractedField;
  issueDate: ExtractedField;
  expiryDate: ExtractedField;
  placeOfBirth?: ExtractedField;
  mrzData?: MRZData;
}

export interface ValidationCheck {
  field: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  confidence: number;
}

export interface ApplicantData {
  name: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
}

export interface EligibilityPolicy {
  minPassportValidity: number; // months
  allowedNationalities?: string[];
  blockedNationalities?: string[];
  minAge?: number;
  maxAge?: number;
  requireBiometric?: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  confidence: number;
}

export interface VerificationResult {
  overallConfidence: number;
  extractedFields: ExtractedDocument;
  validationChecks: ValidationCheck[];
  eligibility: EligibilityResult;
  recommendedActions: string[];
  summary: string;
}
