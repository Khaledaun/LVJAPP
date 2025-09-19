import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());

  // 1. Authentication Check
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const caseId = params.id;
  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  const { id: userId, role } = session.user;
  const prisma = await getPrisma();

  // 2. Fetch the resource first
  const caseToView = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseToView) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // 3. Authorization Check: Verify the user has permission to view this specific case.
  let hasAccess = false;
  if (role === 'ADMIN') {
    hasAccess = true;
  } else if (role === 'STAFF') {
    hasAccess = caseToView.caseManagerId === userId || caseToView.lawyerId === userId;
  } else if (role === 'CLIENT') {
    hasAccess = caseToView.clientId === userId;
  }

  if (!hasAccess) {
    // Important: Return 404 to prevent revealing the existence of a case
    // to an unauthorized user.
    return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });
  }

  // 4. Return the data if authorized
  return NextResponse.json({ case: caseToView });
}
