import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/constants'
import { verifySession, unauthorizedResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const { user } = await verifySession()
    if (!user) {
      return unauthorizedResponse()
    }
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables')
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

    // Get the request body
    const body = await request.json()
    const { 
      patientId, 
      doctorId,
      testType, 
      originalName, 
      fileName, 
      priority, 
      notes, 
      uploadedBy,
      patientInfo 
    } = body

    // Validate required fields
    if (!patientId || !doctorId || !testType || !originalName || !fileName || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Resolve patientId: accept short_id or UUID
    let resolvedPatientId = patientId
    if (!UUID_REGEX.test(patientId)) {
      const { data: shortMatch, error: shortErr } = await supabase
        .from('user_short_ids')
        .select('user_id')
        .eq('short_id', patientId)
        .maybeSingle()

      if (shortErr) {
        console.warn('⚠️ Short ID lookup error:', shortErr.message)
      }
      if (shortMatch?.user_id) {
        resolvedPatientId = shortMatch.user_id
      } else {
        return NextResponse.json(
          { error: 'Invalid patient identifier. Use a valid short code or UUID.' },
          { status: 400 }
        )
      }
    }

    // Resolve doctorId: accept short_id or UUID
    let resolvedDoctorId = doctorId
    if (!UUID_REGEX.test(doctorId)) {
      const { data: shortDoc, error: docErr } = await supabase
        .from('user_short_ids')
        .select('user_id')
        .eq('short_id', doctorId)
        .maybeSingle()

      if (docErr) {
        console.warn('⚠️ Doctor Short ID lookup error:', docErr.message)
      }
      if (shortDoc?.user_id) {
        resolvedDoctorId = shortDoc.user_id
      } else {
        return NextResponse.json(
          { error: 'Invalid doctor identifier. Use a valid short code or UUID.' },
          { status: 400 }
        )
      }
    }

    console.log('🔐 Simple upload for user:', uploadedBy)
    console.log('📁 File:', fileName, 'Patient:', resolvedPatientId, 'Doctor:', resolvedDoctorId, 'Type:', testType)

    // Create a simple record with minimal data
    const simpleRecord = {
      patient_id: resolvedPatientId,
      doctor_id: resolvedDoctorId,
      test_type: testType,
      original_name: originalName,
      file_name: fileName,
      priority: priority || 'normal',
      notes: notes || '',
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString(),
      status: 'uploaded'
    }

    // Try to insert into reports table
    let reportId = null
    try {
      const { data: reportData, error: dbError } = await supabase
        .from('reports')
        .insert(simpleRecord)
        .select('id')
        .single()

      if (dbError) {
        console.warn('⚠️ Database insert failed, continuing with file only:', dbError.message)
      } else {
        reportId = reportData.id
        console.log('✅ Report created with ID:', reportId)
      }
    } catch (dbError) {
      console.warn('⚠️ Database insert failed, continuing with file only:', dbError)
    }

    // Return success response (even if database insert failed)
    return NextResponse.json({
      success: true,
      reportId: reportId,
      fileName: fileName,
      message: reportId ? 'Report uploaded successfully' : 'File uploaded, database record may be incomplete'
    })

  } catch (error: any) {
    console.error('❌ Simple upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    )
  }
}
