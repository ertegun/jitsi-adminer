import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { isSuperAdmin } from '@/lib/auth/superAdmin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ClientIcon } from '@/components/ClientIcon'
import JitsiSuccessAlert from './JitsiSuccessAlert'
import JitsiConnectionWidget from './JitsiConnectionWidget'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user is super admin
  const isSuperAdminUser = await isSuperAdmin()

  // Get user's organizations
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          license: true,
        },
      },
    },
  })

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organizasyon Bulunamadı</CardTitle>
            <CardDescription>Henüz bir organizasyona üye değilsiniz</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const firstOrg = memberships[0].organization
  const license = firstOrg.license

  // Check license status
  if (!license || license.status !== 'ACTIVE') {
    redirect(`/onboarding/license?org=${firstOrg.id}`)
  }

  // Get meeting stats
  const totalMeetings = await prisma.meeting.count({
    where: { organizationId: firstOrg.id },
  })

  const activeMeetings = await prisma.meeting.count({
    where: {
      organizationId: firstOrg.id,
      status: 'LIVE',
    },
  })

  return (
    <DashboardLayout 
      user={session.user} 
      organizationName={firstOrg.name}
      isSuperAdmin={isSuperAdminUser}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Hoş geldiniz, {session.user.name || session.user.email}
          </p>
        </div>

        <JitsiSuccessAlert />
        
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Toplantı</CardTitle>
              <ClientIcon icon="mdi:video" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMeetings}</div>
              <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Toplantı</CardTitle>
              <ClientIcon icon="mdi:video-check" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">{activeMeetings}</div>
              <p className="text-xs text-muted-foreground">Şu anda canlı</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lisans Durumu</CardTitle>
              <ClientIcon icon="mdi:shield-check" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">Aktif</div>
              {license.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Bitiş: {new Date(license.expiresAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>Sık kullanılan işlemler</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Button asChild size="lg" className="h-20">
              <Link href="/meetings/create" className="flex flex-col items-center gap-2">
                <ClientIcon icon="mdi:video-plus" className="w-8 h-8" />
                <span>Yeni Toplantı Oluştur</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-20">
              <Link href="/meetings" className="flex flex-col items-center gap-2">
                <ClientIcon icon="mdi:view-list" className="w-8 h-8" />
                <span>Toplantıları Görüntüle</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Jitsi Connection Widget */}
        <JitsiConnectionWidget 
          organization={{
            id: firstOrg.id,
            jitsiDomain: firstOrg.jitsiDomain,
            jitsiConnectionStatus: firstOrg.jitsiConnectionStatus,
            jitsiLastTestedAt: firstOrg.jitsiLastTestedAt,
          }}
        />
      </div>
    </DashboardLayout>
  )
}
