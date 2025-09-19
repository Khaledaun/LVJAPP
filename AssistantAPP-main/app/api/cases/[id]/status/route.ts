import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { isDevNoDB } from "@/lib/dev";
import { sendStatusChangeNotification, mockStatusChangeNotification } from "@/lib/notifications";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Feature flag for status change notifications
const isStatusNotificationEnabled = process.env.ENABLE_STATUS_NOTIFICATIONS !== 'false';

/**
 * PATCH Handler to update case status
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());

  // Authentication check
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const caseId = params.id;
  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  const { id: userId, role } = session.user;
  const body = await req.json();
  const { status: newStatus } = body;

  // Validate new status
  const validStatuses = ['new', 'documents_pending', 'in_review', 'submitted', 'approved', 'denied'];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return NextResponse.json({ 
      error: "Invalid status. Valid statuses: " + validStatuses.join(', ') 
    }, { status: 400 });
  }

  // Authorization check - only STAFF and ADMIN can update status
  if (role !== 'STAFF' && role !== 'ADMIN') {
    return NextResponse.json({ error: "Not authorized to update case status" }, { status: 403 });
  }

  // Handle development mode
  if (isDevNoDB) {
    const statusChangeData = {
      id: caseId,
      title: 'Mock Case - Development Mode',
      applicantName: 'Mock Applicant',
      applicantEmail: 'mock@example.com',
      previousStatus: 'new',
      newStatus,
      changedBy: session.user.name || session.user.email || userId,
      changedAt: new Date(),
      serviceType: null
    };

    // Log status change event for audit
    console.log(`
📋 STATUS CHANGE AUDIT LOG
==========================
Case ID: ${caseId}
User: ${statusChangeData.changedBy} (${userId})
Previous Status: ${statusChangeData.previousStatus}
New Status: ${newStatus}
Timestamp: ${statusChangeData.changedAt.toISOString()}
Feature Flag: ${isStatusNotificationEnabled ? 'ENABLED' : 'DISABLED'}
Mode: DEVELOPMENT
    `);

    // Send notification if feature flag is enabled
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
    // First, fetch the current case to get previous status and check permissions
    const currentCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        serviceType: { select: { id: true, title: true, description: true } }
      }
    });

    if (!currentCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Authorization check: Verify the user has permission to update this specific case
    let hasAccess = false;
    if (role === 'ADMIN') {
      hasAccess = true;
    } else if (role === 'STAFF') {
      hasAccess = currentCase.caseManagerId === userId || currentCase.lawyerId === userId;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });
    }

    const previousStatus = currentCase.overallStatus;
    
    // Skip update if status hasn't changed
    if (previousStatus === newStatus) {
      return NextResponse.json({ 
        case: currentCase,
        notificationSent: false,
        message: "Status unchanged"
      });
    }

    // Update the case status
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
      changedBy: session.user.name || session.user.email || userId,
      changedAt: new Date(),
      serviceType: updatedCase.serviceType
    };

    // Log status change event for audit
    console.log(`
📋 STATUS CHANGE AUDIT LOG
==========================
Case ID: ${caseId}
User: ${statusChangeData.changedBy} (${userId})
Previous Status: ${previousStatus}
New Status: ${newStatus}
Timestamp: ${statusChangeData.changedAt.toISOString()}
Feature Flag: ${isStatusNotificationEnabled ? 'ENABLED' : 'DISABLED'}
Mode: PRODUCTION
    `);

    let notificationSent = false;

    // Send notification if feature flag is enabled
    if (isStatusNotificationEnabled) {
      try {
        notificationSent = await sendStatusChangeNotification(statusChangeData);
      } catch (notificationError) {
        console.error('Failed to send status change notification:', notificationError);
        // Don't fail the status update if notification fails
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
}