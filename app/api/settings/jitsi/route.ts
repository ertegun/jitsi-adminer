import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'

// GET: Fetch current Jitsi settings for the user's organization
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
        organization: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      )
    }

    const org = membership.organization

    return NextResponse.json({
      jitsiDomain: org.jitsiDomain,
      jitsiAppId: org.jitsiAppId,
      jitsiConnectionStatus: org.jitsiConnectionStatus,
    })
  } catch (error) {
    console.error('GET /api/settings/jitsi error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}

// POST: Update Jitsi settings for the user's organization
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { jitsiDomain, jitsiAppId, jitsiAppSecret } = body

    // Validate required fields
    if (!jitsiDomain || !jitsiAppId || !jitsiAppSecret) {
      return NextResponse.json(
        { error: 'Tüm alanlar zorunludur' },
        { status: 400 }
      )
    }

    // Get user's first organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      )
    }

    // Check if user has permission (OWNER or ADMIN)
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      )
    }

    // Update organization with Jitsi settings
    const updatedOrg = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: {
        jitsiDomain: jitsiDomain.trim(),
        jitsiAppId: jitsiAppId.trim(),
        jitsiAppSecret: jitsiAppSecret.trim(), // TODO: Encrypt in production
        jitsiConnectionStatus: 'CONNECTED',
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        organizationId: updatedOrg.id,
        userId: session.user.id,
        action: 'JITSI_SERVER_CONNECTED',
        targetType: 'Organization',
        targetId: updatedOrg.id,
        metadata: JSON.stringify({
          jitsiDomain: updatedOrg.jitsiDomain,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      jitsiDomain: updatedOrg.jitsiDomain,
      jitsiConnectionStatus: updatedOrg.jitsiConnectionStatus,
    })
  } catch (error) {
    console.error('POST /api/settings/jitsi error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
