'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/DashboardLayout'
import type { OrganizationOption } from '@/components/AppSidebar'

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { data: session } = useSession()
  const [orgName, setOrgName] = useState<string>('')
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const res = await fetch('/api/user/organization')
        if (res.ok) {
          const data = await res.json()
          setOrgName(data.organizationName || '')
          setOrganizations(data.organizations || [])
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
      organizations={organizations}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </DashboardLayout>
  )
}
