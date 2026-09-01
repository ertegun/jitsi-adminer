import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { isSuperAdmin } from '@/lib/auth/superAdmin'
import { DashboardLayout } from '@/components/DashboardLayout'
import Link from 'next/link'

export default async function MeetingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user is super admin
  const isSuperAdminUser = await isSuperAdmin()

  // Get user's first organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: true,
    },
  })

  if (!membership) {
    redirect('/dashboard')
  }

  const org = membership.organization

  // Get all meetings for this organization
  const meetings = await prisma.meeting.findMany({
    where: { organizationId: org.id },
    orderBy: { scheduledStart: 'desc' },
    include: {
      createdBy: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
  })

  // Group by status
  const scheduled = meetings.filter((m) => m.status === 'SCHEDULED')
  const live = meetings.filter((m) => m.status === 'LIVE')
  const ended = meetings.filter((m) => m.status === 'ENDED')
  const cancelled = meetings.filter((m) => m.status === 'CANCELLED')

  return (
    <DashboardLayout 
      user={session.user} 
      organizationName={org.name}
      isSuperAdmin={isSuperAdminUser}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Toplantılar</h1>
            <p className="text-muted-foreground">Tüm toplantılarınızı yönetin</p>
          </div>
          <Link href="/meetings/create" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
            Yeni Toplantı
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <p className="text-sm text-muted-foreground">Planlanmış</p>
            <p className="text-2xl font-bold text-primary">{scheduled.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <p className="text-sm text-muted-foreground">Canlı</p>
            <p className="text-2xl font-bold text-chart-1">{live.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <p className="text-sm text-muted-foreground">Tamamlanmış</p>
            <p className="text-2xl font-bold text-muted-foreground">{ended.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <p className="text-sm text-muted-foreground">İptal Edilmiş</p>
            <p className="text-2xl font-bold text-destructive">{cancelled.length}</p>
          </div>
        </div>

        {/* Content */}
        {/* Live Meetings */}
        {live.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> Canlı Toplantılar
            </h2>
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-chart-1/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">
                      Toplantı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">
                      Başlangıç
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">
                      Katılımcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">
                      Oluşturan
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {live.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-background">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {meeting.title}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {meeting.roomName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(meeting.scheduledStart).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {meeting._count.participants}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {meeting.createdBy.name || meeting.createdBy.email}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="text-sm text-primary hover:text-primary flex items-center gap-1 justify-end"
                        >
                          Detay <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scheduled Meetings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Planlanmış Toplantılar
          </h2>

          {scheduled.length > 0 ? (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Toplantı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Başlangıç
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Bitiş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Oluşturan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Ayarlar
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduled.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-background">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {meeting.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {meeting.roomName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(meeting.scheduledStart).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {meeting.scheduledEnd
                          ? new Date(meeting.scheduledEnd).toLocaleString('tr-TR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {meeting.createdBy.name || meeting.createdBy.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {meeting.lobbyEnabled && (
                            <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800">
                              Lobby
                            </span>
                          )}
                          {meeting.recordingEnabled && (
                            <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-800">
                              Kayıt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="text-sm text-primary hover:text-primary flex items-center gap-1 justify-end"
                        >
                          Detay <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow p-12 text-center">
              <p className="text-muted-foreground mb-4">Henüz planlanmış toplantı yok</p>
              <Link
                href="/meetings/create"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80"
              >
                İlk Toplantıyı Oluştur
              </Link>
            </div>
          )}
        </div>

        {/* Ended Meetings */}
        {ended.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-chart-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Tamamlanmış Toplantılar
            </h2>
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Toplantı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Katılımcı
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ended.slice(0, 10).map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-background">
                      <td className="px-6 py-4 text-sm text-foreground">
                        {meeting.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(meeting.scheduledStart).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {meeting._count.participants}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="text-sm text-primary hover:text-primary flex items-center gap-1 justify-end"
                        >
                          Detay <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ended.length > 10 && (
                <div className="px-6 py-3 bg-background text-center text-sm text-muted-foreground">
                  +{ended.length - 10} daha fazla tamamlanmış toplantı
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
