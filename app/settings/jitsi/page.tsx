'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useToast } from '@/hooks/use-toast'
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper'

type OrganizationStatus = {
  id: string
  jitsiConnectionStatus: 'CONNECTED' | 'PENDING' | 'DISCONNECTED' | string
  jitsiDomain?: string | null
  jitsiAppId?: string | null
  jitsiAppSecret?: string | null
}

type JitsiStatusResponse = {
  organization: OrganizationStatus
  canManage: boolean
}

export default function JitsiSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<JitsiStatusResponse | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/jitsi/status')
      const result: JitsiStatusResponse = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }
        setError((result as { error?: string }).error || 'Veri yüklenemedi')
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

    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const errorParam = params.get('error')

    if (success === 'configured') {
      setSuccessMessage('Jitsi sunucusu başarıyla yapılandırıldı! App ID ve App Secret oluşturuldu.')
      window.history.replaceState({}, '', '/settings/jitsi')
    }

    if (success === 'connected') {
      setSuccessMessage('Bağlantı testi başarılı! Jitsi sunucusu bağlandı.')
      window.history.replaceState({}, '', '/settings/jitsi')
    }

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      window.history.replaceState({}, '', '/settings/jitsi')
    }
  }, [fetchData])

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Jitsi Sunucu Ayarları</h1>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Icon icon="mdi:arrow-left" className="w-4 h-4" /> Dashboard&apos;a Dön
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {successMessage && (
                <div className="bg-chart-1/10 border border-chart-1/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <Icon icon="mdi:check-circle" className="w-5 h-5" /> {successMessage}
                  </p>
                </div>
              )}

              {!data.canManage && (
                <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-chart-2">
                    Jitsi sunucu ayarlarını yönetmek için OWNER veya ADMIN yetkisi gereklidir.
                  </p>
                </div>
              )}

              <div className="bg-card rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Mevcut Durum</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Bağlantı Durumu
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                        data.organization.jitsiConnectionStatus === 'CONNECTED'
                          ? 'bg-green-100 text-green-800'
                          : data.organization.jitsiConnectionStatus === 'PENDING'
                          ? 'bg-yellow-100 text-chart-2'
                          : 'bg-secondary text-gray-800'
                      }`}
                    >
                      {data.organization.jitsiConnectionStatus === 'CONNECTED' ? (
                        <>
                          <Icon icon="mdi:check-circle" className="w-4 h-4 inline" /> Bağlı
                        </>
                      ) : data.organization.jitsiConnectionStatus === 'PENDING' ? (
                        <>
                          <Icon icon="mdi:clock-outline" className="w-4 h-4 inline" /> Beklemede
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:close-circle" className="w-4 h-4 inline" /> Bağlı Değil
                        </>
                      )}
                    </span>
                  </div>

                  {data.organization.jitsiDomain && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Jitsi Domain
                      </label>
                      <p className="text-sm text-foreground font-mono">{data.organization.jitsiDomain}</p>
                    </div>
                  )}

                  {data.organization.jitsiAppId && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        App ID
                      </label>
                      <p className="text-sm text-foreground font-mono">{data.organization.jitsiAppId}</p>
                    </div>
                  )}
                </div>
              </div>

              {data.canManage && (
                <form action="/api/settings/jitsi/configure" method="POST">
                  <input type="hidden" name="organizationId" value={data.organization.id} />

                  <div className="bg-card rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {data.organization.jitsiDomain ? 'Jitsi Sunucusu Güncelle' : 'Jitsi Sunucusu Bağla'}
                    </h2>

                    <div className="space-y-6">
                      <div>
                        <label htmlFor="jitsiDomain" className="block text-sm font-medium text-foreground mb-1">
                          Jitsi Domain/URL
                        </label>
                        <input
                          type="text"
                          id="jitsiDomain"
                          name="jitsiDomain"
                          defaultValue={data.organization.jitsiDomain || ''}
                          placeholder="meet.jitsi.si veya https://meet.jitsi.si"
                          className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-sm text-muted-foreground">
                          Jitsi Meet sunucunuzun domain&apos;i (https:// otomatik eklenir)
                        </p>
                      </div>

                      <div className="bg-chart-3/10 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <Icon icon="mdi:lightbulb-outline" className="w-5 h-5" /> Nasıl Çalışır?
                        </h3>
                        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                          <li>Jitsi domain&apos;inizi girin ve kaydedin</li>
                          <li>Sistem sizin için otomatik App ID ve App Secret üretir</li>
                          <li>Bu değerleri Jitsi sunucunuzun ortam değişkenlerine ekleyin</li>
                          <li>&quot;Bağlantıyı Test Et&quot; ile doğrulayın</li>
                        </ol>
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Kaydet ve Devam Et
                        </button>
                        <Link
                          href="/dashboard"
                          className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-background"
                        >
                          İptal
                        </Link>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {data.organization.jitsiAppId && data.organization.jitsiAppSecret && data.canManage && (
                <div className="mt-6 bg-card rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Icon icon="mdi:clipboard-text-outline" className="w-5 h-5" /> Jitsi Sunucu Yapılandırması
                  </h2>

                  <p className="text-sm text-foreground mb-4">
                    Aşağıdaki değerleri Jitsi sunucunuzun <code className="bg-secondary px-1 rounded">.env</code> dosyasına ekleyin:
                  </p>

                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
                    <pre>{`ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=${data.organization.jitsiAppId}
JWT_APP_SECRET=${data.organization.jitsiAppSecret}
ENABLE_GUESTS=0`}</pre>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(
                          `ENABLE_AUTH=1\nAUTH_TYPE=jwt\nJWT_APP_ID=${data.organization.jitsiAppId}\nJWT_APP_SECRET=${data.organization.jitsiAppSecret}\nENABLE_GUESTS=0`
                        )
                        toast({
                          title: '✓ Kopyalandı!',
                          description: 'Jitsi yapılandırması panoya kopyalandı',
                          duration: 2000,
                        })
                      }}
                      className="px-4 py-2 bg-gray-700 text-primary-foreground rounded-md hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Icon icon="mdi:content-copy" className="w-4 h-4" /> Kopyala
                    </button>

                    <form action="/api/settings/jitsi/test" method="POST">
                      <input type="hidden" name="organizationId" value={data.organization.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-chart-1 text-primary-foreground rounded-md hover:bg-green-700 flex items-center gap-2"
                      >
                        <Icon icon="mdi:magnify" className="w-4 h-4" /> Bağlantıyı Test Et
                      </button>
                    </form>
                  </div>
                </div>
              )}

              <div className="mt-6 bg-chart-2/10 border border-chart-2/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <Icon icon="mdi:alert" className="w-5 h-5" /> Önemli Güvenlik Notu
                </h3>
                <p className="text-sm text-chart-2">
                  Jitsi sunucunuzda JWT auth aktif edilmeden panel JWT üretse bile, kullanıcılar doğrudan Jitsi URL&apos;sine gidip oda açabilir. Token auth zorunlu kılınmalıdır.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
