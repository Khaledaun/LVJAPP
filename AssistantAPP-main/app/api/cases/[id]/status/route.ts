import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { isDevNoDB } from "@/lib/dev";
import { sendStatusChangeNotification, mockStatusChangeNotification } from "@/lib/notifications";
import { runAuthed } from "@/lib/rbac-http";
import { isStaff } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const isStatusNotificationEnabled = process.env.ENABLE_STATUS_NOTIFICATIONS !== 'false';

/**
 * PATCH — update a case's overallStatus. STAFF / ADMIN only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const caseId = params.id;
  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  const body = await req.json();
  const { status: newStatus } = body;

  const validStatuses = ['new', 'documents_pending', 'in_review', 'submitted', 'approved', 'denied'];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return NextResponse.json({
      error: "Invalid status. Valid statuses: " + validStatuses.join(', ')
    }, { status: 400 });
  }

  return runAuthed({ caseId }, async (user) => {
    // Only staff / admin may mutate status (clients can read via GET).
    if (!isStaff(user.role)) {
      return NextResponse.json({ error: "Not authorized to update case status" }, { status: 403 });
    }

    if (isDevNoDB) {
      const statusChangeData = {
        id: caseId,
        title: 'Mock Case - Development Mode',
        applicantName: 'Mock Applicant',
        applicantEmail: 'mock@example.com',
        previousStatus: 'new',
        newStatus,
        changedBy: user.email || user.id,
        changedAt: new Date(),
        serviceType: null
      };

      if (isStatusNotificationEnabled) {
        mockStatusChangeNotification(statusChangeData);
      }

      return NextResponse.json({
        case: { id: caseId, overallStatus: newStatus, updatedAt: new Date() },
        notificationSent: isStatusNotificationEnabled
      });
    }

    const prisma = await getPrisma();

    try {
      const currentCase = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          serviceType: { select: { id: true, title: true, description: true } }
        }
      });

      if (!currentCase) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      const previousStatus = currentCase.overallStatus;

      if (previousStatus === newStatus) {
        return NextResponse.json({
          case: currentCase,
          notificationSent: false,
          message: "Status unchanged"
        });
      }

      const updatedCase = await prisma.case.update({
        where: { id: caseId },
        data: {
          overallStatus: newStatus,
          updatedAt: new Date()
        },
        include: {
          serviceType: { select: { id: true, title: true, description: true } }
        }
      });

      const statusChangeData = {
        id: updatedCase.id,
        title: updatedCase.title,
        applicantName: updatedCase.applicantName,
        applicantEmail: updatedCase.applicantEmail,
        previousStatus,
        newStatus,
        changedBy: user.email || user.id,
        changedAt: new Date(),
        serviceType: updatedCase.serviceType
      };

      let notificationSent = false;

      if (isStatusNotificationEnabled) {
        try {
          notificationSent = await sendStatusChangeNotification(statusChangeData);
        } catch (notificationError) {
          console.error('Failed to send status change notification:', notificationError);
        }
      }

      return NextResponse.json({
        case: updatedCase,
        notificationSent,
        previousStatus,
        newStatus
      });
    } catch (error) {
      console.error("Failed to update case status:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
