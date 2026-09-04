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
    room?: {
      lobby?: boolean
      password?: string
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
  lobbyEnabled?: boolean
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
    lobbyEnabled,
    meeting,
    advancedSettings,
  } = params

  const expiryDate = computeTokenExpiry(meeting)
  const exp = Math.floor(expiryDate.getTime() / 1000)

  // XMPP domain for token 'sub' field (internal Prosody domain).
  // This MUST match XMPP_DOMAIN in Jitsi's .env (meet.jitsi by default),
  // NOT the public domain (meet.gruparge.tr).
  const xmppDomain = 'meet.jitsi'

  const payload: JWTPayload = {
    aud: jitsiAppId,
    iss: jitsiAppId,
    sub: xmppDomain,  // ← Internal XMPP domain, not public jitsiDomain
    room: roomName,
    exp,
    context: {},
    moderator: isModerator ? 'true' : undefined,
  }

  // Add user identity if provided (host links have this, guest links may not).
  // affiliation is what self-hosted Jitsi (jicofo/prosody) uses to grant
  // moderator rights. security_bypass allows moderators to bypass
  // mod_token_security_ondemand lobby/password checks.
  if (isModerator) {
    // Moderators: only affiliation + bypass flags (no name/email so each user
    // can enter their own display name when they join)
    payload.context.user = {
      affiliation: 'owner' as const,
      lobby_bypass: true, // Legacy lobby bypass
      security_bypass: true, // mod_token_security_ondemand bypass
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

  // Add room security settings for mod_token_security_ondemand
  if (lobbyEnabled !== undefined) {
    payload.context.room = {
      lobby: lobbyEnabled,
    }
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
