import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { sendIntakeNotification, mockIntakeNotification } from "@/lib/notifications";
import { runAuthed } from "@/lib/rbac-http";
import { isStaff } from "@/lib/rbac";

// GET — list cases accessible to the session user.
export async function GET(req: Request) {
  return runAuthed('authed', async (user) => {
    // Mock cases for development
    if (process.env.SKIP_DB === '1') {
      const mockCases = [
        {
          id: 'case_1',
          title: 'Work Visa Application - Jane Doe',
          applicantName: 'Jane Doe',
          applicantEmail: 'jane.doe@example.com',
          createdAt: new Date(),
          serviceType: { id: 'st_1', title: 'Work Visa', description: 'Employment-based visa applications and renewals' }
        }
      ];
      return NextResponse.json({ cases: mockCases });
    }

    const prisma = await getPrisma();

    let whereClause: any = {};
    if (user.role === 'CLIENT') {
      whereClause = { clientId: user.id };
    } else if (user.role === 'STAFF') {
      whereClause = {
        OR: [
          { caseManagerId: user.id },
          { lawyerId: user.id },
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
          serviceType: { select: { id: true, title: true, description: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ cases });
    } catch (error) {
      console.error("Failed to fetch cases:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

// POST — create a new case. STAFF / ADMIN only.
export async function POST(req: Request) {
  const body = await req.json();
  const { title, applicantName, applicantEmail, serviceTypeId } = body;

  if (!title || !applicantName || !applicantEmail) {
    return NextResponse.json(
      { error: 'Title, applicant name, and email are required' },
      { status: 400 }
    );
  }

  return runAuthed('staff', async (user) => {
    if (!isStaff(user.role) && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (process.env.SKIP_DB === '1') {
      const mockCase = {
        id: `case_${Date.now()}`,
        title,
        applicantName,
        applicantEmail,
        serviceTypeId: serviceTypeId || null,
        createdAt: new Date(),
      };

      let serviceType = null;
      if (serviceTypeId) {
        const mockServiceTypes = [
          { id: "st_1", title: "Work Visa", description: "Employment-based visa applications and renewals" },
          { id: "st_2", title: "Tourist Extension", description: "Tourist visa extensions and visitor status changes" },
          { id: "st_3", title: "Spouse Visa", description: "Spouse and family reunion visa applications" },
          { id: "st_4", title: "Student Visa", description: "Student visa applications and renewals" },
          { id: "st_5", title: "Asylum Application", description: "Asylum and refugee status applications" }
        ];
        serviceType = mockServiceTypes.find(st => st.id === serviceTypeId) || null;
      }

      mockIntakeNotification({
        id: mockCase.id,
        title: mockCase.title,
        applicantName: mockCase.applicantName,
        applicantEmail: mockCase.applicantEmail,
        serviceType
      });

      return NextResponse.json({ case: mockCase }, { status: 201 });
    }

    try {
      const prisma = await getPrisma();
      const newCase = await prisma.case.create({
        data: {
          title,
          applicantName,
          applicantEmail,
          caseManagerId: user.id,
          caseNumber: `LVJ-${Date.now()}`,
          totalFee: 0,
          currency: 'USD',
          overallStatus: 'new',
          stage: 'Intake',
          urgencyLevel: 'STANDARD',
          completionPercentage: 5,
          serviceTypeId: serviceTypeId || null,
        },
        include: {
          serviceType: true,
        },
      });

      try {
        await sendIntakeNotification({
          id: newCase.id,
          title: newCase.title,
          applicantName: newCase.applicantName,
          applicantEmail: newCase.applicantEmail,
          serviceType: newCase.serviceType,
        });
      } catch (notificationError) {
        console.error('Failed to send intake notification:', notificationError);
      }

      return NextResponse.json({ case: newCase }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        return NextResponse.json({ error: 'A case with this number already exists.' }, { status: 409 });
      }
      console.error('Failed to create case:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
