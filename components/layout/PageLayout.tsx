import { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageLayoutProps {
  children: ReactNode
  title: string
  actions?: ReactNode
  backLink?: string
}

export default function PageLayout({ children, title, actions, backLink = '/dashboard' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {backLink && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={backLink} className="flex items-center gap-2">
                    <Icon icon="mdi:arrow-left" className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
