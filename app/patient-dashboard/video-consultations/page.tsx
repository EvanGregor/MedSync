"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Users, Video, Phone, MessageSquare, Calendar, Clock, User, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import ZoomVideoCall from "@/components/zoom-video-call"

interface Consultation {
  id: string
  doctor_name: string
  doctor_id: string
  patient_name: string
  patient_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  consultation_type: 'video' | 'audio' | 'chat'
  notes?: string
  symptoms?: string
  diagnosis?: string
  prescription?: string
}

interface User {
  id: string
  user_metadata?: {
    role?: string
    name?: string
  }
}

export default function PatientVideoConsultationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false)
  const [selectedConsultationForCall, setSelectedConsultationForCall] = useState<Consultation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const router = useRouter()
  const loadingRef = useRef(false)

  useEffect(() => {
    const checkUser = async () => {
      if (loadingRef.current) {
        console.log('🔄 Already loading, skipping...')
        return
      }

      loadingRef.current = true
      setLoading(true)

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        if (user.user_metadata?.role !== "patient") {
          router.push("/login")
          return
        }

        setUser(user)
        await loadConsultations(user.id)
      } catch (error) {
        console.error('❌ Error in checkUser:', error)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    checkUser()
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && !loading) {
        console.log('🔄 Page focused - refreshing consultations')
        loadConsultations(user.id)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, loading])

  const loadConsultations = async (patientId: string) => {
    const supabase = createClient()

    try {
      console.log('🔍 Loading consultations for patient ID:', patientId)
      setIsLoading(true)
      setLoadError(null)

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

      // Load today's and upcoming consultations (including confirmed appointments)
      const today = format(new Date(), 'yyyy-MM-dd')
      console.log('🔍 Loading appointments for patient:', actualPatientId, 'from date:', today)

      // Query using both patient record ID and auth user ID to handle both cases
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${actualPatientId},patient_id.eq.${patientId}`)
        .gte('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'in-progress', 'completed'])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      console.log('🔍 Appointments query result:', { appointments, error })

      if (error) {
        console.error('❌ Error loading consultations:', error)
        setConsultations([])
        setLoadError(`Failed to load consultations: ${error.message}`)
        return
      }

      if (appointments && appointments.length > 0) {
        console.log('✅ Found', appointments.length, 'appointments')
        const consultationsData: Consultation[] = appointments.map(apt => ({
          id: apt.id,
          doctor_name: apt.doctor_name || 'Dr. Unknown',
          doctor_id: apt.doctor_id,
          patient_name: apt.patient_name || 'Unknown Patient',
          patient_id: apt.patient_id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status === 'confirmed' ? 'scheduled' : (apt.status || 'scheduled'),
          consultation_type: apt.consultation_type || 'video',
          notes: apt.notes,
          symptoms: apt.symptoms,
          diagnosis: apt.diagnosis,
          prescription: apt.prescription
        }))
        setConsultations(consultationsData)
      } else {
        console.log('ℹ️ No appointments found for patient', actualPatientId)
        setConsultations([])
      }
    } catch (error) {
      console.error('❌ Error loading consultations:', error)
      setConsultations([])
      setLoadError('Unexpected error while loading consultations.')
    } finally {
      setIsLoading(false)
    }
  }

  const startVideoCall = (consultation: Consultation) => {
    setSelectedConsultationForCall(consultation)
    setIsVideoCallOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
      case 'in-progress': return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'cancelled': return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5 text-blue-600" />
      case 'audio': return <Phone className="h-5 w-5 text-green-600" />
      case 'chat': return <MessageSquare className="h-5 w-5 text-purple-600" />
      default: return <Video className="h-5 w-5 text-gray-600" />
    }
  }

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video Call'
      case 'audio': return 'Audio Call'
      case 'chat': return 'Chat'
      default: return 'Video Call'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center">
          <Activity className="h-8 w-8 animate-spin mb-4 text-black" />
          <span className="text-xs font-mono uppercase tracking-widest text-black/60">Establishing Secure Uplink...</span>
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
            <span>Portal Exit</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2">Video Consultations</h1>
          <p className="text-black/60 font-light text-lg italic">
            Virtual clinical encounters and synchronous healthcare support
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-black/40 block mb-1">
            Network Integrity
          </span>
          <span className="text-xl font-mono border-b-2 border-cyan-600 inline-flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            LATENCY: 12MS
          </span>
        </div>
      </header>

      <div className="container mx-auto">
        {/* Quick Stats - Brutalist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-black/10 border border-black/10 mb-12">
          {[
            { label: "Today's Visits", val: consultations.filter(c => c.appointment_date === format(new Date(), 'yyyy-MM-dd')).length, color: 'bg-cyan-600' },
            { label: "Upcoming", val: consultations.filter(c => c.appointment_date > format(new Date(), 'yyyy-MM-dd')).length, color: 'bg-indigo-600' },
            { label: "Finalized", val: consultations.filter(c => c.status === 'completed').length, color: 'bg-slate-900' },
            { label: "Total Syncs", val: consultations.length, color: 'bg-slate-900' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 w-full h-0.5 ${stat.color}`}></div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-black/40 mb-2">{stat.label}</p>
              <div className="text-3xl font-black">{stat.val}</div>
            </div>
          ))}
        </div>

        {/* List Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black uppercase tracking-tighter">Scheduled Encounters</h2>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="rounded-none border-black/10 hover:border-black h-10 uppercase font-mono text-[10px] tracking-widest px-6"
              onClick={() => loadConsultations(user?.id || '')}
              disabled={isLoading}
            >
              <Activity className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Node
            </Button>
          </div>
        </div>

        {/* Consultations Feed */}
        <div className="space-y-6">
          {loadError && (
            <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-mono">
              {loadError}
            </div>
          )}
          {consultations.length > 0 ? (
            consultations.map((consultation) => (
              <div
                key={consultation.id}
                className="group border border-black/10 bg-white p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all hover:border-black/30"
              >
                <div className={`absolute left-0 top-0 h-full w-0.5 ${consultation.status === 'scheduled' ? 'bg-cyan-600' : 'bg-black/10'}`}></div>

                <div className="flex items-center gap-6">
                  <div className="p-4 bg-black text-white">
                    <Video className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">{consultation.doctor_name}</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-black/40 mt-1">
                      {getConsultationTypeLabel(consultation.consultation_type)} • SYMPTOMS: {consultation.symptoms || 'NOT SPECIFIED'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="text-left md:text-right">
                    <p className="text-sm font-bold uppercase tracking-tight">
                      {format(parseISO(consultation.appointment_date), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">
                      {consultation.start_time} — {consultation.end_time} PST
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border tracking-tighter ${
                      consultation.status === 'scheduled' ? 'border-cyan-600 text-cyan-600 bg-cyan-50' :
                      consultation.status === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50' :
                      consultation.status === 'in-progress' ? 'border-amber-600 text-amber-600 bg-amber-50' :
                      'border-black/20 text-black/40 bg-black/[0.02]'
                    }`}>
                      {consultation.status}
                    </span>

                    <div className="flex gap-2">
                      {consultation.status === 'scheduled' && (
                        <Button
                          className="bg-black text-white rounded-none h-12 px-8 uppercase font-mono text-[10px] tracking-widest hover:bg-cyan-600 transition-colors"
                          onClick={() => startVideoCall(consultation)}
                        >
                          Establish Link
                        </Button>
                      )}
                      {consultation.status === 'in-progress' && (
                        <Button
                          className="bg-cyan-600 text-white rounded-none h-12 px-8 uppercase font-mono text-[10px] tracking-widest"
                          onClick={() => startVideoCall(consultation)}
                        >
                          Reconnect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-black/10 bg-white p-24 text-center">
              <Users className="h-12 w-12 text-black/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">No Active Links</h3>
              <p className="text-black/60 font-light max-w-sm mx-auto uppercase text-xs tracking-widest leading-loose">
                You have no scheduled consultations. Contact your primary care node to request a session.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Component */}
      {selectedConsultationForCall && (
        <ZoomVideoCall
          isOpen={isVideoCallOpen}
          onClose={() => {
            setIsVideoCallOpen(false)
            setSelectedConsultationForCall(null)
          }}
          consultation={selectedConsultationForCall}
          userRole="patient"
        />
      )}
    </div>
  )
}
