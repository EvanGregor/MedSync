import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'

export async function POST(request: NextRequest) {
  try {
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
    const { fileName, originalName, patientId, testType, reportId } = body

    if (!fileName || !patientId || !testType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Environment check passed, creating Supabase client...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

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
      
      const response = await axios.post('http://localhost:8000/analyze', fastApiForm, {
        headers: fastApiForm.getHeaders(),
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

    // Use the reportId passed from the frontend
    if (!reportId) {
      console.error('No reportId provided for ML processing')
      return NextResponse.json(
        { error: 'Report ID is required for ML processing' },
        { status: 400 }
      )
    }

    // Update the existing report with ML results
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        result: prediction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Error updating report with ML results:', updateError)
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
        patient_id: patientId,
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