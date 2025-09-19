import { getPrisma } from '@/lib/db'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const AllowedUserRoles: UserRole[] = [
  'client','lvj_admin','lvj_team','lvj_marketing','lawyer_admin','lawyer_associate','lawyer_assistant'
];
export type Language = 'en' | 'ar' | 'pt';
import { UserRole } from "@/lib/rbac";

import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";


export async function POST(request: NextRequest) {
  const prisma = await getPrisma();
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      role: inputRole = 'client',
      preferredLanguage = 'EN'
    } = body;

    // Map any role to a valid UserRole
    let role: UserRole = 'client';
    const validRoles = AllowedUserRoles;
    if (validRoles.includes(inputRole as UserRole)) {
      role = inputRole as UserRole;
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password (in production)
    // const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        role,
        firstName,
        lastName,
        phone,
        preferredLanguage: preferredLanguage as Language,
        // In production: hashedPassword
      }
    });

    // Generate case number if client
    if (role === 'client') {
      const caseNumber = `LVJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      await prisma.case.create({
        data: {
          clientId: user.id,
          caseNumber,
          visaType: 'TOURIST', // Default, can be updated later
          destinationCountry: 'Portugal', // Default
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
