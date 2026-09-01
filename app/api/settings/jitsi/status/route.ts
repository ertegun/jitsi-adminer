import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's first organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          include: {
            license: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      )
    }

    const org = membership.organization

    // Check if user can manage Jitsi settings
    const canManage = ['OWNER', 'ADMIN'].includes(membership.role)

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        jitsiDomain: org.jitsiDomain,
        jitsiAppId: org.jitsiAppId,
        jitsiAppSecret: org.jitsiAppSecret,
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
