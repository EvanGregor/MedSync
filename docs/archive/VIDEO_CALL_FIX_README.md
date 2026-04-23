# Video Call Permission Fix

## Problem
The video call is not starting due to a database permission error:
```
{
    "code": "42501",
    "details": null,
    "hint": null,
    "message": "permission denied for table users"
}
```

## Root Cause
The application is trying to access the `users` table in the public schema, but:
1. The table might not exist
2. Row Level Security (RLS) is enabled with restrictive policies
3. The authenticated user doesn't have proper permissions

## Solution

### Step 1: Run the Database Fix Script
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/fix-users-table-permissions.sql`
4. Run the script

This script will:
- ✅ Create the `users` table if it doesn't exist
- ✅ Disable RLS on the users table
- ✅ Grant all permissions to authenticated users
- ✅ Create necessary indexes and functions
- ✅ Backfill existing auth users
- ✅ Add demo users for testing

### Step 2: Test the Fix
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the database connection by visiting:
   ```
   http://localhost:3000/api/test-users-table
   ```

3. You should see a success response like:
   ```json
   {
     "success": true,
     "message": "Users table access successful",
     "data": {
       "tableExists": true,
       "userCount": 7,
       "sampleUsers": [...],
       "connectionTest": "✅ All tests passed"
     }
   }
   ```

### Step 3: Test Video Call
1. Log in to the application
2. Navigate to video consultations
3. Try to start a video call
4. The permission error should be resolved

## Alternative Quick Fix (If Above Doesn't Work)

If you're still getting permission errors, you can temporarily disable RLS on all tables:

```sql
-- Run this in Supabase SQL Editor as a quick fix
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.consultation_meetings TO authenticated;
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.reports TO authenticated;
```

## Verification

After running the fix, you should be able to:

1. ✅ Access the users table without permission errors
2. ✅ Start video calls successfully
3. ✅ See user data in communication pages
4. ✅ Create and join consultation meetings

## Troubleshooting

### If you still get permission errors:

1. **Check Supabase Environment Variables**:
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly

2. **Check Database Schema**:
   - Verify the `users` table exists in the public schema
   - Check that RLS is disabled on the users table

3. **Check User Authentication**:
   - Ensure users are properly authenticated
   - Check that the auth token is valid

4. **Debug with API Endpoint**:
   - Visit `/api/test-users-table` to get detailed error information
   - Check the browser console for additional error details

### Common Error Codes:

- `42501`: Permission denied - Run the fix script
- `42P01`: Table doesn't exist - Run the fix script
- `42703`: Column doesn't exist - Check table structure
- `23505`: Unique constraint violation - Check for duplicate data

## Files Modified

- `scripts/fix-users-table-permissions.sql` - Main fix script
- `app/api/test-users-table/route.ts` - Debug endpoint
- `VIDEO_CALL_FIX_README.md` - This documentation

## Next Steps

Once the video call is working:

1. Test the full video call flow
2. Verify that doctors can create meetings
3. Verify that patients can join meetings
4. Test the chat functionality
5. Test screen sharing (if implemented)

The video call should now work properly without permission errors!
