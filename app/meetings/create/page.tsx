'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/datetime-picker'

export default function CreateMeetingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    scheduledStart: undefined as Date | undefined,
    scheduledEnd: undefined as Date | undefined,
    lobbyEnabled: false,
    recordingEnabled: false,
    participantRoleMode: 'HOST_GUEST',
    // Advanced settings
    startWithAudioMuted: true,
    startWithVideoMuted: true,
    requireDisplayName: true,
    prejoinPageEnabled: true,
    disableChat: false,
    disableReactions: false,
    e2eeEnabled: false,
  })

  const isEndBeforeStart = (start?: Date, end?: Date) =>
    Boolean(start && end && end.getTime() < start.getTime())

  const handleStartChange = (date: Date | undefined) => {
    setFormData((prev) => {
      if (date && isEndBeforeStart(date, prev.scheduledEnd)) {
        setError('Bitiş zamanı başlangıçtan önce olamaz')
        return { ...prev, scheduledStart: date, scheduledEnd: undefined }
      }

      setError('')
      return { ...prev, scheduledStart: date }
    })
  }

  const handleEndChange = (date: Date | undefined) => {
    setFormData((prev) => {
      if (date && isEndBeforeStart(prev.scheduledStart, date)) {
        setError('Bitiş zamanı başlangıçtan önce olamaz')
        return prev
      }

      setError('')
      return { ...prev, scheduledEnd: date }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isEndBeforeStart(formData.scheduledStart, formData.scheduledEnd)) {
      setError('Bitiş zamanı başlangıçtan önce olamaz')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledStart: formData.scheduledStart?.toISOString(),
          scheduledEnd: formData.scheduledEnd?.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Toplantı oluşturulamadı')
        return
      }

      // Redirect to meeting detail
      router.push(`/meetings/${data.meeting.id}`)
    } catch (err) {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Toplantı Oluştur</h1>
          <p className="text-muted-foreground">Toplantı detaylarını girin</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Temel Bilgiler
            </h2>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
                Toplantı Başlığı *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Haftalık Ekip Toplantısı"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduledStart" className="block text-sm font-medium text-foreground mb-1">
                  Başlangıç Zamanı *
                </label>
                <DateTimePicker
                  value={formData.scheduledStart}
                  onChange={handleStartChange}
                  placeholder="Başlangıç tarihi ve saati seçin"
                />
              </div>

              <div>
                <label htmlFor="scheduledEnd" className="block text-sm font-medium text-foreground mb-1">
                  Bitiş Zamanı (opsiyonel)
                </label>
                <DateTimePicker
                  value={formData.scheduledEnd}
                  onChange={handleEndChange}
                  placeholder="Bitiş tarihi ve saati seçin"
                />
              </div>
            </div>
          </div>

          {/* Meeting Settings */}
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Toplantı Ayarları
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Katılımcı Modu
              </label>
              <div className="space-y-2">
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="participantRoleMode"
                    value="HOST_GUEST"
                    checked={formData.participantRoleMode === 'HOST_GUEST'}
                    onChange={(e) => setFormData({ ...formData, participantRoleMode: e.target.value })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-foreground">Host/Misafir</div>
                    <div className="text-sm text-muted-foreground">
                      İki ayrı link: Host linki (moderatör) ve Misafir linki. 
                      Misafirler host gelene kadar bekler.
                    </div>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="radio"
                    name="participantRoleMode"
                    value="EVERYONE_MODERATOR"
                    checked={formData.participantRoleMode === 'EVERYONE_MODERATOR'}
                    onChange={(e) => setFormData({ ...formData, participantRoleMode: e.target.value })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-foreground">Herkes Moderatör</div>
                    <div className="text-sm text-muted-foreground">
                      Tek link, herkes eşit yetkiye sahip. İlk giren toplantıyı başlatır.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.lobbyEnabled}
                  onChange={(e) => setFormData({ ...formData, lobbyEnabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-foreground">Lobby (Bekleme Odası)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.recordingEnabled}
                  onChange={(e) => setFormData({ ...formData, recordingEnabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-foreground">Kayıt (Recording)</span>
              </label>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-card rounded-lg shadow">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-background"
            >
              <h2 className="text-lg font-semibold text-foreground">
                Gelişmiş Ayarlar
              </h2>
              <span className="text-muted-foreground">
                {showAdvanced ? '▼' : '▶'}
              </span>
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.startWithAudioMuted}
                      onChange={(e) => setFormData({ ...formData, startWithAudioMuted: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">Mikrofon Kapalı Başla</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.startWithVideoMuted}
                      onChange={(e) => setFormData({ ...formData, startWithVideoMuted: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">Kamera Kapalı Başla</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requireDisplayName}
                      onChange={(e) => setFormData({ ...formData, requireDisplayName: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">İsim Zorunlu</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.prejoinPageEnabled}
                      onChange={(e) => setFormData({ ...formData, prejoinPageEnabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">Pre-join Ekranı</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.disableChat}
                      onChange={(e) => setFormData({ ...formData, disableChat: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">Sohbeti Kapat</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.disableReactions}
                      onChange={(e) => setFormData({ ...formData, disableReactions: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">Tepkileri Kapat</span>
                  </label>

                  <label className="flex items-center col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.e2eeEnabled}
                      onChange={(e) => setFormData({ ...formData, e2eeEnabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-foreground">
                      E2EE (Uçtan-uca Şifreleme)
                      {formData.e2eeEnabled && (
                        <span className="ml-2 text-yellow-600">⚠️ Kayıt devre dışı kalabilir</span>
                      )}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Toplantı Oluştur'}
            </button>
            <a
              href="/meetings"
              className="px-6 py-3 border border-border text-foreground rounded-md hover:bg-background"
            >
              İptal
            </a>
          </div>
        </form>
      </div>
    </ClientLayoutWrapper>
  )
}
