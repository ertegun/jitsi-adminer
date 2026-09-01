import jwt from 'jsonwebtoken'
import { computeTokenExpiry } from './tokenExpiry'
import type { AdvancedMeetingSettings } from './advancedSettings'

export interface JWTPayload {
  aud: string
  iss: string
  sub: string
  room: string
  exp: number
  context: {
    user?: {
      name?: string
      email?: string
    }
    features?: {
      recording?: boolean
      livestreaming?: boolean
      transcription?: boolean
      'outbound-call'?: boolean
    }
  }
  moderator?: string
}

export interface GenerateTokenParams {
  jitsiDomain: string
  jitsiAppId: string
  jitsiAppSecret: string
  roomName: string
  userName?: string
  userEmail?: string
  isModerator: boolean
  meeting: {
    scheduledStart: Date
    scheduledEnd: Date | null
  }
  advancedSettings?: AdvancedMeetingSettings
}

/**
 * Generate a JWT token for Jitsi Meet access
 * 
 * This token is signed with the organization's jitsiAppSecret and contains:
 * - Room name
 * - User identity (if provided)
 * - Moderator status
 * - Feature permissions from advancedSettings
 * - Expiry time computed from meeting schedule
 */
export function generateJitsiToken(params: GenerateTokenParams): string {
  const {
    jitsiDomain,
    jitsiAppId,
    jitsiAppSecret,
    roomName,
    userName,
    userEmail,
    isModerator,
    meeting,
    advancedSettings,
  } = params

  const expiryDate = computeTokenExpiry(meeting)
  const exp = Math.floor(expiryDate.getTime() / 1000)

  const payload: JWTPayload = {
    aud: jitsiAppId,
    iss: jitsiAppId,
    sub: jitsiDomain,
    room: roomName,
    exp,
    context: {},
    moderator: isModerator ? 'true' : undefined,
  }

  // Add user identity if provided (host links have this, guest links may not)
  if (userName || userEmail) {
    payload.context.user = {
      name: userName,
      email: userEmail,
    }
  }

  // Add feature flags from advanced settings
  if (advancedSettings?.features) {
    payload.context.features = {
      recording: advancedSettings.features.recording,
      livestreaming: advancedSettings.features.livestreaming,
      transcription: advancedSettings.features.transcription,
      'outbound-call': advancedSettings.features.outboundCall,
    }
  }

  return jwt.sign(payload, jitsiAppSecret, { algorithm: 'HS256' })
}
