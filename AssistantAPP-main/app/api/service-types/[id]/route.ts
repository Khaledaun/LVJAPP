import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

// Mock service types for development
const mockServiceTypes = [
  {
    id: "st_1",
    title: "Work Visa",
    description: "Employment-based visa applications and renewals",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "st_2", 
    title: "Tourist Extension",
    description: "Tourist visa extensions and visitor status changes",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "st_3",
    title: "Spouse Visa",
    description: "Spouse and family reunion visa applications",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "st_4",
    title: "Student Visa", 
    description: "Student visa applications and renewals",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "st_5",
    title: "Asylum Application",
    description: "Asylum and refugee status applications",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }
];

// GET Handler to get a specific service type
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const serviceType = await prisma.serviceType.findUnique({
      where: { id },
    });

    if (!serviceType) {
      return NextResponse.json({ error: "Service type not found" }, { status: 404 });
    }

    return NextResponse.json({ serviceType });
  } catch (error) {
    console.error("Failed to fetch service type:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT Handler to update a service type (Admin only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());

  // Check if user is LVJ Admin
  if (!session?.user || session.user.role !== 'LVJ_ADMIN') {
    return NextResponse.json({ error: 'Not authorized. Only LVJ Admins can manage service types.' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (process.env.SKIP_DB === '1') {
      // Mock update for development
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

    const prisma = await getPrisma();
    const serviceType = await prisma.serviceType.update({
      where: { id },
      data: {
        title,
        description: description || null,
      },
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
}

// DELETE Handler to delete a service type (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(getAuthOptions());

  // Check if user is LVJ Admin
  if (!session?.user || session.user.role !== 'LVJ_ADMIN') {
    return NextResponse.json({ error: 'Not authorized. Only LVJ Admins can manage service types.' }, { status: 403 });
  }

  try {
    const { id } = params;

    if (process.env.SKIP_DB === '1') {
      // Mock deletion for development
      const serviceTypeIndex = mockServiceTypes.findIndex(st => st.id === id);
      if (serviceTypeIndex === -1) {
        return NextResponse.json({ error: "Service type not found" }, { status: 404 });
      }
      
      return NextResponse.json({ message: "Service type deleted successfully" });
    }

    const prisma = await getPrisma();
    
    // Check if service type is being used by any cases
    const casesCount = await prisma.case.count({
      where: { serviceTypeId: id },
    });

    if (casesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete service type. It is currently being used by ${casesCount} case(s).` },
        { status: 400 }
      );
    }

    await prisma.serviceType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Service type deleted successfully" });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: "Service type not found" }, { status: 404 });
    }
    console.error('Failed to delete service type:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}