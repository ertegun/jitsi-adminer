import { NextRequest } from 'next/server'

/**
 * Builds an absolute URL for redirects using the incoming request's
 * `Host` header (and `X-Forwarded-*` when behind a proxy) instead of
 * `request.url`.
 *
 * Next.js's standalone server output derives `request.url` from the
 * hostname/port it's bound to (HOSTNAME=0.0.0.0, PORT=3000 in our
 * Docker image) rather than the Host header the browser actually sent.
 * Behind Docker port mapping (e.g. host port 3333 -> container port
 * 3000), that produces redirects to `http://0.0.0.0:3000/...` instead
 * of the address the user is browsing on. Reading the Host header
 * directly avoids that.
 */
export function absoluteUrl(path: string, request: NextRequest): URL {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    // Fallback for environments without a Host header (shouldn't happen
    // for normal browser requests).
    return new URL(path, request.url)
  }

  return new URL(path, `${protocol}://${host}`)
}
