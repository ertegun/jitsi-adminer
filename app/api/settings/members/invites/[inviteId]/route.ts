import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireOrgAdmin } from '@/lib/auth/orgMembership'

// DELETE: revoke a pending invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params

    const invite = await prisma.organizationInvite.findUnique({ where: { id: inviteId } })
    if (!invite) {
      return NextResponse.json({ error: 'Davet bulunamadı' }, { status: 404 })
    }

    const { session } = await requireOrgAdmin(invite.organizationId)

    await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        userId: session.user.id,
        action: 'INVITE_REVOKED',
        targetType: 'OrganizationInvite',
        targetId: inviteId,
        metadata: JSON.stringify({ email: invite.email }),
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

    console.error('Invite revoke error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
