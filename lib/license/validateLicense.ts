/**
 * License validation function
 * 
 * TODO: Replace with real license server call once available.
 * Currently this is a MOCK implementation that accepts any non-empty key.
 * 
 * In production, this should call:
 * const response = await fetch(LICENSE_SERVER_URL + '/api/validate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key })
 * })
 */

export interface LicenseValidationResult {
  valid: boolean
  expiresAt?: Date
  plan?: string
  message?: string
}

export async function validateLicense(key: string): Promise<LicenseValidationResult> {
  // MOCK IMPLEMENTATION - accepts any non-empty key
  // TODO: Replace with real HTTP call to license server
  
  if (!key || key.trim().length === 0) {
    return {
      valid: false,
      message: 'License key cannot be empty'
    }
  }

  // For now, any non-empty key is considered valid
  // In production, this would make an HTTP request to validate
  return {
    valid: true,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now (mock)
    plan: 'MOCK_PLAN',
    message: 'License validated (mock mode)'
  }
}
