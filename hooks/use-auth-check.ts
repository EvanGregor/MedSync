"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"

export type UserRole = "doctor" | "patient" | "lab"

interface AuthCheckResult {
  user: any | null
  shortId: string | null
  loading: boolean
  error: any | null
}

export function useAuthCheck(requiredRole?: UserRole) {
  const [user, setUser] = useState<any>(null)
  const [shortId, setShortId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const loadingRef = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)

      try {
        const supabase = createClient()
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        const user = session?.user || null

        if (authError || !user) {
          console.error("useAuthCheck: getUser failed!", authError)
          router.push("/login")
          return
        }

        const userRole = user.app_metadata?.role || user.user_metadata?.role

        if (requiredRole && userRole !== requiredRole) {
          console.error(`Unauthorized access: required ${requiredRole}, got ${userRole}`)
          router.push("/login")
          return
        }

        setUser(user)

        // Resolve the ID from the current schema. Phase 3 consolidated IDs
        // onto profiles and removed user_short_ids.
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('short_id')
            .eq('id', user.id)
            .maybeSingle()

          if (profileError) {
            console.warn("Could not resolve short ID:", profileError)
          } else {
            setShortId(profile?.short_id || null)
          }
        } catch (idError) {
          console.warn('Failed to resolve short ID:', idError)
        }

      } catch (e) {
        console.error('Auth check error:', e)
        setError(e)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    checkAuth()
  }, [requiredRole, router])

  return { user, shortId, loading, error }
}
