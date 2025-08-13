import { createBrowserClient } from "@supabase/ssr"

export function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  return client
}

// Enhanced client with authentication checks
export async function createAuthenticatedClient() {
  const client = createAuthClient()
  
  // Get current session
  const { data: { session }, error } = await client.auth.getSession()
  
  if (error) {
    console.error('Authentication error:', error)
    throw new Error('Authentication failed')
  }
  
  if (!session) {
    console.error('No active session')
    throw new Error('No active session. Please log in again.')
  }
  
  console.log('✅ Authenticated client created for user:', session.user.id)
  return client
}

// Test database connection with authentication
export async function testDatabaseConnection() {
  try {
    console.log('🧪 Starting database connection test...')
    const client = await createAuthenticatedClient()
    
    console.log('✅ Authenticated client created, testing database access...')
    
    // Test basic database access
    const { data, error } = await client
      .from('reports')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Database connection test successful, data:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ Database connection test error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
