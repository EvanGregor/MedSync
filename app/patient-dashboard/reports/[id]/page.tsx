"use client"

import { useState, useEffect } from 'react'
import { use } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function PatientReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) {
          console.error('Error fetching report:', error)
          setError('Failed to load report')
        } else {
          setReport(data)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Activity className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Report Not Found</h1>
          <p className="text-gray-600 mb-6">The requested report could not be found.</p>
          <Link href="/patient-dashboard/reports">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Medical Report</h1>
          <p className="text-gray-600">Report ID: {report.id}</p>
        </div>
        <Link href="/patient-dashboard/reports">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      </div>

      {/* Report Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Report Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><span className="font-medium">Test Type:</span> {report.test_type}</p>
            <p><span className="font-medium">File Name:</span> {report.original_name}</p>
            <p><span className="font-medium">Uploaded:</span> {new Date(report.uploaded_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p><span className="font-medium">Priority:</span> {report.priority}</p>
            <p><span className="font-medium">Patient ID:</span> {report.patient_id}</p>
            {report.notes && (
              <p><span className="font-medium">Notes:</span> {report.notes}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Original Image/File */}
      {report.file_name && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Report File</h2>
          <div className="flex justify-center">
            {report.file_name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reports/${report.file_name}`}
                alt="Medical report"
                width={400}
                height={400}
                className="rounded-lg"
              />
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">File: {report.original_name}</p>
                <p className="text-sm text-gray-500 mt-2">This is a document file. Use the download button to view.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* AI Analysis Section */}
      {report.result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Analysis</h2>
          <div className="space-y-4">
            {report.result.findings && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Findings</h3>
                <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{report.result.findings}</p>
              </div>
            )}
            {report.result.confidence && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Confidence</h3>
                <p className="text-gray-700">{Math.round(report.result.confidence * 100)}%</p>
              </div>
            )}
            {report.result.recommendations && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Recommendations</h3>
                <p className="text-gray-700 bg-green-50 p-3 rounded-lg">{report.result.recommendations}</p>
              </div>
            )}
            {report.result.severity && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Severity</h3>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  report.result.severity === 'high' ? 'bg-red-100 text-red-800' :
                  report.result.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {report.result.severity}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Patient Information */}
      {report.patient_info && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">Patient ID:</span> {report.patient_info.patientId || report.patient_id}</p>
              {report.patient_info.name && (
                <p><span className="font-medium">Name:</span> {report.patient_info.name}</p>
              )}
              {report.patient_info.age && (
                <p><span className="font-medium">Age:</span> {report.patient_info.age}</p>
              )}
            </div>
            <div>
              {report.patient_info.gender && (
                <p><span className="font-medium">Gender:</span> {report.patient_info.gender}</p>
              )}
              {report.patient_info.contact && (
                <p><span className="font-medium">Contact:</span> {report.patient_info.contact}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 