import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/document-analyzer';
import { validateDocument, checkEligibility, generateSummary, generateRecommendations } from '@/lib/validator';
import { ApplicantData, EligibilityPolicy, VerificationResult } from '@/types/document';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { imageData, applicantData, eligibilityPolicy } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Analyze document
    const extractedDoc = await analyzeDocument(imageData);

    // Validate document
    const validationChecks = validateDocument(extractedDoc);

    // Check eligibility if applicant data is provided
    let eligibility = {
      eligible: true,
      reason: 'No eligibility policy provided',
      confidence: 100
    };

    if (applicantData && eligibilityPolicy) {
      eligibility = checkEligibility(
        extractedDoc,
        applicantData as ApplicantData,
        eligibilityPolicy as EligibilityPolicy
      );
    }

    // Calculate overall confidence
    const confidenceScores = [
      extractedDoc.documentNumber.confidence,
      extractedDoc.firstName.confidence,
      extractedDoc.lastName.confidence,
      extractedDoc.dateOfBirth.confidence,
      extractedDoc.expiryDate.confidence,
      extractedDoc.nationality.confidence
    ].filter(c => c > 0);

    const overallConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
      : 50;

    // Generate summary and recommendations
    const summary = generateSummary(extractedDoc, validationChecks, eligibility);
    const recommendedActions = generateRecommendations(validationChecks, eligibility, overallConfidence);

    const result: VerificationResult = {
      overallConfidence,
      extractedFields: extractedDoc,
      validationChecks,
      eligibility,
      recommendedActions,
      summary
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
