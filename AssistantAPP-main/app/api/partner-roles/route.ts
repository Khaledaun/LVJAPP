import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET(req: Request) {
  const session = await getServerSession(getAuthOptions());

  // Security: Only allow authenticated staff or admins to access this list
  if (session?.user?.role !== Role.STAFF && session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const roles = await prisma.partnerRole.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Failed to fetch partner roles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
