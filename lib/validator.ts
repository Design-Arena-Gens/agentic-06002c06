import { ExtractedDocument, ValidationCheck, ApplicantData, EligibilityPolicy, EligibilityResult } from '@/types/document';
import { parseISO, differenceInMonths, differenceInYears, isAfter, isBefore } from 'date-fns';

export function validateDocument(doc: ExtractedDocument): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // Check document number format
  if (doc.documentNumber.value) {
    const isValid = /^[A-Z0-9]{6,12}$/.test(doc.documentNumber.value);
    checks.push({
      field: 'documentNumber',
      status: isValid ? 'pass' : 'fail',
      message: isValid ? 'Document number format valid' : 'Invalid document number format',
      confidence: doc.documentNumber.confidence
    });
  }

  // Check expiry date
  if (doc.expiryDate.value) {
    try {
      const expiry = parseISO(doc.expiryDate.value);
      const now = new Date();
      const isExpired = isBefore(expiry, now);

      checks.push({
        field: 'expiryDate',
        status: isExpired ? 'fail' : 'pass',
        message: isExpired ? 'Document has expired' : 'Document is valid',
        confidence: doc.expiryDate.confidence
      });

      const monthsUntilExpiry = differenceInMonths(expiry, now);
      if (!isExpired && monthsUntilExpiry < 6) {
        checks.push({
          field: 'expiryDate',
          status: 'warning',
          message: `Document expires in ${monthsUntilExpiry} months`,
          confidence: doc.expiryDate.confidence
        });
      }
    } catch (e) {
      checks.push({
        field: 'expiryDate',
        status: 'fail',
        message: 'Invalid expiry date format',
        confidence: 50
      });
    }
  }

  // Check date of birth
  if (doc.dateOfBirth.value) {
    try {
      const dob = parseISO(doc.dateOfBirth.value);
      const now = new Date();
      const age = differenceInYears(now, dob);

      if (age < 0 || age > 120) {
        checks.push({
          field: 'dateOfBirth',
          status: 'fail',
          message: 'Date of birth is invalid',
          confidence: doc.dateOfBirth.confidence
        });
      } else {
        checks.push({
          field: 'dateOfBirth',
          status: 'pass',
          message: `Age: ${age} years`,
          confidence: doc.dateOfBirth.confidence
        });
      }
    } catch (e) {
      checks.push({
        field: 'dateOfBirth',
        status: 'fail',
        message: 'Invalid date of birth format',
        confidence: 50
      });
    }
  }

  // Check name fields
  if (doc.firstName.value && doc.lastName.value) {
    const hasValidNames = doc.firstName.value.length > 1 && doc.lastName.value.length > 1;
    checks.push({
      field: 'name',
      status: hasValidNames ? 'pass' : 'warning',
      message: hasValidNames ? 'Name fields extracted' : 'Name fields may be incomplete',
      confidence: Math.min(doc.firstName.confidence, doc.lastName.confidence)
    });
  }

  // Check nationality
  if (doc.nationality.value) {
    const isValid = /^[A-Z]{3}$/.test(doc.nationality.value);
    checks.push({
      field: 'nationality',
      status: isValid ? 'pass' : 'warning',
      message: isValid ? 'Nationality code valid' : 'Nationality code format unusual',
      confidence: doc.nationality.confidence
    });
  }

  // Cross-check MRZ data with extracted fields
  if (doc.mrzData) {
    const mrzChecks = validateMRZConsistency(doc);
    checks.push(...mrzChecks);
  }

  return checks;
}

function validateMRZConsistency(doc: ExtractedDocument): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  if (!doc.mrzData) return checks;

  // Check checksum
  checks.push({
    field: 'mrzChecksum',
    status: doc.mrzData.checksumValid ? 'pass' : 'fail',
    message: doc.mrzData.checksumValid ? 'MRZ checksums valid' : 'MRZ checksums failed',
    confidence: doc.mrzData.checksumValid ? 95 : 60
  });

  // Cross-check document number
  if (doc.documentNumber.value && doc.mrzData.documentNumber.value) {
    const match = doc.documentNumber.value === doc.mrzData.documentNumber.value;
    checks.push({
      field: 'documentNumberMatch',
      status: match ? 'pass' : 'fail',
      message: match ? 'Document number matches MRZ' : 'Document number does not match MRZ',
      confidence: 90
    });
  }

  // Cross-check names
  if (doc.lastName.value && doc.mrzData.lastName.value) {
    const similarity = compareStrings(doc.lastName.value, doc.mrzData.lastName.value);
    checks.push({
      field: 'nameMatch',
      status: similarity > 0.8 ? 'pass' : 'warning',
      message: similarity > 0.8 ? 'Names match MRZ' : 'Name mismatch with MRZ',
      confidence: Math.round(similarity * 100)
    });
  }

  return checks;
}

function compareStrings(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const str1 = normalize(a);
  const str2 = normalize(b);

  if (str1 === str2) return 1.0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.includes(shorter)) return 0.9;

  // Simple distance metric
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }

  return matches / longer.length;
}

export function checkEligibility(
  doc: ExtractedDocument,
  applicant: ApplicantData,
  policy: EligibilityPolicy
): EligibilityResult {
  const issues: string[] = [];

  // Check passport validity
  if (doc.expiryDate.value) {
    try {
      const expiry = parseISO(doc.expiryDate.value);
      const now = new Date();
      const monthsValid = differenceInMonths(expiry, now);

      if (monthsValid < policy.minPassportValidity) {
        issues.push(`Passport must be valid for at least ${policy.minPassportValidity} months`);
      }
    } catch (e) {
      issues.push('Cannot verify passport validity period');
    }
  }

  // Check nationality restrictions
  if (policy.allowedNationalities && policy.allowedNationalities.length > 0) {
    if (!policy.allowedNationalities.includes(doc.nationality.value)) {
      issues.push(`Nationality ${doc.nationality.value} is not eligible for ${applicant.visaType}`);
    }
  }

  if (policy.blockedNationalities && policy.blockedNationalities.includes(doc.nationality.value)) {
    issues.push(`Nationality ${doc.nationality.value} is not eligible for ${applicant.visaType}`);
  }

  // Check age requirements
  if (doc.dateOfBirth.value) {
    try {
      const dob = parseISO(doc.dateOfBirth.value);
      const age = differenceInYears(new Date(), dob);

      if (policy.minAge && age < policy.minAge) {
        issues.push(`Applicant must be at least ${policy.minAge} years old`);
      }

      if (policy.maxAge && age > policy.maxAge) {
        issues.push(`Applicant must be under ${policy.maxAge} years old`);
      }
    } catch (e) {
      issues.push('Cannot verify age requirements');
    }
  }

  // Check data consistency with application
  if (applicant.passportNumber && doc.documentNumber.value) {
    if (applicant.passportNumber !== doc.documentNumber.value) {
      issues.push('Passport number does not match application');
    }
  }

  const eligible = issues.length === 0;
  const confidence = eligible ? 95 : 85;

  return {
    eligible,
    reason: eligible ? 'All eligibility requirements met' : issues.join('; '),
    confidence
  };
}

export function generateSummary(
  doc: ExtractedDocument,
  validationChecks: ValidationCheck[],
  eligibility: EligibilityResult
): string {
  const docType = doc.documentType.value || 'Document';
  const name = `${doc.firstName.value} ${doc.lastName.value}`.trim() || 'Unknown';
  const nationality = doc.nationality.value || 'Unknown';

  const failures = validationChecks.filter(c => c.status === 'fail').length;
  const warnings = validationChecks.filter(c => c.status === 'warning').length;

  let summary = `${docType} for ${name} (${nationality}). `;

  if (failures > 0) {
    summary += `${failures} validation failure(s) detected. `;
  }

  if (warnings > 0) {
    summary += `${warnings} warning(s) noted. `;
  }

  if (failures === 0 && warnings === 0) {
    summary += 'All validation checks passed. ';
  }

  if (eligibility.eligible) {
    summary += 'Applicant is eligible for visa application.';
  } else {
    summary += `Visa eligibility: NOT ELIGIBLE. ${eligibility.reason}`;
  }

  return summary;
}

export function generateRecommendations(
  validationChecks: ValidationCheck[],
  eligibility: EligibilityResult,
  overallConfidence: number
): string[] {
  const recommendations: string[] = [];

  const failures = validationChecks.filter(c => c.status === 'fail');
  const warnings = validationChecks.filter(c => c.status === 'warning');

  if (failures.length > 0) {
    recommendations.push('REJECT: Critical validation failures detected');
    failures.forEach(f => {
      recommendations.push(`- Address ${f.field}: ${f.message}`);
    });
    return recommendations;
  }

  if (!eligibility.eligible) {
    recommendations.push('REJECT: Applicant does not meet eligibility requirements');
    recommendations.push(`- ${eligibility.reason}`);
    return recommendations;
  }

  if (overallConfidence < 70) {
    recommendations.push('MANUAL REVIEW: Low confidence in document extraction');
    recommendations.push('- Request higher quality document scan');
    recommendations.push('- Verify extracted information manually');
  } else if (warnings.length > 0) {
    recommendations.push('MANUAL REVIEW: Warnings detected');
    warnings.forEach(w => {
      recommendations.push(`- Review ${w.field}: ${w.message}`);
    });
  } else if (overallConfidence >= 90) {
    recommendations.push('APPROVE: All checks passed with high confidence');
    recommendations.push('- Proceed with visa application processing');
  } else {
    recommendations.push('MANUAL REVIEW: Standard verification recommended');
    recommendations.push('- Verify key details before approval');
  }

  return recommendations;
}
