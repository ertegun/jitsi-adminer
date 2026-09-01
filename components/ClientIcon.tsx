'use client'

import { Icon } from '@iconify/react'

export function ClientIcon({ icon, className }: { icon: string; className?: string }) {
  return <Icon icon={icon} className={className} />
}
