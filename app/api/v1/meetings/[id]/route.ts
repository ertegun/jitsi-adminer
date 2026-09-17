import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateApiKey } from '@/lib/auth/apiKey'
import { generateJitsiToken } from '@/lib/jitsi/generateToken'
import { buildMeetingUrl } from '@/lib/jitsi/buildMeetingUrl'
import { mergeAdvancedSettings } from '@/lib/jitsi/advancedSettings'

/**
 * GET /api/v1/meetings/:id
 *
 * Returns a meeting's status plus freshly-signed join links (JWTs are
 * short-lived, so links are regenerated on every call rather than cached).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = await authenticateApiKey(request)
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Missing or invalid API key' } },
      { status: 401 }
    )
  }

  const { id } = await params

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { organization: true },
  })

  if (!meeting || meeting.organizationId !== apiKey.organizationId) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Meeting not found' } },
      { status: 404 }
    )
  }

  const org = meeting.organization
  const advancedSettings = meeting.advancedSettings
    ? mergeAdvancedSettings(JSON.parse(meeting.advancedSettings))
    : undefined

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

  return NextResponse.json({
    meeting: {
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
    },
    hostLink,
    guestLink,
  })
}
