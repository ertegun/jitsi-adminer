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
      affiliation?: 'owner'
      // Lobby control for token_lobby_ondemand plugin
      lobby?: boolean
    }
    features?: {
      recording?: boolean
      livestreaming?: boolean
      transcription?: boolean
      'outbound-call'?: boolean
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
  // Control lobby via JWT (requires token_lobby_ondemand Prosody plugin)
  lobbyEnabled?: boolean
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
    lobbyEnabled,
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
    // Moderators get full identity + owner affiliation
    payload.context.user = {
      ...(userName ? { name: userName } : {}),
      ...(userEmail ? { email: userEmail } : {}),
      affiliation: 'owner' as const,
      // Moderators bypass lobby (lobby: false or omit)
      ...(lobbyEnabled ? { lobby: false } : {}),
    }
  } else {
    // Guests: only add user object if we have identity info, and NEVER add affiliation
    if (userName || userEmail || lobbyEnabled) {
      payload.context.user = {
        ...(userName ? { name: userName } : {}),
        ...(userEmail ? { email: userEmail } : {}),
        // Non-moderators subject to lobby when enabled
        ...(lobbyEnabled ? { lobby: true } : {}),
      }
    }
    // If no identity info and no lobby, leave context.user undefined so Prosody treats as anonymous
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
