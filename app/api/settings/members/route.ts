import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getCurrentMembership, requireOrgAdmin } from '@/lib/auth/orgMembership'
import { absoluteUrl } from '@/lib/utils/request-url'
import crypto from 'crypto'
import { z } from 'zod'

const INVITE_TTL_DAYS = 7

// GET: list members + pending invites for the current user's organization
export async function GET() {
  const current = await getCurrentMembership()
  if (!current) {
    return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 404 })
  }

  const { membership } = current
  const canManage = ['OWNER', 'ADMIN'].includes(membership.role)

  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: membership.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: 'asc' },
    }),
    canManage
      ? prisma.organizationInvite.findMany({
          where: { organizationId: membership.organizationId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    canManage,
    currentUserId: membership.userId,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
  })
}

const inviteSchema = z.object({
  email: z.string().email('Geçerli bir e-posta giriniz'),
  role: z.enum(['ADMIN', 'HOST', 'VIEWER']),
})

// POST: invite a new member to the current user's organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = inviteSchema.parse(body)

    const current = await getCurrentMembership()
    if (!current) {
      return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 404 })
    }

    const { session, membership } = await requireOrgAdmin(current.membership.organizationId)

    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: membership.organizationId,
        user: { email: data.email },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Bu e-posta zaten organizasyonun üyesi' },
        { status: 400 }
      )
    }

    const existingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organizationId: membership.organizationId,
        email: data.email,
        status: 'PENDING',
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Bu e-postaya zaten bekleyen bir davet var' },
        { status: 400 }
      )
    }

    const token = crypto.randomBytes(24).toString('base64url')
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: membership.organizationId,
        email: data.email,
        role: data.role,
        token,
        expiresAt,
        invitedById: session.user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session.user.id,
        action: 'MEMBER_INVITED',
        targetType: 'OrganizationInvite',
        targetId: invite.id,
        metadata: JSON.stringify({ email: data.email, role: data.role }),
      },
    })

    const inviteUrl = absoluteUrl(`/invite/${token}`, request)

    // TODO(see TODO.md): send this link by email via SMTP instead of only returning it here.

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      inviteUrl: inviteUrl.toString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Üye davet etmek için OWNER veya ADMIN yetkisi gereklidir' },
        { status: 403 }
      )
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    console.error('Invite creation error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
