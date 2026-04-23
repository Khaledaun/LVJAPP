import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { runAuthed } from "@/lib/rbac-http";
import { runPlatformOp } from "@/lib/tenants";
import { isGlobalAdmin } from "@/lib/rbac";

// Mock service types for development
const mockServiceTypes = [
  { id: "st_1", title: "Work Visa", description: "Employment-based visa applications and renewals", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_2", title: "Tourist Extension", description: "Tourist visa extensions and visitor status changes", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_3", title: "Spouse Visa", description: "Spouse and family reunion visa applications", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_4", title: "Student Visa", description: "Student visa applications and renewals", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
  { id: "st_5", title: "Asylum Application", description: "Asylum and refugee status applications", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01") },
];

// GET — public for intake forms. See INTENTIONAL_PUBLIC_ROUTES in audit-auth.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Any authenticated user can read. This keeps the route technically
  // guarded (intake is behind the public signup funnel, but reads
  // happen after login) while still satisfying A-003.
  return runAuthed('authed', async () => {
    try {
      const { id } = params;

      if (process.env.SKIP_DB === '1') {
        const serviceType = mockServiceTypes.find(st => st.id === id);
        if (!serviceType) {
          return NextResponse.json({ error: "Service type not found" }, { status: 404 });
        }
        return NextResponse.json({ serviceType });
      }

      const prisma = await getPrisma();
      const serviceType = await prisma.serviceType.findUnique({ where: { id } });

      if (!serviceType) {
        return NextResponse.json({ error: "Service type not found" }, { status: 404 });
      }

      return NextResponse.json({ serviceType });
    } catch (error) {
      console.error("Failed to fetch service type:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

// PUT — LVJ platform admin only. ServiceType is tenant-scoped per
// D-023, so platform-admin writes go through runPlatformOp to be
// audit-logged.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { title, description } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  return runAuthed('authed', async (user) => {
    if (!isGlobalAdmin(user.role)) {
      return NextResponse.json({ error: 'Not authorized. Only LVJ Admins can manage service types.' }, { status: 403 });
    }

    const { id } = params;

    if (process.env.SKIP_DB === '1') {
      const serviceTypeIndex = mockServiceTypes.findIndex(st => st.id === id);
      if (serviceTypeIndex === -1) {
        return NextResponse.json({ error: "Service type not found" }, { status: 404 });
      }
      const updatedServiceType = {
        ...mockServiceTypes[serviceTypeIndex],
        title,
        description: description || null,
        updatedAt: new Date(),
      };
      return NextResponse.json({ serviceType: updatedServiceType });
    }

    return runPlatformOp(user, 'serviceType.update', async () => {
      try {
        const prisma = await getPrisma();
        const serviceType = await prisma.serviceType.update({
          where: { id },
          data: { title, description: description || null },
        });
        return NextResponse.json({ serviceType });
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
          return NextResponse.json({ error: "Service type not found" }, { status: 404 });
        }
        if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
          return NextResponse.json({ error: 'A service type with this title already exists.' }, { status: 409 });
        }
        console.error('Failed to update service type:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    });
  });
}

// DELETE — LVJ platform admin only.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return runAuthed('authed', async (user) => {
    if (!isGlobalAdmin(user.role)) {
      return NextResponse.json({ error: 'Not authorized. Only LVJ Admins can manage service types.' }, { status: 403 });
    }

    const { id } = params;

    if (process.env.SKIP_DB === '1') {
      const serviceTypeIndex = mockServiceTypes.findIndex(st => st.id === id);
      if (serviceTypeIndex === -1) {
        return NextResponse.json({ error: "Service type not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Service type deleted successfully" });
    }

    return runPlatformOp(user, 'serviceType.delete', async () => {
      try {
        const prisma = await getPrisma();

        const casesCount = await prisma.case.count({ where: { serviceTypeId: id } });
        if (casesCount > 0) {
          return NextResponse.json(
            { error: `Cannot delete service type. It is currently being used by ${casesCount} case(s).` },
            { status: 400 }
          );
        }

        await prisma.serviceType.delete({ where: { id } });
        return NextResponse.json({ message: "Service type deleted successfully" });
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
          return NextResponse.json({ error: "Service type not found" }, { status: 404 });
        }
        console.error('Failed to delete service type:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    });
  });
}
