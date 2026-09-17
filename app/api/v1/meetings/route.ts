import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateApiKey } from '@/lib/auth/apiKey'
import { generateJitsiToken } from '@/lib/jitsi/generateToken'
import { buildMeetingUrl } from '@/lib/jitsi/buildMeetingUrl'
import { mergeAdvancedSettings } from '@/lib/jitsi/advancedSettings'
import { z } from 'zod'
import crypto from 'crypto'

const createMeetingSchema = z.object({
  title: z.string().min(1, 'title is required'),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  lobbyEnabled: z.boolean().default(false),
  recordingEnabled: z.boolean().default(false),
  participantRoleMode: z.enum(['HOST_GUEST', 'EVERYONE_MODERATOR']).default('HOST_GUEST'),
  hostName: z.string().optional(),
  hostEmail: z.string().email().optional(),
  config: z
    .object({
      startWithAudioMuted: z.boolean().optional(),
      startWithVideoMuted: z.boolean().optional(),
      requireDisplayName: z.boolean().optional(),
      prejoinPageEnabled: z.boolean().optional(),
      disableChat: z.boolean().optional(),
      disableReactions: z.boolean().optional(),
      e2eeEnabled: z.boolean().optional(),
    })
    .optional(),
})

function serializeMeeting(meeting: {
  id: string
  title: string
  roomName: string
  status: string
  scheduledStart: Date
  scheduledEnd: Date | null
  lobbyEnabled: boolean
  recordingEnabled: boolean
  participantRoleMode: string
  createdAt: Date
}) {
  return {
    id: meeting.id,
    title: meeting.title,
    roomName: meeting.roomName,
    status: meeting.status,
    scheduledStart: meeting.scheduledStart,
    scheduledEnd: meeting.scheduledEnd,
    lobbyEnabled: meeting.lobbyEnabled,
    recordingEnabled: meeting.recordingEnabled,
    participantRoleMode: meeting.participantRoleMode,
    createdAt: meeting.createdAt,
  }
}

/**
 * POST /api/v1/meetings
 *
 * Creates a meeting and, when the organization's Jitsi server is connected,
 * returns ready-to-use join links in the same response so external
 * integrations don't need a second round-trip.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = await authenticateApiKey(request)
    if (!apiKey) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Missing or invalid API key' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = createMeetingSchema.parse(body)

    const scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : new Date()
    const scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null

    if (scheduledEnd && scheduledEnd.getTime() < scheduledStart.getTime()) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'scheduledEnd must be after scheduledStart' } },
        { status: 400 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { id: apiKey.organizationId },
      include: { license: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Organization not found' } },
        { status: 404 }
      )
    }

    if (!org.license || org.license.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: { code: 'license_inactive', message: 'An active license is required' } },
        { status: 403 }
      )
    }

    const roomName = `${org.slug}-${crypto.randomBytes(8).toString('hex')}`

    const advancedSettings = mergeAdvancedSettings({
      features: {
        recording: data.recordingEnabled,
        livestreaming: false,
        transcription: false,
        outboundCall: false,
        screenSharing: true,
      },
      config: {
        startWithAudioMuted: data.config?.startWithAudioMuted ?? true,
        startWithVideoMuted: data.config?.startWithVideoMuted ?? true,
        requireDisplayName:
          data.participantRoleMode === 'HOST_GUEST'
            ? data.config?.requireDisplayName ?? true
            : false,
        prejoinPageEnabled: data.config?.prejoinPageEnabled ?? true,
        disableChat: data.config?.disableChat ?? false,
        disableReactions: data.config?.disableReactions ?? false,
        e2eeEnabled: data.config?.e2eeEnabled ?? false,
      },
    })

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: org.id,
        createdByUserId: apiKey.createdBy,
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

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: apiKey.createdBy,
        action: 'MEETING_CREATED',
        targetType: 'Meeting',
        targetId: meeting.id,
        metadata: JSON.stringify({ title: data.title, roomName, via: 'public_api', apiKeyId: apiKey.id }),
      },
    })

    let hostLink: string | null = null
    let guestLink: string | null = null

    if (
      org.jitsiDomain &&
      org.jitsiAppId &&
      org.jitsiAppSecret &&
      org.jitsiConnectionStatus === 'CONNECTED'
    ) {
      try {
        const hostToken = generateJitsiToken({
          jitsiDomain: org.jitsiDomain,
          jitsiAppId: org.jitsiAppId,
          jitsiAppSecret: org.jitsiAppSecret,
          roomName: meeting.roomName,
          userName: data.hostName,
          userEmail: data.hostEmail,
          isModerator: true,
          lobbyEnabled: meeting.lobbyEnabled,
          meeting: { scheduledStart: meeting.scheduledStart, scheduledEnd: meeting.scheduledEnd },
          advancedSettings,
        })

        hostLink = buildMeetingUrl({
          jitsiDomain: org.jitsiDomain,
          roomName: meeting.roomName,
          jwt: hostToken,
          advancedSettings,
        })

        if (meeting.participantRoleMode === 'HOST_GUEST') {
          guestLink = buildMeetingUrl({
            jitsiDomain: org.jitsiDomain,
            roomName: meeting.roomName,
            advancedSettings,
          })
        }
      } catch (error) {
        console.error('Failed to generate meeting links:', error)
      }
    }

    return NextResponse.json(
      {
        meeting: serializeMeeting(meeting),
        hostLink,
        guestLink,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Validation error', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Public API create meeting error:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/meetings
 *
 * Lists meetings belonging to the API key's organization, newest first.
 */
export async function GET(request: NextRequest) {
  const apiKey = await authenticateApiKey(request)
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Missing or invalid API key' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)
  const cursor = searchParams.get('cursor') || undefined

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: apiKey.organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  return NextResponse.json({
    meetings: meetings.map(serializeMeeting),
    nextCursor: meetings.length === limit ? meetings[meetings.length - 1].id : null,
  })
}
