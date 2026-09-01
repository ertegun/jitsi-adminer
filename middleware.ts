export { auth as middleware } from '@/lib/auth/auth'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/meetings/:path*',
    '/settings/:path*',
    '/admin/:path*',
    // Note: /api/license/validate is excluded to allow license validation during onboarding
  ],
}
