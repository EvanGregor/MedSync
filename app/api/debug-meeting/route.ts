import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create service role client for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get appointment ID from query params
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Check if consultation_meetings table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'consultation_meetings')
      .eq('table_schema', 'public')
      .maybeSingle()

    if (tableError) {
      console.error('Error checking table existence:', tableError)
    }

    // Get meeting details for the appointment
    const { data: meetings, error: meetingsError } = await supabase
      .from('consultation_meetings')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('is_active', true)

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError)
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle()

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError)
    }

    // Get RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'consultation_meetings')

    if (policiesError) {
      console.error('Error fetching policies:', policiesError)
    }

    // Return debug information
    return NextResponse.json({
      success: true,
      debug: {
        appointmentId,
        tableExists: !!tableExists,
        meetings: meetings || [],
        appointment: appointment || null,
        policies: policies || [],
        errors: {
          tableError: tableError?.message,
          meetingsError: meetingsError?.message,
          appointmentError: appointmentError?.message,
          policiesError: policiesError?.message
        }
      }
    })

  } catch (error) {
    console.error('Debug meeting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
