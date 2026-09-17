'use client'

import { useCallback, useEffect, useState, use } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type InviteInfo = {
  email: string
  role: string
  organizationName: string
  userExists: boolean
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Yönetici',
  HOST: 'Sunucu (Host)',
  VIEWER: 'İzleyici',
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsSignin, setNeedsSignin] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const fetchInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/invites/${token}`)
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Davet bulunamadı')
        return
      }
      setInvite(result)
    } catch {
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvite()
  }, [fetchInvite])

  const acceptInvite = async (body: Record<string, string>) => {
    const res = await fetch(`/api/invites/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json()

    if (!res.ok) {
      if (result.error === 'NEEDS_SIGNIN') {
        setNeedsSignin(true)
        return
      }
      setError(result.error || 'Davet kabul edilemedi')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleCreateAccountAndJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await acceptInvite({ name, password })
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinDirectly = async () => {
    setError('')
    setSubmitting(true)
    try {
      await acceptInvite({})
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignInThenJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await signIn('credentials', {
        email: invite?.email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Şifre hatalı')
        return
      }

      await acceptInvite({})
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <Icon icon="mdi:alert-circle" className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-foreground">{error || 'Davet bulunamadı veya süresi dolmuş'}</p>
            <Link href="/auth/signin" className="text-sm text-primary hover:underline">
              Giriş sayfasına dön
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Icon icon="mdi:account-plus" className="w-9 h-9 text-primary-foreground" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight">Organizasyon Daveti</CardTitle>
            <CardDescription>
              <strong>{invite.organizationName}</strong> organizasyonuna{' '}
              <strong>{roleLabels[invite.role] || invite.role}</strong> olarak davet edildiniz
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3.5 py-3 rounded-lg flex items-start gap-2.5 text-sm">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label>E-posta</Label>
            <Input value={invite.email} disabled className="h-10 mt-1.5" />
          </div>

          {needsSignin ? (
            <form onSubmit={handleSignInThenJoin} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bu e-posta ile zaten bir hesabınız var. Katılmak için şifrenizle giriş yapın.
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-10">
                {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap ve Katıl'}
              </Button>
            </form>
          ) : invite.userExists ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bu e-postayla zaten oturum açmış olmalısınız. Katılmak için devam edin.
              </p>
              <Button onClick={handleJoinDirectly} disabled={submitting} className="w-full h-10">
                {submitting ? 'Katılıyor...' : 'Organizasyona Katıl'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateAccountAndJoin} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Devam etmek için bir hesap oluşturun.
              </p>
              <div className="space-y-2">
                <Label htmlFor="name">Adınız</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                  className="h-10"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-10">
                {submitting ? 'Katılıyor...' : 'Hesap Oluştur ve Katıl'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter>
          <p className="text-center text-sm text-muted-foreground w-full">
            <Link href="/auth/signin" className="text-foreground hover:underline font-medium underline-offset-4">
              Giriş sayfasına dön
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
