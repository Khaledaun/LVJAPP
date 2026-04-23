import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { runAuthed } from '@/lib/rbac-http';

export async function GET(req: Request) {
  return runAuthed('staff', async () => {
    const prisma = await getPrisma();
    try {
      const roles = await prisma.partnerRole.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ roles });
    } catch (error) {
      console.error('Failed to fetch partner roles:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
