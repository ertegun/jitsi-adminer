import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { validateLicense } from '@/lib/license/validateLicense'
import { z } from 'zod'

const validateSchema = z.object({
  organizationId: z.string(),
  licenseKey: z.string().min(1, 'License key is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateSchema.parse(body)

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Optional: Check if user has access (if authenticated)
    // This allows license validation during onboarding before user is logged in
    const session = await auth()
    if (session?.user) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organizationId: data.organizationId,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Validate license key using centralized validation function
    const validationResult = await validateLicense(data.licenseKey)

    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.message || 'Invalid license key' 
        },
        { status: 400 }
      )
    }

    // Update or create license record
    const license = await prisma.license.upsert({
      where: { organizationId: data.organizationId },
      update: {
        licenseKey: data.licenseKey,
        status: 'ACTIVE',
        lastValidatedAt: new Date(),
        expiresAt: validationResult.expiresAt,
        validationSource: 'MOCK', // Will be 'REMOTE' when real server is integrated
      },
      create: {
        organizationId: data.organizationId,
        licenseKey: data.licenseKey,
        status: 'ACTIVE',
        lastValidatedAt: new Date(),
        expiresAt: validationResult.expiresAt,
        validationSource: 'MOCK',
      },
    })

    return NextResponse.json({
      success: true,
      license: {
        status: license.status,
        expiresAt: license.expiresAt,
        plan: validationResult.plan,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('License validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
