import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type * as FirebaseFirestore from 'firebase-admin/firestore';

import { options } from '@/app/api/auth/[...nextauth]/options'; 

// --- TYPE DEFINITIONS FOR SERVER-SIDE USE ---
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


// -------------------------------------------------------------
// --- 1. GET HANDLER (For fetching data) ---
// -------------------------------------------------------------
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

        q = q.orderBy('created', 'desc'); 

        // --- Execute Query ---
        const snapshot = await q.limit(limit + 1).offset(offset).get();
        
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            created: doc.data().created ? doc.data().created.toDate().toISOString() : null
        })) as ServerRequisition[];

        
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


// -------------------------------------------------------------
// --- 2. POST HANDLER (For submitting data) ---
// -------------------------------------------------------------
export async function POST(request: NextRequest) {
    const session = await getServerSession(options);

    if (!session || !session.user || !session.user.email) {
        return new NextResponse("Authentication required", { status: 401 });
    }

    try {
        // Read the request body as JSON
        const newRequisitionData = await request.json();

        // Validate essential fields (e.g., must have itemName and quantity)
        if (!newRequisitionData.itemName || !newRequisitionData.quantity) {
             return new NextResponse("Missing required fields.", { status: 400 });
        }

        // Prepare the data to be saved in Firestore
        const requisitionToSave = {
            ...newRequisitionData,
            // Automatically assign fields from the secure session
            requesterEmail: session.user.email,
            requesterName: session.user.name,
            employeeId: session.user.employeeId || 'N/A', // Assuming employeeId might be in session
            department: session.user.department,
            
            // Set initial status and timestamp
            status: 'Pending Supervisor Review', 
            created: new Date(),
        };

        // Save to Firestore
        const docRef = await db.collection('requisitions').add(requisitionToSave);

        // Return a success response
        return new NextResponse(JSON.stringify({ 
            message: "Requisition submitted successfully.", 
            id: docRef.id 
        }), { 
            status: 201, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Requisition POST Error:", error);
        return new NextResponse("Failed to submit requisition due to server error.", { status: 500 });
    }
}
