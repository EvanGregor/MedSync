# 🔧 Meeting ID Issue Fix

## Problem Description

The doctor and patient are getting different meeting IDs and cannot join the same video call meeting. This happens because:

1. The `consultation_meetings` table might not exist in the database
2. Row Level Security (RLS) policies might be preventing access
3. The meeting creation/retrieval logic has insufficient error handling

## Root Cause

The issue occurs in the `components/zoom-video-call.tsx` file where:

1. **Meeting Creation**: When a doctor starts a video call, a meeting record should be created in the `consultation_meetings` table
2. **Meeting Retrieval**: When a patient joins, they should retrieve the same meeting record
3. **Database Issues**: The table might not exist or have proper permissions

## Solution

### 1. Database Setup

Run the database fix script to ensure the `consultation_meetings` table exists with proper structure and permissions:

```sql
-- Run this in your Supabase SQL Editor
\i scripts/fix-meeting-id-issue.sql
```

### 2. Code Improvements

The video call component has been enhanced with:

- **Better Error Handling**: Specific error messages for different failure scenarios
- **Enhanced Logging**: Detailed console logs for debugging
- **Permission Checks**: Clear indication when RLS policies are blocking access

### 3. Testing

Run the test script to verify the fix is working:

```sql
-- Run this in your Supabase SQL Editor
\i scripts/test-meeting-id-fix.sql
```

## How It Works

### Meeting Creation Flow

1. **Doctor starts video call**:
   - Generates a unique meeting ID based on appointment ID
   - Creates a record in `consultation_meetings` table
   - Sets the doctor as the host

2. **Patient joins video call**:
   - Queries the `consultation_meetings` table for the appointment
   - Retrieves the same meeting ID and password
   - Joins as an attendee

### Database Schema

```sql
CREATE TABLE consultation_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    meeting_id TEXT NOT NULL,
    password TEXT NOT NULL,
    host_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Policies

- **View Policy**: Users can view meetings for their appointments (doctor OR patient)
- **Create Policy**: Only doctors can create meetings for their appointments
- **Update Policy**: Only hosts can update their meetings

## Troubleshooting

### Common Issues

1. **"Permission denied" error**:
   - Check if RLS policies are properly set up
   - Verify user authentication

2. **"Table does not exist" error**:
   - Run the database fix script
   - Check if the table was created successfully

3. **"Meeting already exists" error**:
   - This is expected behavior - the system prevents duplicate meetings

### Debug Steps

1. **Check browser console** for detailed error messages
2. **Run the test script** to verify database setup
3. **Check Supabase logs** for any database errors
4. **Verify user permissions** in Supabase dashboard

## Files Modified

- `scripts/fix-meeting-id-issue.sql` - Database fix script
- `scripts/test-meeting-id-fix.sql` - Test script
- `components/zoom-video-call.tsx` - Enhanced error handling and logging

## Verification

After applying the fix:

1. **Doctor starts a video call** - should create a meeting record
2. **Patient joins the same call** - should get the same meeting ID
3. **Both users** should be able to join the same Zoom meeting

## Support

If the issue persists:

1. Check the browser console for error messages
2. Run the test script to verify database setup
3. Check Supabase dashboard for any permission issues
4. Contact support with the error details
