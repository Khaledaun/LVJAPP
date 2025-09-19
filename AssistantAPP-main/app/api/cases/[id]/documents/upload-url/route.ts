import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/cases/[id]/documents/upload-url - Generate signed upload URL
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caseId = params.id;
    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Check file size limit (10MB)
    if (fileSize && fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be under 10MB' },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const objectName = `cases/${caseId}/documents/${documentId}-${fileName}`;

    // In mock mode, return a mock URL
    const uploadUrl = 'https://mock-upload-url.example.com/upload';

    return NextResponse.json({
      uploadUrl,
      documentId,
      objectName,
      expiresIn: 3600, // 1 hour
    });

  } catch (error) {
    console.error(`POST /api/cases/${params.id}/documents/upload-url error:`, error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
