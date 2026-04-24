import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import { UUID_REGEX } from '@/lib/constants'
import { analysisRequestSchema } from '@/lib/schemas'
import { verifySession, unauthorizedResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const { user } = await verifySession()
    if (!user) {
      return unauthorizedResponse()
    }
    // Validate environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase URL' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      )
    }

    const body = await request.json()

    // Strict Zod Validation
    const validation = analysisRequestSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation Error:', validation.error.format())
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { fileName, originalName, patientId, doctorId, testType, reportId } = validation.data

    console.log('Environment check passed, creating Supabase client...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('Internal API Key configured:', !!process.env.INTERNAL_API_KEY)

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

    console.log('Supabase client created successfully')
    console.log('Attempting to download file:', fileName)

    // Download file from Supabase Storage using service role
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('reports')
      .download(fileName)

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download file', details: downloadError?.message },
        { status: 500 }
      )
    }

    console.log('File downloaded successfully, size:', fileData.size)

    // Convert file to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create unique filename for temp processing
    const fileExtension = path.extname(originalName)
    const tempFileName = `ml_process_${Date.now()}${fileExtension}`
    const tempFilePath = join(tmpdir(), tempFileName)

    // Write file to temp directory
    await writeFile(tempFilePath, buffer)
    console.log('File written to temp directory:', tempFilePath)

    // Call FastAPI for ML analysis
    let prediction
    try {
      const fastApiForm = new FormData();
      fastApiForm.append('scan_type', testType === 'x_ray' ? 'xray' : testType === 'mri' ? 'mri' : testType);
      fastApiForm.append('file', buffer, originalName);

      console.log(`Sending ${testType} image to ML service...`)

      const internalKey = process.env.INTERNAL_API_KEY || 'default-secret-key';

      const response = await axios.post('http://localhost:8000/analyze', fastApiForm, {
        headers: {
          ...fastApiForm.getHeaders(),
          'X-Internal-Secret': internalKey
        },
        timeout: 30000, // 30 second timeout
      });

      prediction = response.data;
      console.log('ML analysis result:', prediction)

      // Ensure all required fields are present
      if (!prediction.findings) prediction.findings = 'No specific findings detected.';
      if (typeof prediction.confidence !== 'number') prediction.confidence = 0.5;
      if (!prediction.recommendations) prediction.recommendations = 'No recommendations available.';
      if (!prediction.severity) prediction.severity = 'unknown';

    } catch (err: any) {
      console.error('ML processing error:', err.message)
      prediction = {
        findings: 'AI analysis unavailable. Please review manually.',
        confidence: 0.0,
        recommendations: 'Manual review recommended.',
        severity: 'unknown',
      };
    }

    // Resolve patientId: allow short_id or UUID for consistency with lab-upload
    let resolvedPatientId = patientId
    // Resolve doctorId
    let resolvedDoctorId = doctorId

    console.log('🔍 Resolving IDs - Original doctorId:', doctorId, 'patientId:', patientId)

    if (doctorId && !UUID_REGEX.test(doctorId)) {
      console.log('🔍 Resolving doctor Short ID:', doctorId)
      const { data: shortDoc, error: docErr } = await supabase
        .from('user_short_ids')
        .select('user_id')
        .ilike('short_id', doctorId)
        .maybeSingle()

      if (docErr) {
        console.warn('⚠️ Doctor Short ID resolution error:', docErr)
      }

      if (shortDoc?.user_id) {
        resolvedDoctorId = shortDoc.user_id
        console.log('✅ Doctor ID resolved to UUID:', resolvedDoctorId)
      } else {
        console.warn('⚠️ Doctor Short ID not found:', doctorId)
      }
    } else if (doctorId && UUID_REGEX.test(doctorId)) {
      console.log('✅ Doctor ID is already a valid UUID:', doctorId)
    }

    if (patientId && !UUID_REGEX.test(patientId)) {
      console.log('🔍 Resolving patient Short ID:', patientId)
      const { data: shortMatch, error: shortErr } = await supabase
        .from('user_short_ids')
        .select('user_id')
        .ilike('short_id', patientId)
        .maybeSingle()

      if (shortErr) {
        console.warn('⚠️ Patient Short ID resolution error:', shortErr)
      }

      if (!shortErr && shortMatch?.user_id) {
        resolvedPatientId = shortMatch.user_id
        console.log('✅ Patient ID resolved to UUID:', resolvedPatientId)
      } else {
        console.warn('⚠️ Patient Short ID not found:', patientId)
      }
    } else if (patientId && UUID_REGEX.test(patientId)) {
      console.log('✅ Patient ID is already a valid UUID:', patientId)
    }

    console.log('🔍 Final resolved IDs - Doctor:', resolvedDoctorId, 'Patient:', resolvedPatientId)

    // Use the reportId passed from the frontend
    if (!reportId) {
      console.error('No reportId provided for ML processing')
      return NextResponse.json(
        { error: 'Report ID is required for ML processing' },
        { status: 400 }
      )
    }

    // Update the existing report with ML results
    // Use the resolved doctor ID (UUID) instead of the original input
    console.log('📊 Updating report with ML results - Report ID:', reportId, 'Doctor ID:', resolvedDoctorId)

    const updateData = {
      result: prediction,
      updated_at: new Date().toISOString(),
      doctor_id: resolvedDoctorId || null, // Use resolved UUID, not original input
    }

    console.log('📊 Update data:', JSON.stringify(updateData, null, 2))

    const { error: updateError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)

    if (updateError) {
      console.error('Error updating report with ML results:', updateError)

      // If it's a UUID format error, provide more specific guidance
      if (updateError.message.includes('invalid input syntax for type uuid')) {
        console.error('UUID format error detected. Doctor ID:', resolvedDoctorId)
        return NextResponse.json(
          {
            error: 'Failed to update report with ML results',
            details: `Invalid UUID format for doctor ID: ${resolvedDoctorId}. This might be a Short ID that couldn't be resolved to a UUID.`,
            suggestion: 'Please ensure the doctor ID is a valid UUID or Short ID that exists in the system.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update report with ML results', details: updateError.message },
        { status: 500 }
      )
    }

    // Store ML suggestion in ml_suggestions table
    const { data: suggestionData, error: suggestionError } = await supabase
      .from('ml_suggestions')
      .insert({
        report_id: reportId,
        patient_id: resolvedPatientId || patientId,
        test_type: testType,
        findings: prediction.findings,
        confidence: prediction.confidence,
        recommendations: prediction.recommendations,
        severity: prediction.severity,
        status: 'pending_review',
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (suggestionError) {
      console.error('Error creating ML suggestion:', suggestionError)
      return NextResponse.json(
        { error: 'Failed to store ML suggestion', details: suggestionError.message },
        { status: 500 }
      )
    }

    // Create notification for doctors about new ML analysis
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: reportId, // Use report ID as user_id for now
          title: 'AI Analysis Complete',
          message: `AI analysis completed for ${testType} report - Patient ID: ${patientId}`,
          notification_type: 'ml_suggestion',
          related_id: suggestionData.id,
          related_type: 'ml_suggestion',
          data: {
            patient_id: patientId,
            test_type: testType,
            suggestion_id: suggestionData.id,
            confidence: prediction.confidence,
            severity: prediction.severity
          }
        })
    } catch (notificationError) {
      console.warn('Notification creation failed:', notificationError)
      // Continue even if notification fails
    }

    // Clean up temp file
    try {
      await writeFile(tempFilePath, '') // Clear the file
    } catch (cleanupError) {
      console.warn('Temp file cleanup failed:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      reportId: reportId,
      suggestionId: suggestionData.id,
      prediction,
    })

  } catch (error: any) {
    console.error('ML processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 