import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
// NOTE: Assuming you have @types/firebase-admin installed for the Query type
import type * as FirebaseFirestore from 'firebase-admin/firestore';

import { options } from '@/app/api/auth/[...nextauth]/options'; 

// --- TYPE DEFINITIONS FOR SERVER-SIDE USE ---
// Define the Requisition structure reflecting the data fetched from Firestore
interface ServerRequisition {
    id: string;
    itemName: string;
    quantity: number;
    department: string;
    requesterName: string;
    employeeId: string;
    unitCost: number;
    reason: string;
    status: 'Pending Supervisor Review' | 'Approved by Supervisor' | 'Pending Owner Review' | 'Approved' | 'Rejected by Supervisor' | 'Rejected by Owner' | 'Canceled';
    requesterEmail: string;
    created: { toDate: () => Date } | Date | string | null;
    rejectionReason?: string;
    supervisorApprovedBy?: string;
    ownerApprovedBy?: string;
    rejectedBy?: string;
}

// Define the response shape sent to the client
interface PaginatedResponse {
    data: ServerRequisition[];
    meta: {
        currentPage: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
// ---------------------------------------------


// --- FIREBASE ADMIN INITIALIZATION ---
if (!getApps().length) {
    try {
        const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
        initializeApp({
            credential: cert(serviceAccountKey),
        });
        console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK:", error);
    }
}
const db = getFirestore();

// --- PAGINATION UTILITY ---
const ITEMS_PER_PAGE = 10;

const getQueryParam = (request: NextRequest, key: string): string | undefined => {
    return request.nextUrl.searchParams.get(key) || undefined;
};


// --- THE MAIN GET HANDLER ---
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(options);

        if (!session || !session.user || !session.user.email) {
            return new NextResponse("Authentication required", { status: 401 });
        }

        const userRole = session.user.role;
        const userDepartment = session.user.department;
        const userEmail = session.user.email; 

        const view = getQueryParam(request, 'view') || 'my-submissions';
        const page = parseInt(getQueryParam(request, 'page') || '1', 10);
        const limit = parseInt(getQueryParam(request, 'limit') || ITEMS_PER_PAGE.toString(), 10);
        const offset = (page - 1) * limit;

        const requisitionsRef = db.collection('requisitions');
        // FIX 1: Using FirebaseFirestore.Query instead of 'any'
        let q: FirebaseFirestore.Query = requisitionsRef; 

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

        // Firestore requires ordering for stable pagination/offset
        q = q.orderBy('created', 'desc'); 

        // --- Execute Query ---
        const snapshot = await q.limit(limit + 1).offset(offset).get();
        
        // FIX 2: Using ServerRequisition[] instead of 'any[]'
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            created: doc.data().created ? doc.data().created.toDate().toISOString() : null
        })) as ServerRequisition[]; // <-- Type applied here

        
        const hasNextPage = data.length > limit;
        const finalData = hasNextPage ? data.slice(0, limit) : data;
        
        const meta = {
            currentPage: page,
            limit: limit,
            hasNextPage: hasNextPage,
            hasPrevPage: page > 1,
        };

        return NextResponse.json( { data: finalData, meta } as PaginatedResponse);

    } catch (error) {
        console.error("Firestore Requisitions GET Error:", error);
        return new NextResponse("Internal Server Error fetching requisitions.", { status: 500 });
    }
}
