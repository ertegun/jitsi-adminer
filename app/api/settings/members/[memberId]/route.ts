import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireOrgAdmin } from '@/lib/auth/orgMembership'
import { z } from 'zod'

const roleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'HOST', 'VIEWER']),
})

// PATCH: change a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params
    const body = await request.json()
    const data = roleSchema.parse(body)

    const target = await prisma.organizationMember.findUnique({ where: { id: memberId } })
    if (!target) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const { session } = await requireOrgAdmin(target.organizationId)

    if (target.userId === session.user.id && data.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Kendi rolünüzü kendiniz düşüremezsiniz' },
        { status: 400 }
      )
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: data.role },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: target.organizationId,
        userId: session.user.id,
        action: 'MEMBER_ROLE_CHANGED',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: JSON.stringify({ role: data.role }),
      },
    })

    return NextResponse.json({ success: true, member: { id: updated.id, role: updated.role } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    console.error('Member role update error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE: remove a member from the organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

    const target = await prisma.organizationMember.findUnique({ where: { id: memberId } })
    if (!target) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    const { session } = await requireOrgAdmin(target.organizationId)

    if (target.userId === session.user.id) {
      return NextResponse.json(
        { error: 'Kendinizi organizasyondan çıkaramazsınız' },
        { status: 400 }
      )
    }

    if (target.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Sahip (OWNER) rolündeki bir üye kaldırılamaz' },
        { status: 400 }
      )
    }

    await prisma.organizationMember.delete({ where: { id: memberId } })

    await prisma.auditLog.create({
      data: {
        organizationId: target.organizationId,
        userId: session.user.id,
        action: 'MEMBER_REMOVED',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: JSON.stringify({ userId: target.userId }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    console.error('Member removal error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
