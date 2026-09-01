import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/superAdmin'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@iconify/react'
import Link from 'next/link'

export default async function AdminDashboard() {
  try {
    await requireSuperAdmin()
  } catch {
    redirect('/dashboard')
  }

  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get system-wide statistics
  const [totalOrgs, totalUsers, totalMeetings, activeMeetings] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.meeting.count(),
    prisma.meeting.count({ where: { status: 'LIVE' } }),
  ])

  // Recent organizations
  const recentOrgs = await prisma.organization.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      license: true,
      _count: {
        select: {
          members: true,
          meetings: true,
        },
      },
    },
  })

  // Recent users
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          organizations: true,
        },
      },
    },
  })

  return (
    <DashboardLayout 
      user={session.user} 
      organizationName="Super Admin Panel"
      isSuperAdmin={true}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Icon icon="mdi:shield-crown" className="w-8 h-8 text-destructive" />
            Super Admin Özet
          </h1>
          <p className="text-muted-foreground">Sistem geneli istatistikler</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Organizasyon</CardTitle>
              <Icon icon="mdi:domain" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrgs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
              <Icon icon="mdi:account-group" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Toplantı</CardTitle>
              <Icon icon="mdi:video-box" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMeetings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Toplantı</CardTitle>
              <Icon icon="mdi:video-check" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">{activeMeetings}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Son Organizasyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org._count.members} üye • {org._count.meetings} toplantı
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className={org.license?.status === 'ACTIVE' ? 'text-chart-1' : 'text-destructive'}>
                      {org.license?.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Son Kullanıcılar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user._count.organizations} organizasyon
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
