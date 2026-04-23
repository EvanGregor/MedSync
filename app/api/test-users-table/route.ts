import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Test 1: Check if we can connect to Supabase
    console.log('🔍 Testing Supabase connection...')
    
    // Test 2: Check if users table exists
    console.log('🔍 Checking if users table exists...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Users table access failed:', tableError)
      return NextResponse.json({
        success: false,
        error: 'Users table access failed',
        details: {
          code: tableError.code,
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint
        }
      }, { status: 500 })
    }
    
    // Test 3: Try to get actual user data
    console.log('🔍 Testing user data retrieval...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, online')
      .limit(5)
    
    if (usersError) {
      console.error('❌ User data retrieval failed:', usersError)
      return NextResponse.json({
        success: false,
        error: 'User data retrieval failed',
        details: {
          code: usersError.code,
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint
        }
      }, { status: 500 })
    }
    
    // Test 4: Check current user
    console.log('🔍 Checking current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Current user check failed:', userError)
      return NextResponse.json({
        success: false,
        error: 'Current user check failed',
        details: {
          code: userError.code,
          message: userError.message,
          details: userError.details,
          hint: userError.hint
        }
      }, { status: 500 })
    }
    
    // Test 5: Try to get current user from users table
    let currentUserData = null
    if (user) {
      console.log('🔍 Getting current user from users table...')
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      
      if (currentUserError) {
        console.error('❌ Current user data retrieval failed:', currentUserError)
      } else {
        currentUserData = currentUser
      }
    }
    
    // Success response
    return NextResponse.json({
      success: true,
      message: 'Users table access successful',
      data: {
        tableExists: true,
        userCount: users?.length || 0,
        sampleUsers: users,
        currentUser: user ? {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role,
          name: user.user_metadata?.name
        } : null,
        currentUserData: currentUserData,
        connectionTest: '✅ All tests passed'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Unexpected error in test-users-table:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 })
  }
}
