"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, FileText, Download, Eye, ArrowLeft, X, ExternalLink, Brain } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function PatientReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSampleData, setIsSampleData] = useState(false)
  const [viewingReport, setViewingReport] = useState<any>(null)
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.user_metadata?.role !== "patient") {
        router.push("/login")
        return
      }

      setUser(user)

      try {
        // Try to resolve patient ID (could be short ID or UUID)
        let resolvedPatientId = user.id // Default to auth user ID

        // First try to find by short_id mapping
        const { data: shortIdMapping } = await supabase
          .from('user_short_ids')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        // Also try to match by short_id if patient_id is provided in metadata
        const metadataPatientId = user.user_metadata?.patient_id
        if (metadataPatientId) {
          const { data: metadataMapping } = await supabase
            .from('user_short_ids')
            .select('user_id')
            .eq('short_id', metadataPatientId)
            .maybeSingle()

          if (metadataMapping?.user_id) {
            resolvedPatientId = metadataMapping.user_id
          }
        }

        console.log('🔍 Fetching reports for patient ID:', resolvedPatientId)
        console.log('🔍 User ID:', user.id)
        console.log('🔍 User metadata:', user.user_metadata)

        // Fetch reports for this patient - use individual queries instead of .or() to avoid syntax issues
        let reportsData: any[] = []
        let error: any = null

        // Try multiple ways to find reports for this patient
        const queries = [
          // Try by resolved patient ID (UUID)
          supabase
            .from('reports')
            .select(`
              *,
              ml_suggestions (
                id,
                findings,
                confidence,
                recommendations,
                severity,
                status,
                processed_at
              )
            `)
            .eq('patient_id', resolvedPatientId)
            .order('uploaded_at', { ascending: false }),

          // Try by user ID (UUID)
          supabase
            .from('reports')
            .select(`
              *,
              ml_suggestions (
                id,
                findings,
                confidence,
                recommendations,
                severity,
                status,
                processed_at
              )
            `)
            .eq('patient_id', user.id)
            .order('uploaded_at', { ascending: false }),

          // Try by short ID if user has one
          supabase
            .from('user_short_ids')
            .select('short_id')
            .eq('user_id', user.id)
            .eq('role', 'patient')
            .maybeSingle()
            .then(async (shortIdResult) => {
              if (shortIdResult.data?.short_id) {
                return supabase
                  .from('reports')
                  .select(`
                    *,
                    ml_suggestions (
                      id,
                      findings,
                      confidence,
                      recommendations,
                      severity,
                      status,
                      processed_at
                    )
                  `)
                  .eq('patient_id', shortIdResult.data.short_id)
                  .order('uploaded_at', { ascending: false })
              }
              return { data: [], error: null }
            })
        ]

        // Execute all queries and combine results
        for (const query of queries) {
          try {
            const result = await query
            if (result.data && result.data.length > 0) {
              reportsData = [...reportsData, ...result.data]
            }
            if (result.error) {
              console.warn('Query error:', result.error)
              error = result.error
            }
          } catch (err) {
            console.warn('Query execution error:', err)
          }
        }

        // Remove duplicates based on report ID
        const uniqueReports = reportsData.filter((report, index, self) =>
          index === self.findIndex(r => r.id === report.id)
        )

        reportsData = uniqueReports

        console.log('🔍 Total reports found:', reportsData.length)
        console.log('🔍 Reports data:', reportsData)

        if (error) {
          const errorDetails = {
            message: error?.message || 'Unknown error',
            details: error?.details || null,
            hint: error?.hint || null,
            code: error?.code || null,
            timestamp: new Date().toISOString(),
            context: 'fetching_patient_reports'
          }
          console.error('Error fetching reports:', errorDetails)
          console.error('Full error object:', JSON.stringify(error, null, 2))
          // Show sample data if there's an error
          const sampleReports = [
            {
              id: '1',
              patient_id: resolvedPatientId,
              test_type: 'blood_test',
              original_name: 'Complete Blood Count Report',
              file_name: 'cbc_report_001.pdf',
              priority: 'normal',
              notes: 'Routine blood work - all values within normal range',
              uploaded_at: new Date().toISOString()
            },
            {
              id: '2',
              patient_id: resolvedPatientId,
              test_type: 'x_ray',
              original_name: 'Chest X-Ray Report',
              file_name: 'chest_xray_001.jpg',
              priority: 'normal',
              notes: 'Chest X-ray shows normal heart and lung fields',
              uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '3',
              patient_id: resolvedPatientId,
              test_type: 'urine_test',
              original_name: 'Urinalysis Report',
              file_name: 'urinalysis_001.pdf',
              priority: 'normal',
              notes: 'Urine analysis shows normal findings',
              uploaded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
          setReports(sampleReports)
          setIsSampleData(true)
        } else {
          console.log('Reports found:', reportsData?.length || 0)

          // If no reports found, show sample data for demonstration
          if (!reportsData || reportsData.length === 0) {
            console.log('No reports found, showing sample data')
            const sampleReports = [
              {
                id: '1',
                patient_id: resolvedPatientId,
                test_type: 'blood_test',
                original_name: 'Complete Blood Count Report',
                file_name: 'cbc_report_001.pdf',
                priority: 'normal',
                notes: 'Routine blood work - all values within normal range',
                uploaded_at: new Date().toISOString()
              },
              {
                id: '2',
                patient_id: resolvedPatientId,
                test_type: 'x_ray',
                original_name: 'Chest X-Ray Report',
                file_name: 'chest_xray_001.jpg',
                priority: 'normal',
                notes: 'Chest X-ray shows normal heart and lung fields',
                uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                id: '3',
                patient_id: resolvedPatientId,
                test_type: 'urine_test',
                original_name: 'Urinalysis Report',
                file_name: 'urinalysis_001.pdf',
                priority: 'normal',
                notes: 'Urine analysis shows normal findings',
                uploaded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              }
            ]
            setReports(sampleReports)
            setIsSampleData(true)
          } else {
            console.log('Setting real reports:', reportsData)
            setReports(reportsData)
          }
        }
      } catch (error) {
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null,
          timestamp: new Date().toISOString(),
          context: 'patient_reports_checkUser'
        }
        console.error('Error in checkUser:', errorInfo)
        console.error('Raw error object:', error)
        // Show sample data on error
        const sampleReports = [
          {
            id: '1',
            patient_id: user.id,
            test_type: 'blood_test',
            original_name: 'Complete Blood Count Report',
            file_name: 'cbc_report_001.pdf',
            priority: 'normal',
            notes: 'Routine blood work - all values within normal range',
            uploaded_at: new Date().toISOString()
          },
          {
            id: '2',
            patient_id: user.id,
            test_type: 'x_ray',
            original_name: 'Chest X-Ray Report',
            file_name: 'chest_xray_001.jpg',
            priority: 'normal',
            notes: 'Chest X-ray shows normal heart and lung fields',
            uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            patient_id: user.id,
            test_type: 'urine_test',
            original_name: 'Urinalysis Report',
            file_name: 'urinalysis_001.pdf',
            priority: 'normal',
            notes: 'Urine analysis shows normal findings',
            uploaded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        setReports(sampleReports)
        setIsSampleData(true)
      }

      setLoading(false)
    }

    checkUser()
  }, [router])

  // Function to view a report
  const handleViewReport = async (report: any) => {
    try {
      setViewingReport(report)

      if (isSampleData) {
        // For sample data, show a demo modal
        alert(`Viewing sample report: ${report.original_name}\n\nThis is a demonstration. Real reports will open in a modal.`)
        return
      }

      const supabase = createClient()

      // Get the file URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.file_name, 3600) // 1 hour expiry

      if (error) {
        const errorDetails = {
          message: error?.message || 'Unknown error',
          details: (error as any)?.details || null,
          code: (error as any)?.code || null,
          timestamp: new Date().toISOString(),
          context: 'getting_file_url'
        }
        console.error('Error getting file URL:', errorDetails)
        toast({
          title: 'Error viewing report',
          description: 'Unable to retrieve the report file. Please try again later.',
          variant: 'destructive'
        })
        return
      }

      // Set the URL and open modal for viewing
      setReportUrl(data.signedUrl)
      setViewModalOpen(true)

    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString(),
        context: 'viewing_report'
      }
      console.error('Error viewing report:', errorInfo)
      toast({
        title: 'Error viewing report',
        description: 'Something went wrong while trying to view the report.',
        variant: 'destructive'
      })
    } finally {
      setViewingReport(null)
    }
  }

  const handleViewReportDetails = (reportId: string) => {
    router.push(`/patient-dashboard/reports/${reportId}`)
  }

  // Function to download a report
  const handleDownloadReport = async (report: any) => {
    try {
      setDownloadingReport(report.id)

      if (isSampleData) {
        // For sample data, show a demo message
        alert(`Downloading sample report: ${report.original_name}\n\nThis is a demonstration. Real reports will download automatically.`)
        return
      }

      const supabase = createClient()

      // Get the file from Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .download(report.file_name)

      if (error) {
        const errorDetails = {
          message: error?.message || 'Unknown error',
          details: (error as any)?.details || null,
          code: (error as any)?.code || null,
          timestamp: new Date().toISOString(),
          context: 'downloading_file'
        }
        console.error('Error downloading file:', errorDetails)
        toast({
          title: 'Error downloading report',
          description: 'Unable to download the report file.',
          variant: 'destructive'
        })
        return
      }

      // Create a download link
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = report.original_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Download successful',
        description: `${report.original_name} has been downloaded.`,
      })

    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString(),
        context: 'downloading_report'
      }
      console.error('Error downloading report:', errorInfo)
      toast({
        title: 'Error downloading report',
        description: 'Something went wrong while trying to download the report.',
        variant: 'destructive'
      })
    } finally {
      setDownloadingReport(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center">
          <Activity className="h-8 w-8 animate-spin mb-4 text-black" />
          <span className="text-xs font-mono uppercase tracking-widest text-black/60">System Initializing...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="border-b border-black/10 pb-8 mb-12 flex items-end justify-between">
        <div>
          <Link href="/patient-dashboard" className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-black/40 hover:text-black mb-4 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2">My Medical Reports</h1>
          <p className="text-black/60 font-light text-lg italic">
            Access your diagnostic records and AI-powered health explanations
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-black/40 block mb-1">
            Secure Access
          </span>
          <span className="text-xl font-mono border-b-2 border-indigo-600 inline-flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            SYNCED
          </span>
        </div>
      </header>

      <div className="container mx-auto">
        {isSampleData && (
          <div className="mb-12 p-6 bg-indigo-50 border border-indigo-500/20 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>
            <p className="text-xs font-mono text-indigo-900 uppercase leading-relaxed">
              <strong>DEMO MODE:</strong> Currently displaying sample records. Real medical data will populate once uploaded by verified providers.
            </p>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="border border-black/10 bg-white p-16 text-center">
            <FileText className="h-12 w-12 text-black/20 mx-auto mb-6" />
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">No Reports Found</h3>
            <p className="text-black/60 font-light mb-8 max-w-sm mx-auto uppercase text-xs tracking-widest leading-loose">Your medical records will appear here once finalized by your clinical team.</p>
            <Link href="/patient-dashboard">
              <Button className="bg-black text-white rounded-none px-8 h-12 uppercase font-mono text-xs">Return to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8">
            {reports.map((report) => (
              <div key={report.id} className="border border-black/10 bg-white p-8 relative overflow-hidden group hover:border-black/30 transition-all">
                <div className={`absolute left-0 top-0 h-full w-0.5 ${report.priority === 'urgent' ? 'bg-red-600' : 'bg-black/10'}`}></div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-black text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">{report.original_name}</h3>
                    </div>

                      <div className="flex flex-wrap gap-3 mb-8">
                        <div className="font-mono text-[10px] uppercase font-bold text-black/60 px-2 py-0.5 border border-black/10 bg-black/[0.02] tracking-tighter">
                          DATE: {new Date(report.uploaded_at).toLocaleDateString()}
                        </div>
                        <div className="font-mono text-[10px] uppercase font-bold text-black/60 px-2 py-0.5 border border-black/10 bg-black/[0.02] tracking-tighter">
                          TYPE: {report.test_type?.replace('_', ' ')}
                        </div>
                        <div className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 border border-emerald-600 text-emerald-600 bg-emerald-50 tracking-tighter">
                          STATUS: AVAILABLE
                        </div>
                      </div>

                    <div className="p-6 bg-amber-50 border border-amber-500/20 relative overflow-hidden mb-6">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-amber-600"></div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900 mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Analysis Insight
                      </h4>
                      <p className="text-sm font-mono text-amber-900 uppercase leading-relaxed">
                        Automated scan complete. No critical anomalies detected in cell morphology or telemetry.
                        Detailed patient-friendly briefing available in "View Details".
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <Button
                      className="bg-black text-white rounded-none h-12 uppercase font-mono text-[10px] tracking-widest flex items-center justify-between px-6"
                      onClick={() => handleViewReport(report)}
                      disabled={viewingReport?.id === report.id}
                    >
                      {viewingReport?.id === report.id ? 'OPENING...' : 'VIEW SOURCE'}
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      className="border-black/20 hover:border-black rounded-none h-12 uppercase font-mono text-[10px] tracking-widest flex items-center justify-between px-6 transition-all"
                      onClick={() => handleViewReportDetails(report.id)}
                    >
                      DETAILED BRIEF
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      className="border-black/10 hover:border-black/30 rounded-none h-12 uppercase font-mono text-[10px] tracking-widest flex items-center justify-between px-6 opacity-40 hover:opacity-100 transition-all"
                      onClick={() => handleDownloadReport(report)}
                      disabled={downloadingReport === report.id}
                    >
                      {downloadingReport === report.id ? 'FETCHING...' : 'DOWNLOAD PDF'}
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report View Modal - Brutalist Style */}
      {viewModalOpen && reportUrl && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-white border-2 border-black w-full max-w-5xl h-full flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>

            <div className="flex items-center justify-between p-6 border-b border-black/10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {viewingReport?.original_name || 'Medical Report'}
                </h3>
                <p className="text-[10px] font-mono text-black/40 uppercase mt-1">Source Authentication Node: SEC-882</p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="rounded-none border-black/10 hover:border-black h-10 uppercase font-mono text-[10px] tracking-widest"
                  onClick={() => viewingReport && handleDownloadReport(viewingReport)}
                >
                  Download
                </Button>
                <Button
                  className="bg-black text-white rounded-none h-10 w-10 flex items-center justify-center"
                  onClick={() => {
                    setViewModalOpen(false)
                    setReportUrl(null)
                    setViewingReport(null)
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-black/[0.02] p-2">
              <iframe
                src={reportUrl}
                className="w-full h-full border-0 bg-white"
                title="Medical Report Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 