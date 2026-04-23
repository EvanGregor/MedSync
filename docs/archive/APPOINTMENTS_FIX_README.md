# Appointments Loading Issue - Fix Guide

## Problem Description
The appointments are not loading in the doctor dashboard consultations section. This is likely due to one or more of the following issues:

1. **Missing Database Tables**: The `appointments`, `doctors`, or `patients` tables don't exist
2. **Incorrect Table Structure**: Tables exist but have wrong column types or missing columns
3. **Missing Sample Data**: Tables exist but have no data to display
4. **Permission Issues**: Database permissions are not set correctly
5. **ID Mismatch**: Doctor ID in appointments doesn't match the logged-in user

## Solution Steps

### Step 1: Run the Database Setup Script
Execute the comprehensive fix script in your Supabase SQL Editor:

```sql
-- Run this in Supabase SQL Editor
-- File: scripts/fix-appointments-loading.sql
```

**If you get column errors, use the simple version instead:**

```sql
-- Run this in Supabase SQL Editor (if the above fails)
-- File: scripts/fix-appointments-simple.sql
```

These scripts will:
- Create the `appointments`, `doctors`, and `patients` tables if they don't exist
- Handle existing tables with missing columns gracefully
- Set up proper indexes for performance
- Disable Row Level Security (RLS) for testing
- Grant proper permissions
- Insert sample data for testing

### Step 2: Verify the Setup
Run the test script to verify everything is working:

```sql
-- Run this in Supabase SQL Editor
-- File: scripts/test-appointments-setup.sql
```

This will show you:
- Which tables exist
- How many records are in each table
- Sample appointments for today
- Doctor-patient relationships

### Step 3: Check the Application
After running the scripts:

1. **Log in as a doctor** in your application
2. **Navigate to the consultations page** (`/doctor-dashboard/consultations`)
3. **Check the browser console** for any error messages
4. **Verify appointments are displayed**

## Expected Results

After running the fix scripts, you should see:

### In the Database:
- `appointments` table with proper structure
- `doctors` table with at least one doctor record
- `patients` table with at least one patient record
- Sample appointments for today and tomorrow

### In the Application:
- Consultations page loads without errors
- Today's appointments are displayed
- Appointment details (patient name, time, type, status) are shown
- Action buttons (Start, Join, View Notes) are functional

## Troubleshooting

### If appointments still don't load:

1. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look for error messages in the Console tab
   - Common errors: "relation does not exist", "permission denied"

2. **Verify Database Connection**:
   - Check if your Supabase URL and API key are correct
   - Ensure the database is accessible

3. **Check User Authentication**:
   - Make sure you're logged in as a doctor
   - Verify the user has the correct role in `user_metadata`

4. **Manual Database Check**:
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('appointments', 'doctors', 'patients');
   
   -- Check appointments count
   SELECT COUNT(*) FROM public.appointments;
   
   -- Check today's appointments
   SELECT * FROM public.appointments 
   WHERE appointment_date = CURRENT_DATE;
   ```

### If you see demo data:
The application is designed to show demo data when:
- The appointments table doesn't exist
- There are no appointments in the database
- There's a database error

This is normal behavior and indicates the fallback system is working.

## File Changes Made

### 1. Fixed Debug Script
- **File**: `scripts/debug-appointments.sql`
- **Change**: Fixed syntax error in SQL query

### 2. Updated Consultations Page
- **File**: `app/doctor-dashboard/consultations/page.tsx`
- **Change**: Added better doctor ID resolution logic

### 3. Created Fix Script
- **File**: `scripts/fix-appointments-loading.sql`
- **Purpose**: Comprehensive database setup and sample data creation

### 4. Created Test Script
- **File**: `scripts/test-appointments-setup.sql`
- **Purpose**: Verify the setup is working correctly

## Database Schema

### Appointments Table
```sql
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    patient_name TEXT NOT NULL,
    doctor_name TEXT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type TEXT DEFAULT 'consultation',
    consultation_type TEXT DEFAULT 'video',
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Doctors Table
```sql
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Patients Table
```sql
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Next Steps

After fixing the appointments loading issue:

1. **Test the full workflow**: Create, view, and manage appointments
2. **Add more sample data**: Create additional appointments for testing
3. **Implement appointment creation**: Add functionality to create new appointments
4. **Add real-time updates**: Implement WebSocket or polling for live updates
5. **Add appointment notifications**: Send reminders and updates to users

## Support

If you continue to experience issues:

1. Check the browser console for specific error messages
2. Verify the database scripts ran successfully
3. Ensure your Supabase project is properly configured
4. Check that the user has the correct role and permissions
