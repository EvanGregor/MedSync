import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// IMPORTANT: In-memory rate limiting only works on a single instance.
// For production Vercel deployment (Serverless), please use Upstash/Redis.
// Example: const redis = new Redis({ ... });
const rateLimitMap = new Map();

const rateLimit = (ip: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  const requestTimestamps = rateLimitMap.get(ip) || [];
  const requestsInWindow = requestTimestamps.filter((timestamp: number) => timestamp > windowStart);

  if (requestsInWindow.length >= limit) {
    return false;
  }

  requestsInWindow.push(now);
  rateLimitMap.set(ip, requestsInWindow);
  return true;
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Rate Limiting
  // 1. Rate Limiting
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const pathname = request.nextUrl.pathname;

  // Stricter limit for auth/public routes (20 req/min)
  if (pathname === '/login' || pathname === '/signup') {
    if (!rateLimit(`${ip}:auth`, 20, 60 * 1000)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  // Standard limit for API routes (60 req/min)
  else if (pathname.startsWith('/api')) {
    if (!rateLimit(`${ip}:api`, 60, 60 * 1000)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
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
