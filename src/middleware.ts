import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

const publicRoutes = [
  '/sign-in', 
  '/sign-up', 
  '/forgot-password', 
  '/api/auth'
];

const protectedRoutes = [
  '/',
  '/dashboard', 
  '/my-requisitions'
];

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/sign-in', '/sign-up', '/forgot-password', '/dashboard', '/my-requisitions', '/api/auth/:path*'],
};
