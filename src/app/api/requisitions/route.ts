<<<<<<< HEAD
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Query, FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend'; 

// Initialize Firebase Admin SDK
if (!getApps().length) {
    try {
        const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
        initializeApp({
            credential: cert(serviceAccountKey),
        });
    } catch (error) {
        console.error("Error initializing Firebase Admin SDK:", error);
    }
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY); 

// Helper interfaces
interface UserSession {
    email: string;
    role: string;
    department?: string;
    name: string;
}

interface RequisitionData {
    itemName: string;
    quantity: number;
    unitCost: number;
    reason: string;
    employeeId: string;
}

// Helper Type for Reviewer Role
type ReviewerRole = 'supervisor' | 'owner';

// --- Dynamic Reviewer Email Lookup Function (Unchanged) ---
async function getReviewerEmail(role: ReviewerRole, department?: string): Promise<string | null> {
    const usersRef = db.collection('users');
    let query: Query = usersRef.where('role', '==', role);
    
    if (role === 'supervisor' && department) {
        query = query.where('department', '==', department);
    } 
    
    const snapshot = await query.limit(1).get();

    if (!snapshot.empty) {
        return snapshot.docs[0].data().email as string;
    }

    return null;
=======
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
>>>>>>> dad25876f3197e5db3fa24d1e10c7c8e0cd870fb
}
// ---------------------------------------------

<<<<<<< HEAD
// --- Resend Notification for New Submission (Unchanged) ---
async function sendNewSubmissionNotification(newReq: any, reviewerEmail: string) {
    const SENDER_EMAIL = 'no-reply@yourverifieddomain.com'; 
    const toEmail = reviewerEmail; 
    const subject = `🔔 ACTION REQUIRED: New Requisition from ${newReq.requesterName}`;
    const dashboardLink = 'https://your-app-domain.com/my-requisitions?view=action'; 
    
    const itemDetails = `Requisition for <b>${newReq.itemName}</b> (Dept: ${newReq.department}, Cost: #$${(newReq.quantity * newReq.unitCost).toFixed(2)})`;
    
    const htmlBody = `<p>A new requisition has been submitted by ${newReq.requesterName} from the ${newReq.department} department and requires your immediate attention.</p>
                      <p>${itemDetails}</p>
                      <p>Please review and approve or reject the request in your Action Queue now.</p>
                      <p>Review Now: <a href="${dashboardLink}">Click Here</a></p>`;
=======
>>>>>>> dad25876f3197e5db3fa24d1e10c7c8e0cd870fb

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

<<<<<<< HEAD
// --- 1. GET HANDLER (Unchanged from your provided logic) ---

export async function GET(req: NextRequest) {
    const session = await getServerSession(options);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    
    const user = session.user as UserSession;
    const userRole = user.role;
    const userDepartment = user.department;
    const userEmail = user.email;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view'); 

    // --- NEW: Pagination Parameters ---
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10'); // Default limit to 10
    const offset = (page - 1) * limit;
    // ------------------------------------

    try {
        const requisitionsRef = db.collection('requisitions');
        let query: Query = requisitionsRef;
        
        // --- Apply Role-Based Query Filters ---
        if (userRole === 'staff') {
            query = query
                .where('requesterEmail', '==', userEmail)
                .orderBy('created', 'desc');
        } else if (userRole === 'owner') {
            if (view === 'action') {
                // Owner Action Queue must include both supervisor approved and supervisor submitted requests
                query = query
                    .where('status', 'in', ['Pending Owner Review', 'Approved by Supervisor'])
                    .orderBy('created', 'desc');
            } else {
                query = query
                    .where('status', 'in', [
                        'Pending Supervisor Review', 
                        'Approved by Supervisor', 
                        'Pending Owner Review', // Include this status for full history
                        'Approved',                  
                        'Rejected by Supervisor',    
                        'Rejected by Owner',         
                        'Canceled'                   
                    ])
                    .orderBy('created', 'desc');
            }
        } else if (userRole === 'supervisor' && userDepartment) {
            if (view === 'action') {
                query = query
                    .where('department', '==', userDepartment)
                    .where('status', '==', 'Pending Supervisor Review')
                    .orderBy('created', 'desc');
            } else if (view === 'my-submissions') {
                query = query
                    .where('requesterEmail', '==', userEmail)
                    .orderBy('created', 'desc');
            } else {
                 query = query
                    .where('department', '==', userDepartment)
                    .where('status', 'in', ['Pending Supervisor Review', 'Approved by Supervisor', 'Rejected by Supervisor'])
                    .orderBy('created', 'desc');
            }
        } else {
            return NextResponse.json({ message: 'Unauthorized role or missing department information.' }, { status: 403 });
        }
        
        // --- Pagination Implementation ---
        const snapshot = await query
            .offset(offset)
            .limit(limit + 1) 
            .get();
        
        const hasNextPage = snapshot.docs.length > limit;
        const documents = hasNextPage ? snapshot.docs.slice(0, limit) : snapshot.docs;
        // ------------------------------------
        
        const requisitions = documents.map(doc => {
            const data = doc.data();
            const createdDate = data.created && data.created.toDate 
                ? data.created.toDate().toISOString()
                : data.created;

            return {
                id: doc.id,
                ...data,
                created: createdDate,
            };
        });

        // Return the data array AND the pagination metadata
        return NextResponse.json({
            data: requisitions,
            meta: {
                currentPage: page,
                limit: limit,
                hasNextPage: hasNextPage,
                hasPrevPage: page > 1,
            }
        });

    } catch (error) {
        console.error('Failed to fetch requisitions:', error);
        return NextResponse.json({ message: 'An unexpected error occurred while fetching data.' }, { status: 500 });
    }
}


// --- 2. POST HANDLER (UPDATED) ---

export async function POST(req: NextRequest) {
=======
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
>>>>>>> dad25876f3197e5db3fa24d1e10c7c8e0cd870fb
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
<<<<<<< HEAD
        
        // 🚀 CRITICAL NEW LOGIC: Determine the initial status based on the user's role
        let initialStatus: string;
        let nextReviewerRole: ReviewerRole | null = null;
        
        if (user.role === 'supervisor') {
            // Supervisor submits: skip supervisor review, go straight to owner
            initialStatus = 'Pending Owner Review';
            nextReviewerRole = 'owner'; 
        } else if (user.role === 'owner') {
            // Owner submits: auto-approve
            initialStatus = 'Approved';
            nextReviewerRole = null; 
        } else {
            // Default for staff
            initialStatus = 'Pending Supervisor Review';
            nextReviewerRole = 'supervisor';
        }
        // -------------------------------------------------------------
        
        const newRequisition = {
            itemName: body.itemName,
            quantity: body.quantity,
            unitCost: body.unitCost,
            reason: body.reason || 'No reason provided.',
            employeeId: body.employeeId,
            
            requesterEmail: user.email,
            requesterName: user.name,
            department: user.department, 
            
            // 🎯 Use the role-calculated status
            status: initialStatus, 
            created: FieldValue.serverTimestamp(), 
        };

        const docRef = await db.collection('requisitions').add(newRequisition);
        
        // Update notification logic to target the correct reviewer
        if (nextReviewerRole) {
            const reviewerEmail = await getReviewerEmail(nextReviewerRole, newRequisition.department);
            
            if (reviewerEmail) {
                await sendNewSubmissionNotification({ ...newRequisition, id: docRef.id }, reviewerEmail);
            } else {
                console.warn(`WARNING: No ${nextReviewerRole} found for department: ${newRequisition.department}. Email notification skipped.`);
            }
        }
=======

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
>>>>>>> dad25876f3197e5db3fa24d1e10c7c8e0cd870fb

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
