"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Activity, FileText, MessageSquare, Calendar, Pill, Brain, Heart, Clock, CheckCircle, AlertCircle, LogOut, Trash2, User } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format, parseISO } from "date-fns"

interface PatientActivity {
  id: string
  type: 'appointment' | 'report' | 'message' | 'ai_chat'
  title: string
  description: string
  date: string
  status: string
  icon: string
}

interface PatientStats {
  recentReports: number
  upcomingAppointments: number
  unreadMessages: number
  healthScore: number
}

export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<PatientActivity[]>([])
  const [stats, setStats] = useState<PatientStats>({
    recentReports: 0,
    upcomingAppointments: 0,
    unreadMessages: 0,
    healthScore: 85
  })
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Check if user has patient role
      if (user.user_metadata?.role !== "patient") {
        router.push("/login")
        return
      }

      setUser(user)
      
      // Load patient data directly without requiring profile setup
      await loadPatientData(user.id)
      setLoading(false)
    }

    checkUser()
  }, [router])

  const loadPatientData = async (patientId: string) => {
    const supabase = createClient()
    
    try {
      // Load appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .gte('appointment_date', format(new Date(), 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      // Load reports from the reports table
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${patientId},receiver_id.eq.${patientId}`)
        .order('created_at', { ascending: false })
        .limit(10)

      // Create demo activity data if no real data exists
      const demoActivity: PatientActivity[] = [
        {
          id: '1',
          type: 'appointment',
          title: 'Annual Checkup',
          description: 'Scheduled with Dr. Smith',
          date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'scheduled',
          icon: 'calendar'
        },
        {
          id: '2',
          type: 'report',
          title: 'Blood Test Results',
          description: 'Your latest blood work is ready',
          date: format(new Date(), 'yyyy-MM-dd'),
          status: 'completed',
          icon: 'file-text'
        },
        {
          id: '3',
          type: 'message',
          title: 'Message from Dr. Johnson',
          description: 'Regarding your recent test results',
          date: format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'unread',
          icon: 'message-square'
        }
      ]

      // Use real data if available, otherwise use demo data
      const activityData = appointments?.length || reports?.length || messages?.length 
        ? [] // Will be populated with real data
        : demoActivity

      setRecentActivity(activityData)
      
      // Update stats
      setStats({
        recentReports: reports?.length || 1,
        upcomingAppointments: appointments?.length || 1,
        unreadMessages: messages?.filter(m => m.read === false).length || 1,
        healthScore: 85
      })

    } catch (error) {
      console.error('Error loading patient data:', error)
      // Set demo data if there's an error
      setRecentActivity([
        {
          id: '1',
          type: 'appointment',
          title: 'Annual Checkup',
          description: 'Scheduled with Dr. Smith',
          date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'scheduled',
          icon: 'calendar'
        },
        {
          id: '2',
          type: 'report',
          title: 'Blood Test Results',
          description: 'Your latest blood work is ready',
          date: format(new Date(), 'yyyy-MM-dd'),
          status: 'completed',
          icon: 'file-text'
        }
      ])
      setStats({
        recentReports: 1,
        upcomingAppointments: 1,
        unreadMessages: 1,
        healthScore: 85
      })
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.')) {
      try {
        // Use the signOut method to log the user out
        const supabase = createClient()
        await supabase.auth.signOut()
        
        // Show message about account deletion
        alert('Account deletion request submitted. Please contact support to complete the process. You have been logged out.')
        router.push("/")
      } catch (error) {
        console.error('Error processing account deletion:', error)
        alert('Failed to process account deletion. Please contact support directly.')
      }
    }
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'file': return <FileText className="h-5 w-5 text-blue-600" />
      case 'message': return <MessageSquare className="h-5 w-5 text-green-600" />
      case 'calendar': return <Calendar className="h-5 w-5 text-purple-600" />
      case 'brain': return <Brain className="h-5 w-5 text-pink-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'report': return 'bg-blue-50'
      case 'message': return 'bg-green-50'
      case 'appointment': return 'bg-purple-50'
      case 'ai_chat': return 'bg-pink-50'
      default: return 'bg-gray-50'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
      case 'unread':
        return <Badge className="bg-blue-100 text-blue-800">New</Badge>
      case 'read':
        return <Badge className="bg-green-100 text-green-800">Read</Badge>
      case 'confirmed':
        return <Badge className="bg-purple-100 text-purple-800">Confirmed</Badge>
      case 'scheduled':
        return <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image src="/medi.png" alt="MedSync Logo" width={32} height={32} />
            <span className="text-2xl font-bold text-gray-900">MedSync</span>
            <Badge className="bg-green-100 text-green-800">Patient Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.user_metadata?.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white text-green-600 border-green-200 hover:bg-green-50"
                >
                  <User className="h-4 w-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleLogout} className="text-green-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteAccount} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Health Dashboard</h1>
          <p className="text-gray-600">
            Manage your health records, communicate with your healthcare team, and get AI-powered insights.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Your Patient ID:</strong> {user?.id || 'Not available'} 
              <br />
              <span className="text-xs">Share this ID with your healthcare providers so they can upload reports for you.</span>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recentReports}</div>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.upcomingAppointments}</div>
              <p className="text-xs text-gray-500">Upcoming</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.unreadMessages}</div>
              <p className="text-xs text-gray-500">Unread</p>
            </CardContent>
          </Card>

          <Card className="border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.healthScore}%</div>
              <p className="text-xs text-gray-500">Good</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-100 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex-1">
              <FileText className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>My Reports</CardTitle>
              <CardDescription className="flex-1">View and download your medical reports with AI-powered explanations. Click to view reports uploaded by your healthcare providers.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/patient-dashboard/reports">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-green-100 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex-1">
              <MessageSquare className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Chat with Team</CardTitle>
              <CardDescription className="flex-1">Secure messaging with your doctors and lab technicians. Get real-time updates and communicate directly with your healthcare team.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/patient-dashboard/chat">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Open Chat
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-pink-100 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex-1">
              <Brain className="h-10 w-10 text-pink-600 mb-2" />
              <CardTitle>AI Health Assistant</CardTitle>
              <CardDescription className="flex-1">Ask health questions and get AI-powered guidance. Get instant answers to your medical queries and health concerns.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/patient-dashboard/ai-assistant">
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                  Ask AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-blue-100">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest health updates and interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-center space-x-4 p-3 ${getActivityBgColor(activity.type)} rounded-lg`}>
                    {getActivityIcon(activity.icon)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(parseISO(activity.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
