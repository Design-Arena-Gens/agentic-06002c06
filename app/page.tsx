'use client';

import { useState } from 'react';
import { VerificationResult, ApplicantData, EligibilityPolicy } from '@/types/document';

export default function Home() {
  const [imageData, setImageData] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Applicant form fields
  const [applicantName, setApplicantName] = useState('');
  const [applicantDOB, setApplicantDOB] = useState('');
  const [applicantPassport, setApplicantPassport] = useState('');
  const [applicantNationality, setApplicantNationality] = useState('');
  const [visaType, setVisaType] = useState('TOURIST');

  // Policy fields
  const [minValidity, setMinValidity] = useState('6');
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('');
  const [allowedNationalities, setAllowedNationalities] = useState('');
  const [blockedNationalities, setBlockedNationalities] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!imageData) {
      setError('Please upload a document image');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const applicantData: ApplicantData | undefined = applicantName ? {
        name: applicantName,
        dateOfBirth: applicantDOB,
        passportNumber: applicantPassport,
        nationality: applicantNationality,
        visaType: visaType
      } : undefined;

      const eligibilityPolicy: EligibilityPolicy = {
        minPassportValidity: parseInt(minValidity),
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        allowedNationalities: allowedNationalities ? allowedNationalities.split(',').map(s => s.trim()) : undefined,
        blockedNationalities: blockedNationalities ? blockedNationalities.split(',').map(s => s.trim()) : undefined,
      };

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          applicantData,
          eligibilityPolicy
        }),
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          AI Document Verifier
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Passport, Visa, ID & Travel Document Verification System
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Document</h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {imageData && (
                  <div className="mt-4">
                    <img src={imageData} alt="Document" className="max-w-full h-auto rounded border" />
                  </div>
                )}
              </div>
            </div>

            {/* Applicant Data */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Applicant Information</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={applicantDOB}
                  onChange={(e) => setApplicantDOB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Passport Number"
                  value={applicantPassport}
                  onChange={(e) => setApplicantPassport(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Nationality (e.g., USA, GBR)"
                  value={applicantNationality}
                  onChange={(e) => setApplicantNationality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TOURIST">Tourist Visa</option>
                  <option value="BUSINESS">Business Visa</option>
                  <option value="STUDENT">Student Visa</option>
                  <option value="WORK">Work Visa</option>
                </select>
              </div>
            </div>

            {/* Eligibility Policy */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Eligibility Policy</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. Passport Validity (months)
                  </label>
                  <input
                    type="number"
                    value={minValidity}
                    onChange={(e) => setMinValidity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Age</label>
                    <input
                      type="number"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max. Age</label>
                    <input
                      type="number"
                      value={maxAge}
                      onChange={(e) => setMaxAge(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed Nationalities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={allowedNationalities}
                    onChange={(e) => setAllowedNationalities(e.target.value)}
                    placeholder="e.g., USA, CAN, GBR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blocked Nationalities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={blockedNationalities}
                    onChange={(e) => setBlockedNationalities(e.target.value)}
                    placeholder="e.g., XXX, YYY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || !imageData}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Document'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {result && (
              <>
                {/* Summary */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-800">Summary</h2>
                  <p className="text-gray-700">{result.summary}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Confidence</span>
                      <span className="text-sm font-semibold text-indigo-600">{result.overallConfidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${result.overallConfidence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Extracted Fields */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-800">Extracted Fields</h2>
                  <div className="space-y-2 text-sm">
                    <Field label="Document Type" field={result.extractedFields.documentType} />
                    <Field label="Document Number" field={result.extractedFields.documentNumber} />
                    <Field label="First Name" field={result.extractedFields.firstName} />
                    <Field label="Last Name" field={result.extractedFields.lastName} />
                    <Field label="Date of Birth" field={result.extractedFields.dateOfBirth} />
                    <Field label="Nationality" field={result.extractedFields.nationality} />
                    <Field label="Sex" field={result.extractedFields.sex} />
                    <Field label="Issue Date" field={result.extractedFields.issueDate} />
                    <Field label="Expiry Date" field={result.extractedFields.expiryDate} />
                    <Field label="Issuing Country" field={result.extractedFields.issuingCountry} />
                  </div>
                </div>

                {/* Validation Checks */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-800">Validation Checks</h2>
                  <div className="space-y-2">
                    {result.validationChecks.map((check, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <span className={`mt-0.5 ${
                          check.status === 'pass' ? 'text-green-500' :
                          check.status === 'fail' ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{check.field}</p>
                          <p className="text-xs text-gray-600">{check.message}</p>
                          <p className="text-xs text-gray-500">Confidence: {check.confidence}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eligibility */}
                <div className={`rounded-lg shadow-lg p-6 ${
                  result.eligibility.eligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h2 className="text-xl font-semibold mb-3 text-gray-800">Eligibility Status</h2>
                  <p className={`font-semibold ${result.eligibility.eligible ? 'text-green-700' : 'text-red-700'}`}>
                    {result.eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{result.eligibility.reason}</p>
                  <p className="text-xs text-gray-600 mt-1">Confidence: {result.eligibility.confidence}%</p>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-800">Recommended Actions</h2>
                  <ul className="space-y-2">
                    {result.recommendedActions.map((action, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* JSON Output */}
                <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-3 text-gray-100">JSON Response</h2>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {!result && !loading && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-500">Upload a document and click "Verify Document" to see results</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Analyzing document...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, field }: { label: string; field: { value: string; confidence: number } }) {
  if (!field.value) return null;

  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900">
        {field.value}
        <span className="text-xs text-gray-500 ml-2">({field.confidence}%)</span>
      </span>
    </div>
  );
}
