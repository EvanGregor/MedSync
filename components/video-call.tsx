'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Send,
  X,
  Users,
  Calendar,
  Clock,
  Settings,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase'

interface VideoCallProps {
  isOpen: boolean
  onClose: () => void
  consultation: any
  userRole: 'doctor' | 'patient'
}

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: Date
}

interface MeetingDetails {
  meeting_id: string
  password: string
  host_id: string
  created_at: string
  is_active: boolean
}

export default function VideoCall({
  isOpen,
  onClose,
  consultation,
  userRole
}: VideoCallProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Video/Audio states
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Meeting states
  const [meetingId, setMeetingId] = useState('')
  const [password, setPassword] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(false)

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Load meeting details from database
  const loadMeetingDetails = async () => {
    if (!consultation?.id) {
      console.log('❌ No consultation ID available')
      return
    }

    console.log('🔍 Loading meeting details for appointment:', consultation.id)
    setIsLoadingMeeting(true)
    const supabase = createClient()

    try {
      // Check if meeting already exists for this appointment
      const { data: existingMeetings, error } = await supabase
        .from('consultation_meetings')
        .select('*')
        .eq('appointment_id', consultation.id)
        .eq('is_active', true)

      if (error) {
        console.error('❌ Error loading meeting details:', error)
        setIsLoadingMeeting(false)
        return
      }

      console.log('📊 Query result:', { existingMeetings, count: existingMeetings?.length })

      if (existingMeetings && existingMeetings.length > 0) {
        const existingMeeting = existingMeetings[0]
        console.log('✅ Found existing meeting:', existingMeeting)
        setMeetingDetails(existingMeeting)
        setMeetingId(existingMeeting.meeting_id)
        setPassword(existingMeeting.password)
        setIsHost(existingMeeting.host_id === consultation.doctor_id)

        console.log('🔗 Meeting details set:', {
          meetingId: existingMeeting.meeting_id,
          isHost: existingMeeting.host_id === consultation.doctor_id
        })
      } else {
        console.log('📝 No existing meeting found')
        // Set default participant name
        const defaultName = userRole === 'doctor'
          ? `Dr. ${consultation.doctor_name || 'Doctor'}`
          : consultation.patient_name || 'Patient'
        setParticipantName(defaultName)
      }
    } catch (error) {
      console.error('❌ Error in loadMeetingDetails:', error)
    } finally {
      setIsLoadingMeeting(false)
    }
  }

  // Subscribe to real-time meeting updates
  useEffect(() => {
    if (isOpen && consultation?.id) {
      loadMeetingDetails()

      // Set up real-time subscription for meeting updates
      const supabase = createClient()
      const subscription = supabase
        .channel('consultation-meetings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consultation_meetings',
            filter: `appointment_id=eq.${consultation.id}`
          },
          (payload) => {
            console.log('🔄 Real-time meeting update:', payload)
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              loadMeetingDetails()
            }
          }
        )
        .subscribe()

      // For patients, also poll for new meetings every 5 seconds as backup
      let pollInterval: NodeJS.Timeout | null = null
      if (userRole === 'patient') {
        pollInterval = setInterval(() => {
          if (!meetingDetails && isOpen) {
            console.log('🔄 Patient polling for new meeting...')
            loadMeetingDetails()
          }
        }, 5000)
      }

      return () => {
        subscription.unsubscribe()
        if (pollInterval) clearInterval(pollInterval)
      }
    }
  }, [isOpen, consultation?.id, userRole, meetingDetails])

  // Generate meeting ID based on consultation ID (consistent)
  const generateMeetingId = () => {
    if (consultation?.id) {
      // Use consultation ID to create a consistent meeting ID
      const hash = consultation.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)
      return hash.padEnd(11, '0').substring(0, 11)
    }
    // Fallback to random ID
    return Math.floor(100000000 + Math.random() * 900000000).toString()
  }

  // Initialize camera and microphone
  const initializeMedia = async () => {
    try {
      console.log('🎥 Initializing camera and microphone...')

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

      console.log('✅ Media stream obtained')
      localStreamRef.current = stream

      // Set the video source
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(e => console.error('❌ Error playing local video:', e))
        }
        localVideoRef.current.onplay = () => {
          setIsVideoPlaying(true)
        }
      }

      return stream
    } catch (error: any) {
      console.error('❌ Error accessing media devices:', error)

      if (error.name === 'NotAllowedError') {
        setConnectionError('Camera and microphone access denied. Please allow permissions and try again.')
      } else if (error.name === 'NotFoundError') {
        setConnectionError('No camera or microphone found. Please connect devices and try again.')
      } else if (error.name === 'NotReadableError') {
        setConnectionError('Camera or microphone is already in use by another application.')
      } else {
        setConnectionError(`Camera/Microphone access failed: ${error.message}`)
      }

      throw error
    }
  }

  // Start video call
  const startVideoCall = async () => {
    if (!participantName.trim()) {
      setConnectionError('Please enter your name')
      return
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      let currentMeetingId = meetingId
      let currentPassword = password

      // If no meeting exists, create one (only doctor can create)
      if (!meetingDetails && userRole === 'doctor') {
        console.log('🆕 Creating new meeting...')
        currentMeetingId = generateMeetingId()
        currentPassword = Math.random().toString(36).substring(2, 8)

        // Store meeting details in database
        const supabase = createClient()

        console.log('💾 Creating meeting in database:', {
          appointment_id: consultation.id,
          meeting_id: currentMeetingId,
          password: currentPassword,
          host_id: consultation.doctor_id
        })

        const { data: newMeeting, error } = await supabase
          .from('consultation_meetings')
          .upsert({
            appointment_id: consultation.id,
            meeting_id: currentMeetingId,
            password: currentPassword,
            host_id: consultation.doctor_id,
            is_active: true
          }, {
            onConflict: 'appointment_id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (error) {
          console.error('❌ Error creating meeting:', error)
          setConnectionError('Failed to create meeting. Please try again.')
          setIsConnecting(false)
          return
        }

        console.log('✅ Meeting created:', newMeeting)
        setMeetingDetails(newMeeting)
        setMeetingId(currentMeetingId)
        setPassword(currentPassword)
        setIsHost(true)
      } else if (meetingDetails) {
        // Join existing meeting
        console.log('🔗 Joining existing meeting...')
        currentMeetingId = meetingDetails.meeting_id
        currentPassword = meetingDetails.password
      } else {
        // Patient trying to join but no meeting exists
        setConnectionError('No meeting available. Please wait for the doctor to start the consultation.')
        setIsConnecting(false)
        return
      }

      // Initialize camera and microphone
      await initializeMedia()

      // Initialize WebRTC peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      peerConnectionRef.current = peerConnection

      // Add local stream to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle incoming streams
      peerConnection.ontrack = (event) => {
        console.log('📹 Remote stream received')
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Create offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      // Simulate connection (in real app, you'd use signaling server)
      setTimeout(() => {
        setIsConnected(true)
        setIsConnecting(false)
        addChatMessage('System', `Meeting ${userRole === 'doctor' ? 'started' : 'joined'}. Meeting ID: ${currentMeetingId}`)
        addChatMessage('System', 'Connected to video call')
      }, 2000)

    } catch (error: any) {
      console.error('❌ Error starting video call:', error)
      setConnectionError('Failed to start video call. Please check your camera and microphone permissions.')
      setIsConnecting(false)
    }
  }

  // Leave meeting
  const leaveMeeting = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setIsConnected(false)
    addChatMessage('System', 'Meeting ended.')
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        addChatMessage('System', `Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`)

        if (videoTrack.enabled && localVideoRef.current) {
          localVideoRef.current.play().catch(e => console.error('❌ Error playing video after toggle:', e))
        }
      }
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
        addChatMessage('System', `Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`)
      }
    }
  }

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        })

        if (localStreamRef.current && peerConnectionRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0]
          const sender = peerConnectionRef.current.getSenders().find(s =>
            s.track?.kind === 'video'
          )

          if (sender) {
            sender.replaceTrack(videoTrack)
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream
          }

          setIsScreenSharing(true)
          addChatMessage('System', 'Screen sharing started')
        }
      } else {
        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
          setIsScreenSharing(false)
          addChatMessage('System', 'Screen sharing stopped')
        }
      }
    } catch (error) {
      console.error('❌ Screen sharing error:', error)
      addChatMessage('System', 'Screen sharing failed')
    }
  }

  // Chat functions
  const addChatMessage = (sender: string, message: string) => {
    const newMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      message,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, newMsg])
  }

  const sendChatMessage = () => {
    if (newMessage.trim()) {
      addChatMessage(participantName, newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
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
              <CardTitle className="text-xl">
                Video Consultation
              </CardTitle>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {meetingDetails && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {isHost ? 'Host' : 'Participant'}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {consultation && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(consultation.appointment_date), 'PPP')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{consultation.appointment_time}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>
                  {userRole === 'doctor' ? consultation.patient_name : consultation.doctor_name}
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Connection Error */}
          {connectionError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">  <p className="text-destructive text-sm mb-2">{connectionError}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConnectionError(null)
                    startVideoCall()
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Loading Meeting */}
          {isLoadingMeeting && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading meeting details...</p>
              </div>
            </div>
          )}

          {/* Meeting Setup */}
          {!isConnected && !isConnecting && !isLoadingMeeting && (
            <div className="space-y-4">
              {/* Show meeting status */}
              {meetingDetails ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-green-600">✅</div>
                    <h3 className="font-medium text-green-900">Meeting Available</h3>
                  </div>
                  <p className="text-green-700 text-sm">
                    Meeting ID: <strong>{meetingDetails.meeting_id}</strong>
                  </p>
                </div>
              ) : userRole === 'patient' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-yellow-600">⏳</div>
                    <h3 className="font-medium text-yellow-900">Waiting for Doctor</h3>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    The doctor hasn't started the meeting yet. Please wait...
                  </p>
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <Button
                onClick={startVideoCall}
                disabled={!participantName.trim() || (userRole === 'patient' && !meetingDetails)}
                className="w-full"
              >
                <Video className="h-4 w-4 mr-2" />
                {meetingDetails ? 'Join Video Call' : 'Start Video Call'}
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isConnecting && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Connecting to meeting...</p>
              </div>
            </div>
          )}

          {/* Video Call Interface */}
          {isConnected && (
            <div className="flex-1 flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Video Container */}
              <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
                {/* Remote Video (Main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Fallback when no remote video */}
                {!remoteVideoRef.current?.srcObject && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-xl font-semibold mb-2">Waiting for other participant</h3>
                      <p className="text-gray-300">Your camera is active and ready</p>
                    </div>
                  </div>
                )}

                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    You
                  </div>
                </div>

                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-2 bg-black/50 rounded-full px-4 py-2">
                    <Button
                      variant={isAudioOn ? "default" : "destructive"}
                      size="sm"
                      onClick={toggleAudio}
                    >
                      {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant={isVideoOn ? "default" : "destructive"}
                      size="sm"
                      onClick={toggleVideo}
                    >
                      {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant={isScreenSharing ? "default" : "secondary"}
                      size="sm"
                      onClick={toggleScreenShare}
                    >
                      {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={leaveMeeting}
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Panel */}
              <div className="w-full lg:w-80 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Chat</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>

                {isChatOpen && (
                  <div className="flex-1 flex flex-col border rounded-lg">
                    {/* Chat Messages */}
                    <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-primary">
                                {msg.sender}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(msg.timestamp, 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm bg-muted p-2 rounded-lg">
                              {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Chat Input */}
                    <div className="p-4 border-t">
                      <div className="flex space-x-2">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type a message..."
                          className="flex-1 min-h-[60px] resize-none"
                        />
                        <Button
                          onClick={sendChatMessage}
                          disabled={!newMessage.trim()}
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
