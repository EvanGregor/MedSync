import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
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
      testType, 
      originalName, 
      fileName, 
      priority, 
      notes, 
      uploadedBy,
      patientInfo 
    } = body

    // Validate required fields
    if (!patientId || !testType || !originalName || !fileName || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('🔐 Server-side upload for user:', uploadedBy)
    console.log('📁 File:', fileName, 'Patient:', patientId, 'Type:', testType)

    // Insert report into database using service role (bypasses RLS)
    const { data: reportData, error: dbError } = await supabase
      .from('reports')
      .insert({
        patient_id: patientId,
        test_type: testType,
        original_name: originalName,
        file_name: fileName,
        priority: priority || 'normal',
        notes: notes || '',
        uploaded_by: uploadedBy,
        patient_info: patientInfo || {}
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('❌ Database insert error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create report', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('✅ Report created successfully with ID:', reportData.id)

    // Create notification for doctors
    try {
      await supabase
        .from('notifications')
        .insert({
          type: 'new_report',
          title: 'New Lab Report Available',
          message: `A new ${testType} report has been uploaded for Patient ID: ${patientId}`,
          target_role: 'doctor',
          data: {
            patient_id: patientId,
            test_type: testType,
            file_name: originalName,
            priority: priority || 'normal',
            report_id: reportData.id
          }
        })
      console.log('✅ Notification created successfully')
    } catch (notificationError) {
      console.warn('⚠️ Notification creation failed:', notificationError)
      // Continue even if notification fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      reportId: reportData.id,
      message: 'Report uploaded successfully'
    })

  } catch (error: any) {
    console.error('❌ Server-side upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
