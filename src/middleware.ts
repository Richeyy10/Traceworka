import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

// Public routes that don't require authentication.
// Includes auth pages and API routes for authentication.
const publicRoutes = [
   '/', 
  '/sign-in', 
  '/sign-up', 
  '/forgot-password', 
  '/api/auth'
];

// Protected routes that require a logged-in user.
const protectedRoutes = [
  '/dashboard', 
  '/my-requisitions'
];

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If the user is unauthenticated and tries to access a protected route,
  // redirect them to the sign-in page.
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If the user is authenticated and tries to access a public page,
  // redirect them to the dashboard.
  if (token && isPublicRoute && pathname !== '/dashboard' && pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/sign-in', '/sign-up', '/forgot-password', '/dashboard', '/my-requisitions', '/api/auth/:path*'],
};
