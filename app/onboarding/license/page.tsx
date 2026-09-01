'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LicensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  
  const [licenseKey, setLicenseKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!orgId) {
    router.push('/auth/signin')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          licenseKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Lisans doğrulama başarısız')
        return
      }

      // License activated, redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Icon icon="mdi:key" className="w-9 h-9 text-primary-foreground" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight">Lisans Anahtarı Girin</CardTitle>
            <CardDescription>Devam etmek için geçerli bir lisans anahtarı gereklidir</CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-chart-2/10 border border-chart-2/30 text-chart-2 px-3.5 py-3 rounded-lg text-sm">
              <strong className="font-semibold">Geliştirme Modu:</strong> Şu anda mock lisans doğrulama aktif. 
              Herhangi bir metin girip devam edebilirsiniz. Üretim ortamında burası 
              gerçek lisans sunucusuna bağlanacak.
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3.5 py-3 rounded-lg flex items-start gap-2.5 text-sm">
                <Icon icon="mdi:alert-circle" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="licenseKey">Lisans Anahtarı</Label>
              <Input
                id="licenseKey"
                name="licenseKey"
                type="text"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="h-10 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Lisans anahtarınızı girin ve doğrulayın
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-10"
            >
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="w-4 h-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                <>
                  <Icon icon="mdi:check-circle" className="w-4 h-4 mr-2" />
                  Doğrula ve Devam Et
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
