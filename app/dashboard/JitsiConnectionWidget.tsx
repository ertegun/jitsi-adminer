'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'

export default function JitsiConnectionWidget({ 
  organization 
}: { 
  organization: {
    id: string
    jitsiDomain: string | null
    jitsiConnectionStatus: string
    jitsiLastTestedAt: Date | null
  }
}) {
  const router = useRouter()
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    
    const form = new FormData()
    form.append('organizationId', organization.id)
    
    try {
      await fetch('/api/settings/jitsi/test', {
        method: 'POST',
        body: form,
      })
      
      // Refresh page data
      router.refresh()
    } catch (error) {
      alert('Test başarısız')
    } finally {
      setTesting(false)
    }
  }

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Henüz test edilmedi'
    
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Az önce'
    if (diffMins < 60) return `${diffMins} dakika önce`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} saat önce`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} gün önce`
  }

  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Jitsi Sunucu Bağlantısı
        </h2>
        <a
          href="/settings/jitsi"
          className="text-sm text-primary hover:text-primary/90 flex items-center gap-1 transition-colors"
        >
          Ayarlar <Icon icon="mdi:arrow-right" className="w-4 h-4" />
        </a>
      </div>

      {organization.jitsiConnectionStatus === 'CONNECTED' ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-foreground">
              Bağlı: {organization.jitsiDomain}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Son kontrol: {getTimeAgo(organization.jitsiLastTestedAt)}
          </p>
          <button
            onClick={handleTest}
            disabled={testing}
            className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
          >
            {testing ? 'Test ediliyor...' : <><Icon icon="mdi:magnify" className="w-4 h-4 inline" /> Şimdi Test Et</>}
          </button>
        </div>
      ) : organization.jitsiConnectionStatus === 'PENDING' ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div>
              <span className="text-sm font-medium text-foreground">
                Beklemede: {organization.jitsiDomain}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Jitsi sunucunuza App ID ve Secret ekleyin
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Son test: {getTimeAgo(organization.jitsiLastTestedAt)}
          </p>
          <div className="flex gap-2">
            <a
              href="/settings/jitsi"
              className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Ayarları Görüntüle
            </a>
            <button
              onClick={handleTest}
              disabled={testing}
              className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
            >
              {testing ? 'Test ediliyor...' : <><Icon icon="mdi:magnify" className="w-4 h-4 inline" /> Tekrar Test Et</>}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
            <span className="text-sm text-muted-foreground">Jitsi sunucusu bağlanmadı</span>
          </div>
          <a
            href="/settings/jitsi"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Jitsi Sunucusu Bağla
          </a>
        </div>
      )}
    </div>
  )
}
