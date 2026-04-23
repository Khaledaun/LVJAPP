import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { runAuthed } from '@/lib/rbac-http';
import { isStaff } from '@/lib/rbac';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name, email, roleName } = await req.json();

  if (!name || !roleName) {
    return NextResponse.json(
      { error: 'Partner name and role are required' },
      { status: 400 }
    );
  }

  const caseId = params.id;

  return runAuthed({ caseId }, async (user) => {
    // Staff / admins only (tenant access already enforced by guard).
    if (!isStaff(user.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const prisma = await getPrisma();
    try {
      // Find-or-create the PartnerRole.
      const role = await prisma.partnerRole.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });

      const newPartner = await prisma.externalPartner.create({
        data: {
          name,
          email,
          type: roleName,
          case: { connect: { id: caseId } },
          role: { connect: { id: role.id } },
        },
      });

      return NextResponse.json({ partner: newPartner }, { status: 201 });
    } catch (error) {
      console.error(`Failed to add partner to case ${caseId}:`, error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  return runAuthed({ caseId }, async () => {
    const prisma = await getPrisma();
    try {
      const partners = await prisma.externalPartner.findMany({
        where: { caseId },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ partners });
    } catch (error) {
      console.error(`Failed to fetch partners for case ${caseId}:`, error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
