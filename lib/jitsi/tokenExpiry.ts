import type { Meeting } from '@prisma/client'

/**
 * Compute JWT expiry time based on meeting schedule
 * 
 * Rules:
 * - If scheduledEnd exists: exp = scheduledEnd + 4 hours (tolerance for overrun)
 * - If scheduledEnd is null (ad-hoc): exp = scheduledStart + 24 hours
 * - Never allow unlimited/very long exp (security risk)
 * 
 * This applies to BOTH host and guest links (no special treatment for moderators)
 */
export function computeTokenExpiry(meeting: {
  scheduledStart: Date
  scheduledEnd: Date | null
}): Date {
  if (meeting.scheduledEnd) {
    // Add 4 hours tolerance
    return new Date(meeting.scheduledEnd.getTime() + 4 * 60 * 60 * 1000)
  } else {
    // Ad-hoc meeting: 24 hours from start
    return new Date(meeting.scheduledStart.getTime() + 24 * 60 * 60 * 1000)
  }
}
