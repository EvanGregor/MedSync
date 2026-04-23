# 🔧 Meeting ID RLS Policy Troubleshooting Guide

## Problem
Error code `42501`: "new row violates row-level security policy for table 'consultation_meetings'"

## Root Cause Analysis

The issue occurs because the Row Level Security (RLS) policy is preventing doctors from creating meeting records. This happens due to:

1. **ID Format Mismatch**: The `appointments` table stores `doctor_id` in different formats (UUID vs short ID)
2. **RLS Policy Logic**: The policy checks `doctor_id = auth.uid()` but they might be in different formats
3. **User Role Verification**: The policy might not properly verify the user's role

## Quick Fixes

### Option 1: Disable RLS Temporarily (For Testing)

Run this in your Supabase SQL Editor:

```sql
-- Quick fix: Disable RLS temporarily
ALTER TABLE public.consultation_meetings DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'consultation_meetings';
```

### Option 2: Use Permissive RLS Policies

Run the simple fix script:

```sql
-- Copy and paste the contents of scripts/fix-meeting-id-issue-simple.sql
```

### Option 3: Advanced RLS Fix

Run the comprehensive fix script:

```sql
-- Copy and paste the contents of scripts/fix-meeting-id-issue.sql
```

## Debugging Steps

### 1. Check Current RLS Status

```sql
-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'consultation_meetings';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'consultation_meetings';
```

### 2. Check User Authentication

```sql
-- Check current user
SELECT auth.uid() as current_user_id;

-- Check user metadata
SELECT 
    id,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE id = auth.uid();
```

### 3. Check Appointment Data

```sql
-- Check appointment structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('doctor_id', 'patient_id');

-- Check sample appointments
SELECT 
    id,
    doctor_id,
    patient_id,
    appointment_date
FROM public.appointments 
LIMIT 5;
```

### 4. Check User Short IDs

```sql
-- Check if current user has a short ID
SELECT 
    user_id,
    short_id,
    role
FROM public.user_short_ids 
WHERE user_id = auth.uid();
```

## Testing the Fix

### 1. Test Meeting Creation

1. **Login as a doctor**
2. **Go to consultations page**
3. **Click "Start Video Call"**
4. **Check browser console for errors**
5. **Click the 🐛 debug button if available**

### 2. Test Meeting Retrieval

1. **Login as a patient**
2. **Go to consultations page**
3. **Click "Join Video Call"**
4. **Verify you get the same meeting ID as the doctor**

### 3. Check Database Records

```sql
-- Check if meeting was created
SELECT 
    cm.id,
    cm.appointment_id,
    cm.meeting_id,
    cm.password,
    cm.host_id,
    cm.is_active,
    a.doctor_name,
    a.patient_name
FROM public.consultation_meetings cm
LEFT JOIN public.appointments a ON cm.appointment_id = a.id
ORDER BY cm.created_at DESC
LIMIT 5;
```

## Common Issues and Solutions

### Issue 1: "Permission denied" Error

**Cause**: RLS policy is too restrictive

**Solution**: 
```sql
-- Use permissive policy
CREATE POLICY "Allow doctors to create meetings" ON public.consultation_meetings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'doctor'
        )
    );
```

### Issue 2: "Table does not exist" Error

**Cause**: Database table not created

**Solution**: Run the table creation script:
```sql
CREATE TABLE IF NOT EXISTS public.consultation_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL,
    meeting_id TEXT NOT NULL,
    password TEXT NOT NULL,
    host_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Issue 3: "Meeting already exists" Error

**Cause**: Duplicate meeting creation attempt

**Solution**: This is expected behavior. The system prevents duplicate meetings.

## Production Considerations

### Security Best Practices

1. **Don't disable RLS permanently** - Use proper policies instead
2. **Test thoroughly** - Ensure only authorized users can access meetings
3. **Monitor logs** - Watch for unusual access patterns
4. **Regular audits** - Review RLS policies periodically

### Recommended RLS Policy

```sql
-- Secure but functional RLS policy
CREATE POLICY "Users can view their meetings" ON public.consultation_meetings
    FOR SELECT USING (
        appointment_id IN (
            SELECT id FROM public.appointments 
            WHERE 
                doctor_id = auth.uid()::text OR 
                patient_id = auth.uid()::text OR
                doctor_id IN (
                    SELECT short_id FROM public.user_short_ids 
                    WHERE user_id = auth.uid()
                ) OR
                patient_id IN (
                    SELECT short_id FROM public.user_short_ids 
                    WHERE user_id = auth.uid()
                )
        )
    );

CREATE POLICY "Doctors can create meetings" ON public.consultation_meetings
    FOR INSERT WITH CHECK (
        host_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'doctor'
        )
    );
```

## Support

If the issue persists:

1. **Check browser console** for detailed error messages
2. **Run debug API**: `/api/debug-meeting?appointmentId=YOUR_APPOINTMENT_ID`
3. **Check Supabase logs** for database errors
4. **Verify user permissions** in Supabase dashboard
5. **Contact support** with error details and debug information
