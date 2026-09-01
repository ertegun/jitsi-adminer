import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/superAdmin'
import { prisma } from '@/lib/db/prisma'

export default async function UsersPage() {
  try {
    await requireSuperAdmin()
  } catch {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organizations: {
        include: {
          organization: true,
        },
      },
      _count: {
        select: {
          createdMeetings: true,
        },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-destructive text-primary-foreground shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Tüm Kullanıcılar</h1>
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
            <a href="/admin/users" className="text-sm font-semibold text-destructive">
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
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Organizasyonlar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Toplantı Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Roller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {user.name}
                        {user.isSuperAdmin && (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">
                            SUPER ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.organizations.map((membership) => (
                        <div key={membership.id} className="text-sm">
                          <span className="text-foreground">
                            {membership.organization.name}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({membership.role})
                          </span>
                        </div>
                      ))}
                      {user.organizations.length === 0 && (
                        <span className="text-sm text-gray-400">Organizasyon yok</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {user._count.createdMeetings}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.organizations.map((membership) => (
                        <span
                          key={membership.id}
                          className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                        >
                          {membership.role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Henüz kullanıcı yok
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
