// import { NextResponse, NextRequest } from 'next/server';
// import { initializeApp, cert, getApps } from 'firebase-admin/app';
// import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// import { getServerSession } from "next-auth";
// import { options } from '../auth/[...nextauth]/options';
// import { Resend } from 'resend';

// // Initialize Resend
// const resend = new Resend(process.env.RESEND_API_KEY);

// // Initialize Firebase Admin SDK if it hasn't been already
// if (!getApps().length) {
//   try {
//     const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
//     initializeApp({
//       credential: cert(serviceAccountKey),
//     });
//   } catch (error) {
//     console.error("Error initializing Firebase Admin SDK:", error);
//   }
// }

// const db = getFirestore();

// // Handles GET requests
// export async function GET() {
//   try {
//     const session = await getServerSession(options);
//     const userEmail = session?.user?.email;
//     const userRole = session?.user?.role;

//     if (!userEmail) {
//       return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
//     }

//     const requisitionsRef = db.collection('requisitions');
//     let query;

//     if (userRole === 'admin') {
//       // Admin sees all requisitions
//       query = requisitionsRef.orderBy('created', 'desc');
//     } else {
//       // Standard user sees only their own requisitions
//       query = requisitionsRef.where('requesterEmail', '==', userEmail).orderBy('created', 'desc');
//     }

//     const snapshot = await query.get();

//     if (snapshot.empty) {
//       return NextResponse.json([], { status: 200 });
//     }

//     const requisitions = snapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         created: data.created ? data.created.toDate().toISOString() : null,
//         lastUpdated: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : null,
//       };
//     });

//     return NextResponse.json(requisitions, { status: 200 });

//   } catch (error) {
//     console.error('Failed to fetch requisitions:', error);
//     return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
//   }
// }

// // Handles POST requests
// export async function POST(request: NextRequest) {
//     try {
//         const session = await getServerSession(options);
        
//         if (!session?.user?.email) {
//             return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//         }

//         const data = await request.json();
//         const { itemName, quantity, department, reason, unitCost, requesterName, employeeId } = data;

//         // Create a new requisition document in Firestore
//         const newRequisition = {
//             itemName,
//             quantity: Number(quantity),
//             department,
//             reason,
//             unitCost: Number(unitCost),
//             requesterName,
//             employeeId,
//             requesterEmail: session.user.email,
//             status: 'Pending',
//             created: FieldValue.serverTimestamp(),
//             lastUpdated: FieldValue.serverTimestamp(),
//         };

//         const docRef = await db.collection('requisitions').add(newRequisition);

//         // --- New Email Notification for Admin ---
//         const adminEmail = 'admin@yourcompany.com'; // <-- **Replace with your admin's email**
//         const emailSubject = 'New Requisition Submitted';
//         const emailMessage = `A new requisition for ${itemName} has been submitted by ${requesterName}. Please log in to the dashboard to review it.`;

//         try {
//             await resend.emails.send({
//                 from: 'Requisition System <noreply@yourdomain.com>', // Replace with your domain
//                 to: adminEmail,
//                 subject: emailSubject,
//                 html: `<p>${emailMessage}</p>`,
//             });
//             console.log('Admin notification email sent successfully.');
//         } catch (emailError) {
//             console.error('Failed to send admin email notification:', emailError);
//         }

//         return NextResponse.json({ id: docRef.id, message: 'Requisition submitted successfully' }, { status: 201 });
//     } catch (error) {
//         console.error('Failed to submit requisition:', error);
//         return NextResponse.json({ message: 'Failed to submit requisition' }, { status: 500 });
//     }
// }


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

// --- Dynamic Reviewer Email Lookup Function (Unchanged) ---
async function getReviewerEmail(role: 'supervisor' | 'owner', department?: string): Promise<string | null> {
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
}

// --- Resend Notification for New Submission (Unchanged) ---
async function sendNewSubmissionNotification(newReq: any, supervisorEmail: string) {
    const SENDER_EMAIL = 'no-reply@yourverifieddomain.com'; 
    const toEmail = supervisorEmail; 
    const subject = `🔔 ACTION REQUIRED: New Requisition from ${newReq.requesterName}`;
    const dashboardLink = 'https://your-app-domain.com/my-requisitions?view=action'; 
    
    const itemDetails = `Requisition for <b>${newReq.itemName}</b> (Dept: ${newReq.department}, Cost: #$${(newReq.quantity * newReq.unitCost).toFixed(2)})`;
    
    const htmlBody = `<p>A new requisition has been submitted by ${newReq.requesterName} from the ${newReq.department} department and requires your immediate attention.</p>
                      <p>${itemDetails}</p>
                      <p>Please review and approve or reject the request in your Action Queue now.</p>
                      <p>Review Now: <a href="${dashboardLink}">Click Here</a></p>`;

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: [toEmail],
            subject: subject,
            html: htmlBody,
        });

        if (error) {
            console.error('Resend Email Error on Submission:', error);
        } else {
            console.log(`New submission notification email sent successfully to ${toEmail}.`);
        }
    } catch (err) {
        console.error('Failed to send submission email via Resend:', err);
    }
}

// --- 1. GET HANDLER (With Pagination) ---

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
        
        // --- Apply Role-Based Query Filters (Unchanged) ---
        // (The logic here remains the same as before to filter the dataset)
        if (userRole === 'staff') {
            query = query
                .where('requesterEmail', '==', userEmail)
                .orderBy('created', 'desc');
        // ... (other role/view filters remain the same) ...
        } else if (userRole === 'owner') {
            if (view === 'action') {
                query = query
                    .where('status', 'in', ['Pending Supervisor Review', 'Approved by Supervisor'])
                    .orderBy('created', 'desc');
            } else {
                query = query
                    .where('status', 'in', [
                        'Pending Supervisor Review', 
                        'Approved by Supervisor',    
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
        
        // Get the COUNT of ALL documents that match the query *before* applying limit/offset.
        // NOTE: Firestore requires separate query for count and is expensive. 
        // For simple pagination, we can just check if the next page exists.
        
        // We query for LIMIT + 1 to easily check if there's a next page.
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


// --- 2. POST HANDLER (Unchanged) ---

export async function POST(req: NextRequest) {
    const session = await getServerSession(options);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    const user = session.user as UserSession;
    
    if (!user.department) {
        return NextResponse.json({ message: 'User profile is incomplete. Missing department for submission.' }, { status: 400 });
    }
    
    try {
        const body: RequisitionData = await req.json();

        if (!body.itemName || body.quantity == null || body.unitCost == null) {
            return NextResponse.json({ message: 'Missing required requisition fields.' }, { status: 400 });
        }
        
        const newRequisition = {
            itemName: body.itemName,
            quantity: body.quantity,
            unitCost: body.unitCost,
            reason: body.reason || 'No reason provided.',
            employeeId: body.employeeId,
            
            requesterEmail: user.email,
            requesterName: user.name,
            department: user.department, 
            
            status: 'Pending Supervisor Review', 
            created: FieldValue.serverTimestamp(), 
        };

        const docRef = await db.collection('requisitions').add(newRequisition);
        
        const supervisorEmail = await getReviewerEmail('supervisor', newRequisition.department);
        
        if (supervisorEmail) {
            await sendNewSubmissionNotification({ ...newRequisition, id: docRef.id }, supervisorEmail);
        } else {
            console.warn(`WARNING: No supervisor found for department: ${newRequisition.department}. Email notification skipped.`);
        }

        return NextResponse.json({ id: docRef.id, message: 'Requisition submitted successfully.' }, { status: 201 });

    } catch (error) {
        console.error('Failed to submit requisition:', error);
        return NextResponse.json({ message: 'An unexpected error occurred while submitting the requisition.' }, { status: 500 });
    }
}