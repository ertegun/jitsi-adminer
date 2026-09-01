'use client'

import { ReactNode, useEffect, useState } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface DashboardLayoutProps {
  children: ReactNode
  user?: {
    name?: string | null
    email?: string | null
  }
  organizationName?: string
  isSuperAdmin?: boolean
}

export function DashboardLayout({ children, user, organizationName, isSuperAdmin }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} organizationName={organizationName} isSuperAdmin={isSuperAdmin} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
        </header>
        <div className="flex-1 overflow-y-auto">
          <main className="p-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
