import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { isSuperAdmin } from '@/lib/auth/superAdmin'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    const isSuperAdminUser = await isSuperAdmin()

    return NextResponse.json({
      organizationName: membership?.organization.name || '',
      isSuperAdmin: isSuperAdminUser,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
