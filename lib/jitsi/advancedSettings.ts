/**
 * Advanced meeting settings schema
 * This is the single source of truth for all advanced meeting configuration options.
 * 
 * Settings are split into two categories:
 * A) JWT-embedded features (signed, secure, user cannot modify)
 * B) URL config parameters (passed as query params, override Jitsi client config)
 */

export interface AdvancedMeetingSettings {
  // A) JWT Features (context.features in JWT payload)
  features: {
    recording: boolean
    livestreaming: boolean
    transcription: boolean
    outboundCall: boolean
  }
  
  // B) URL Config Parameters (appended as ?config.xxx=...)
  config: {
    startWithAudioMuted: boolean
    startWithVideoMuted: boolean
    requireDisplayName: boolean
    prejoinPageEnabled: boolean
    disableChat: boolean
    disableReactions: boolean
    e2eeEnabled: boolean
    // Lobby - enable waiting room for non-moderators
    'lobby.enabled'?: boolean
    // Lobby auto-knock: false = moderator must manually approve each guest
    'lobby.autoKnock'?: boolean
  }
}

/**
 * Default advanced settings for new meetings
 * These provide sensible defaults that can be overridden per meeting
 */
export const DEFAULT_ADVANCED_SETTINGS: AdvancedMeetingSettings = {
  features: {
    recording: false, // Will be synced with recordingEnabled
    livestreaming: false,
    transcription: false,
    outboundCall: false,
  },
  config: {
    startWithAudioMuted: true,
    startWithVideoMuted: true,
    requireDisplayName: true, // Will vary by link type (false for host, true for guest)
    prejoinPageEnabled: true,
    disableChat: false,
    disableReactions: false,
    e2eeEnabled: false, // Note: e2ee disables recording/livestreaming
  },
}

/**
 * Get default settings for a specific participant role mode
 */
export function getDefaultSettingsForRole(
  participantRoleMode: 'HOST_GUEST' | 'EVERYONE_MODERATOR',
  isModerator: boolean
): AdvancedMeetingSettings {
  const settings = { ...DEFAULT_ADVANCED_SETTINGS }
  
  if (participantRoleMode === 'HOST_GUEST') {
    // For guest links, require display name
    settings.config.requireDisplayName = !isModerator
  } else {
    // For everyone-moderator mode, display name not strictly required
    settings.config.requireDisplayName = false
  }
  
  return settings
}

/**
 * Merge custom settings with defaults
 */
export function mergeAdvancedSettings(
  custom: Partial<AdvancedMeetingSettings>
): AdvancedMeetingSettings {
  return {
    features: {
      ...DEFAULT_ADVANCED_SETTINGS.features,
      ...custom.features,
    },
    config: {
      ...DEFAULT_ADVANCED_SETTINGS.config,
      ...custom.config,
    },
  }
}
