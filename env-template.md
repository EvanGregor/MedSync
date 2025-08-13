# Environment Variables Required for ML Process

## Required Variables

You need to add these environment variables to your `.env.local` file:

```bash
# Your existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NEW: Service Role Key for ML Process
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## How to Get the Service Role Key

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings > API**
3. **Copy the "service_role" key** (NOT the anon key)
4. **Add it to your `.env.local` file**

## Why This is Needed

- **Client-side operations** (lab upload) use the `anon` key
- **Server-side operations** (ML process download) need the `service_role` key
- **Service role key** has elevated permissions for server-side access
- **Without it**, the ML process can't download files from storage

## Security Note

- **Never expose** the service role key in client-side code
- **Only use it** in server-side API routes
- **The service role key** bypasses RLS policies (which is what we want for ML processing)

## After Adding the Variable

1. **Restart your Next.js development server**
2. **Run the storage fix script** in Supabase SQL editor
3. **Test lab upload** - should work end-to-end now
