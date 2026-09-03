import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { generateJitsiToken } from '@/lib/jitsi/generateToken'
import { buildMeetingUrl } from '@/lib/jitsi/buildMeetingUrl'
import { mergeAdvancedSettings } from '@/lib/jitsi/advancedSettings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organization: true,
        createdBy: true,
        participants: {
          orderBy: { joinedAt: 'desc' },
        },
        sessions: {
          orderBy: { actualStart: 'desc' },
        },
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check access
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: meeting.organizationId,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const org = meeting.organization
    const advancedSettings = meeting.advancedSettings
      ? mergeAdvancedSettings(JSON.parse(meeting.advancedSettings))
      : undefined

    // Add lobby config if enabled
    if (advancedSettings && meeting.lobbyEnabled) {
      advancedSettings.config['lobby.enabled'] = true
      // Require moderator to manually approve each guest (no auto-admit)
      advancedSettings.config['lobby.autoKnock'] = false
    }

    // Generate meeting links if Jitsi is connected
    let hostLink = null
    let guestLink = null

    if (
      org.jitsiDomain &&
      org.jitsiAppId &&
      org.jitsiAppSecret &&
      org.jitsiConnectionStatus === 'CONNECTED'
    ) {
      try {
        // Host link
        const hostToken = generateJitsiToken({
          jitsiDomain: org.jitsiDomain,
          jitsiAppId: org.jitsiAppId,
          jitsiAppSecret: org.jitsiAppSecret,
          roomName: meeting.roomName,
          userName: meeting.createdBy.name || undefined,
          userEmail: meeting.createdBy.email,
          isModerator: true,
          meeting: {
            scheduledStart: meeting.scheduledStart,
            scheduledEnd: meeting.scheduledEnd,
          },
          advancedSettings,
        })

        hostLink = buildMeetingUrl({
          jitsiDomain: org.jitsiDomain,
          roomName: meeting.roomName,
          jwt: hostToken,
          advancedSettings,
        })

        // Guest link (if HOST_GUEST mode). 
        // For lobby to work properly with Prosody + JWT auth, guest links must
        // be COMPLETELY ANONYMOUS (no JWT token at all). JWT-authenticated users
        // bypass the lobby regardless of affiliation. Only anonymous users are
        // held in the lobby waiting for a moderator.
        if (meeting.participantRoleMode === 'HOST_GUEST') {
          guestLink = buildMeetingUrl({
            jitsiDomain: org.jitsiDomain,
            roomName: meeting.roomName,
            // NO jwt parameter - guests are anonymous
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
        createdBy: {
          name: meeting.createdBy.name,
          email: meeting.createdBy.email,
        },
        participants: meeting.participants,
        sessions: meeting.sessions,
      },
      hostLink,
      guestLink,
    })
  } catch (error) {
    console.error('Meeting detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
