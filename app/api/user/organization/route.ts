import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth/superAdmin'
import { getCurrentMembership, listUserOrganizations } from '@/lib/auth/orgMembership'

export async function GET() {
  try {
    const [current, list, isSuperAdminUser] = await Promise.all([
      getCurrentMembership(),
      listUserOrganizations(),
      isSuperAdmin(),
    ])

    if (!current || !list) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeMembership = list.memberships.find(
      (m) => m.organizationId === current.membership.organizationId
    )

    return NextResponse.json({
      organizationName: activeMembership?.organization.name || '',
      organizationId: current.membership.organizationId,
      organizations: list.memberships.map((m) => ({
        id: m.organizationId,
        name: m.organization.name,
        role: m.role,
        isActive: m.organizationId === current.membership.organizationId,
      })),
      isSuperAdmin: isSuperAdminUser,
    })
  } catch (error) {
    console.error('User organization fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
