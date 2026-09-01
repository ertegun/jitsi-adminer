import type { AdvancedMeetingSettings } from './advancedSettings'

export interface BuildMeetingUrlParams {
  jitsiDomain: string
  roomName: string
  jwt: string
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
  
  // Add JWT token
  url.searchParams.set('jwt', jwt)

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
