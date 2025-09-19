import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessRoute, UserRole } from "./rbac";

export async function authMiddleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/auth/error"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Check terms acceptance for authenticated users
  if (!token.termsAccepted && pathname !== "/terms/accept") {
    return NextResponse.redirect(new URL("/terms/accept", request.url));
  }

  // Check role-based access
  const userRole = token.role as UserRole;
  if (!canAccessRoute(userRole, pathname)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}
