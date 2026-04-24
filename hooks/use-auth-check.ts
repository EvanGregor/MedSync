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
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push("/login")
          return
        }

        const userRole = user.user_metadata?.role

        if (requiredRole && userRole !== requiredRole) {
          console.error(`Unauthorized access: required ${requiredRole}, got ${userRole}`)
          router.push("/login")
          return
        }

        setUser(user)

        // Resolve Short ID
        try {
          let resolvedShortId: string | null = null
          const { data: userRow } = await supabase.from('users').select('short_id').eq('auth_id', user.id).maybeSingle()
          resolvedShortId = userRow?.short_id || null

          if (!resolvedShortId) {
            const { data: shortRow } = await supabase.from('user_short_ids').select('short_id').eq('user_id', user.id).maybeSingle()
            resolvedShortId = shortRow?.short_id || null
          }
          setShortId(resolvedShortId)
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
