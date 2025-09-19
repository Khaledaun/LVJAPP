import 'server-only'

let prisma: any

export async function getPrisma(): Promise<any> {
  if (process.env.SKIP_DB === '1') {
    const explain = new Error('DB disabled (SKIP_DB=1). Set DATABASE_URL + run "npx prisma generate" to enable.')
    return new Proxy({}, { get(){ throw explain }, apply(){ throw explain } })
  }
  if (prisma) return prisma
  try {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
    return prisma
  } catch (err) {
    const explain = new Error('@prisma/client not ready. Set DATABASE_URL, add prisma/schema.prisma, and run: npx prisma generate')
    return new Proxy({}, { get(){ throw explain }, apply(){ throw explain } })
  }
}

// Export the prisma instance for synchronous access
export { prisma };
