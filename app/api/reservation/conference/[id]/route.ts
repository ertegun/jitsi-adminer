import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Prosody Reservation API — per-conference endpoint
 *
 * GET  /api/reservation/conference/:id  → read conference info (409 recovery)
 * DELETE /api/reservation/conference/:id → conference ended (all users left or duration exceeded)
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Mark meeting as ended
  try {
    await prisma.meeting.update({
      where: { id },
      data: {
        status: 'ENDED',
      },
    })
  } catch (error) {
    // Ignore if meeting doesn't exist
    console.error('DELETE reservation error:', error)
  }

  return new NextResponse(null, { status: 200 })
}
