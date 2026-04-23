# Fix Video Consultation RLS Error

## Problem
You're seeing: **"Permission denied. RLS policy violation"**

This happens because Supabase Row Level Security (RLS) is blocking access to the `consultation_meetings` table.

## Quick Fix (2 minutes)

### Option 1: Run SQL Script (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `scripts/fix-rls-policies.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Refresh your MedSync app and try video call again

### Option 2: Disable RLS Temporarily (Quick but less secure)
1. Go to Supabase Dashboard → **Table Editor**
2. Find `consultation_meetings` table
3. Click the table name → **... (three dots)** → **Edit table**
4. **Uncheck** "Enable Row Level Security (RLS)"
5. Click **Save**
6. Refresh your app

## What the SQL Script Does

```sql
-- Allows ALL authenticated users to:
✅ Read meeting records (SELECT)
✅ Create meetings (INSERT)  
✅ Update meeting status (UPDATE)
✅ Delete old meetings (DELETE)
```

This is permissive for development. For production, you'd want stricter policies like:
- Doctors can only see their own meetings
- Patients can only see meetings they're part of

## Verification

After running the script, you should see:
1. **4 policies created** for `consultation_meetings`
2. **No RLS errors** in the console
3. **Video call working** - doctor can create meeting, patient can join

## Still Not Working?

### Check Console Errors
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for detailed error messages
4. Common issues:
   - Table doesn't exist → Run `scripts/create-meetings-table.sql` first
   - Auth errors → Make sure you're logged in
   - Network errors → Check Supabase URL/keys in `.env.local`

### Verify Table Exists
Run this in Supabase SQL Editor:
```sql
SELECT * FROM consultation_meetings LIMIT 1;
```

If you get "relation does not exist", run:
```bash
# In your project root
psql [your-database-url] -f scripts/create-meetings-table.sql
```

Or create the table in Supabase SQL Editor using the `create-meetings-table.sql` script.

## Next Steps After Fix

1. ✅ Video calls should work completely
2. Test with 2 browser windows (doctor + patient roles)
3. Verify both can see each other
4. Check meeting ID is the same for both users

---

**File Locations:**
- RLS Fix SQL: `scripts/fix-rls-policies.sql`
- Table Creation SQL: `scripts/create-meetings-table.sql` (if needed)
- Video Component: `components/video-call.tsx`
