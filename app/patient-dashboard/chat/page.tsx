"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, MessageSquare, Send, ArrowLeft, Stethoscope, FlaskConical, User, Clock, Check, CheckCheck, Brain, AlertTriangle, Lightbulb, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_role: string
  receiver_id: string
  receiver_name: string
  receiver_role: string
  created_at: string
  is_read?: boolean
}

interface Contact {
  id: string
  name: string
  role: string
  specialty?: string
  online: boolean
  last_message?: string
  last_message_time?: string
  unread_count?: number
}

export default function PatientChatPage() {
  const [user, setUser] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState<Contact[]>([])
  const [labTechs, setLabTechs] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState("doctors")
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Enhanced scroll to bottom with better positioning
  const scrollToBottomEnhanced = () => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  // Handle scroll to top for new messages
  const scrollToTop = () => {
    const messagesContainer = messagesEndRef.current?.parentElement
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  // Check scroll position for scroll buttons
  const handleScroll = () => {
    const messagesContainer = messagesContainerRef.current
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer
      setCanScrollUp(scrollTop > 100)
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 100)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log('No authenticated user, redirecting to login')
          router.push("/login")
          return
        }

        if (user.user_metadata?.role !== "patient") {
          console.log('User is not a patient, redirecting to login')
          router.push("/login")
          return
        }

        console.log('Authenticated patient user:', user.email)
        setUser(user)
        
        // Get or create user record
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (userError) {
          console.log('Creating new user record...')
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              auth_id: user.id,
              name: user.user_metadata?.name || 'Patient',
              email: user.email || '',
              role: 'patient'
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating user record:', createError)
            console.error('Create error details:', {
              code: createError.code,
              message: createError.message,
              details: createError.details
            })
          } else {
            console.log('Created new user record with ID:', newUser.id)
            setCurrentUserId(newUser.id)
            // Set user as online
            await supabase
              .from('users')
              .update({ online: true })
              .eq('id', newUser.id)
          }
        } else {
          console.log('Found existing user record with ID:', userData.id)
          setCurrentUserId(userData.id)
          // Set user as online
          await supabase
            .from('users')
            .update({ online: true })
            .eq('id', userData.id)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error in checkUser:', error)
        setLoading(false)
      }
    }

    checkUser()
  }, [router, supabase])

  useEffect(() => {
    if (currentUserId) {
      loadContacts()
      setupRealtimeSubscriptions()
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    if (selectedContact && currentUserId) {
      loadMessages()
      markMessagesAsRead()
    }
  }, [selectedContact, currentUserId])

  const setupRealtimeSubscriptions = () => {
    // Subscribe to user online status changes
    const userStatusSubscription = supabase
      .channel('user_status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `role.in.(doctor,lab)`
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedUser = payload.new as any
          setOnlineUsers(prev => {
            const newSet = new Set(prev)
            if (updatedUser.online) {
              newSet.add(updatedUser.id)
            } else {
              newSet.delete(updatedUser.id)
            }
            return newSet
          })
        }
      })
      .subscribe()

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('all_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message
        if (newMessage.receiver_id === currentUserId || newMessage.sender_id === currentUserId) {
          setMessages(prev => {
            // Check if message already exists
            if (!prev.find(m => m.id === newMessage.id)) {
              return [...prev, newMessage]
            }
            return prev
          })
        }
      })
      .subscribe()

    return () => {
      userStatusSubscription.unsubscribe()
      messageSubscription.unsubscribe()
    }
  }

  const loadContacts = async () => {
    try {
      // First, check if we have the current user ID
      if (!currentUserId) {
        console.log('No current user ID, skipping contact load')
        return
      }

      // Prevent multiple simultaneous calls
      if (loadingContacts) {
        console.log('Already loading contacts, skipping')
        return
      }

      if (doctors.length > 0 || labTechs.length > 0) {
        console.log('Contacts already loaded, skipping')
        return
      }

      setLoadingContacts(true)
      console.log('Loading contacts for user:', currentUserId)

      // Validate Supabase client
      if (!supabase) {
        console.error('Supabase client is not available')
        return
      }

      // Test Supabase connection first
      console.log('Testing Supabase connection...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Supabase auth connection failed:', sessionError)
        console.error('Session error details:', {
          code: sessionError.code,
          message: sessionError.message
        })
        return
      }

      console.log('Supabase auth connection successful')

      // First, let's test if we can connect to the database
      console.log('Testing database connection...')
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('Database connection test failed:', testError)
        console.error('Connection error details:', {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint
        })
        
        // Check if it's a table structure issue
        if (testError.code === '42P01') {
          console.error('Table "users" does not exist!')
        } else if (testError.code === '42703') {
          console.error('Column "count" does not exist in users table!')
        }
        
        return
      }

      console.log('Database connection successful, proceeding with contact load...')

      // Let's check what columns actually exist in the users table
      console.log('Checking users table structure...')
      const { data: structureData, error: structureError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      if (structureError) {
        console.error('Structure check failed:', structureError)
        console.error('Structure error details:', {
          code: structureError.code,
          message: structureError.message,
          details: structureError.details,
          hint: structureError.hint
        })
        return
      }

      console.log('Users table structure check successful, sample data:', structureData)

      // Now try to load the actual contacts with a very simple query first
      console.log('Attempting to load contacts with simple query...')
      let { data: usersData, error } = await supabase
        .from('users')
        .select('id, name, role')
        .limit(10)

      if (error) {
        console.error('Simple query failed:', error)
        console.error('Simple query error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        return
      }

      console.log('Simple query successful, data:', usersData)

      // Now try the complex query
      console.log('Attempting complex query with role filtering...')
      const { data: complexData, error: complexError } = await supabase
        .from('users')
        .select('id, name, role, specialty, online')
        .in('role', ['doctor', 'lab'])
        .order('online', { ascending: false })

      if (complexError) {
        console.error('Complex query failed:', complexError)
        console.error('Complex query error details:', {
          code: complexError.code,
          message: complexError.message,
          details: complexError.details,
          hint: complexError.hint
        })
        
        // Use simple query data if complex query fails
        usersData = complexData || usersData
      } else {
        console.log('Complex query successful, data:', complexData)
        usersData = complexData
      }

      if (!usersData) {
        console.error('No user data received from either query')
        return
      }

      const usersList = usersData || []
      console.log('Final loaded users:', usersList)
      
      // Map users to Contact interface with default values
      const mapToContact = (user: any): Contact => ({
        id: user.id,
        name: user.name,
        role: user.role,
        specialty: user.specialty || null,
        online: user.online || false
      })

      const doctorsList = usersList.filter((u: any) => u.role === 'doctor').map(mapToContact)
      const labsList = usersList.filter((u: any) => u.role === 'lab').map(mapToContact)
      
      setDoctors(doctorsList)
      setLabTechs(labsList)
      
      // Update online users set (only if online column exists)
      if (usersList.some((u: any) => 'online' in u)) {
        const onlineUserIds = new Set(usersList.filter((u: any) => u.online).map((u: any) => u.id))
        setOnlineUsers(onlineUserIds)
      }
      
      if (doctorsList.length > 0) {
        setSelectedContact(doctorsList[0])
      }
    } catch (error) {
      console.error('Unexpected error loading contacts:', error)
      console.error('Error type:', typeof error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    } finally {
      setLoadingContacts(false)
    }
  }

  const getActiveContacts = () => {
    switch (activeTab) {
      case 'doctors': return doctors
      case 'labs': return labTechs
      default: return doctors
    }
  }

  const loadMessages = async () => {
    if (!selectedContact || !currentUserId) return

    try {
      console.log('Loading messages between:', currentUserId, 'and', selectedContact.id)

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      console.log('Loaded messages:', messagesData?.length || 0)
      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const markMessagesAsRead = async () => {
    if (!selectedContact || !currentUserId) return

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', selectedContact.id)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !currentUserId || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("") // Clear input immediately for better UX
    
    // Create local message immediately for real-time display
    const localMessage: Message = {
      id: `local-${Date.now()}`,
      content: messageContent,
      sender_id: currentUserId,
      sender_name: user?.user_metadata?.name || 'Patient',
      sender_role: 'patient',
      receiver_id: selectedContact.id,
      receiver_name: selectedContact.name,
      receiver_role: selectedContact.role,
      created_at: new Date().toISOString()
    }
    
    // Add message to local state immediately
    setMessages(prev => [...prev, localMessage])
    
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sender_id: currentUserId,
          sender_name: user?.user_metadata?.name || 'Patient',
          sender_role: 'patient',
          receiver_id: selectedContact.id,
          receiver_name: selectedContact.name,
          receiver_role: selectedContact.role
        })
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        // Keep the local message but mark it as failed
        setMessages(prev => 
          prev.map(msg => 
            msg.id === localMessage.id 
              ? { ...msg, id: `failed-${Date.now()}` }
              : msg
          )
        )
      } else if (data) {
        // Replace local message with server message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === localMessage.id ? data : msg
          )
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Keep the local message but mark it as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === localMessage.id 
            ? { ...msg, id: `failed-${Date.now()}` }
            : msg
        )
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const contacts = getActiveContacts()
    if (contacts.length > 0) {
      setSelectedContact(contacts[0])
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getUnreadCount = (contactId: string) => {
    return messages.filter(m => 
      m.sender_id === contactId && 
      m.receiver_id === currentUserId && 
      !m.is_read
    ).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .contacts-container {
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }
      `}</style>

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 flex-shrink-0 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image src="/medi.png" alt="MedSync Logo" width={32} height={32} />
            <span className="text-2xl font-bold text-gray-900">MedSync</span>
            <Badge className="bg-green-100 text-green-800">Patient Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/patient-dashboard">
              <Button variant="outline" className="bg-white text-green-600 border-green-200 hover:bg-green-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

              <div className="container mx-auto px-4 py-8 flex-1 flex flex-col min-h-0 overflow-hidden">

        <div className="grid gap-6 flex-1 min-h-0 h-full items-start max-h-[calc(100vh-120px)] lg:grid-cols-4">
          {/* Contacts Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col bg-white border-2 border-gray-200 shadow-md">
              <CardHeader className="flex-shrink-0 bg-gray-50 border-b border-gray-200 pt-6 pb-4">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Healthcare Team
                </CardTitle>
                <CardDescription>Connect with doctors and lab technicians</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                    <TabsTrigger value="doctors" className="flex items-center">
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Doctors
                    </TabsTrigger>
                    <TabsTrigger value="labs" className="flex items-center">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Labs
                    </TabsTrigger>
                  </TabsList>

                                     <TabsContent value="doctors" className="mt-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 contacts-container">
                     <div className="space-y-2 p-2 pt-4">
                       {loadingContacts ? (
                         <div className="flex items-center justify-center py-8">
                           <Activity className="h-6 w-6 text-green-600 animate-spin mr-2" />
                           <span className="text-gray-600">Loading doctors...</span>
                         </div>
                       ) : doctors.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">
                           <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                           <p>No doctors available</p>
                         </div>
                       ) : (
                         doctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          onClick={() => setSelectedContact(doctor)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedContact?.id === doctor.id
                              ? 'bg-green-100 border-green-300 shadow-sm'
                              : 'bg-white hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <Stethoscope className="h-8 w-8 text-green-600" />
                                {onlineUsers.has(doctor.id) && (
                                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{doctor.name}</p>
                                <p className="text-sm text-gray-600">{doctor.specialty}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getUnreadCount(doctor.id) > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  {getUnreadCount(doctor.id)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                       ))
                       )}
                     </div>
                   </TabsContent>

                                      <TabsContent value="labs" className="mt-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 contacts-container">
                     <div className="space-y-2 p-2 pt-4">
                       {loadingContacts ? (
                         <div className="flex items-center justify-center py-8">
                           <Activity className="h-6 w-6 text-purple-600 animate-spin mr-2" />
                           <span className="text-gray-600">Loading labs...</span>
                         </div>
                       ) : labTechs.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">
                           <FlaskConical className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                           <p>No labs available</p>
                         </div>
                       ) : (
                         labTechs.map((lab) => (
                        <div
                          key={lab.id}
                          onClick={() => setSelectedContact(lab)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedContact?.id === lab.id
                              ? 'bg-green-100 border-green-300 shadow-sm'
                              : 'bg-white hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <FlaskConical className="h-8 w-8 text-purple-600" />
                                {onlineUsers.has(lab.id) && (
                                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{lab.name}</p>
                                <p className="text-sm text-gray-600">{lab.specialty}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getUnreadCount(lab.id) > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  {getUnreadCount(lab.id)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                       ))
                       )}
                     </div>
                   </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="h-full flex flex-col bg-white border-2 border-gray-200 shadow-md">
              {selectedContact ? (
                <>
                  <CardHeader className="border-b flex-shrink-0 bg-gray-50 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {selectedContact.role === 'doctor' ? (
                            <Stethoscope className="h-8 w-8 text-green-600" />
                          ) : (
                            <FlaskConical className="h-8 w-8 text-purple-600" />
                          )}
                          {onlineUsers.has(selectedContact.id) && (
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
                          <CardDescription>
                            {selectedContact.role === 'doctor' ? 'Doctor' : 'Lab Technician'} • {selectedContact.specialty}
                            {onlineUsers.has(selectedContact.id) && (
                              <span className="text-green-600 ml-2">• Online</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 relative contacts-container" ref={messagesContainerRef} onScroll={handleScroll}>
                      {messages.length > 0 && canScrollUp && (
                        <div className="sticky top-0 z-10 bg-gradient-to-b from-white to-transparent pb-2 mb-2">
                          <div className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={scrollToTop}
                              className="text-xs text-gray-500 hover:text-gray-700 bg-white/80 backdrop-blur-sm"
                            >
                              ↑ Scroll to Top
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`p-3 rounded-lg max-w-xs lg:max-w-md ${
                              message.sender_id === currentUserId
                                ? 'bg-green-100 text-gray-900'
                                : 'bg-blue-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>{formatTime(message.created_at)}</span>
                              {message.sender_id === currentUserId && (
                                <div className="flex items-center">
                                  {message.is_read ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <Check className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="border-t p-4 flex-shrink-0">
                      <div className="flex space-x-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
                          className="flex-1"
                          disabled={sending}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {sending ? (
                            <Activity className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Select a contact to start chatting</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 