// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { getUser, maybeSingle, push, createClientMock, router } = vi.hoisted(() => {
  const push = vi.fn()
  const router = { push }
  return {
  getUser: vi.fn(), maybeSingle: vi.fn(), push, createClientMock: vi.fn(), router,
  }
})
vi.mock('@/lib/supabase', () => ({ createClient: createClientMock }))
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/doctor-dashboard' }))
import { useAuthCheck } from '@/hooks/use-auth-check'

describe('useAuthCheck', () => {
  beforeEach(() => {
    getUser.mockReset(); maybeSingle.mockReset(); push.mockReset()
    createClientMock.mockReset().mockReturnValue({
      auth: { getUser },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    })
  })
  it('loads a role-matched user and profile short ID', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', app_metadata: { role: 'doctor' } } }, error: null })
    maybeSingle.mockResolvedValue({ data: { short_id: 'DOC0000001' } })
    const { result } = renderHook(() => useAuthCheck('doctor'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user.id).toBe('u1')
    expect(result.current.shortId).toBe('DOC0000001')
    expect(push).not.toHaveBeenCalled()
  })
  it.each([
    ['logged out', { data: { user: null }, error: null }, 'doctor'],
    ['expired session', { data: { user: null }, error: new Error('expired') }, 'doctor'],
    ['role missing', { data: { user: { id: 'u1', app_metadata: {} } }, error: null }, 'doctor'],
    ['wrong role', { data: { user: { id: 'u1', app_metadata: { role: 'lab' } } }, error: null }, 'doctor'],
  ])('redirects for %s', async (_label, response, required) => {
    getUser.mockResolvedValue(response)
    const { result } = renderHook(() => useAuthCheck(required as 'doctor'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(push).toHaveBeenCalledWith('/login')
  })
  it('captures an unexpected client error', async () => {
    createClientMock.mockImplementation(() => { throw new Error('bad client') })
    const { result } = renderHook(() => useAuthCheck())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
