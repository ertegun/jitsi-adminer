import type { AdvancedMeetingSettings } from './advancedSettings'

export interface BuildMeetingUrlParams {
  jitsiDomain: string
  roomName: string
  // Omit for guest links: with ENABLE_GUESTS=1 on the Jitsi server, a request
  // with no JWT at all is routed to the anonymous guest domain and made to
  // wait for an authenticated (moderator) user to create the room first. A
  // guest link that carries a signed-but-unprivileged JWT is still treated as
  // "authenticated" and can race the moderator to create/own the room.
  jwt?: string
  advancedSettings?: AdvancedMeetingSettings
}

/**
 * Build the complete Jitsi meeting URL with JWT and config parameters
 *
 * Format: https://jitsi-domain/roomName?jwt=xxx&config.xxx=yyy&config.zzz=www
 *
 * Config parameters override Jitsi client defaults for this specific meeting
 */
export function buildMeetingUrl(params: BuildMeetingUrlParams): string {
  const { jitsiDomain, roomName, jwt, advancedSettings } = params

  // Remove protocol if present, we'll add it back
  const cleanDomain = jitsiDomain.replace(/^https?:\/\//, '')

  const url = new URL(`https://${cleanDomain}/${roomName}`)

  // Add JWT token (guest links intentionally omit this — see BuildMeetingUrlParams.jwt)
  if (jwt) {
    url.searchParams.set('jwt', jwt)
  }

  // Add config parameters from advanced settings
  if (advancedSettings?.config) {
    const config = advancedSettings.config
    
    // Convert boolean config values to URL parameters
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        url.searchParams.set(`config.${key}`, value.toString())
      } else {
        url.searchParams.set(`config.${key}`, String(value))
      }
    })
  }

  return url.toString()
}
