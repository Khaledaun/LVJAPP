import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());
  const caseId = params.id;

  // Security: Only staff and admins can add partners
  if (session?.user?.role !== Role.STAFF && session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const { name, email, roleName } = await req.json();

    if (!name || !roleName) {
      return NextResponse.json(
        { error: 'Partner name and role are required' },
        { status: 400 }
      );
    }

    // 1. "Find-or-Create" the PartnerRole. This is the dynamic part.
    const role = await prisma.partnerRole.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    // 2. Create the ExternalPartner and link it to the case and the role.
    const newPartner = await prisma.externalPartner.create({
      data: {
        name,
        email,
        type: roleName, // Also store the string for easy display
        case: {
          connect: { id: caseId },
        },
        role: {
          connect: { id: role.id },
        },
      },
    });

    return NextResponse.json({ partner: newPartner }, { status: 201 });
  } catch (error) {
    console.error(`Failed to add partner to case ${caseId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());
  const caseId = params.id;

  // Security: User must be involved in the case to see partners
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const partners = await prisma.externalPartner.findMany({
      where: { caseId: caseId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ partners });
  } catch (error) {
    console.error(`Failed to fetch partners for case ${caseId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
