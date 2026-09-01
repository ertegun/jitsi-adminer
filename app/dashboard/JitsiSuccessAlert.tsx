'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'

export default function JitsiSuccessAlert() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const jitsiParam = searchParams.get('jitsi')
    if (jitsiParam === 'configured') {
      setShow(true)
      // Clear URL param
      window.history.replaceState({}, '', '/dashboard')
      
      // Refresh server data to show updated Jitsi status
      router.refresh()
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShow(false), 5000)
    }
  }, [searchParams, router])

  if (!show) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <p className="text-sm text-green-800 flex items-center gap-2">
          <Icon icon="mdi:check-circle" className="w-5 h-5" /> Jitsi sunucusu başarıyla bağlandı! Toplantı oluşturabilirsiniz.
        </p>
        <button
          onClick={() => setShow(false)}
          className="text-green-600 hover:text-green-800 ml-4"
        >
          <Icon icon="mdi:close" className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
