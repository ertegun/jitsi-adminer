import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const acceptSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
})

// POST: accept an invite.
// - Logged-in user whose session email matches the invite: joins immediately.
// - Anonymous visitor whose email has no account yet: creates the account (name+password required) and joins.
// - Anonymous visitor whose email already has an account: must sign in first (NEEDS_SIGNIN).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const data = acceptSchema.parse(body)

    const invite = await prisma.organizationInvite.findUnique({ where: { token } })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Davet geçersiz veya süresi dolmuş' }, { status: 404 })
    }

    const session = await auth()

    let userId: string

    if (session?.user) {
      if (session.user.email !== invite.email) {
        return NextResponse.json(
          { error: `Bu davet ${invite.email} adresine gönderilmiş. Lütfen o hesapla giriş yapın.` },
          { status: 403 }
        )
      }
      userId = session.user.id
    } else {
      const existingUser = await prisma.user.findUnique({ where: { email: invite.email } })

      if (existingUser) {
        return NextResponse.json(
          { error: 'NEEDS_SIGNIN', message: 'Bu e-posta ile zaten bir hesap var, önce giriş yapın' },
          { status: 409 }
        )
      }

      if (!data.name || !data.password) {
        return NextResponse.json(
          { error: 'Hesap oluşturmak için ad ve şifre gereklidir' },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(data.password, 10)
      const newUser = await prisma.user.create({
        data: { email: invite.email, name: data.name, passwordHash },
      })
      userId = newUser.id
    }

    const alreadyMember = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: invite.organizationId },
    })

    if (!alreadyMember) {
      await prisma.organizationMember.create({
        data: { userId, organizationId: invite.organizationId, role: invite.role },
      })
    }

    // Switch the user into the org they just joined so they land there right away
    // (they may already belong to another org, e.g. one they created at signup).
    await prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: invite.organizationId },
    })

    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        action: 'INVITE_ACCEPTED',
        targetType: 'OrganizationInvite',
        targetId: invite.id,
        metadata: JSON.stringify({ email: invite.email }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Invite accept error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
