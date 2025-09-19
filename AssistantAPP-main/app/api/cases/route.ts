import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db"; // Use the async getter
import { Role, CaseStatus } from "@prisma/client";

// GET Handler to list cases
export async function GET(req: Request) {
  const session = await getServerSession(getAuthOptions());
  const prisma = await getPrisma(); // Initialize prisma

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: userId, role } = session.user;
  
  let whereClause = {};

  if (role === Role.CLIENT) {
    whereClause = { clientId: userId };
  } else if (role === Role.STAFF) {
    whereClause = {
      OR: [
        { caseManagerId: userId },
        { lawyerId: userId },
      ],
    };
  }

  try {
    const cases = await prisma.case.findMany({
      where: whereClause,
      include: {
        client: { select: { name: true, email: true } },
        caseManager: { select: { name: true } },
        lawyer: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Failed to fetch cases:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST Handler to create a new case
export async function POST(req: Request) {
  const session = await getServerSession(getAuthOptions());
  const prisma = await getPrisma(); // Initialize prisma

  if (session?.user?.role !== Role.STAFF && session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, applicantName, applicantEmail } = body;

    if (!title || !applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: 'Title, applicant name, and email are required' },
        { status: 400 }
      );
    }

    const newCase = await prisma.case.create({
      data: {
        title,
        applicantName,
        applicantEmail,
        caseManagerId: session.user.id,
        caseNumber: `LVJ-${Date.now()}`,
        totalFee: 0,
        currency: 'USD',
        overallStatus: CaseStatus.new,
        stage: 'Intake',
        urgencyLevel: 'STANDARD',
        completionPercentage: 5,
      },
    });

    return NextResponse.json({ newCase }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
         return NextResponse.json({ error: 'A case with this number already exists.' }, { status: 409 });
    }
    console.error('Failed to create case:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
