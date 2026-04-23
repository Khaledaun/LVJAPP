import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


import { NextRequest, NextResponse } from "next/server";
import { getUserTermsStatus } from "@/lib/terms";


export async function POST(request: NextRequest) {
  return runAuthed('authed', async (sessionUser) => {
    const prisma = await getPrisma();
    try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLanguage: true,
        renderMode: true,
        timezone: true,
        isActive: true,
        termsAcceptedAt: true,
        termsVersion: true,
        gdprConsentGiven: true,
        lastLoginAt: true
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 404 });
    }

    // Get terms status
    const termsStatus = await getUserTermsStatus(user.id);

    // Get user preferences (same as user data for now)
    const preferences = {
      language: user.preferredLanguage,
      renderMode: user.renderMode,
      timezone: user.timezone
    };

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage,
        renderMode: user.renderMode,
        timezone: user.timezone,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt
      },
      preferences,
      termsStatus: {
        accepted: termsStatus.allAccepted,
        version: user.termsVersion,
        acceptedAt: user.termsAcceptedAt
      },
      sessionId
    });

    } catch (error) {
      console.error("Bootstrap error:", error);
      return NextResponse.json(
        { error: "Failed to bootstrap session" },
        { status: 500 }
      );
    }
  });
}
