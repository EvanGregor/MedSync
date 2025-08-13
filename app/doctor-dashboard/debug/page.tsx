"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, FileText, AlertTriangle, CheckCircle, X } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || user.user_metadata?.role !== "doctor") {
        router.push("/login")
        return
      }
      
      setUser(user)
      console.log('Debug: User loaded:', user.email)
      
      // Test database connection
      try {
        console.log('Debug: Testing database connection...')
        const { data: reportsData, error } = await supabase
          .from('reports')
          .select('*')
          .limit(5)
        
        if (error) {
          console.error('Debug: Database error:', error)
          setError(`Database error: ${error.message}`)
        } else {
          console.log('Debug: Reports from database:', reportsData?.length || 0)
          setReports(reportsData || [])
        }
      } catch (err) {
        console.error('Debug: Exception:', err)
        setError(`Exception: ${err}`)
      }
      
      setLoading(false)
    }
    
    checkUser()
  }, [router])

  const loadDemoReports = () => {
    console.log('Debug: Loading demo reports...')
    const demoReports = [
      {
        id: 'demo-report-1',
        patient_id: '38',
        test_type: 'chest_xray',
        original_name: 'chest_xray_patient_38.jpg',
        file_name: 'demo-chest-xray-1.jpg',
        uploaded_at: new Date().toISOString(),
        priority: 'urgent',
        user_name: 'John Doe'
      }
    ]
    setReports(demoReports)
    setError(null)
  }

  const testNavigation = (reportId: string) => {
    console.log('Debug: Testing navigation to:', reportId)
    router.push(`/doctor-dashboard/reports/${reportId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading debug information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug Information</h1>
          <p className="text-gray-600">Troubleshooting the reports loading issue</p>
        </div>

        {/* User Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Role</p>
                <p className="text-sm text-gray-600">{user?.user_metadata?.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Reports in Database:</span>
                <Badge className={reports.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {reports.length} reports
                </Badge>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">Error:</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button onClick={loadDemoReports} variant="outline">
                  Load Demo Reports
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reports found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{report.test_type}</p>
                        <p className="text-sm text-gray-600">ID: {report.id}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => testNavigation(report.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Test Navigation
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Test */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Navigation Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test if the report detail page exists and works correctly.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => testNavigation('demo-report-1')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Test: demo-report-1
                </Button>
                <Button
                  onClick={() => testNavigation('non-existent-report')}
                  variant="outline"
                >
                  Test: Non-existent Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Reports */}
        <div className="flex justify-center">
          <Link href="/doctor-dashboard/reports">
            <Button>
              Back to Reports Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 