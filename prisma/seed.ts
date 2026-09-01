import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create super admin user
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@jitsi-admin.local'
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123456'

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  })

  if (existingSuperAdmin) {
    console.log('✅ Super admin already exists:', superAdminEmail)
    return
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 10)

  const superAdmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      passwordHash,
      name: 'Super Admin',
      isSuperAdmin: true,
    },
  })

  console.log('✅ Super admin created!')
  console.log('   Email:', superAdminEmail)
  console.log('   Password:', superAdminPassword)
  console.log('   ⚠️  Change this password in production!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
