import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

const KEY_PREFIX = 'jad_live_'
const PREFIX_DISPLAY_LENGTH = 12 // "jad_live_" + first 3 chars of the secret

/**
 * Generate a new public API key.
 *
 * Returns the full plaintext key (shown to the user exactly once) plus the
 * values that get persisted: a SHA-256 hash for lookup/verification and a
 * short, non-secret prefix so the key can be recognized in the UI later.
 */
export function generateApiKey() {
  const secret = crypto.randomBytes(24).toString('base64url')
  const fullKey = `${KEY_PREFIX}${secret}`
  const keyHash = hashApiKey(fullKey)
  const keyPrefix = fullKey.slice(0, PREFIX_DISPLAY_LENGTH)

  return { fullKey, keyHash, keyPrefix }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Authenticate a request carrying `Authorization: Bearer <api_key>`.
 * Returns the active ApiKey (with its Organization) or null.
 * Also updates lastUsedAt (fire-and-forget, does not block the response).
 */
export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  const keyHash = hashApiKey(token)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  })

  if (!apiKey || apiKey.revokedAt) {
    return null
  }

  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((error) => console.error('Failed to update ApiKey.lastUsedAt:', error))

  return apiKey
}
