import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Prosody Reservation API endpoint
 *
 * Called by Prosody BEFORE a room is created. We look up the meeting by
 * roomName in our DB and tell Prosody:
 *   - Is this an approved meeting? (403 if not)
 *   - How long can it run? (duration in seconds)
 *   - Should lobby be enabled? (per-meeting from DB)
 *
 * See: https://jitsi.github.io/handbook/docs/devops-guide/reservation
 */
export async function POST(request: NextRequest) {
  try {
    // Prosody sends application/x-www-form-urlencoded
    const formData = await request.formData()
    const name = formData.get('name') as string | null
    const startTime = formData.get('start_time') as string | null
    const mailOwner = formData.get('mail_owner') as string | null

    if (!name) {
      return NextResponse.json({ message: 'Room name required' }, { status: 400 })
    }

    // Strip tenant prefix if present: "[tenant]roomname" -> "roomname"
    const roomName = name.replace(/^\[.*?\]/, '')

    // Look up meeting in DB by room name
    const meeting = await prisma.meeting.findFirst({
      where: { roomName },
      include: { organization: true },
    })

    if (!meeting) {
      // Room not in DB → reject creation
      return NextResponse.json(
        { message: 'Bu toplantı sistemde kayıtlı değil' },
        { status: 403 }
      )
    }

    // Compute allowed duration
    const now = new Date()
    const scheduledEnd = meeting.scheduledEnd
    const scheduledStart = meeting.scheduledStart

    let durationSeconds = 4 * 60 * 60 // default 4 hours
    if (scheduledEnd) {
      const endMs = scheduledEnd.getTime()
      const nowMs = now.getTime()
      durationSeconds = Math.max(60, Math.floor((endMs - nowMs) / 1000))
    }

    return NextResponse.json(
      {
        id: meeting.id,
        name: roomName,
        mail_owner: mailOwner || meeting.organization.slug,
        start_time: scheduledStart.toISOString(),
        duration: durationSeconds,
        // ⬇ Per-meeting lobby control — requires
        //   reservations_enable_lobby_support = true in Prosody
        lobby: meeting.lobbyEnabled,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reservation API error:', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET is called by Prosody in the 409 recovery flow to read existing
 * conference info. We just return the same shape as POST.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json({ message: 'ID required' }, { status: 400 })
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { organization: true },
  })

  if (!meeting) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const scheduledEnd = meeting.scheduledEnd
  const durationSeconds = scheduledEnd
    ? Math.max(60, Math.floor((scheduledEnd.getTime() - Date.now()) / 1000))
    : 4 * 60 * 60

  return NextResponse.json({
    id: meeting.id,
    name: meeting.roomName,
    mail_owner: meeting.organization.slug,
    start_time: meeting.scheduledStart.toISOString(),
    duration: durationSeconds,
    lobby: meeting.lobbyEnabled,
  })
}
