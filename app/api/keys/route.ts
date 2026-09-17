import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { getCurrentMembership } from '@/lib/auth/orgMembership'
import { generateApiKey } from '@/lib/auth/apiKey'
import { z } from 'zod'

const createKeySchema = z.object({
  name: z.string().min(1, 'İsim gereklidir').max(100),
})

export async function GET() {
  const current = await getCurrentMembership()
  if (!current) {
    return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 404 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: current.membership.organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      creator: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({ keys })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createKeySchema.parse(body)

    const current = await getCurrentMembership()

    if (!current) {
      return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 404 })
    }

    const { membership } = current

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'API anahtarı oluşturma yetkiniz yok' },
        { status: 403 }
      )
    }

    const { fullKey, keyHash, keyPrefix } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: membership.organizationId,
        name: data.name,
        keyHash,
        keyPrefix,
        createdBy: session.user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session.user.id,
        action: 'API_KEY_CREATED',
        targetType: 'ApiKey',
        targetId: apiKey.id,
        metadata: JSON.stringify({ name: data.name, keyPrefix }),
      },
    })

    // The plaintext key is only ever returned here — it cannot be recovered later.
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
