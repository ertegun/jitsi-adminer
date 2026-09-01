'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/DashboardLayout'

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { data: session } = useSession()
  const [orgName, setOrgName] = useState<string>('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const res = await fetch('/api/user/organization')
        if (res.ok) {
          const data = await res.json()
          setOrgName(data.organizationName || '')
          setIsSuperAdmin(data.isSuperAdmin || false)
        }
      } catch (error) {
        console.error('Failed to fetch org data:', error)
      }
    }

    if (session?.user) {
      fetchOrgData()
    }
  }, [session])

  if (!session?.user) {
    return <div className="min-h-screen bg-background p-6">{children}</div>
  }

  return (
    <DashboardLayout 
      user={session.user}
      organizationName={orgName}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </DashboardLayout>
  )
}
