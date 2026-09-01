'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

export function BackButton({ href, label = 'Geri' }: { href?: string; label?: string }) {
  const router = useRouter()
  
  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }
  
  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className="gap-2">
      <Icon icon="mdi:arrow-left" className="w-4 h-4" />
      {label}
    </Button>
  )
}
