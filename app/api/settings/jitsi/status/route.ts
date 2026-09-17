import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getCurrentMembership } from '@/lib/auth/orgMembership'

export async function GET() {
  try {
    const current = await getCurrentMembership()

    if (!current) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      )
    }

    const { membership } = current

    const org = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      )
    }

    // Check if user can manage Jitsi settings
    const canManage = ['OWNER', 'ADMIN'].includes(membership.role)

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        jitsiDomain: org.jitsiDomain,
        jitsiAppId: org.jitsiAppId,
        // Only OWNER/ADMIN may see the secret — other members just see connection status
        jitsiAppSecret: canManage ? org.jitsiAppSecret : null,
        jitsiConnectionStatus: org.jitsiConnectionStatus,
      },
      canManage,
    })
  } catch (error) {
    console.error('Jitsi status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
