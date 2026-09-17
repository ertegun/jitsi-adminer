'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useToast } from '@/hooks/use-toast'
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Member = {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
}

type Invite = {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

type MembersResponse = {
  canManage: boolean
  currentUserId: string
  members: Member[]
  invites: Invite[]
}

const roleLabels: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  HOST: 'Sunucu (Host)',
  VIEWER: 'İzleyici',
}

const invitableRoles = ['ADMIN', 'HOST', 'VIEWER'] as const

export default function MembersSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MembersResponse | null>(null)
  const [error, setError] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<(typeof invitableRoles)[number]>('HOST')
  const [inviting, setInviting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/members')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }
        setError(result.error || 'Veri yüklenemedi')
        return
      }

      setData(result)
    } catch {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setLastInviteUrl(null)
    try {
      const response = await fetch('/api/settings/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'Davet oluşturulamadı', variant: 'destructive' })
        return
      }

      setLastInviteUrl(result.inviteUrl)
      setInviteEmail('')
      fetchData()
      toast({ title: '✓ Davet oluşturuldu', description: 'Davet linkini kopyalayıp paylaşabilirsiniz.', duration: 3000 })
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Bu daveti iptal etmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/settings/members/invites/${id}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'İptal edilemedi', variant: 'destructive' })
        return
      }

      fetchData()
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      const response = await fetch(`/api/settings/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'Rol güncellenemedi', variant: 'destructive' })
        return
      }

      fetchData()
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Bu üyeyi organizasyondan çıkarmak istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/settings/members/${memberId}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'Çıkarılamadı', variant: 'destructive' })
        return
      }

      fetchData()
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizasyon Üyeleri</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Icon icon="mdi:arrow-left" className="w-4 h-4" /> Dashboard&apos;a Dön
          </Link>
        </div>

        <div>
          {loading && (
            <div className="min-h-[40vh] flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          )}

          {!loading && error && (
            <div className="min-h-[40vh] flex items-center justify-center">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="bg-chart-3/10 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Aynı Jitsi sunucusunu birlikte kullanacağınız kişileri organizasyonunuza üye olarak davet edin.
                  Her üyenin kendi giriş bilgisi olur, ama hepsi aynı Jitsi sunucu yapılandırmasını paylaşır.
                </p>
              </div>

              {!data.canManage && (
                <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-chart-2">
                    Üye davet etmek ve yönetmek için OWNER veya ADMIN yetkisi gereklidir.
                  </p>
                </div>
              )}

              {data.canManage && (
                <div className="bg-card rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Yeni Üye Davet Et</h2>
                  <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as (typeof invitableRoles)[number])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {invitableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Icon icon="mdi:email-plus-outline" className="w-4 h-4" /> Davet Et
                    </button>
                  </form>

                  {lastInviteUrl && (
                    <div className="mt-4 bg-background border border-border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        SMTP yapılandırılmadığı için davet e-postası otomatik gönderilmedi. Bu linki kopyalayıp davet ettiğiniz kişiye iletin:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-900 text-gray-100 px-3 py-2 rounded font-mono text-xs overflow-x-auto">
                          {lastInviteUrl}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(lastInviteUrl)
                            toast({ title: '✓ Kopyalandı!', duration: 2000 })
                          }}
                          className="px-3 py-2 bg-gray-700 text-primary-foreground rounded-md hover:bg-gray-800"
                        >
                          <Icon icon="mdi:content-copy" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {data.canManage && data.invites.length > 0 && (
                <div className="bg-card rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Bekleyen Davetler</h2>
                  <div className="space-y-3">
                    {data.invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                        <div>
                          <p className="font-medium text-foreground">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {roleLabels[invite.role] || invite.role} · Son geçerlilik:{' '}
                            {new Date(invite.expiresAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="px-3 py-1.5 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 flex items-center gap-1"
                        >
                          <Icon icon="mdi:close" className="w-4 h-4" /> İptal Et
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Üyeler</h2>
                <div className="space-y-3">
                  {data.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user.name || member.user.email}
                          {member.user.id === data.currentUserId && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">Siz</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>

                      {data.canManage && member.user.id !== data.currentUserId && member.role !== 'OWNER' ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(['ADMIN', 'HOST', 'VIEWER'] as const).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {roleLabels[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="px-3 py-1.5 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 flex items-center gap-1"
                          >
                            <Icon icon="mdi:account-remove-outline" className="w-4 h-4" /> Çıkar
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-secondary text-muted-foreground">
                          {roleLabels[member.role] || member.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayoutWrapper>
  )
}
