"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Camera, ArrowLeft, Plus, Search, Filter, Clock, CheckCircle, AlertTriangle, Upload, Eye, X } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

interface ImagingStudy {
  id: string
  patient_id: string
  patient_name: string
  study_type: string
  body_part: string
  scheduled_date: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'urgent'
  priority: 'low' | 'normal' | 'high' | 'critical'
  radiologist?: string
  notes?: string
  image_count?: number
}

export default function LabImagingPage() {
  const [user, setUser] = useState<any>(null)
  const [studies, setStudies] = useState<ImagingStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    patient_id: "",
    patient_name: "",
    study_type: "",
    body_part: "",
    scheduled_date: "",
    priority: "normal",
    radiologist: "",
    notes: ""
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.user_metadata?.role !== "lab") {
        router.push("/login")
        return
      }

      setUser(user)
      loadImagingStudies()
      setLoading(false)
    }

    checkUser()
  }, [router])

  const loadImagingStudies = async () => {
    // Mock data for demonstration
    const mockStudies: ImagingStudy[] = [
      {
        id: "1",
        patient_id: "P001",
        patient_name: "John Smith",
        study_type: "X-Ray",
        body_part: "Chest",
        scheduled_date: "2024-01-15T09:00:00Z",
        status: "scheduled",
        priority: "normal",
        radiologist: "Dr. Sarah Wilson",
        notes: "Routine chest X-ray",
        image_count: 2
      },
      {
        id: "2",
        patient_id: "P002",
        patient_name: "Sarah Johnson",
        study_type: "CT Scan",
        body_part: "Head",
        scheduled_date: "2024-01-15T10:30:00Z",
        status: "in_progress",
        priority: "high",
        radiologist: "Dr. Michael Brown",
        notes: "Trauma evaluation",
        image_count: 45
      },
      {
        id: "3",
        patient_id: "P003",
        patient_name: "Michael Brown",
        study_type: "MRI",
        body_part: "Spine",
        scheduled_date: "2024-01-15T08:15:00Z",
        status: "completed",
        priority: "normal",
        radiologist: "Dr. Emily Davis",
        notes: "Back pain evaluation",
        image_count: 120
      },
      {
        id: "4",
        patient_id: "P004",
        patient_name: "Emily Davis",
        study_type: "Ultrasound",
        body_part: "Abdomen",
        scheduled_date: "2024-01-15T11:45:00Z",
        status: "urgent",
        priority: "critical",
        radiologist: "Dr. David Wilson",
        notes: "Emergency abdominal pain",
        image_count: 15
      },
      {
        id: "5",
        patient_id: "P005",
        patient_name: "David Wilson",
        study_type: "Mammogram",
        body_part: "Breast",
        scheduled_date: "2024-01-15T07:30:00Z",
        status: "completed",
        priority: "normal",
        radiologist: "Dr. Lisa Anderson",
        notes: "Screening mammogram",
        image_count: 4
      }
    ]

    setStudies(mockStudies)
  }

  const handleScheduleStudy = () => {
    setShowScheduleModal(true)
  }

  const handleSubmitScheduleStudy = () => {
    console.log("handleSubmitScheduleStudy called")
    console.log("Form data:", scheduleForm)

    if (!scheduleForm.patient_id || !scheduleForm.patient_name || !scheduleForm.study_type || !scheduleForm.body_part || !scheduleForm.scheduled_date) {
      console.log("Validation failed - missing required fields")
      console.log("patient_id:", scheduleForm.patient_id)
      console.log("patient_name:", scheduleForm.patient_name)
      console.log("study_type:", scheduleForm.study_type)
      console.log("body_part:", scheduleForm.body_part)
      console.log("scheduled_date:", scheduleForm.scheduled_date)
      alert("Please fill in all required fields")
      return
    }

    console.log("Creating new study...")
    const newStudy: ImagingStudy = {
      id: (studies.length + 1).toString(),
      patient_id: scheduleForm.patient_id,
      patient_name: scheduleForm.patient_name,
      study_type: scheduleForm.study_type,
      body_part: scheduleForm.body_part,
      scheduled_date: scheduleForm.scheduled_date,
      status: "scheduled",
      priority: scheduleForm.priority as 'low' | 'normal' | 'high' | 'critical',
      radiologist: scheduleForm.radiologist || undefined,
      notes: scheduleForm.notes || undefined
    }

    console.log("New study:", newStudy)
    setStudies([...studies, newStudy])
    setShowScheduleModal(false)
    setScheduleForm({
      patient_id: "",
      patient_name: "",
      study_type: "",
      body_part: "",
      scheduled_date: "",
      priority: "normal",
      radiologist: "",
      notes: ""
    })
    console.log("Study scheduled successfully!")
  }

  const handleViewStudy = (study: ImagingStudy) => {
    setSelectedStudy(study)
    setShowViewModal(true)
  }

  const handleUploadImages = (study: ImagingStudy) => {
    setSelectedStudy(study)
    setShowUploadModal(true)
  }

  const handleStatusUpdate = (studyId: string, newStatus: 'scheduled' | 'in_progress' | 'completed' | 'urgent') => {
    setStudies(studies.map(study =>
      study.id === studyId ? { ...study, status: newStatus } : study
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />
      case 'in_progress': return <Activity className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'urgent': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredStudies = studies.filter(study => {
    const matchesSearch = study.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.study_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || study.status === statusFilter
    const matchesType = typeFilter === "all" || study.study_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center">
          <Activity className="h-8 w-8 animate-spin mb-4 text-black" />
          <span className="text-xs font-mono uppercase tracking-widest text-black/60">Establishing Imaging Link...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="border-b border-black/10 pb-8 mb-12 flex items-end justify-between">
        <div>
          <Link href="/lab-dashboard" className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-black/40 hover:text-black mb-4 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            <span>Return to Node</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight uppercase mb-2">Imaging Center</h1>
          <p className="text-black/60 font-light text-lg italic">
            Telemetry capture and visualization systems
          </p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-black/40 block mb-1">
            System Hash
          </span>
          <span className="text-xl font-mono border-b-2 border-indigo-600">
            IMAGING_V1.0
          </span>
        </div>
      </header>

      {/* Quick Stats Grid - Superflat */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border border-black/10 mb-16">
        {[
          { label: 'Scheduled Today', count: studies.filter(s => s.status === 'scheduled').length, accent: 'bg-indigo-600', sub: 'Awaiting Capture' },
          { label: 'In Progress', count: studies.filter(s => s.status === 'in_progress').length, accent: 'bg-amber-600', sub: 'Active Scan' },
          { label: 'Urgent Studies', count: studies.filter(s => s.status === 'urgent' || s.priority === 'critical').length, accent: 'bg-red-600', sub: 'Priority Sequence' },
          { label: 'Completed Today', count: studies.filter(s => s.status === 'completed').length, accent: 'bg-emerald-600', sub: 'Post-Process' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 relative overflow-hidden group">
            <div className={`absolute left-0 top-0 h-full w-0.5 ${stat.accent}`}></div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-black/40 mb-4">{stat.label}</div>
            <div className="text-4xl font-black tracking-tighter mb-1">{stat.count}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-black/20 italic">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search - Brutalist */}
      <div className="border border-black/10 bg-white p-10 relative mb-12">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-600"></div>
        <div className="flex items-center justify-between mb-8 border-b border-black/10 pb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Filter className="h-5 w-5" />
            Uplink Filters
          </h3>
          <Button
            className="bg-black text-white rounded-none hover:bg-indigo-600 h-10 px-6 font-mono text-[10px] uppercase tracking-widest transition-all"
            onClick={handleScheduleStudy}
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Study
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20" />
            <Input
              placeholder="SEARCH BY PATIENT / TYPE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-none border-black h-12 font-mono text-xs uppercase focus-visible:ring-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-none border-black h-12 font-mono text-xs uppercase focus:ring-0">
              <SelectValue placeholder="FILTER BY STATUS" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-black">
              <SelectItem value="all">ALL STATUSES</SelectItem>
              <SelectItem value="scheduled">SCHEDULED</SelectItem>
              <SelectItem value="in_progress">IN PROGRESS</SelectItem>
              <SelectItem value="completed">COMPLETED</SelectItem>
              <SelectItem value="urgent">URGENT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="rounded-none border-black h-12 font-mono text-xs uppercase focus:ring-0">
              <SelectValue placeholder="FILTER BY TYPE" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-black">
              <SelectItem value="all">ALL TYPES</SelectItem>
              <SelectItem value="X-Ray">X-RAY</SelectItem>
              <SelectItem value="CT Scan">CT SCAN</SelectItem>
              <SelectItem value="MRI">MRI</SelectItem>
              <SelectItem value="Ultrasound">ULTRASOUND</SelectItem>
              <SelectItem value="Mammogram">MAMMOGRAM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Imaging Studies List */}
      <div className="border border-black/10 bg-white p-10 relative">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-black/10"></div>
        <div className="flex items-center justify-between mb-10 border-b border-black/10 pb-6">
          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Camera className="h-6 w-6" />
            Capture Logs
          </h3>
          <span className="text-[10px] font-mono text-black/40 uppercase tracking-widest">{filteredStudies.length} STUDIES FOUND</span>
        </div>

        <div className="space-y-6">
          {filteredStudies.length === 0 ? (
            <div className="text-center py-20 bg-black/[0.01] border border-dashed border-black/10">
              <Camera className="h-12 w-12 mx-auto mb-4 text-black/10" />
              <p className="text-xs font-mono uppercase text-black/40">NO IMAGING DATA IN CURRENT NODE</p>
            </div>
          ) : (
            filteredStudies.map((study) => (
              <div key={study.id} className="border border-black/10 p-8 hover:border-indigo-600/30 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-10">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="p-3 bg-black/[0.03] group-hover:bg-black group-hover:text-white transition-colors">
                      {getStatusIcon(study.status)}
                    </div>
                    <div>
                      <p className="font-black text-lg uppercase tracking-tight">{study.patient_name}</p>
                      <p className="text-[10px] font-mono text-black/40 uppercase">ID: {study.patient_id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase">{study.study_type} - {study.body_part}</p>
                    <p className="text-[10px] font-mono text-black/40 uppercase">
                      SCHEDULED: {new Date(study.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border uppercase tracking-tighter ${
                    study.status === 'urgent' ? 'border-red-600 text-red-600 bg-red-50' :
                    study.status === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50' :
                    study.status === 'in_progress' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' :
                    'border-black/20 text-black/40 bg-black/[0.02]'
                  }`}>
                    {study.status.replace('_', ' ')}
                  </span>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border uppercase tracking-tighter ${
                    study.priority === 'critical' ? 'border-red-600 text-red-600 bg-red-50' :
                    study.priority === 'high' ? 'border-amber-600 text-amber-600 bg-amber-50' :
                    'border-black/20 text-black/40 bg-black/[0.02]'
                  }`}>
                    {study.priority}
                  </span>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="rounded-none border-black h-12 px-6 font-mono text-[10px] uppercase tracking-widest hover:bg-black/5 transition-all"
                      onClick={() => handleViewStudy(study)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      VIEW
                    </Button>
                    <Button
                      className="bg-black text-white rounded-none h-12 px-6 font-mono text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all"
                      onClick={() => handleUploadImages(study)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      UPLOAD
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Study Modal - Brutalist */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white border-2 border-black w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-10 border-b border-black/10 pb-6">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Schedule Capture</h3>
                <Button variant="ghost" className="hover:bg-black/5 rounded-none" onClick={() => setShowScheduleModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Patient ID</label>
                    <Input
                      value={scheduleForm.patient_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, patient_id: e.target.value })}
                      placeholder="ENTER ID..."
                      className="rounded-none border-black h-12 font-mono text-sm uppercase focus-visible:ring-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Patient Name</label>
                    <Input
                      value={scheduleForm.patient_name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, patient_name: e.target.value })}
                      placeholder="ENTER NAME..."
                      className="rounded-none border-black h-12 font-mono text-sm uppercase focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Study Type</label>
                    <Select value={scheduleForm.study_type} onValueChange={(value) => setScheduleForm({ ...scheduleForm, study_type: value })}>
                      <SelectTrigger className="rounded-none border-black h-12 font-mono text-sm uppercase focus:ring-0">
                        <SelectValue placeholder="SELECT..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-black">
                        <SelectItem value="X-Ray">X-RAY</SelectItem>
                        <SelectItem value="CT Scan">CT SCAN</SelectItem>
                        <SelectItem value="MRI">MRI</SelectItem>
                        <SelectItem value="Ultrasound">ULTRASOUND</SelectItem>
                        <SelectItem value="Mammogram">MAMMOGRAM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Body Part</label>
                    <Input
                      value={scheduleForm.body_part}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, body_part: e.target.value })}
                      placeholder="e.g. CHEST..."
                      className="rounded-none border-black h-12 font-mono text-sm uppercase focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Scheduled Timestamp</label>
                  <Input
                    type="text"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                    placeholder="YYYY-MM-DD HH:MM"
                    className="rounded-none border-black h-12 font-mono text-xs uppercase focus-visible:ring-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Priority</label>
                    <Select value={scheduleForm.priority} onValueChange={(value) => setScheduleForm({ ...scheduleForm, priority: value })}>
                      <SelectTrigger className="rounded-none border-black h-12 font-mono text-sm uppercase focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-black">
                        <SelectItem value="low">LOW</SelectItem>
                        <SelectItem value="normal">NORMAL</SelectItem>
                        <SelectItem value="high">HIGH</SelectItem>
                        <SelectItem value="critical">CRITICAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Radiologist</label>
                    <Input
                      value={scheduleForm.radiologist}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, radiologist: e.target.value })}
                      placeholder="NAME..."
                      className="rounded-none border-black h-12 font-mono text-sm uppercase focus-visible:ring-0"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-black text-white rounded-none h-14 hover:bg-indigo-600 transition-all uppercase font-mono text-xs tracking-widest mt-4"
                  onClick={handleSubmitScheduleStudy}
                >
                  Establish Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Study Modal - Brutalist */}
      {showViewModal && selectedStudy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white border-2 border-black w-full max-w-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
            <div className="p-10">
              <div className="flex items-center justify-between mb-10 border-b border-black/10 pb-6">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Study: {selectedStudy.patient_name}</h3>
                <Button variant="ghost" className="hover:bg-black/5 rounded-none" onClick={() => setShowViewModal(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-10 mb-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Study Hash</p>
                    <p className="font-mono text-xl uppercase tracking-tighter">{selectedStudy.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Type / Region</p>
                    <p className="font-mono text-xl uppercase tracking-tighter">{selectedStudy.study_type} - {selectedStudy.body_part}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Scheduled Date</p>
                    <p className="font-mono text-sm uppercase text-black/60">{new Date(selectedStudy.scheduled_date).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Status</p>
                    <span className={`text-[10px] font-mono font-bold px-3 py-1 border uppercase tracking-widest inline-block ${
                      selectedStudy.status === 'urgent' ? 'border-red-600 text-red-600 bg-red-50' :
                      selectedStudy.status === 'completed' ? 'border-emerald-600 text-emerald-600 bg-emerald-50' :
                      selectedStudy.status === 'in_progress' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' :
                      'border-black/20 text-black/40 bg-black/[0.02]'
                    }`}>
                      {selectedStudy.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Assigned Radiologist</p>
                    <p className="font-black text-xl uppercase text-indigo-600">{selectedStudy.radiologist || 'UNASSIGNED'}</p>
                  </div>
                </div>
              </div>

              {selectedStudy.notes && (
                <div className="p-6 bg-black/[0.02] border border-black/5 mb-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Technical Observations</p>
                  <p className="text-sm font-mono uppercase text-black/70 leading-relaxed italic">{selectedStudy.notes}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  className="flex-1 bg-black text-white rounded-none h-16 hover:bg-indigo-600 transition-all uppercase font-mono text-xs tracking-widest"
                  onClick={() => {
                    setShowViewModal(false)
                    handleUploadImages(selectedStudy)
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Initialize Image Upload
                </Button>
                <Button
                  variant="outline"
                  className="rounded-none border-black h-16 px-10 hover:bg-black/5 uppercase font-mono text-xs tracking-widest transition-all"
                  onClick={() => setShowViewModal(false)}
                >
                  De-Auth
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Images Modal - Brutalist */}
      {showUploadModal && selectedStudy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white border-2 border-black w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-10 border-b border-black/10 pb-6">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Capture Upload</h3>
                <Button variant="ghost" className="hover:bg-black/5 rounded-none" onClick={() => setShowUploadModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-black/[0.02] border border-black/5 mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Target Study</p>
                  <p className="font-bold text-sm uppercase">{selectedStudy.study_type} - {selectedStudy.body_part}</p>
                  <p className="text-[10px] font-mono text-black/40 uppercase">NODE: {selectedStudy.patient_name}</p>
                </div>

                <div className="border-2 border-dashed border-black/10 p-10 text-center hover:border-black/30 transition-all group cursor-pointer relative">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.dcm,.dicom"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setSelectedFiles(e.target.files)}
                  />
                  <Upload className="h-10 w-10 text-black/10 mx-auto mb-4 group-hover:text-black/30" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-black/40">Initialize Local Link or Drag Files</p>

                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-black/5 text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2">Pending Packets:</p>
                      <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {Array.from(selectedFiles).map(f => (
                          <div key={f.name} className="text-[9px] font-mono uppercase text-black/60 truncate bg-black/[0.02] p-1">
                            {f.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && <div className="p-3 bg-red-600 text-white font-mono text-[10px] uppercase tracking-widest">{uploadError}</div>}

                <div className="flex gap-4 pt-4">
                  <Button
                    className="flex-1 bg-black text-white rounded-none h-14 hover:bg-indigo-600 transition-all uppercase font-mono text-xs tracking-widest"
                    disabled={uploading || !selectedFiles || selectedFiles.length === 0}
                    onClick={async () => {
                      if (!selectedFiles || selectedFiles.length === 0) return
                      setUploading(true)
                      setUploadError(null)
                      const supabase = createClient()
                      try {
                        for (const file of Array.from(selectedFiles)) {
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${selectedStudy.id}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
                          const { error: uploadError } = await supabase.storage.from('imaging').upload(fileName, file)
                          if (uploadError) throw uploadError
                        }
                        alert('Telemetry packets uploaded successfully!')
                        setShowUploadModal(false)
                        setSelectedFiles(null)
                        handleStatusUpdate(selectedStudy.id, 'completed')
                      } catch (err: any) {
                        setUploadError(err.message || 'Transmission failed')
                      } finally {
                        setUploading(false)
                      }
                    }}
                  >
                    {uploading && <Activity className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Uplink
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-none border-black h-14 px-6 hover:bg-black/5 uppercase font-mono text-[10px] tracking-widest transition-all"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Abort
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
