import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { absoluteUrl } from '@/lib/utils/request-url'
import crypto from 'crypto'
import { z } from 'zod'

const configureSchema = z.object({
  organizationId: z.string(),
  jitsiDomain: z.string().url('Geçerli bir URL giriniz'),
  credentialMode: z.enum(['auto', 'manual']).default('auto'),
  jitsiAppId: z.string().optional(),
  jitsiAppSecret: z.string().optional(),
}).refine(
  (data) => data.credentialMode !== 'manual' || (data.jitsiAppId && data.jitsiAppSecret),
  { message: 'Mevcut App ID ve App Secret bilgilerini giriniz', path: ['jitsiAppId'] }
)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.redirect(absoluteUrl('/auth/signin', request))
    }

    const formData = await request.formData()
    let jitsiDomain = formData.get('jitsiDomain') as string
    const organizationId = formData.get('organizationId') as string
    const credentialMode = (formData.get('credentialMode') as string) || 'auto'
    const manualAppId = (formData.get('jitsiAppId') as string) || undefined
    const manualAppSecret = (formData.get('jitsiAppSecret') as string) || undefined

    // Add https:// if not present
    if (jitsiDomain && !jitsiDomain.startsWith('http://') && !jitsiDomain.startsWith('https://')) {
      jitsiDomain = `https://${jitsiDomain}`
    }

    const data = {
      organizationId,
      jitsiDomain,
      credentialMode,
      jitsiAppId: manualAppId,
      jitsiAppSecret: manualAppSecret,
    }

    const validated = configureSchema.parse(data)

    // Check if user has admin rights
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: validated.organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership) {
      return new NextResponse('Yetkisiz erişim', { status: 403 })
    }

    // Clean domain (remove protocol and trailing slash)
    const cleanDomain = validated.jitsiDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    const org = await prisma.organization.findUnique({
      where: { id: validated.organizationId },
    })

    let appId = org?.jitsiAppId
    let appSecret = org?.jitsiAppSecret

    if (validated.credentialMode === 'manual') {
      // User already has a Jitsi server configured with these credentials — use them as-is
      appId = validated.jitsiAppId
      appSecret = validated.jitsiAppSecret
    } else if (!appId || !appSecret) {
      // Generate new credentials
      appId = `jitsi-${crypto.randomBytes(8).toString('hex')}`
      appSecret = crypto.randomBytes(32).toString('base64')
    }

    // Test connection to determine initial status
    let initialStatus = 'PENDING'
    try {
      const testUrl = `https://${cleanDomain}`
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      
      if (response.ok || response.status === 404) {
        initialStatus = 'CONNECTED'
      }
    } catch (error) {
      // Connection failed, keep PENDING
      console.log('Initial connection test failed:', error)
    }

    // Update organization
    await prisma.organization.update({
      where: { id: validated.organizationId },
      data: {
        jitsiDomain: cleanDomain,
        jitsiAppId: appId,
        jitsiAppSecret: appSecret,
        jitsiConnectionStatus: initialStatus,
        jitsiLastTestedAt: new Date(),
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        organizationId: validated.organizationId,
        userId: session.user.id,
        action: 'JITSI_SERVER_CONFIGURED',
        targetType: 'Organization',
        targetId: validated.organizationId,
        metadata: JSON.stringify({ domain: cleanDomain }),
      },
    })

    return NextResponse.redirect(absoluteUrl('/dashboard?jitsi=configured', request))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 })
    }

    console.error('Jitsi configuration error:', error)
    return new NextResponse('Bir hata oluştu', { status: 500 })
  }
}
