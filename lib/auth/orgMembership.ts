import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'

/**
 * Returns all of the current user's organization memberships (id, role, org name),
 * ordered by membership id (roughly creation order, since ids are cuids).
 */
export async function listUserOrganizations() {
  const session = await auth()
  if (!session?.user) {
    return null
  }

  const [memberships, user] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeOrganizationId: true },
    }),
  ])

  return { session, memberships, activeOrganizationId: user?.activeOrganizationId ?? null }
}

/**
 * Returns the current user's active organization membership.
 * "Active" = the organization they last selected (User.activeOrganizationId), falling
 * back to their earliest membership if none was selected yet or it's no longer valid
 * (e.g. they were removed from that org). Users can belong to more than one
 * organization (e.g. via an invite while already owning their own), so this is the
 * single source of truth every route should use instead of an unordered findFirst.
 */
export async function getCurrentMembership() {
  const result = await listUserOrganizations()
  if (!result || result.memberships.length === 0) {
    return null
  }

  const { session, memberships, activeOrganizationId } = result

  const active = activeOrganizationId
    ? memberships.find((m) => m.organizationId === activeOrganizationId)
    : undefined

  const membership = active ?? memberships[0]

  return { session, membership }
}

/**
 * Requires the current user to be an OWNER or ADMIN of the given organization.
 * Throws with a message suitable for a 401/403 response if not.
 */
export async function requireOrgAdmin(organizationId: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  })

  if (!membership) {
    throw new Error('Forbidden')
  }

  return { session, membership }
}

/**
 * Switches the current user's active organization. Validates that they're actually
 * a member of the target organization first.
 */
export async function setActiveOrganization(organizationId: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId },
  })

  if (!membership) {
    throw new Error('Forbidden')
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeOrganizationId: organizationId },
  })

  return membership
}
