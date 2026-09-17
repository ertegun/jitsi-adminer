'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useToast } from '@/hooks/use-toast'
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper'

type ApiKeyListItem = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  creator: { name: string | null; email: string }
}

type TestEndpoint = 'create' | 'list' | 'get'

type TestResult = {
  method: string
  url: string
  status: number
  ok: boolean
  body: unknown
}

const DEFAULT_CREATE_BODY = {
  title: 'Test Toplantısı',
  lobbyEnabled: false,
  recordingEnabled: false,
  participantRoleMode: 'HOST_GUEST',
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
      {children}
    </pre>
  )
}

export default function ApiKeysSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<ApiKeyListItem[]>([])
  const [error, setError] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // --- Test console state ---
  const [testApiKey, setTestApiKey] = useState('')
  const [showTestKey, setShowTestKey] = useState(false)
  const [testEndpoint, setTestEndpoint] = useState<TestEndpoint>('create')
  const [testBody, setTestBody] = useState(() => JSON.stringify(DEFAULT_CREATE_BODY, null, 2))
  const [testMeetingId, setTestMeetingId] = useState('')
  const [testLimit, setTestLimit] = useState('20')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testErrorMsg, setTestErrorMsg] = useState('')

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/keys')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }
        setError(result.error || 'Veri yüklenemedi')
        return
      }

      setKeys(result.keys)
    } catch {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'API anahtarı oluşturulamadı', variant: 'destructive' })
        return
      }

      setCreatedKey(result.apiKey.key)
      setTestApiKey(result.apiKey.key)
      setNewKeyName('')
      fetchKeys()
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Bu API anahtarını iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return

    try {
      const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: result.error || 'İptal edilemedi', variant: 'destructive' })
        return
      }

      fetchKeys()
    } catch {
      toast({ title: 'Hata', description: 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  const handleRunTest = async () => {
    setTestErrorMsg('')

    if (!testApiKey.trim()) {
      setTestErrorMsg('Test etmek için bir API anahtarı girin.')
      return
    }

    let url = '/api/v1/meetings'
    let method = 'GET'
    let bodyToSend: string | undefined

    if (testEndpoint === 'create') {
      method = 'POST'
      try {
        JSON.parse(testBody)
      } catch {
        setTestErrorMsg('Gövde (body) geçerli bir JSON değil.')
        return
      }
      bodyToSend = testBody
    } else if (testEndpoint === 'list') {
      method = 'GET'
      const params = new URLSearchParams()
      if (testLimit.trim()) params.set('limit', testLimit.trim())
      url = `/api/v1/meetings${params.toString() ? `?${params.toString()}` : ''}`
    } else if (testEndpoint === 'get') {
      if (!testMeetingId.trim()) {
        setTestErrorMsg('Görüntülemek için bir toplantı ID girin.')
        return
      }
      method = 'GET'
      url = `/api/v1/meetings/${encodeURIComponent(testMeetingId.trim())}`
    }

    setTestLoading(true)
    setTestResult(null)
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${testApiKey.trim()}`,
          ...(bodyToSend ? { 'Content-Type': 'application/json' } : {}),
        },
        body: bodyToSend,
      })

      const responseBody = await response.json().catch(() => null)

      setTestResult({
        method,
        url,
        status: response.status,
        ok: response.ok,
        body: responseBody,
      })

      // If a meeting was just created, make it easy to fetch it next.
      if (
        testEndpoint === 'create' &&
        response.ok &&
        responseBody &&
        typeof responseBody === 'object' &&
        'meeting' in responseBody
      ) {
        const meeting = (responseBody as { meeting?: { id?: string } }).meeting
        if (meeting?.id) setTestMeetingId(meeting.id)
      }
    } catch {
      setTestErrorMsg('İstek gönderilemedi. Ağ bağlantınızı kontrol edin.')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Anahtarları</h1>
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

          {!loading && !error && (
            <>
              <div className="bg-chart-3/10 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  API anahtarları, harici uygulamaların (rezervasyon sistemi, mobil uygulama, CRM vb.) bu panele API
                  üzerinden bağlanıp sizin adınıza toplantı oluşturabilmesini sağlar. Aşağıda hem kullanım dökümanını
                  hem de kendi anahtarınızla canlı test yapabileceğiniz bir konsol bulabilirsiniz.
                </p>
              </div>

              {createdKey && (
                <div className="bg-chart-1/10 border border-chart-1/30 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Icon icon="mdi:key-alert" className="w-5 h-5" /> Yeni API Anahtarı Oluşturuldu
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Bu anahtarı şimdi kopyalayın — güvenlik nedeniyle tekrar gösterilmeyecek. Aşağıdaki test
                    konsoluna otomatik dolduruldu.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900 text-gray-100 px-3 py-2 rounded font-mono text-sm overflow-x-auto">
                      {createdKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdKey)
                        toast({ title: '✓ Kopyalandı!', duration: 2000 })
                      }}
                      className="px-3 py-2 bg-gray-700 text-primary-foreground rounded-md hover:bg-gray-800"
                    >
                      <Icon icon="mdi:content-copy" className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setCreatedKey(null)}
                    className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Kapat
                  </button>
                </div>
              )}

              <div className="bg-card rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Yeni API Anahtarı Oluştur</h2>
                <form onSubmit={handleCreate} className="flex gap-3">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Örn: Rezervasyon Uygulaması"
                    className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={creating || !newKeyName.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Icon icon="mdi:plus" className="w-4 h-4" /> Oluştur
                  </button>
                </form>
              </div>

              <div className="bg-card rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Mevcut Anahtarlar</h2>

                {keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz API anahtarı oluşturulmadı.</p>
                ) : (
                  <div className="space-y-3">
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between border border-border rounded-lg p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{key.name}</p>
                            {key.revokedAt && (
                              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                                İptal Edildi
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{key.keyPrefix}…</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Oluşturuldu: {new Date(key.createdAt).toLocaleString('tr-TR')}
                            {key.lastUsedAt && ` · Son kullanım: ${new Date(key.lastUsedAt).toLocaleString('tr-TR')}`}
                          </p>
                        </div>

                        {!key.revokedAt && (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="px-3 py-1.5 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 flex items-center gap-1"
                          >
                            <Icon icon="mdi:delete-outline" className="w-4 h-4" /> İptal Et
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ============ TEST CONSOLE ============ */}
              <div className="bg-card rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Icon icon="mdi:flask-outline" className="w-5 h-5" /> API Test Konsolu
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Bir API anahtarıyla gerçek isteği doğrudan tarayıcınızdan bu panele gönderir ve yanıtı gösterir.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">API Anahtarı</label>
                    <div className="flex gap-2">
                      <input
                        type={showTestKey ? 'text' : 'password'}
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        placeholder="jad_live_..."
                        className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTestKey((v) => !v)}
                        className="px-3 py-2 border border-border rounded-md hover:bg-background"
                        title={showTestKey ? 'Gizle' : 'Göster'}
                      >
                        <Icon icon={showTestKey ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Endpoint</label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'create', label: 'POST /meetings — Toplantı Oluştur' },
                          { id: 'list', label: 'GET /meetings — Liste' },
                          { id: 'get', label: 'GET /meetings/:id — Detay' },
                        ] as { id: TestEndpoint; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTestEndpoint(opt.id)}
                          className={`px-3 py-1.5 text-sm rounded-md border ${
                            testEndpoint === opt.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-foreground hover:bg-background'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {testEndpoint === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        İstek Gövdesi (JSON)
                      </label>
                      <textarea
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        rows={10}
                        className="w-full px-3 py-2 border border-border rounded-md shadow-sm font-mono text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        spellCheck={false}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Alanlar: title (zorunlu), scheduledStart, scheduledEnd, lobbyEnabled, recordingEnabled,
                        participantRoleMode (&quot;HOST_GUEST&quot; | &quot;EVERYONE_MODERATOR&quot;), hostName,
                        hostEmail, config (startWithAudioMuted, requireDisplayName, vb.)
                      </p>
                    </div>
                  )}

                  {testEndpoint === 'list' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">limit</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={testLimit}
                        onChange={(e) => setTestLimit(e.target.value)}
                        className="w-32 px-3 py-2 border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {testEndpoint === 'get' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Toplantı ID</label>
                      <input
                        type="text"
                        value={testMeetingId}
                        onChange={(e) => setTestMeetingId(e.target.value)}
                        placeholder="cmf..."
                        className="w-full px-3 py-2 border border-border rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {testErrorMsg && <p className="text-sm text-destructive">{testErrorMsg}</p>}

                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={testLoading}
                    className="px-4 py-2 bg-chart-1 text-primary-foreground rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Icon icon="mdi:send" className="w-4 h-4" />
                    {testLoading ? 'Gönderiliyor...' : 'İsteği Gönder'}
                  </button>

                  {testResult && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            testResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-destructive'
                          }`}
                        >
                          {testResult.status}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground">
                          {testResult.method} {testResult.url}
                        </span>
                      </div>
                      <CodeBlock>{JSON.stringify(testResult.body, null, 2)}</CodeBlock>
                    </div>
                  )}
                </div>
              </div>

              {/* ============ DOCUMENTATION ============ */}
              <div className="bg-card rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Icon icon="mdi:book-open-variant" className="w-5 h-5" /> API Dökümanı
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Toplantı oluşturmak için harici uygulamanızdan çağırabileceğiniz uç noktalar.
                </p>

                <div className="space-y-8 text-sm text-foreground">
                  <section>
                    <h3 className="font-semibold mb-2">Kimlik Doğrulama</h3>
                    <p className="text-muted-foreground mb-2">
                      Tüm <code className="bg-secondary px-1 rounded">/api/v1/*</code> uç noktaları{' '}
                      <code className="bg-secondary px-1 rounded">Authorization</code> header&apos;ında Bearer token
                      bekler:
                    </p>
                    <CodeBlock>{`Authorization: Bearer jad_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</CodeBlock>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                      <li>Anahtar yalnızca oluşturulduğu anda bir kez gösterilir; sunucuda sadece hash&apos;i saklanır.</li>
                      <li>İptal edilen anahtarlar <code className="bg-secondary px-1 rounded">401</code> döner.</li>
                      <li>Her kullanımda &quot;Son kullanım&quot; tarihi güncellenir (yukarıdaki listede görünür).</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">POST /api/v1/meetings — Toplantı Oluştur</h3>
                    <p className="text-muted-foreground mb-2">
                      Yeni bir toplantı oluşturur; organizasyonun Jitsi bağlantısı aktifse{' '}
                      <code className="bg-secondary px-1 rounded">hostLink</code> ve{' '}
                      <code className="bg-secondary px-1 rounded">guestLink</code> aynı yanıtta döner.
                    </p>
                    <div className="overflow-x-auto mb-2">
                      <table className="w-full text-xs border border-border rounded-md overflow-hidden">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="text-left p-2">Alan</th>
                            <th className="text-left p-2">Tip</th>
                            <th className="text-left p-2">Zorunlu</th>
                            <th className="text-left p-2">Açıklama</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            ['title', 'string', 'Evet', 'Toplantı başlığı'],
                            ['scheduledStart', 'ISO 8601 datetime', 'Hayır', 'Varsayılan: şimdi'],
                            ['scheduledEnd', 'ISO 8601 datetime', 'Hayır', 'Belirtilmezse ad-hoc kabul edilir (token 24 saat geçerli)'],
                            ['lobbyEnabled', 'boolean', 'Hayır', 'Varsayılan: false'],
                            ['recordingEnabled', 'boolean', 'Hayır', 'Varsayılan: false'],
                            ['participantRoleMode', '"HOST_GUEST" | "EVERYONE_MODERATOR"', 'Hayır', 'Varsayılan: HOST_GUEST'],
                            ['hostName', 'string', 'Hayır', 'Host JWT’sine gömülecek görünen isim'],
                            ['hostEmail', 'string', 'Hayır', 'Host JWT’sine gömülecek e-posta'],
                            ['config', 'object', 'Hayır', 'startWithAudioMuted, requireDisplayName, disableChat vb. (boolean)'],
                          ].map((row) => (
                            <tr key={row[0]}>
                              {row.map((cell, i) => (
                                <td key={i} className={`p-2 align-top ${i === 0 ? 'font-mono' : 'text-muted-foreground'}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-muted-foreground mb-1">Örnek yanıt (201):</p>
                    <CodeBlock>{`{
  "meeting": {
    "id": "cmf...",
    "title": "Satış Görüşmesi",
    "roomName": "acme-1a2b3c4d5e6f7a8b",
    "status": "SCHEDULED",
    "scheduledStart": "2026-09-20T10:00:00.000Z",
    "scheduledEnd": "2026-09-20T11:00:00.000Z",
    "lobbyEnabled": true,
    "recordingEnabled": false,
    "participantRoleMode": "HOST_GUEST",
    "createdAt": "2026-09-17T12:00:00.000Z"
  },
  "hostLink": "https://meet.example.com/acme-1a2b3c4d5e6f7a8b?jwt=eyJ...",
  "guestLink": "https://meet.example.com/acme-1a2b3c4d5e6f7a8b"
}`}</CodeBlock>
                    <p className="text-xs text-muted-foreground mt-2">
                      <code className="bg-secondary px-1 rounded">hostLink</code>/
                      <code className="bg-secondary px-1 rounded">guestLink</code> yalnızca organizasyonun Jitsi
                      sunucusu bağlıysa doldurulur, aksi halde <code className="bg-secondary px-1 rounded">null</code>{' '}
                      döner. <code className="bg-secondary px-1 rounded">EVERYONE_MODERATOR</code> modunda ayrı bir
                      guest linki üretilmez.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">GET /api/v1/meetings/:id — Toplantı Detayı</h3>
                    <p className="text-muted-foreground">
                      Toplantının durumunu ve <strong>taze imzalanmış</strong> katılım linklerini döner. JWT&apos;ler
                      kısa ömürlü olduğundan linkler her çağrıda yeniden üretilir; yanıtı önbelleğe almayın. Yanıt
                      formatı yukarıdaki oluşturma yanıtıyla aynıdır.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">GET /api/v1/meetings — Toplantı Listesi</h3>
                    <p className="text-muted-foreground mb-2">
                      Organizasyona ait toplantıları en yeniden eskiye sıralı döner (cursor tabanlı sayfalama).{' '}
                      <code className="bg-secondary px-1 rounded">limit</code> (1–100, varsayılan 20) ve{' '}
                      <code className="bg-secondary px-1 rounded">cursor</code> (bir önceki yanıttaki{' '}
                      <code className="bg-secondary px-1 rounded">nextCursor</code>) query parametrelerini alır.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Hata Formatı</h3>
                    <CodeBlock>{`{
  "error": {
    "code": "invalid_request",
    "message": "scheduledEnd must be after scheduledStart"
  }
}`}</CodeBlock>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs border border-border rounded-md overflow-hidden">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="text-left p-2">HTTP</th>
                            <th className="text-left p-2">code</th>
                            <th className="text-left p-2">Anlamı</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            ['400', 'invalid_request', 'Geçersiz/eksik alan'],
                            ['401', 'unauthorized', 'API anahtarı eksik, geçersiz veya iptal edilmiş'],
                            ['403', 'license_inactive', 'Organizasyonun aktif lisansı yok'],
                            ['404', 'not_found', 'Organizasyon veya toplantı bulunamadı'],
                            ['500', 'internal_error', 'Sunucu hatası'],
                          ].map((row) => (
                            <tr key={row[0]}>
                              {row.map((cell, i) => (
                                <td key={i} className={`p-2 align-top ${i < 2 ? 'font-mono' : 'text-muted-foreground'}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Önemli Notlar</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Anahtarı yalnızca sunucu tarafı (backend) kodunuzda kullanın; tarayıcı JS&apos;ine veya mobil uygulama binary&apos;sine gömmeyin.</li>
                      <li>
                        <code className="bg-secondary px-1 rounded">hostLink</code> moderatör JWT&apos;si içerir;{' '}
                        <code className="bg-secondary px-1 rounded">guestLink</code> bilinçli olarak anonimdir (lobby
                        mekanizmasının çalışabilmesi için).
                      </li>
                      <li>Organizasyonun aktif bir lisansı olmalı, aksi halde 403 alırsınız.</li>
                      <li>Host token süresi toplantı bitişine (+4 saat tolerans) veya ad-hoc toplantılarda başlangıca (+24 saat) göre otomatik hesaplanır; süresiz token üretilmez.</li>
                    </ul>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayoutWrapper>
  )
}
