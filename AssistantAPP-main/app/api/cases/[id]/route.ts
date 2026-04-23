import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { runAuthed } from "@/lib/rbac-http";

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  // runAuthed's `caseId` guard already enforces that the caller has
  // access (admin / case manager / lawyer / client). Inside the
  // callback, the Prisma extension auto-scopes by tenantId (D-023).
  return runAuthed({ caseId }, async () => {
    const prisma = await getPrisma();

    const caseToView = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseToView) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: caseToView });
  });
}
