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
      affiliation?: 'owner' | 'member'
      lobby_bypass?: boolean
      security_bypass?: boolean
    }
    features?: {
      recording?: boolean
      livestreaming?: boolean
      transcription?: boolean
      'outbound-call'?: boolean
      'screen-sharing'?: boolean
    }
  }
  // Legacy top-level claim, kept for older Jitsi deployments that still read
  // it. Modern self-hosted Jitsi (jicofo/prosody) reads context.user.affiliation
  // instead — see below.
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

  // Add user identity if provided (host links have this, guest links may not).
  // affiliation is what self-hosted Jitsi (jicofo/prosody) uses to grant
  // moderator rights — but it ALSO makes mod_muc_lobby_rooms bypass the lobby
  // for anyone with an affiliation other than 'none' (see
  // resources/prosody-plugins/mod_muc_lobby_rooms.lua: only occupants with no
  // affiliation get sent to the lobby). So we only set it for moderators;
  // guests must be left with no affiliation or lobby-enabled meetings would
  // let them straight in.
  if (isModerator) {
    // Moderators get full identity + owner affiliation + lobby bypass
    payload.context.user = {
      ...(userName ? { name: userName } : {}),
      ...(userEmail ? { email: userEmail } : {}),
      affiliation: 'owner' as const,
      lobby_bypass: true, // Moderators always bypass lobby
    }
  } else {
    // Guests: only add user object if we have identity info, and NEVER add affiliation
    if (userName || userEmail) {
      payload.context.user = {
        ...(userName ? { name: userName } : {}),
        ...(userEmail ? { email: userEmail } : {}),
      }
    }
    // If no identity info, leave context.user undefined so Prosody treats as anonymous
  }

  // Add feature flags from advanced settings
  if (advancedSettings?.features) {
    payload.context.features = {
      recording: advancedSettings.features.recording,
      livestreaming: advancedSettings.features.livestreaming,
      transcription: advancedSettings.features.transcription,
      'outbound-call': advancedSettings.features.outboundCall,
      'screen-sharing': advancedSettings.features.screenSharing,
    }
  }

  return jwt.sign(payload, jitsiAppSecret, { algorithm: 'HS256' })
}
