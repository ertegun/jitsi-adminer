import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { absoluteUrl } from '@/lib/utils/request-url'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.redirect(absoluteUrl('/auth/signin', request))
    }

    const formData = await request.formData()
    const organizationId = formData.get('organizationId') as string

    // Check membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
      },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return new NextResponse('Yetkisiz erişim', { status: 403 })
    }

    const org = membership.organization

    if (!org.jitsiDomain) {
      return new NextResponse('Jitsi domain tanımlı değil', { status: 400 })
    }

    // Simple connectivity test (just check if domain is reachable)
    // In production, this should make a real HTTP request to test JWT
    try {
      const testUrl = `https://${org.jitsiDomain}`
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok || response.status === 404) {
        // Domain is reachable (404 is ok, just means root path doesn't exist)
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            jitsiConnectionStatus: 'CONNECTED',
            jitsiLastTestedAt: new Date(),
          },
        })

        await prisma.auditLog.create({
          data: {
            organizationId,
            userId: session.user.id,
            action: 'JITSI_CONNECTION_TESTED',
            targetType: 'Organization',
            targetId: organizationId,
            metadata: JSON.stringify({ status: 'success' }),
          },
        })

        return NextResponse.redirect(
          absoluteUrl('/settings/jitsi?success=connected', request),
          { status: 303 }
        )
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          jitsiConnectionStatus: 'PENDING',
          jitsiLastTestedAt: new Date(),
        },
      })

      return NextResponse.redirect(
        absoluteUrl(
          `/settings/jitsi?error=${encodeURIComponent('Bağlantı başarısız: ' + (error as Error).message)}`,
          request
        ),
        { status: 303 }
      )
    }
  } catch (error) {
    console.error('Jitsi test error:', error)
    return new NextResponse('Bir hata oluştu', { status: 500 })
  }
}
