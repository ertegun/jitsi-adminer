import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'

/**
 * Check if current user is a super admin
 * Throws error if not authenticated or not super admin
 */
export async function requireSuperAdmin() {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  })

  if (!user?.isSuperAdmin) {
    throw new Error('Forbidden: Super admin access required')
  }

  return session
}

/**
 * Check if current user is a super admin (returns boolean)
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  
  if (!session?.user) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  })

  return user?.isSuperAdmin || false
}
