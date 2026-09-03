import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Webhook receiver for Jitsi mod_http_events_plugin
 * 
 * Expected events:
 * - room-created
 * - occupant-joined
 * - occupant-left
 * - room-destroyed
 * 
 * Security: Verify JITSI_WEBHOOK_SECRET header
 */

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== process.env.JITSI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await request.json()
    const eventType = event.event

    switch (eventType) {
      case 'room-created':
        await handleRoomCreated(event)
        break
      case 'occupant-joined':
        await handleOccupantJoined(event)
        break
      case 'occupant-left':
        await handleOccupantLeft(event)
        break
      case 'room-destroyed':
        await handleRoomDestroyed(event)
        break
      default:
        console.log('Unknown event type:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleRoomCreated(event: any) {
  const roomName = event.room
  
  // Find meeting by room name
  const meeting = await prisma.meeting.findUnique({
    where: { roomName },
  })

  if (!meeting) {
    console.log('Meeting not found for room:', roomName)
    return
  }

  // Create or update the currently-open session for this meeting
  const openSession = await prisma.meetingSession.findFirst({
    where: { meetingId: meeting.id, actualEnd: null },
  })

  if (openSession) {
    await prisma.meetingSession.update({
      where: { id: openSession.id },
      data: { actualStart: new Date() },
    })
  } else {
    await prisma.meetingSession.create({
      data: {
        meetingId: meeting.id,
        actualStart: new Date(),
      },
    })
  }

  // Update meeting status to LIVE
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: 'LIVE' },
  })
}

async function handleOccupantJoined(event: any) {
  const roomName = event.room
  const jid = event.occupant?.jid
  const displayName = event.occupant?.nick || 'Anonymous'

  const meeting = await prisma.meeting.findUnique({
    where: { roomName },
  })

  if (!meeting) {
    return
  }

  // Create participant record
  await prisma.meetingParticipant.create({
    data: {
      meetingId: meeting.id,
      displayName,
      jid,
      joinedAt: new Date(),
    },
  })
}

async function handleOccupantLeft(event: any) {
  const roomName = event.room
  const jid = event.occupant?.jid

  const meeting = await prisma.meeting.findUnique({
    where: { roomName },
  })

  if (!meeting || !jid) {
    return
  }

  // Find participant and update leftAt
  const participant = await prisma.meetingParticipant.findFirst({
    where: {
      meetingId: meeting.id,
      jid,
      leftAt: null, // Still in the meeting
    },
    orderBy: { joinedAt: 'desc' },
  })

  if (participant) {
    const leftAt = new Date()
    const durationSeconds = Math.floor(
      (leftAt.getTime() - participant.joinedAt.getTime()) / 1000
    )

    await prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt,
        durationSeconds,
      },
    })
  }
}

async function handleRoomDestroyed(event: any) {
  const roomName = event.room

  const meeting = await prisma.meeting.findUnique({
    where: { roomName },
    include: { sessions: true },
  })

  if (!meeting) {
    return
  }

  // Find the active session
  const activeSession = meeting.sessions.find(s => !s.actualEnd)

  if (activeSession) {
    const actualEnd = new Date()
    const totalDurationSeconds = Math.floor(
      (actualEnd.getTime() - activeSession.actualStart.getTime()) / 1000
    )

    await prisma.meetingSession.update({
      where: { id: activeSession.id },
      data: {
        actualEnd,
        totalDurationSeconds,
      },
    })
  }

  // Update meeting status to ENDED
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: 'ENDED' },
  })
}
