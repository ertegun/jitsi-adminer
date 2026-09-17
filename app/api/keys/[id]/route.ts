import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const apiKey = await prisma.apiKey.findUnique({ where: { id } })
  if (!apiKey) {
    return NextResponse.json({ error: 'API anahtarı bulunamadı' }, { status: 404 })
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: apiKey.organizationId },
  })

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }

  if (apiKey.revokedAt) {
    return NextResponse.json({ error: 'API anahtarı zaten iptal edilmiş' }, { status: 400 })
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      organizationId: apiKey.organizationId,
      userId: session.user.id,
      action: 'API_KEY_REVOKED',
      targetType: 'ApiKey',
      targetId: apiKey.id,
      metadata: JSON.stringify({ name: apiKey.name }),
    },
  })

  return NextResponse.json({ success: true })
}
