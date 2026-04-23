import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { runAuthed } from "@/lib/rbac-http";
import { runPlatformOp } from "@/lib/tenants";
import { isGlobalAdmin } from "@/lib/rbac";

const mockServiceTypes = [
  { id: "st_1", title: "Work Visa", description: "Employment-based visa applications and renewals", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_2", title: "Tourist Extension", description: "Tourist visa extensions and visitor status changes", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_3", title: "Spouse Visa", description: "Spouse and family reunion visa applications", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_4", title: "Student Visa", description: "Student visa applications and renewals", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_5", title: "Asylum Application", description: "Asylum and refugee status applications", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
];

// GET — any authenticated user (intake picker).
export async function GET(req: Request) {
  return runAuthed('authed', async () => {
    try {
      if (process.env.SKIP_DB === '1') {
        return NextResponse.json({ serviceTypes: mockServiceTypes });
      }
      const prisma = await getPrisma();
      const serviceTypes = await prisma.serviceType.findMany({
        orderBy: { title: 'asc' },
      });
      return NextResponse.json({ serviceTypes });
    } catch (error) {
      console.error("Failed to fetch service types:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

// POST — LVJ admin only.
export async function POST(req: Request) {
  const body = await req.json();
  const { title, description } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  return runAuthed('authed', async (user) => {
    if (!isGlobalAdmin(user.role)) {
      return NextResponse.json({ error: 'Not authorized. Only LVJ Admins can manage service types.' }, { status: 403 });
    }

    if (process.env.SKIP_DB === '1') {
      const newServiceType = {
        id: `st_${Date.now()}`,
        title,
        description: description || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return NextResponse.json({ serviceType: newServiceType }, { status: 201 });
    }

    return runPlatformOp(user, 'serviceType.create', async () => {
      try {
        const prisma = await getPrisma();
        const serviceType = await prisma.serviceType.create({
          data: { title, description: description || null },
        });
        return NextResponse.json({ serviceType }, { status: 201 });
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
          return NextResponse.json({ error: 'A service type with this title already exists.' }, { status: 409 });
        }
        console.error('Failed to create service type:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    });
  });
}
