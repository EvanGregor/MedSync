"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, FileText, MessageSquare, Calendar, Brain, Heart, Video, ArrowRight, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import Sidebar from "@/components/medical/navigation/Sidebar"
import StatusBadge from "@/components/medical/common/StatusBadge"

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
  const [shortId, setShortId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<PatientActivity[]>([])
  const [stats, setStats] = useState<PatientStats>({
    recentReports: 0,
    upcomingAppointments: 0,
    unreadMessages: 0,
    healthScore: 85
  })
  const router = useRouter()
  const loadingRef = useRef(false)

  useEffect(() => {
    const checkUser = async () => {
      if (loadingRef.current) return
      loadingRef.current = true

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.user_metadata?.role !== "patient") {
        router.push("/login")
        return
      }

      setUser(user)

      try {
        let resolvedShortId: string | null = null
        const { data: userRow } = await supabase.from('users').select('short_id').eq('auth_id', user.id).maybeSingle()
        resolvedShortId = userRow?.short_id || null

        if (!resolvedShortId) {
          const { data: shortRow } = await supabase.from('user_short_ids').select('short_id').eq('user_id', user.id).maybeSingle()
          resolvedShortId = shortRow?.short_id || null
        }
        setShortId(resolvedShortId)
      } catch (e) {
        console.warn('Failed to load short ID for patient:', e)
      }

      await loadPatientData(user.id)
      setLoading(false)
      loadingRef.current = false
    }

    checkUser()
  }, [])

  const loadPatientData = async (patientId: string) => {
    const supabase = createClient()

    try {
      // First, try to get the patient's record from the patients table
      let actualPatientId = patientId
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (patientData) {
        actualPatientId = patientData.id
        console.log('✅ Found patient record:', patientData)
      } else {
        console.log('⚠️ No patient record found for user_id:', patientId, 'using user_id directly')
      }

      // Query appointments using both the patient record ID and the auth user ID
      // This handles both cases where doctor uses patient table ID or auth user ID
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${actualPatientId},patient_id.eq.${patientId}`)
        .gte('appointment_date', format(new Date(), 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })

      console.log('📅 Found appointments for patient:', appointments?.length || 0)

      const { data: reports } = await supabase
        .from('reports')
        .select('*')
        .or(`patient_id.eq.${actualPatientId},patient_id.eq.${patientId}`)
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${patientId},receiver_id.eq.${patientId}`)
        .order('created_at', { ascending: false })
        .limit(10)

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
        }
      ]

      // Map real appointments to activity
      const appointmentActivities: PatientActivity[] = (appointments || []).map(apt => ({
        id: apt.id,
        type: 'appointment' as const,
        title: apt.appointment_type || 'Consultation',
        description: `Scheduled with ${apt.doctor_name || 'Doctor'}`,
        date: apt.appointment_date,
        status: apt.status || 'scheduled',
        icon: 'calendar'
      }))

      const activityData = appointmentActivities.length > 0 ? appointmentActivities : demoActivity

      setRecentActivity(activityData)

      setStats({
        recentReports: reports?.length || 1,
        upcomingAppointments: appointments?.length || 1,
        unreadMessages: messages?.filter(m => m.read === false).length || 1,
        healthScore: 85 // Mock health score
      })

    } catch (error) {
      console.error('Error loading patient data:', error)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'file-text': return <FileText className="h-4 w-4" />
      case 'message': return <MessageSquare className="h-4 w-4" />
      case 'calendar': return <Calendar className="h-4 w-4" />
      case 'brain': return <Brain className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center">
          <Activity className="h-8 w-8 animate-spin mb-4" />
          <span className="text-xs font-mono uppercase tracking-widest text-black/60">Loading Dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar userRole="patient" userName={user?.user_metadata?.name} onLogout={handleLogout} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-12">
          {/* Header */}
          <div className="mb-12 border-b border-black/10 pb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">
                  System Online
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                HELLO, {user?.user_metadata?.name?.split(' ')[0].toUpperCase() || 'PATIENT'}
              </h1>
              <p className="text-black/60 font-light text-lg">
                Personal Health Command Center
              </p>
            </div>
            {shortId && (
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40 block mb-1">
                  Patient ID
                </span>
                <span className="text-xl font-mono border-b border-black">
                  {shortId}
                </span>
              </div>
            )}
          </div>

          {/* Stats Grid - "Deconstructed" */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border border-black/10 mb-16">
            <div className="bg-white p-6 hover:bg-black/[0.02] transition-colors group cursor-pointer relative" onClick={() => router.push('/patient-dashboard/reports')}>
              <div className="flex justify-between items-start mb-4">
                <FileText className="h-5 w-5 text-black/40 group-hover:text-black transition-colors" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">01</span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.recentReports}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-black/60">Medical Reports</div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
            </div>

            <div className="bg-white p-6 hover:bg-black/[0.02] transition-colors group cursor-pointer relative" onClick={() => router.push('/patient-dashboard/video-consultations')}>
              <div className="flex justify-between items-start mb-4">
                <Calendar className="h-5 w-5 text-black/40 group-hover:text-black transition-colors" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">02</span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.upcomingAppointments}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-black/60">Upcoming Visits</div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-600"></div>
            </div>

            <div className="bg-white p-6 hover:bg-black/[0.02] transition-colors group cursor-pointer relative" onClick={() => router.push('/patient-dashboard/chat')}>
              <div className="flex justify-between items-start mb-4">
                <MessageSquare className="h-5 w-5 text-black/40 group-hover:text-black transition-colors" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">03</span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.unreadMessages}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-black/60">Unread Messages</div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900"></div>
            </div>

            <div className="bg-white p-6 hover:bg-black/[0.02] transition-colors group cursor-pointer relative">
              <div className="flex justify-between items-start mb-4">
                <Heart className="h-5 w-5 text-black/40 group-hover:text-black transition-colors" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">04</span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.healthScore}%</div>
              <div className="text-xs font-mono uppercase tracking-wider text-black/60">Health Score</div>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>
            </div>
          </div>

          {/* Main Content Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Column 1 & 2: Featured + Actions */}
            <div className="lg:col-span-2 space-y-12">

              {/* AI Assistant Banner */}
              <div className="border border-black p-1 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-600 z-20"></div>
                <div className="bg-black text-white p-8 lg:p-12 relative z-10 transition-transform duration-500 group-hover:scale-[0.99]">
                  <div className="absolute top-4 right-4 text-xs font-mono border border-white/20 px-2 py-1">
                    AI ENABLED
                  </div>
                  <Brain className="h-12 w-12 mb-6" />
                  <h2 className="text-3xl font-bold mb-4">Personal Health Assistant</h2>
                  <p className="text-white/60 max-w-lg mb-8 font-light">
                    Get instant answers about your health, understand your reports, and receive personalized guidance.
                  </p>
                  <Button
                    onClick={() => router.push('/patient-dashboard/ai-assistant')}
                    className="bg-white text-black hover:bg-white/90 rounded-none h-12 px-8 font-mono uppercase tracking-widest text-xs flex items-center space-x-4"
                  >
                    <span>Start Chat</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Activity Table */}
              <div>
                <div className="flex items-center justify-between mb-6 border-b border-black/10 pb-2">
                  <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
                  <Link href="/patient-dashboard/reports" className="text-xs font-mono uppercase tracking-widest border-b border-black hover:pb-0.5 transition-all">
                    View History
                  </Link>
                </div>

                <div className="border-t border-black/10">
                  {recentActivity.map((activity) => (
                    <div key={activity.id}
                      className="flex items-center justify-between py-4 border-b border-black/10 group hover:bg-black/[0.02] cursor-pointer transition-colors px-2">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-black/5">
                          {getActivityIcon(activity.icon)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="font-bold">{activity.title}</span>
                            <StatusBadge status={activity.status as any} size="sm" />
                          </div>
                          <span className="text-sm text-black/50">{activity.description}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-black/40 block mb-1">
                          {format(parseISO(activity.date), 'MMM dd')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="py-8 text-center text-black/40 font-mono text-xs uppercase">
                      No recent activity recorded.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Column 3: Telehealth & Quick Actions */}
            <div className="space-y-12">
              {/* Telehealth Card */}
              <div className="border border-black/10 p-6 bg-white">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">
                    Telehealth
                  </span>
                  <Video className="h-4 w-4 text-black/40" />
                </div>
                <h3 className="text-xl font-bold mb-2">Video Consultations</h3>
                <p className="text-sm text-black/60 mb-6 font-light">
                  Connect with your doctors remotely from the comfort of your home.
                </p>
                <Button
                  onClick={() => router.push('/patient-dashboard/video-consultations')}
                  className="w-full bg-black text-white rounded-none h-12 font-mono uppercase tracking-widest text-xs flex items-center justify-between px-4 group"
                >
                  <span>Join Session</span>
                  <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Quick Actions List */}
              <div className="border border-black/10 p-6 bg-white">
                <div className="mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-black/40">
                    Quick Access
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'My Reports', href: '/patient-dashboard/reports', icon: FileText },
                    { label: 'Messages', href: '/patient-dashboard/chat', icon: MessageSquare },
                    { label: 'Appointments', href: '/patient-dashboard/video-consultations', icon: Calendar },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className="w-full flex items-center justify-between p-4 border border-transparent hover:border-black/10 hover:bg-black/[0.02] transition-all group text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <action.icon className="h-4 w-4 text-black/40 group-hover:text-black" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}