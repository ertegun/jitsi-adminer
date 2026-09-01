import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createMeetingSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir'),
  scheduledStart: z.string(),
  scheduledEnd: z.string().optional(),
  lobbyEnabled: z.boolean().default(false),
  recordingEnabled: z.boolean().default(false),
  participantRoleMode: z.enum(['HOST_GUEST', 'EVERYONE_MODERATOR']).default('HOST_GUEST'),
  // Advanced settings
  startWithAudioMuted: z.boolean().default(true),
  startWithVideoMuted: z.boolean().default(true),
  requireDisplayName: z.boolean().default(true),
  prejoinPageEnabled: z.boolean().default(true),
  disableChat: z.boolean().default(false),
  disableReactions: z.boolean().default(false),
  e2eeEnabled: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createMeetingSchema.parse(body)
    const scheduledStart = new Date(data.scheduledStart)
    const scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null

    if (scheduledEnd && scheduledEnd.getTime() < scheduledStart.getTime()) {
      return NextResponse.json(
        { error: 'Bitiş zamanı başlangıçtan önce olamaz' },
        { status: 400 }
      )
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

    // Check license
    if (!org.license || org.license.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Aktif lisans gereklidir' },
        { status: 403 }
      )
    }

    // Check if user can create meetings
    if (!['OWNER', 'ADMIN', 'HOST'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Toplantı oluşturma yetkiniz yok' },
        { status: 403 }
      )
    }

    // Generate unique room name
    const roomName = `${org.slug}-${crypto.randomBytes(8).toString('hex')}`

    // Build advanced settings JSON
    const advancedSettings = {
      features: {
        recording: data.recordingEnabled,
        livestreaming: false,
        transcription: false,
        outboundCall: false,
      },
      config: {
        startWithAudioMuted: data.startWithAudioMuted,
        startWithVideoMuted: data.startWithVideoMuted,
        requireDisplayName: data.participantRoleMode === 'HOST_GUEST' 
          ? data.requireDisplayName 
          : false,
        prejoinPageEnabled: data.prejoinPageEnabled,
        disableChat: data.disableChat,
        disableReactions: data.disableReactions,
        e2eeEnabled: data.e2eeEnabled,
      },
    }

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        organizationId: org.id,
        createdByUserId: session.user.id,
        title: data.title,
        roomName,
        scheduledStart,
        scheduledEnd,
        lobbyEnabled: data.lobbyEnabled,
        recordingEnabled: data.recordingEnabled,
        participantRoleMode: data.participantRoleMode,
        advancedSettings: JSON.stringify(advancedSettings),
        status: 'SCHEDULED',
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: session.user.id,
        action: 'MEETING_CREATED',
        targetType: 'Meeting',
        targetId: meeting.id,
        metadata: JSON.stringify({ title: data.title, roomName }),
      },
    })

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        roomName: meeting.roomName,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create meeting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
