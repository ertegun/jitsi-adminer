import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/superAdmin'
import { prisma } from '@/lib/db/prisma'

export default async function OrganizationsPage() {
  try {
    await requireSuperAdmin()
  } catch {
    redirect('/dashboard')
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      license: true,
      _count: {
        select: {
          members: true,
          meetings: true,
        },
      },
      members: {
        where: { role: 'OWNER' },
        take: 1,
        include: {
          user: true,
        },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-destructive text-primary-foreground shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Tüm Organizasyonlar</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Özet
            </a>
            <a href="/admin/organizations" className="text-sm font-semibold text-destructive">
              Organizasyonlar
            </a>
            <a href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
              Kullanıcılar
            </a>
            <a href="/admin/meetings" className="text-sm text-muted-foreground hover:text-foreground">
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
        <div className="bg-card shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Organizasyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sahip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Üye Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Toplantı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Jitsi Bağlantı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lisans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Oluşturulma
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">{org.name}</div>
                      <div className="text-sm text-muted-foreground">@{org.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org.members[0] && (
                      <div className="text-sm text-foreground">
                        <div>{org.members[0].user.name}</div>
                        <div className="text-muted-foreground">{org.members[0].user.email}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {org._count.members}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {org._count.meetings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        org.jitsiConnectionStatus === 'CONNECTED'
                          ? 'bg-green-100 text-green-800'
                          : org.jitsiConnectionStatus === 'PENDING'
                          ? 'bg-yellow-100 text-chart-2'
                          : 'bg-secondary text-gray-800'
                      }`}
                    >
                      {org.jitsiConnectionStatus}
                    </span>
                    {org.jitsiDomain && (
                      <div className="text-xs text-muted-foreground mt-1">{org.jitsiDomain}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        org.license?.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : org.license?.status === 'PENDING'
                          ? 'bg-yellow-100 text-chart-2'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {org.license?.status || 'NO LICENSE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {organizations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Henüz organizasyon yok
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
