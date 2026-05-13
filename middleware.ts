import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ---------- Rate Limiting ----------
// Uses Upstash Redis so state survives serverless cold-starts on Vercel.
// Fallback: if UPSTASH env vars are missing, rate limiting is silently skipped
// so local development still works without Redis.
let authLimiter: Ratelimit | null = null
let apiLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // 20 requests per 60-second sliding window for auth routes
  authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  })

  // 60 requests per 60-second sliding window for API routes
  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
    prefix: "ratelimit:api",
  })
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Rate Limiting (Upstash Redis – production-safe)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const pathname = request.nextUrl.pathname

  // Stricter limit for auth/public routes
  if (pathname === '/login' || pathname === '/signup') {
    if (authLimiter) {
      const { success } = await authLimiter.limit(ip)
      if (!success) {
        return new NextResponse('Too Many Requests', { status: 429 })
      }
    }
  }
  // Standard limit for API routes
  else if (pathname.startsWith('/api')) {
    if (apiLimiter) {
      const { success } = await apiLimiter.limit(ip)
      if (!success) {
        return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.includes("-dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Role-based access control
    const userRole = user.user_metadata?.role
    const requestedDashboard = request.nextUrl.pathname.split("/")[1]

    if (requestedDashboard === "patient-dashboard" && userRole !== "patient") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (requestedDashboard === "doctor-dashboard" && userRole !== "doctor") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (requestedDashboard === "lab-dashboard" && userRole !== "lab") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // 3. Security Headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=*, microphone=*, geolocation=()')
  
  // Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
