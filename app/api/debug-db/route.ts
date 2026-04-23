import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const results: any = {
        timestamp: new Date().toISOString(),
        checks: {}
    }

    try {
        // Create admin client with service role key for testing
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        results.checks.envVars = {
            hasSupabaseUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
            hasAnonKey: !!supabaseAnonKey,
            supabaseUrl: supabaseUrl
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing Supabase environment variables',
                results
            })
        }

        // Create client with service role key (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Test 1: Check if consultation_meetings table exists
        const { data: tableCheck, error: tableError } = await supabase
            .from('consultation_meetings')
            .select('id')
            .limit(1)

        results.checks.tableExists = {
            exists: !tableError || tableError.code !== '42P01',
            error: tableError ? { code: tableError.code, message: tableError.message } : null,
            data: tableCheck
        }

        // Test 2: Check table structure
        const { data: columns, error: columnsError } = await supabase
            .rpc('get_table_columns', { table_name: 'consultation_meetings' })
            .single()

        // Fallback if RPC doesn't exist
        if (columnsError) {
            results.checks.tableStructure = {
                error: 'Could not check table structure via RPC',
                rpcError: columnsError.message
            }
        } else {
            results.checks.tableStructure = columns
        }

        // Test 3: Try to insert a test record
        const testMeetingId = 'TEST_' + Date.now()
        const { data: insertData, error: insertError } = await supabase
            .from('consultation_meetings')
            .insert({
                appointment_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
                meeting_id: testMeetingId,
                password: 'test123',
                host_id: '00000000-0000-0000-0000-000000000000',
                is_active: false
            })
            .select()
            .single()

        results.checks.insertTest = {
            success: !insertError,
            error: insertError ? {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            } : null,
            data: insertData
        }

        // Clean up test record if it was created
        if (!insertError) {
            await supabase
                .from('consultation_meetings')
                .delete()
                .eq('meeting_id', testMeetingId)
            results.checks.insertTest.cleanedUp = true
        }

        // Test 4: Check RLS policies
        const { data: policies, error: policiesError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'consultation_meetings')

        results.checks.rlsPolicies = {
            policies: policies || [],
            error: policiesError ? policiesError.message : null
        }

        // Test 5: Check appointments table exists
        const { data: appointmentsCheck, error: appointmentsError } = await supabase
            .from('appointments')
            .select('id')
            .limit(1)

        results.checks.appointmentsTable = {
            exists: !appointmentsError,
            sampleId: appointmentsCheck?.[0]?.id,
            error: appointmentsError ? appointmentsError.message : null
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            results
        })
    }
}
