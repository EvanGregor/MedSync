import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { Report } from '@/lib/types'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function getReport(id: string): Promise<{ report: Report | null, mlSuggestion: any }> {
  const supabase = createClient()
  
  // Get the report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()
    
  if (reportError) {
    console.error('Error fetching report:', reportError)
    return { report: null, mlSuggestion: null }
  }

  // Get the ML suggestion for this report
  const { data: mlSuggestion, error: mlError } = await supabase
    .from('ml_suggestions')
    .select('*')
    .eq('report_id', id)
    .order('processed_at', { ascending: false })
    .limit(1)
    .single()

  if (mlError && mlError.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching ML suggestion:', mlError)
  }

  return { 
    report, 
    mlSuggestion: mlSuggestion || null 
  }
}

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { report, mlSuggestion } = await getReport(id)
  
  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center">Report not found</h1>
        <div className="text-center mt-4">
          <Link href="/doctor-dashboard/reports">
            <Button>Back to Reports</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get ML analysis results - prioritize ml_suggestions over reports.result
  let findings = 'No findings available'
  let confidence = 0
  let recommendations = 'No recommendations available'
  let severity = 'Unknown'
  let status = 'Unknown'

  if (mlSuggestion) {
    // Use ML suggestion data
    findings = mlSuggestion.findings || 'No findings available'
    confidence = mlSuggestion.confidence || 0
    recommendations = mlSuggestion.recommendations || 'No recommendations available'
    severity = mlSuggestion.severity || 'Unknown'
    status = mlSuggestion.status || 'Unknown'
  } else if (report.result) {
    // Fallback to reports.result (backward compatibility)
    const result = report.result
    findings = result.findings || 'No findings available'
    confidence = result.confidence || 0
    recommendations = result.recommendations || 'No recommendations available'
    severity = result.severity || 'Unknown'
  }

  // Extract and clean patient information
  const patientInfo = (report.patient_info as any) || {}
  
  // Helper function to clean up placeholder values
  const cleanValue = (value: any, defaultValue: string = 'Not provided') => {
    if (!value || value === 'Unknown' || value === 'Not specified' || value === 'Not provided' || value === 'Not applicable') {
      return defaultValue
    }
    return value
  }

  // Extract patient details with proper fallbacks
  const patientId = report.patient_id || patientInfo.patientId || 'Unknown'
  const fullName = cleanValue(patientInfo.fullName, 'Not provided')
  const dateOfBirth = cleanValue(patientInfo.dateOfBirth, 'Not provided')
  const age = cleanValue(patientInfo.age, 'Not provided')
  const gender = cleanValue(patientInfo.gender, 'Not specified')
  const phoneNumber = cleanValue(patientInfo.phoneNumber, 'Not provided')
  const address = cleanValue(patientInfo.address, 'Not provided')
  
  // Only show relevant fields based on test type
  const testType = report.test_type || patientInfo.testType || 'Unknown'
  const isEyeTest = testType.toLowerCase().includes('eye') || testType.toLowerCase().includes('retina')
  const eyeSide = isEyeTest ? cleanValue(patientInfo.eyeSide, 'Not specified') : null
  
  // Medical history (only show if not "None" or placeholder)
  const familyHistory = cleanValue(patientInfo.familyHistoryOfCancer, null)
  const previousDiagnosis = cleanValue(patientInfo.previousDiagnosis, null)
  const ongoingTreatments = cleanValue(patientInfo.ongoingTreatments, null)
  
  // Timestamps
  const recordCreated = patientInfo.recordCreated ? new Date(patientInfo.recordCreated).toLocaleDateString() : 'Not available'
  const lastUpdated = patientInfo.lastUpdated ? new Date(patientInfo.lastUpdated).toLocaleDateString() : 'Not available'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-green-100 text-green-800'
      case 'accepted': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'severe': return 'bg-orange-100 text-orange-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'mild': return 'bg-blue-100 text-blue-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Medical Report Analysis</h1>
        <Link href="/doctor-dashboard/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
      
      <p className="text-center text-gray-500 mb-6">
        AI-powered analysis for medical imaging
      </p>

      {/* Original Image */}
      {report.original_image_url && (
        <div className="flex justify-center mb-8">
          <Card className="p-4">
            <Image
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reports/${report.original_image_url}`}
              alt="Medical scan"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </Card>
        </div>
      )}

      {/* AI Analysis Results */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">AI Analysis Results</h2>
          {mlSuggestion && (
            <div className="flex space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(severity)}`}>
                {severity.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">🔍 AI Findings:</h3>
            <p className="text-blue-800 leading-relaxed">{findings}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">Confidence Score</h4>
              <p className="text-2xl font-bold text-green-700">{(confidence * 100).toFixed(1)}%</p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-1">Severity Level</h4>
              <p className="text-lg font-semibold text-purple-700">{severity}</p>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-1">Analysis Status</h4>
              <p className="text-lg font-semibold text-orange-700">{status.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">💡 AI Recommendations:</h3>
            <p className="text-yellow-800 leading-relaxed">{recommendations}</p>
          </div>
        </div>
        
        {mlSuggestion && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Processed:</span> {new Date(mlSuggestion.processed_at).toLocaleString()}
            </p>
            {mlSuggestion.reviewed_at && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Reviewed:</span> {new Date(mlSuggestion.reviewed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Patient Information - Cleaned up */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Patient ID:</span>
              <span className="text-gray-900">{patientId}</span>
            </div>
            
            {fullName !== 'Not provided' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Full Name:</span>
                <span className="text-gray-900">{fullName}</span>
              </div>
            )}
            
            {dateOfBirth !== 'Not provided' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Date of Birth:</span>
                <span className="text-gray-900">{dateOfBirth}</span>
              </div>
            )}
            
            {age !== 'Not provided' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Age:</span>
                <span className="text-gray-900">{age} years</span>
              </div>
            )}
            
            {gender !== 'Not specified' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Gender:</span>
                <span className="text-gray-900">{gender}</span>
              </div>
            )}
            
            {phoneNumber !== 'Not provided' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Phone Number:</span>
                <span className="text-gray-900">{phoneNumber}</span>
              </div>
            )}
            
            {address !== 'Not provided' && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Address:</span>
                <span className="text-gray-900">{address}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {eyeSide && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Eye Side:</span>
                <span className="text-gray-900">{eyeSide}</span>
              </div>
            )}
            
            {familyHistory && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Family History:</span>
                <span className="text-gray-900">{familyHistory}</span>
              </div>
            )}
            
            {previousDiagnosis && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Previous Diagnosis:</span>
                <span className="text-gray-900">{previousDiagnosis}</span>
              </div>
            )}
            
            {ongoingTreatments && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Ongoing Treatments:</span>
                <span className="text-gray-900">{ongoingTreatments}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Record Created:</span>
              <span className="text-gray-900">{recordCreated}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="text-gray-900">{lastUpdated}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Metadata */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Report Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Test Type:</span>
              <span className="text-gray-900">{testType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">File Name:</span>
              <span className="text-gray-900">{report.original_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Uploaded:</span>
              <span className="text-gray-900">{report.uploaded_at ? new Date(report.uploaded_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Priority:</span>
              <span className="text-gray-900">{report.priority || 'Normal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Report ID:</span>
              <span className="text-gray-900">{report.id}</span>
            </div>
            {mlSuggestion && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">ML Suggestion ID:</span>
                <span className="text-gray-900">{mlSuggestion.id}</span>
              </div>
            )}
            {report.notes && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Notes:</span>
                <span className="text-gray-900">{report.notes}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
} 