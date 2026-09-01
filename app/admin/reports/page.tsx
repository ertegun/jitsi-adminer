import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/superAdmin'
import { prisma } from '@/lib/db/prisma'

export default async function ReportsPage() {
  try {
    await requireSuperAdmin()
  } catch {
    redirect('/dashboard')
  }

  // Organization usage stats
  const orgStats = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          meetings: true,
          members: true,
        },
      },
      meetings: {
        include: {
          sessions: true,
          participants: true,
        },
      },
    },
  })

  const organizationReports = orgStats.map((org) => {
    // Calculate total meeting duration (session-based)
    const totalDurationSeconds = org.meetings.reduce((acc, meeting) => {
      const sessionDuration = meeting.sessions.reduce(
        (sessionAcc, session) => sessionAcc + (session.totalDurationSeconds || 0),
        0
      )
      return acc + sessionDuration
    }, 0)

    // Calculate total participant-minutes
    const totalParticipantMinutes = org.meetings.reduce((acc, meeting) => {
      const participantDuration = meeting.participants.reduce(
        (partAcc, participant) => partAcc + (participant.durationSeconds || 0),
        0
      )
      return acc + participantDuration
    }, 0)

    return {
      organization: org,
      totalMeetings: org._count.meetings,
      totalMembers: org._count.members,
      totalDurationHours: Math.round(totalDurationSeconds / 3600),
      totalParticipantHours: Math.round(totalParticipantMinutes / 3600),
      avgMeetingDuration:
        org._count.meetings > 0
          ? Math.round(totalDurationSeconds / org._count.meetings / 60)
          : 0,
    }
  }).sort((a, b) => b.totalParticipantHours - a.totalParticipantHours)

  // System-wide totals
  const systemTotals = organizationReports.reduce(
    (acc, report) => ({
      meetings: acc.meetings + report.totalMeetings,
      durationHours: acc.durationHours + report.totalDurationHours,
      participantHours: acc.participantHours + report.totalParticipantHours,
    }),
    { meetings: 0, durationHours: 0, participantHours: 0 }
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-destructive text-primary-foreground shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Sistem Raporları</h1>
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
            <a href="/admin/meetings" className="text-sm text-muted-foreground hover:text-foreground">
              Toplantılar
            </a>
            <a href="/admin/reports" className="text-sm font-semibold text-destructive">
              Raporlar
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System-wide Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-muted-foreground">Toplam Toplantı Süresi</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {systemTotals.durationHours} <span className="text-lg">saat</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {systemTotals.meetings} toplantı
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-muted-foreground">
              Toplam Katılımcı-Saat
            </h3>
            <p className="mt-2 text-3xl font-bold text-primary">
              {systemTotals.participantHours} <span className="text-lg">saat</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Gerçek sunucu yükü metriği
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-muted-foreground">Ortalama Katılımcı</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {systemTotals.durationHours > 0
                ? (systemTotals.participantHours / systemTotals.durationHours).toFixed(1)
                : 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Kişi/toplantı</p>
          </div>
        </div>

        {/* Organization Usage Table */}
        <div className="bg-card rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-foreground">
              Organizasyon Bazlı Kullanım
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Katılımcı-saat bazlı sıralama (yüksekten düşüğe)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organizasyon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Toplantı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Üye
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Toplam Süre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Katılımcı-Saat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ort. Toplantı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Kota Durumu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {organizationReports.map((report) => {
                  const org = report.organization
                  const quotaUsagePercent =
                    org.monthlyMinuteQuota && report.totalParticipantHours > 0
                      ? Math.round(
                          (report.totalParticipantHours * 60) /
                            org.monthlyMinuteQuota *
                            100
                        )
                      : null

                  return (
                    <tr key={org.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {org.name}
                        </div>
                        <div className="text-sm text-muted-foreground">@{org.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {report.totalMeetings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {report.totalMembers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {report.totalDurationHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary">
                          {report.totalParticipantHours}h
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {report.avgMeetingDuration}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {org.monthlyMinuteQuota ? (
                          <div>
                            <div
                              className={`text-sm font-medium ${
                                quotaUsagePercent! > 90
                                  ? 'text-destructive'
                                  : quotaUsagePercent! > 70
                                  ? 'text-yellow-600'
                                  : 'text-chart-1'
                              }`}
                            >
                              {quotaUsagePercent}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {org.monthlyMinuteQuota} dakika kota
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Kota yok</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {organizationReports.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Henüz kullanım verisi yok
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-chart-3/10 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> Rapor Metrikleri Hakkında
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Toplam Süre:</strong> Toplantıların açık kaldığı toplam süre
              (MeetingSession bazlı).
            </p>
            <p>
              <strong>Katılımcı-Saat:</strong> Her katılımcının odada geçirdiği süre
              ayrı ayrı toplanır. Bu metrik, sunucu yükünü ve gerçek kullanımı daha
              doğru yansıtır. Örnek: 5 kişi 2 saat = 10 katılımcı-saat.
            </p>
            <p>
              <strong>Kota:</strong> Organizasyon bazlı aylık dakika kotası varsa,
              kullanım yüzdesi gösterilir (katılımcı-dakika metriğine göre).
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
