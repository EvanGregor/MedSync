'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Send,
  X,
  Users,
  Calendar,
  Clock,
  Copy,
  Check,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase'

interface Consultation {
  id: string
  appointment_date?: string
  appointment_time?: string
  start_time?: string
  end_time?: string
  doctor_id?: string
  doctor_name?: string
  patient_name?: string
}

interface ZoomVideoCallProps {
  isOpen: boolean
  onClose: () => void
  consultation: Consultation
  userRole: 'doctor' | 'patient'
}

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: Date
}

interface MeetingDetails {
  id?: string
  appointment_id?: string
  meeting_id: string
  password: string
  host_id: string
  created_at: string
  is_active: boolean
}

interface SignalPayload {
  type: 'ready' | 'offer' | 'answer' | 'ice-candidate' | 'hangup'
  fromUserId: string
  senderName: string
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

interface ChatBroadcastPayload {
  fromUserId: string
  senderName: string
  message: string
  timestamp: string
}

export default function ZoomVideoCall({
  isOpen,
  onClose,
  consultation,
  userRole
}: ZoomVideoCallProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isChannelReady, setIsChannelReady] = useState(false)

  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)
  const [hasLocalStream, setHasLocalStream] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)

  const [meetingId, setMeetingId] = useState('')
  const [password, setPassword] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [copiedMeetingId, setCopiedMeetingId] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const signalingChannelRef = useRef<RealtimeChannel | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const isCreatingOfferRef = useRef(false)

  const loadMeetingDetailsRef = useRef<() => Promise<MeetingDetails | null>>(async () => null)
  const handleIncomingSignalRef = useRef<(payload: SignalPayload) => Promise<void>>(async () => {})
  const handleIncomingChatRef = useRef<(payload: ChatBroadcastPayload) => void>(() => {})

  const currentUserIdRef = useRef<string | null>(null)
  const isHostRef = useRef(false)
  const isConnectedRef = useRef(false)
  const participantNameRef = useRef('')
  const meetingDetailsRef = useRef<MeetingDetails | null>(null)

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])

  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    participantNameRef.current = participantName
  }, [participantName])

  useEffect(() => {
    meetingDetailsRef.current = meetingDetails
  }, [meetingDetails])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Ensure local self-preview binds even when media was created
  // before the preview video element mounted.
  useEffect(() => {
    if (!isConnected || !localVideoRef.current) return

    const previewStream = isScreenSharing
      ? (screenStreamRef.current || localStreamRef.current)
      : localStreamRef.current

    if (previewStream) {
      localVideoRef.current.srcObject = previewStream
      localVideoRef.current.style.transform = 'none'
      localVideoRef.current.style.webkitTransform = 'none'
      void localVideoRef.current.play().catch(() => {
        // Ignore autoplay race; interaction usually resolves this.
      })
      setHasLocalStream(true)
    }
  }, [isConnected, isScreenSharing, isVideoOn])

  const getDefaultParticipantName = () => {
    if (userRole === 'doctor') {
      const doctorName = consultation?.doctor_name || 'Doctor'
      return doctorName.toLowerCase().startsWith('dr.') ? doctorName : `Dr. ${doctorName}`
    }
    return consultation?.patient_name || 'Patient'
  }

  const addChatMessage = (sender: string, message: string) => {
    const nextMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sender,
      message,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, nextMessage])
  }

  const generateMeetingId = () => {
    if (consultation?.id) {
      const normalized = consultation.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      return normalized.slice(0, 11).padEnd(11, '0')
    }
    return Math.floor(10000000000 + Math.random() * 90000000000).toString().slice(0, 11)
  }

  const generateMeetingPassword = () => Math.random().toString(36).substring(2, 8)

  const getConsultationTime = () => {
    if (consultation?.start_time && consultation?.end_time) {
      return `${consultation.start_time} - ${consultation.end_time}`
    }
    return consultation?.appointment_time || 'Time TBA'
  }

  const isDemoConsultation = consultation?.id?.startsWith('demo-')

  const shouldCurrentUserActAsHost = (meeting: MeetingDetails | null, userId: string | null) => {
    if (userRole === 'doctor') return true
    if (!meeting || !userId) return false
    return meeting.host_id === userId
  }

  const resolveCurrentUserId = async () => {
    if (currentUserIdRef.current) {
      return currentUserIdRef.current
    }

    const supabase = createClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('❌ Unable to resolve authenticated user:', error)
      return null
    }

    setCurrentUserId(user.id)
    return user.id
  }

  const clearRemoteVideo = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setHasRemoteStream(false)
  }

  const cleanupConnectionResources = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    pendingIceCandidatesRef.current = []
    clearRemoteVideo()
    setHasLocalStream(false)
  }

  const loadMeetingDetails = async (): Promise<MeetingDetails | null> => {
    if (!consultation?.id) {
      return null
    }

    const userId = await resolveCurrentUserId()
    if (!participantNameRef.current) {
      setParticipantName(getDefaultParticipantName())
    }

    if (isDemoConsultation) {
      const demoMeeting: MeetingDetails = {
        meeting_id: generateMeetingId(),
        password: generateMeetingPassword(),
        host_id: userId || 'demo-host',
        created_at: new Date().toISOString(),
        is_active: true
      }

      setMeetingDetails(demoMeeting)
      setMeetingId(demoMeeting.meeting_id)
      setPassword(demoMeeting.password)
      setIsHost(userRole === 'doctor')
      return demoMeeting
    }

    setIsLoadingMeeting(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('consultation_meetings')
        .select('*')
        .eq('appointment_id', consultation.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('❌ Error loading meeting details:', error)
        if (error.code === '42501') {
          setConnectionError('Permission denied while reading meeting data.')
        } else if (error.code === '42P01') {
          setConnectionError('Meeting table is missing. Please run database setup scripts.')
        } else {
          setConnectionError('Failed to load meeting details. Please retry.')
        }
        return null
      }

      if (!data) {
        setMeetingDetails(null)
        setMeetingId('')
        setPassword('')
        setIsHost(false)
        isHostRef.current = false
        return null
      }

      setMeetingDetails(data)
      setMeetingId(data.meeting_id)
      setPassword(data.password)
      const shouldHost = shouldCurrentUserActAsHost(data, userId)
      setIsHost(shouldHost)
      isHostRef.current = shouldHost
      return data
    } catch (error) {
      console.error('❌ Unexpected error loading meeting details:', error)
      setConnectionError('Unexpected error while loading meeting details.')
      return null
    } finally {
      setIsLoadingMeeting(false)
    }
  }

  loadMeetingDetailsRef.current = loadMeetingDetails

  const createMeetingRecord = async (): Promise<MeetingDetails | null> => {
    if (!consultation?.id) {
      setConnectionError('Missing consultation details. Please refresh and retry.')
      return null
    }

    if (isDemoConsultation) {
      return loadMeetingDetails()
    }

    const hostUserId = await resolveCurrentUserId()
    if (!hostUserId) {
      setConnectionError('Authentication error. Please sign in again.')
      return null
    }

    if (userRole !== 'doctor') {
      setConnectionError('Only doctors can start a consultation meeting.')
      return null
    }

    const supabase = createClient()

    try {
      const { error: deactivateError } = await supabase
        .from('consultation_meetings')
        .update({ is_active: false })
        .eq('appointment_id', consultation.id)
        .eq('is_active', true)

      if (deactivateError) {
        console.error('❌ Error deactivating previous meetings:', deactivateError)
        if (deactivateError.code === '42501') {
          setConnectionError('Permission denied while preparing meeting state.')
          return null
        }
      }

      const { data, error } = await supabase
        .from('consultation_meetings')
        .insert({
          appointment_id: consultation.id,
          meeting_id: generateMeetingId(),
          password: generateMeetingPassword(),
          host_id: hostUserId,
          is_active: true
        })
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating meeting record:', error)

        if (error.code === '23505') {
          return await loadMeetingDetailsRef.current()
        }

        if (error.code === '42501') {
          setConnectionError('Permission denied while creating meeting. Check RLS policy for host_id.')
        } else if (error.code === '22P02') {
          setConnectionError('Invalid appointment ID format. Please reschedule this consultation.')
        } else {
          setConnectionError('Failed to create meeting record. Please retry.')
        }
        return null
      }

      setMeetingDetails(data)
      setMeetingId(data.meeting_id)
      setPassword(data.password)
      setIsHost(true)
      isHostRef.current = true
      return data
    } catch (error) {
      console.error('❌ Unexpected error creating meeting record:', error)
      setConnectionError('Unexpected error while creating meeting.')
      return null
    }
  }

  const attachLocalTracks = (pc: RTCPeerConnection) => {
    const localStream = localStreamRef.current
    if (!localStream) return

    const existingTrackIds = new Set(pc.getSenders().map(sender => sender.track?.id).filter(Boolean))

    localStream.getTracks().forEach(track => {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, localStream)
      }
    })
  }

  const sendSignal = async (payload: Omit<SignalPayload, 'fromUserId' | 'senderName'>) => {
    const channel = signalingChannelRef.current
    const userId = currentUserIdRef.current
    if (!channel || !userId) return

    const senderName = participantNameRef.current.trim() || getDefaultParticipantName()

    await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...payload, fromUserId: userId, senderName }
    })
  }

  const createPeerConnection = async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current
    }

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]

    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
    if (turnUrl && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential
      })
    }

    const peerConnection = new RTCPeerConnection({ iceServers })

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        void sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON()
        })
      }
    }

    peerConnection.ontrack = event => {
      const [stream] = event.streams
      if (stream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
        setHasRemoteStream(true)
      }
    }

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      // Do not mark remote stream as available until ontrack fires.
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setHasRemoteStream(false)
      }
    }

    attachLocalTracks(peerConnection)
    peerConnectionRef.current = peerConnection
    return peerConnection
  }

  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return

    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift()
      if (!candidate) continue
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('❌ Error adding queued ICE candidate:', error)
      }
    }
  }

  const createAndSendOffer = async () => {
    if (!isHostRef.current || !isConnectedRef.current || isCreatingOfferRef.current) return

    isCreatingOfferRef.current = true
    try {
      const pc = await createPeerConnection()
      attachLocalTracks(pc)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sendSignal({
        type: 'offer',
        description: offer
      })
    } catch (error) {
      console.error('❌ Error creating offer:', error)
    } finally {
      isCreatingOfferRef.current = false
    }
  }

  const stopScreenShare = async () => {
    if (!screenStreamRef.current) return

    screenStreamRef.current.getTracks().forEach(track => track.stop())
    screenStreamRef.current = null

    const localStream = localStreamRef.current
    const cameraTrack = localStream?.getVideoTracks()[0]

    if (cameraTrack && peerConnectionRef.current) {
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(cameraTrack)
    }

    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }

    setIsScreenSharing(false)
    setIsVideoOn(Boolean(cameraTrack?.enabled))
    addChatMessage('System', 'Screen sharing stopped.')
  }

  const initializeLocalMedia = async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setConnectionError(
          'Camera/microphone API is unavailable in this browser context. Joining without local AV.'
        )
        return null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      localStreamRef.current = stream
      setHasLocalStream(true)
      setIsVideoOn(Boolean(stream.getVideoTracks()[0]?.enabled))
      setIsAudioOn(Boolean(stream.getAudioTracks()[0]?.enabled))

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.style.transform = 'none'
        localVideoRef.current.style.webkitTransform = 'none'
        void localVideoRef.current.play().catch(() => {
          // Ignore autoplay errors; user interaction will usually resolve playback.
        })
      }

      return stream
    } catch (error: any) {
      console.error('❌ Error initializing local media:', error)
      if (error?.name === 'NotAllowedError') {
        setConnectionError('Camera and microphone permission denied.')
      } else if (error?.name === 'NotFoundError') {
        setConnectionError('No camera/microphone found on this device.')
      } else if (error?.name === 'NotReadableError') {
        setConnectionError('Camera or microphone is already in use by another app/tab. Joined without local AV.')
      } else {
        setConnectionError('Unable to access camera/microphone. Joining without local AV.')
      }
      setHasLocalStream(false)
      return null
    }
  }

  const handleIncomingChat = (payload: ChatBroadcastPayload) => {
    if (!payload || payload.fromUserId === currentUserIdRef.current) return

    setChatMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sender: payload.senderName || 'Participant',
        message: payload.message,
        timestamp: new Date(payload.timestamp || Date.now())
      }
    ])
  }

  const handleIncomingSignal = async (payload: SignalPayload) => {
    if (!payload || payload.fromUserId === currentUserIdRef.current) return

    try {
      if (payload.type === 'ready') {
        addChatMessage('System', `${payload.senderName || 'Participant'} is ready.`)
        if (isHostRef.current && isConnectedRef.current) {
          await createAndSendOffer()
        }
        return
      }

      if (payload.type === 'hangup') {
        addChatMessage('System', `${payload.senderName || 'Participant'} left the meeting.`)
        clearRemoteVideo()
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
          peerConnectionRef.current = null
        }
        return
      }

      if (!isConnectedRef.current) {
        return
      }

      if (payload.type === 'offer' && payload.description) {
        const pc = await createPeerConnection()
        await pc.setRemoteDescription(new RTCSessionDescription(payload.description))
        await flushPendingIceCandidates(pc)

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await sendSignal({
          type: 'answer',
          description: answer
        })
        return
      }

      if (payload.type === 'answer' && payload.description) {
        const pc = await createPeerConnection()
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.description))
          await flushPendingIceCandidates(pc)
        }
        return
      }

      if (payload.type === 'ice-candidate' && payload.candidate) {
        const pc = peerConnectionRef.current
        if (!pc) {
          pendingIceCandidatesRef.current.push(payload.candidate)
          return
        }

        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } else {
          pendingIceCandidatesRef.current.push(payload.candidate)
        }
      }
    } catch (error) {
      console.error('❌ Error handling signaling payload:', payload.type, error)
    }
  }

  handleIncomingChatRef.current = handleIncomingChat
  handleIncomingSignalRef.current = handleIncomingSignal

  const joinOrStartMeeting = async () => {
    if (!participantNameRef.current.trim()) {
      setConnectionError('Please enter your name before joining.')
      return
    }

    if (!isChannelReady) {
      setConnectionError('Connecting secure signaling channel. Please retry in a moment.')
      return
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const resolvedUserId = await resolveCurrentUserId()
      if (!resolvedUserId) {
        setConnectionError('Authentication error. Please sign in again.')
        return
      }

      let activeMeeting = meetingDetailsRef.current
      if (!activeMeeting) {
        activeMeeting = userRole === 'doctor'
          ? await createMeetingRecord()
          : await loadMeetingDetailsRef.current()
      }

      if (!activeMeeting) {
        setConnectionError(
          userRole === 'patient'
            ? 'No meeting available yet. Please wait for the doctor to start.'
            : 'Unable to create meeting. Please retry.'
        )
        return
      }
      const shouldHost = shouldCurrentUserActAsHost(activeMeeting, resolvedUserId)
      setIsHost(shouldHost)
      isHostRef.current = shouldHost

      const localStream = await initializeLocalMedia()
      const pc = await createPeerConnection()
      if (localStream) {
        attachLocalTracks(pc)
      }

      setIsConnected(true)
      addChatMessage('System', `Meeting ${shouldHost ? 'started' : 'joined'} (ID: ${activeMeeting.meeting_id}).`)
      if (!localStream) {
        addChatMessage('System', 'Joined without camera/microphone. Close other apps/tabs using your devices to enable AV.')
      }

      await sendSignal({ type: 'ready' })
      if (shouldHost) {
        await createAndSendOffer()
      }
    } catch (error) {
      console.error('❌ Error joining/starting meeting:', error)
      if (!connectionError) {
        setConnectionError('Failed to start the video call. Please retry.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const leaveMeeting = async () => {
    try {
      if (isConnectedRef.current) {
        await sendSignal({ type: 'hangup' })
      }
    } catch (error) {
      console.error('❌ Error sending hangup signal:', error)
    } finally {
      cleanupConnectionResources()
      setIsConnected(false)
      setIsConnecting(false)
      setIsScreenSharing(false)
      addChatMessage('System', 'You left the meeting.')
    }
  }

  const handleClose = async () => {
    await leaveMeeting()
    onClose()
  }

  const toggleVideo = () => {
    if (!isConnectedRef.current) return

    const stream = isScreenSharing ? screenStreamRef.current : localStreamRef.current
    const videoTrack = stream?.getVideoTracks()[0]
    if (!videoTrack) return

    videoTrack.enabled = !videoTrack.enabled
    setIsVideoOn(videoTrack.enabled)
    addChatMessage('System', `Video ${videoTrack.enabled ? 'enabled' : 'disabled'}.`)
  }

  const toggleAudio = () => {
    if (!isConnectedRef.current || !localStreamRef.current) return

    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (!audioTrack) return

    audioTrack.enabled = !audioTrack.enabled
    setIsAudioOn(audioTrack.enabled)
    addChatMessage('System', `Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}.`)
  }

  const toggleScreenShare = async () => {
    if (!isConnectedRef.current) return

    try {
      if (isScreenSharing) {
        await stopScreenShare()
        return
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) {
        throw new Error('No screen track available.')
      }

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(screenTrack)
        }
      }

      screenTrack.onended = () => {
        void stopScreenShare()
      }

      screenStreamRef.current = screenStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream
        localVideoRef.current.style.transform = 'none'
        localVideoRef.current.style.webkitTransform = 'none'
        void localVideoRef.current.play().catch(() => {
          // Ignore autoplay errors.
        })
      }

      setIsScreenSharing(true)
      setIsVideoOn(true)
      addChatMessage('System', 'Screen sharing started.')
    } catch (error) {
      console.error('❌ Error toggling screen share:', error)
      addChatMessage('System', 'Unable to start screen sharing.')
    }
  }

  const sendChatMessage = async () => {
    if (!newMessage.trim()) return

    const messageToSend = newMessage.trim()
    const senderName = participantNameRef.current.trim() || getDefaultParticipantName()

    addChatMessage(senderName, messageToSend)
    setNewMessage('')

    const channel = signalingChannelRef.current
    const userId = currentUserIdRef.current
    if (!channel || !userId) return

    await channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: {
        fromUserId: userId,
        senderName,
        message: messageToSend,
        timestamp: new Date().toISOString()
      }
    })
  }

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendChatMessage()
    }
  }

  const copyMeetingId = async () => {
    if (!meetingId) return

    try {
      await navigator.clipboard.writeText(meetingId)
      setCopiedMeetingId(true)
      setTimeout(() => setCopiedMeetingId(false), 1500)
    } catch (error) {
      console.error('❌ Failed to copy meeting ID:', error)
    }
  }

  useEffect(() => {
    if (!isOpen || !consultation?.id) return

    if (!participantNameRef.current) {
      setParticipantName(getDefaultParticipantName())
    }

    void loadMeetingDetailsRef.current()

    const supabase = createClient()
    const meetingSubscription = supabase
      .channel(`consultation-meeting-${consultation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_meetings',
          filter: `appointment_id=eq.${consultation.id}`
        },
        () => {
          void loadMeetingDetailsRef.current()
        }
      )
      .subscribe()

    let pollingInterval: ReturnType<typeof setInterval> | null = null
    if (userRole === 'patient') {
      pollingInterval = setInterval(() => {
        if (!meetingDetailsRef.current && isOpen) {
          void loadMeetingDetailsRef.current()
        }
      }, 5000)
    }

    return () => {
      meetingSubscription.unsubscribe()
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [isOpen, consultation?.id, userRole])

  useEffect(() => {
    if (!isOpen || !consultation?.id) return

    const supabase = createClient()
    const signalingChannel = supabase
      .channel(`consultation-signal-${consultation.id}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void handleIncomingSignalRef.current(payload as SignalPayload)
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        handleIncomingChatRef.current(payload as ChatBroadcastPayload)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setIsChannelReady(true)
        } else if (status === 'CHANNEL_ERROR') {
          setIsChannelReady(false)
          setConnectionError('Unable to connect signaling channel.')
        }
      })

    signalingChannelRef.current = signalingChannel

    return () => {
      setIsChannelReady(false)
      signalingChannel.unsubscribe()
      signalingChannelRef.current = null
    }
  }, [isOpen, consultation?.id])

  useEffect(() => {
    if (!isOpen) {
      cleanupConnectionResources()
      setIsConnected(false)
      setIsConnecting(false)
      setIsScreenSharing(false)
      setHasRemoteStream(false)
      setConnectionError(null)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      cleanupConnectionResources()
      if (signalingChannelRef.current) {
        signalingChannelRef.current.unsubscribe()
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-xl">Video Consultation</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Badge variant={isChannelReady ? 'default' : 'secondary'}>
                  {isChannelReady ? 'Signaling Ready' : 'Connecting Channel'}
                </Badge>
                {meetingDetails && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {isHost ? 'Host' : 'Participant'}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void handleClose()}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                {consultation?.appointment_date
                  ? format(new Date(consultation.appointment_date), 'PPP')
                  : 'Date TBA'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{getConsultationTime()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{userRole === 'doctor' ? consultation?.patient_name : consultation?.doctor_name}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {connectionError && !isConnected && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive text-sm mb-2">{connectionError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConnectionError(null)
                  void joinOrStartMeeting()
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {isLoadingMeeting && (
            <div className="flex items-center justify-center h-40">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading meeting details...</p>
              </div>
            </div>
          )}

          {!isConnected && !isConnecting && !isLoadingMeeting && (
            <div className="space-y-4">
              {meetingDetails ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="text-green-600">✅</div>
                    <h3 className="font-medium text-green-900">Meeting Available</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">Meeting ID</label>
                      <div className="flex items-center space-x-2">
                        <Input value={meetingId} readOnly className="font-mono" />
                        <Button variant="outline" size="sm" onClick={() => void copyMeetingId()}>
                          {copiedMeetingId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input value={password} readOnly className="font-mono" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      value={participantName}
                      onChange={e => setParticipantName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>

                  <Button
                    onClick={() => void joinOrStartMeeting()}
                    className="w-full mt-4"
                    disabled={!participantName.trim() || !isChannelReady}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Video Call
                  </Button>
                </div>
              ) : userRole === 'doctor' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-blue-600">👨‍⚕️</div>
                    <h3 className="font-medium text-blue-900">Start Consultation</h3>
                  </div>
                  <p className="text-blue-700 text-sm mb-3">
                    Starting the call will create a shared meeting that the patient can join.
                  </p>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      value={participantName}
                      onChange={e => setParticipantName(e.target.value)}
                      placeholder="Dr. Your Name"
                    />
                  </div>

                  <Button
                    onClick={() => void joinOrStartMeeting()}
                    className="w-full"
                    disabled={!participantName.trim() || !isChannelReady}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Consultation
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-yellow-600">⏳</div>
                    <h3 className="font-medium text-yellow-900">Waiting for Doctor</h3>
                  </div>
                  <p className="text-yellow-700 text-sm mb-4">
                    The doctor must start the consultation first. Use refresh to check again.
                  </p>
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      value={participantName}
                      onChange={e => setParticipantName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void loadMeetingDetailsRef.current()}
                  >
                    Refresh Meeting Status
                  </Button>
                </div>
              )}
            </div>
          )}

          {isConnecting && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Connecting to meeting...</p>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="flex-1 min-h-0 relative">
              {connectionError && (
                <div className="absolute left-4 right-4 top-4 z-30 bg-destructive/90 text-white rounded-md px-3 py-2 text-sm shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{connectionError}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setConnectionError(null)
                          void joinOrStartMeeting()
                        }}
                      >
                        Retry
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConnectionError(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="relative bg-black rounded-lg overflow-hidden h-full min-h-0">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${hasRemoteStream ? '' : 'hidden'}`}
                />

                {!hasRemoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <div className="text-5xl mb-4">👥</div>
                      <h3 className="text-lg font-semibold mb-2">Waiting for other participant</h3>
                      <p className="text-gray-300 text-sm">Your camera and mic are active.</p>
                    </div>
                  </div>
                )}

                {(hasLocalStream || isScreenSharing) && (
                  <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOn ? '' : 'hidden'}`}
                      style={{ transform: 'none', WebkitTransform: 'none' }}
                    />

                    {!isVideoOn && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                        Camera Off
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      You
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-2 bg-black/50 rounded-full px-4 py-2">
                    <Button variant={isAudioOn ? 'default' : 'destructive'} size="sm" onClick={toggleAudio}>
                      {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>

                    <Button variant={isVideoOn ? 'default' : 'destructive'} size="sm" onClick={toggleVideo}>
                      {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>

                    <Button variant={isScreenSharing ? 'default' : 'secondary'} size="sm" onClick={() => void toggleScreenShare()}>
                      {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </Button>

                    <Button variant="destructive" size="sm" onClick={() => void leaveMeeting()}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!hasLocalStream && (
                  <div className="absolute bottom-20 right-4 z-20 bg-black/60 text-white text-xs px-3 py-1.5 rounded-md">
                    Joined without local AV
                  </div>
                )}
              </div>

              <div className="absolute top-4 left-4 z-20">
                <Button
                  variant={isChatOpen ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="shadow-md"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {isChatOpen ? 'Hide Chat' : 'Show Chat'}
                </Button>
              </div>

              {isChatOpen && (
                <div className="absolute right-4 top-16 bottom-4 z-20 w-80 max-w-[45vw]">
                  <div className="h-full flex flex-col border rounded-lg bg-white/95 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center justify-between p-3 border-b">
                      <h3 className="font-medium">Chat</h3>
                      <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-primary">{msg.sender}</span>
                            <span className="text-xs text-muted-foreground">{format(msg.timestamp, 'HH:mm')}</span>
                          </div>
                          <p className="text-sm bg-muted p-2 rounded-lg">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t">
                      <div className="flex space-x-2">
                        <Textarea
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={handleChatKeyPress}
                          placeholder="Type a message..."
                          className="flex-1 min-h-[60px] resize-none"
                        />
                        <Button onClick={() => void sendChatMessage()} disabled={!newMessage.trim()} size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isConnected && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Meeting ID:</span> {meetingId}
                </div>
                <div>
                  <span className="font-medium">Password:</span> {password}
                </div>
                <div>
                  <span className="font-medium">Role:</span> {isHost ? 'Host' : 'Participant'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
