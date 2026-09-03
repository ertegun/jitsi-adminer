'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [meetingId, setMeetingId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => {
      setMeetingId(p.id)
    })
  }, [params])

  useEffect(() => {
    if (meetingId) {
      fetchData()
    }
  }, [meetingId])

  const fetchData = async () => {
    if (!meetingId) return
    try {
      const response = await fetch(`/api/meetings/${meetingId}`)
      const result = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }
        if (response.status === 404) {
          router.push('/meetings')
          return
        }
        setError(result.error || 'Veri yüklenemedi')
        return
      }

      setData(result)
    } catch (err) {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Kopyalandı!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const { meeting, hostLink, guestLink } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {meeting.title}
            </h1>
            <a href="/meetings" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon icon="mdi:arrow-left" className="w-4 h-4" /> Toplantılara Dön
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Info */}
            <div className="bg-card rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Toplantı Bilgileri
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Oluşturan: {meeting.createdBy.name || meeting.createdBy.email}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Başlangıç:</span>
                  <p className="text-foreground font-medium">
                    {new Date(meeting.scheduledStart).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bitiş:</span>
                  <p className="text-foreground font-medium">
                    {meeting.scheduledEnd
                      ? new Date(meeting.scheduledEnd).toLocaleString('tr-TR')
                      : 'Belirtilmemiş'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Oda Adı:</span>
                  <p className="text-foreground font-mono text-xs">
                    {meeting.roomName}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mod:</span>
                  <p className="text-foreground">
                    {meeting.participantRoleMode === 'HOST_GUEST'
                      ? 'Host/Misafir'
                      : 'Herkes Moderatör'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {meeting.lobbyEnabled && (
                  <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                    Lobby
                  </span>
                )}
                {meeting.recordingEnabled && (
                  <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                    Kayıt
                  </span>
                )}
              </div>
            </div>

            {/* Meeting Links */}
            {(hostLink || guestLink) && (
              <div className="bg-card rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Icon icon="mdi:link-variant" className="w-5 h-5" /> Toplantı Linkleri
                </h2>

                <div className="space-y-4">
                  {hostLink && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Host Link (Moderatör) - Sadece siz
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={hostLink}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(hostLink)}
                          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80 flex items-center gap-2"
                        >
                          <Icon icon="mdi:content-copy" className="w-4 h-4" /> Kopyala
                        </button>
                      </div>
                    </div>
                  )}

                  {guestLink && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Misafir Link - Katılımcılarla paylaşın
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={guestLink}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(guestLink)}
                          className="px-4 py-2 text-sm bg-chart-1 text-primary-foreground rounded hover:bg-green-700 flex items-center gap-2"
                        >
                          <Icon icon="mdi:content-copy" className="w-4 h-4" /> Kopyala
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Misafirler, host gelene kadar bekleme odasında kalır
                      </p>
                    </div>
                  )}

                  {!guestLink && meeting.participantRoleMode === 'EVERYONE_MODERATOR' && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Herkes Moderatör</strong> modunda tek link kullanılır. 
                      Host linki tüm katılımcılarla paylaşılabilir.
                    </p>
                  )}
                </div>
              </div>
            )}

            {!hostLink && !guestLink && (
              <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4 flex items-start gap-2">
                <Icon icon="mdi:alert" className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-chart-2">
                  Jitsi sunucu bağlantısı yok. Toplantı linkleri üretilemedi.{' '}
                  <a href="/settings/jitsi" className="underline">
                    Jitsi sunucusu bağlayın
                  </a>
                </p>
              </div>
            )}

            {/* Participants */}
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Katılımcılar ({meeting.participants.length})
              </h2>

              {meeting.participants.length > 0 ? (
                <div className="divide-y">
                  {meeting.participants.map((participant: any) => (
                    <div key={participant.id} className="py-3 flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {participant.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Katıldı: {new Date(participant.joinedAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      {participant.durationSeconds && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(participant.durationSeconds / 60)} dakika
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Henüz katılımcı yok
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sessions */}
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Oturumlar
              </h2>

              {meeting.sessions.length > 0 ? (
                <div className="space-y-3">
                  {meeting.sessions.map((session: any) => (
                    <div key={session.id} className="text-sm">
                      <p className="font-medium text-foreground">
                        {new Date(session.actualStart).toLocaleString('tr-TR')}
                      </p>
                      {session.actualEnd && (
                        <p className="text-muted-foreground">
                          Süre: {Math.round((session.totalDurationSeconds || 0) / 60)} dakika
                        </p>
                      )}
                      {!session.actualEnd && (
                        <p className="text-chart-1 font-medium">Devam ediyor...</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Henüz oturum başlamadı
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                İşlemler
              </h2>

              <div className="space-y-2">
                {hostLink && (
                  <a
                    href={hostLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-primary text-primary-foreground text-center rounded hover:bg-primary/80 flex items-center justify-center gap-2"
                  >
                    <Icon icon="mdi:video" className="w-5 h-5" /> Toplantıya Katıl
                  </a>
                )}

                <button
                  onClick={() => {
                    if (confirm('Toplantıyı iptal etmek istediğinizden emin misiniz?')) {
                      // TODO: Cancel meeting API
                      alert('İptal fonksiyonu yakında eklenecek')
                    }
                  }}
                  className="block w-full px-4 py-2 border border-red-300 text-destructive text-center rounded hover:bg-destructive/10 flex items-center justify-center gap-2"
                >
                  <Icon icon="mdi:close-circle" className="w-5 h-5" /> Toplantıyı İptal Et
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
