'use client'

import { Icon } from '@iconify/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface AppSidebarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  organizationName?: string
  isSuperAdmin?: boolean
}

export function AppSidebar({ user, organizationName, isSuperAdmin }: AppSidebarProps) {
  const pathname = usePathname()

  const mainMenuItems = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: 'mdi:view-dashboard',
    },
    {
      title: 'Toplantılar',
      url: '/meetings',
      icon: 'mdi:video',
    },
    {
      title: 'Yeni Toplantı',
      url: '/meetings/create',
      icon: 'mdi:video-plus',
    },
  ]

  const settingsItems = [
    {
      title: 'Jitsi Ayarları',
      url: '/settings/jitsi',
      icon: 'mdi:cog',
    },
  ]

  const adminItems = isSuperAdmin ? [
    {
      title: 'Admin Panel',
      url: '/admin',
      icon: 'mdi:shield-crown',
    },
    {
      title: 'Organizasyonlar',
      url: '/admin/organizations',
      icon: 'mdi:domain',
    },
    {
      title: 'Kullanıcılar',
      url: '/admin/users',
      icon: 'mdi:account-group',
    },
    {
      title: 'Tüm Toplantılar',
      url: '/admin/meetings',
      icon: 'mdi:video-box',
    },
    {
      title: 'Raporlar',
      url: '/admin/reports',
      icon: 'mdi:chart-line',
    },
  ] : []

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Icon icon="mdi:video-account" className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">Jitsi Admin</h2>
            {organizationName && (
              <p className="text-xs text-muted-foreground truncate">{organizationName}</p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ana Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <Icon icon={item.icon} className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ayarlar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <Icon icon={item.icon} className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-destructive">
              <Icon icon="mdi:shield-crown" className="w-3 h-3 mr-1 inline" />
              Super Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <Icon icon={item.icon} className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <form action="/api/auth/signout" method="POST" className="w-full">
                <button type="submit" className="flex items-center gap-2 w-full">
                  <Icon icon="mdi:logout" className="w-4 h-4" />
                  <span>Çıkış Yap</span>
                </button>
              </form>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
