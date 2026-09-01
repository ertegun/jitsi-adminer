import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/superAdmin'
import { prisma } from '@/lib/db/prisma'
import { generateJitsiToken } from '@/lib/jitsi/generateToken'
import { buildMeetingUrl } from '@/lib/jitsi/buildMeetingUrl'
import { mergeAdvancedSettings } from '@/lib/jitsi/advancedSettings'

export default async function MeetingsPage() {
  try {
    await requireSuperAdmin()
  } catch {
    redirect('/dashboard')
  }

  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organization: true,
      createdBy: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-destructive text-primary-foreground shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Tüm Toplantılar</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Özet
            </a>
            <a href="/admin/organizations" className="text-sm text-muted-foreground hover:text-foreground">
              Organizasyonlar
            </a>
            <a href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
              Kullanıcılar
            </a>
            <a href="/admin/meetings" className="text-sm font-semibold text-destructive">
              Toplantılar
            </a>
            <a href="/admin/reports" className="text-sm text-muted-foreground hover:text-foreground">
              Raporlar
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {meetings.map((meeting) => {
            const org = meeting.organization
            const advancedSettings = meeting.advancedSettings
              ? mergeAdvancedSettings(JSON.parse(meeting.advancedSettings))
              : undefined

            // Generate host and guest links if Jitsi is connected
            let hostLink = null
            let guestLink = null

            if (
              org.jitsiDomain &&
              org.jitsiAppId &&
              org.jitsiAppSecret &&
              org.jitsiConnectionStatus === 'CONNECTED'
            ) {
              try {
                // Host link
                const hostToken = generateJitsiToken({
                  jitsiDomain: org.jitsiDomain,
                  jitsiAppId: org.jitsiAppId,
                  jitsiAppSecret: org.jitsiAppSecret,
                  roomName: meeting.roomName,
                  userName: meeting.createdBy.name || undefined,
                  userEmail: meeting.createdBy.email,
                  isModerator: true,
                  meeting: {
                    scheduledStart: meeting.scheduledStart,
                    scheduledEnd: meeting.scheduledEnd,
                  },
                  advancedSettings,
                })

                hostLink = buildMeetingUrl({
                  jitsiDomain: org.jitsiDomain,
                  roomName: meeting.roomName,
                  jwt: hostToken,
                  advancedSettings,
                })

                // Guest link (if HOST_GUEST mode)
                if (meeting.participantRoleMode === 'HOST_GUEST') {
                  const guestToken = generateJitsiToken({
                    jitsiDomain: org.jitsiDomain,
                    jitsiAppId: org.jitsiAppId,
                    jitsiAppSecret: org.jitsiAppSecret,
                    roomName: meeting.roomName,
                    isModerator: false,
                    meeting: {
                      scheduledStart: meeting.scheduledStart,
                      scheduledEnd: meeting.scheduledEnd,
                    },
                    advancedSettings,
                  })

                  guestLink = buildMeetingUrl({
                    jitsiDomain: org.jitsiDomain,
                    roomName: meeting.roomName,
                    jwt: guestToken,
                    advancedSettings,
                  })
                }
              } catch (error) {
                console.error('Failed to generate meeting links:', error)
              }
            }

            return (
              <div key={meeting.id} className="bg-card rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {meeting.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {org.name} • {meeting.createdBy.name}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm rounded ${
                      meeting.status === 'LIVE'
                        ? 'bg-green-100 text-green-800'
                        : meeting.status === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-800'
                        : meeting.status === 'ENDED'
                        ? 'bg-secondary text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {meeting.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Başlangıç:</span>{' '}
                    <span className="text-foreground">
                      {new Date(meeting.scheduledStart).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bitiş:</span>{' '}
                    <span className="text-foreground">
                      {meeting.scheduledEnd
                        ? new Date(meeting.scheduledEnd).toLocaleString('tr-TR')
                        : 'Belirtilmemiş'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Katılımcı:</span>{' '}
                    <span className="text-foreground">{meeting._count.participants}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Oda:</span>{' '}
                    <span className="font-mono text-sm text-foreground">
                      {meeting.roomName}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  {meeting.lobbyEnabled && (
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                      Lobby Aktif
                    </span>
                  )}
                  {meeting.recordingEnabled && (
                    <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                      Kayıt Açık
                    </span>
                  )}
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                    {meeting.participantRoleMode === 'HOST_GUEST'
                      ? 'Host/Misafir'
                      : 'Herkes Moderatör'}
                  </span>
                </div>

                {/* Meeting Links */}
                {(hostLink || guestLink) && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Toplantı Linkleri
                    </h4>

                    {hostLink && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Host Link (Moderatör)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={hostLink}
                            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background font-mono"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(hostLink)}
                            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80"
                          >
                            Kopyala
                          </button>
                        </div>
                      </div>
                    )}

                    {guestLink && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Guest Link (Misafir)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={guestLink}
                            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background font-mono"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(guestLink)}
                            className="px-4 py-2 text-sm bg-chart-1 text-primary-foreground rounded hover:bg-green-700"
                          >
                            Kopyala
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!hostLink && !guestLink && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      ⚠️ Jitsi sunucu bağlantısı yok, link üretilemiyor
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {meetings.length === 0 && (
            <div className="bg-card rounded-lg shadow p-12 text-center text-muted-foreground">
              Henüz toplantı yok
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
