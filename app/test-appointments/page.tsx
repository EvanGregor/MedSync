"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"

export default function TestAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testAppointments()
  }, [])

  const testAppointments = async () => {
    const supabase = createClient()
    
    try {
      console.log('🧪 Testing appointments...')
      
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('No user found')
        return
      }
      
      console.log('🧪 User:', user.id)
      
      // 2. Get all appointments
      const { data: allAppointments, error: allError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('🧪 All appointments:', allAppointments)
      console.log('🧪 All appointments error:', allError)
      
      // 3. Get today's appointments
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', today)
        .order('start_time', { ascending: true })
      
      console.log('🧪 Today\'s date:', today)
      console.log('🧪 Today\'s appointments:', todayAppointments)
      console.log('🧪 Today\'s appointments error:', todayError)
      
      // 4. Get doctor info
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      console.log('🧪 Doctor info:', doctor)
      console.log('🧪 Doctor error:', doctorError)
      
      // 5. Get appointments for this doctor
      if (doctor) {
        const { data: doctorAppointments, error: doctorAppError } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', doctor.id)
          .order('appointment_date', { ascending: true })
        
        console.log('🧪 Doctor appointments:', doctorAppointments)
        console.log('🧪 Doctor appointments error:', doctorAppError)
      }
      
      setAppointments(allAppointments || [])
      
    } catch (error) {
      console.error('🧪 Test error:', error)
      setError('Test failed')
    } finally {
      setLoading(false)
    }
  }

  const createTestAppointment = async () => {
    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        alert('No user found')
        return
      }
      
      // Get doctor info
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (doctorError || !doctor) {
        alert('No doctor found')
        return
      }
      
      // Create test appointment
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: newAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          doctor_id: doctor.id,
          patient_id: doctor.id, // Use doctor as patient for testing
          patient_name: 'Test Patient',
          doctor_name: doctor.name,
          appointment_date: today,
          start_time: '14:00:00',
          end_time: '14:30:00',
          duration_minutes: 30,
          appointment_type: 'consultation',
          status: 'scheduled',
          notes: 'Test appointment created from test page'
        })
        .select()
      
      if (insertError) {
        alert(`Error creating appointment: ${insertError.message}`)
      } else {
        alert('Test appointment created successfully!')
        testAppointments() // Refresh the list
      }
      
    } catch (error) {
      console.error('Error creating test appointment:', error)
      alert('Error creating test appointment')
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Appointments Test Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <button 
          onClick={createTestAppointment}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Create Test Appointment
        </button>
        <button 
          onClick={testAppointments}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">All Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <p className="text-gray-500">No appointments found</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border p-3 rounded">
                <div><strong>Patient:</strong> {appointment.patient_name}</div>
                <div><strong>Doctor:</strong> {appointment.doctor_name}</div>
                <div><strong>Date:</strong> {appointment.appointment_date}</div>
                <div><strong>Time:</strong> {appointment.start_time}</div>
                <div><strong>Status:</strong> {appointment.status}</div>
                <div><strong>Doctor ID:</strong> {appointment.doctor_id}</div>
                <div><strong>Patient ID:</strong> {appointment.patient_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  )
}
