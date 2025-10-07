import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
// CRITICAL: Use the path that worked best for you locally, or try the direct root alias.
import { options } from '@/app/api/auth/[...nextauth]/options'; 

// This function only tests if the session can be retrieved.
export async function GET(request: NextRequest) {
    try {
        // 1. Attempt to retrieve the user session
        const session = await getServerSession(options);

        // 2. Check the session status
        if (!session || !session.user || !session.user.email) {
            console.log("DEBUG: Session not found, returning 401.");
            // Returns 401, which triggers the SWR error on the client page.
            return new NextResponse(JSON.stringify({ 
                error: "Authentication failed. Session is null or incomplete.",
                details: {
                    isAuthenticated: !!session
                }
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. If we reach here, authentication worked!
        console.log(`DEBUG: Session successfully retrieved for user: ${session.user.email}`);

        // 4. Return dummy data to prove success (the client page expects this format)
        return NextResponse.json({ 
            data: [
                { 
                    id: "TEST-001", 
                    itemName: "Debug Item", 
                    quantity: 1, 
                    department: session.user.department || 'Unknown',
                    requesterName: session.user.name || 'Test User',
                    unitCost: 10.00,
                    reason: "Test",
                    status: 'Approved',
                    requesterEmail: session.user.email,
                    created: new Date().toISOString(),
                }
            ], 
            meta: { currentPage: 1, limit: 10, hasNextPage: false, hasPrevPage: false } 
        });

    } catch (error) {
        // This handles crashes related to module loading or next-auth initialization.
        console.error("FATAL ERROR IN REQUISITIONS ROUTE:", error);
        return new NextResponse(JSON.stringify({ 
            error: "Internal Server Error during session processing.",
            detail: (error as Error).message || "Unknown error."
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
