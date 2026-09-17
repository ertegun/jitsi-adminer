import { NextRequest, NextResponse } from 'next/server'
import { setActiveOrganization } from '@/lib/auth/orgMembership'
import { z } from 'zod'

const switchSchema = z.object({
  organizationId: z.string(),
})

// POST: switch which organization the current user is viewing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = switchSchema.parse(body)

    await setActiveOrganization(data.organizationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Bu organizasyonun üyesi değilsiniz' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    console.error('Active organization switch error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
