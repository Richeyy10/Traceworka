import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Use the now-working path to your NextAuth options
import { options } from '@/app/api/auth/[...nextauth]/options'; 

// --- 1. FIREBASE ADMIN INITIALIZATION (Must be defined outside the GET function) ---
if (!getApps().length) {
    try {
        // This is the line that was likely crashing. It must parse correctly on Vercel.
        const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
        initializeApp({
            credential: cert(serviceAccountKey),
        });
        console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
        // IMPORTANT: Log this error. If you see this, the ENV variable is wrong.
        console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK:", error);
    }
}
const db = getFirestore();

// --- 2. PAGINATION UTILITY ---
const ITEMS_PER_PAGE = 10;

// Helper to sanitize query params
const getQueryParam = (request: NextRequest, key: string): string | undefined => {
    return request.nextUrl.searchParams.get(key) || undefined;
};


// --- 3. THE MAIN GET HANDLER (Authentication and Database Logic) ---
export async function GET(request: NextRequest) {
    try {
        // **Authentication Check (Successfully isolated and confirmed working)**
        const session = await getServerSession(options);

        if (!session || !session.user || !session.user.email) {
            return new NextResponse("Authentication required", { status: 401 });
        }

        // Extract user data from the session
        const userRole = session.user.role;
        const userDepartment = session.user.department;
        const userEmail = session.user.email; 

        // Extract pagination and view params from URL
        const view = getQueryParam(request, 'view') || 'my-submissions';
        const page = parseInt(getQueryParam(request, 'page') || '1', 10);
        const limit = parseInt(getQueryParam(request, 'limit') || ITEMS_PER_PAGE.toString(), 10);
        const offset = (page - 1) * limit;

        const requisitionsRef = db.collection('requisitions');
        let q: any = requisitionsRef;

        // --- Dynamic Query Logic based on Role and View ---
        if (userRole === 'staff' || view === 'my-submissions') {
            q = q.where('requesterEmail', '==', userEmail);
        } 
        
        else if (userRole === 'supervisor' && view === 'action') {
            q = q.where('status', '==', 'Pending Supervisor Review')
                 .where('department', '==', userDepartment);
        } 
        
        else if (userRole === 'owner' && view === 'action') {
            q = q.where('status', '==', 'Approved by Supervisor');
        } 
        
        // Owner view 'all' or any other unhandled case simply returns the base query.

        // --- Execute Query for the current page ---
        // Note: Firestore requires ordering before limit/offset. We will assume a default order 
        // by creation time for safety, if you haven't specified one.
        q = q.orderBy('created', 'desc'); // ADDED: Required for stable pagination/offset

        const snapshot = await q.limit(limit + 1).offset(offset).get();
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Ensure `created` is sent as a serializable string if it's a Timestamp
            created: doc.data().created ? doc.data().created.toDate().toISOString() : null
        })) as any[];

        
        const hasNextPage = data.length > limit;
        const finalData = hasNextPage ? data.slice(0, limit) : data;
        
        const meta = {
            currentPage: page,
            limit: limit,
            hasNextPage: hasNextPage,
            hasPrevPage: page > 1,
        };

        return NextResponse.json({ data: finalData, meta });

    } catch (error) {
        // This catch block handles crashes from the Firestore or Firebase Admin logic.
        console.error("Firestore Requisitions GET Error:", error);
        return new NextResponse("Internal Server Error fetching requisitions.", { status: 500 });
    }
}

// NOTE: You will need to add the POST handler and any other necessary handlers 
// for creating/updating requisitions here as well.
