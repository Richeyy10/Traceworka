'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/assets/logowithnobkg.png'
import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast'; 

// --- NEW INTERFACES FOR PAGINATION ---
interface PaginationMeta {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface PaginatedResponse {
    data: Requisition[];
    meta: PaginationMeta;
}
// ------------------------------------

// Define the fetcher function for SWR
const fetcher = async (url: string) => {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error('Failed to fetch requisitions list from the server.');
        }
        return res.json();
    } catch (error) {
        console.error("SWR Fetch Error:", error);
        throw error; 
    }
};

// Define a type for the potential Firestore Timestamp object
type FirestoreTimestamp = {
    toDate: () => Date;
};

// --- DATE FORMATTING HELPER FUNCTION (Type Fixed for ESLint/TS) ---
// FIX 1: Use specific types for the timestamp parameter
const formatFirestoreTimestamp = (timestamp: FirestoreTimestamp | string | null | undefined): string => {
    if (!timestamp) {
        return 'N/A';
    }
    
    // Safely determine if it's a Firestore Timestamp object or a simple string date
    const date = typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp 
        ? (timestamp as FirestoreTimestamp).toDate()
        : new Date(timestamp as string);
    
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};
// ----------------------------------------

// Requisition Interface (Type Fixed)
interface Requisition {
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
    created: FirestoreTimestamp | string; // FIX 2: Use specific type
    rejectionReason?: string;
    
    supervisorApprovedBy?: string;
    ownerApprovedBy?: string;
    rejectedBy?: string;
}

// --- NEW Pagination Constants ---
const ITEMS_PER_PAGE = 10;

export default function MyRequisitionsPage() {
    const { data: session, status } = useSession();
    const userRole = session?.user?.role || 'staff';
    const userDepartment = session?.user?.department || 'default';
    // const userEmail = session?.user?.email; // FIX 3: Variable removed as it was unused

    const isStaff = userRole === 'staff';
    const isSupervisor = userRole === 'supervisor';
    const isOwner = userRole === 'owner';

    const [activeView, setActiveView] = useState(isStaff ? 'my-submissions' : 'action');

    // --- NEW Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(ITEMS_PER_PAGE);
    // ----------------------------

    // --- DYNAMIC URL GENERATION (Now includes pagination params) ---
    const swrKey = useMemo(() => {
        let baseUrl = `/api/requisitions?role=${userRole}&department=${userDepartment}&limit=${limit}&page=${currentPage}`;

        if (!isStaff) {
            baseUrl += `&view=${activeView}`;
        }
        return baseUrl;
    }, [userRole, userDepartment, activeView, isStaff, limit, currentPage]);


    const { data: response, error, isLoading, mutate } = useSWR<PaginatedResponse>(swrKey, fetcher);

    // 💡 Add toast for SWR fetch errors
    useEffect(() => {
        if (error) {
            toast.error('Could not load requisitions. Please check your connection or log in again.');
        }
    }, [error]);

    // Extract data and meta from the response
    const myRequisitions = response?.data || [];
    const meta = response?.meta || { currentPage: 1, limit: ITEMS_PER_PAGE, hasNextPage: false, hasPrevPage: false };

    // --- Action Handlers ---
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);

    const handleAction = async (id: string, newStatus: Requisition['status'], reason: string = '') => {
        const actionName = newStatus.includes('Approved') ? 'Approval' : 
                         newStatus.includes('Rejected') ? 'Rejection' : 'Cancellation';
                         
        const loadingToastId = toast.loading(`${actionName} in progress...`);

        try {
            const response = await fetch(`/api/requisitions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: newStatus, 
                    rejectionReason: reason,
                    performedBy: session?.user?.name || session?.user?.email 
                }),
            });

            if (response.ok) {
                toast.success(`Requisition successfully ${actionName.toLowerCase()}!`, { id: loadingToastId });
                mutate();
                
                setShowReasonModal(false);
                setRejectionReason('');
                setSelectedRequisitionId(null);
            } else {
                const errorText = await response.text();
                toast.error(`Failed to complete action. Status: ${response.status}`, { id: loadingToastId });
                console.error(`Failed to update requisition status:`, errorText);
            }
        } catch (error) {
            toast.error('Network connection failed during update.', { id: loadingToastId });
            console.error('An unexpected error occurred:', error);
        }
    };

    const handleApprove = (id: string) => {
        let nextStatus: Requisition['status'];
        if (userRole === 'supervisor') {
            nextStatus = 'Approved by Supervisor';
        } else if (userRole === 'owner') {
            nextStatus = 'Approved'; 
        } else {
            return;
        }
        
        handleAction(id, nextStatus);
    };

    const handleRejectClick = (id: string) => {
        setSelectedRequisitionId(id);
        setShowReasonModal(true);
    };

    const handleRejectSubmit = () => {
        if (!rejectionReason.trim()) {
            toast.error("Rejection reason cannot be empty.");
            return;
        }

        let nextStatus: Requisition['status'];
        if (userRole === 'supervisor') {
            nextStatus = 'Rejected by Supervisor';
        } else if (userRole === 'owner') {
            nextStatus = 'Rejected by Owner';
        } else {
            return;
        }
        
        if (selectedRequisitionId) {
            handleAction(selectedRequisitionId, nextStatus, rejectionReason);
        }
    };

    const handleCancel = (id: string) => {
        if (window.confirm('Are you sure you want to cancel this requisition? This cannot be undone.')) {
            handleAction(id, 'Canceled');
        } 
    };

    // 🚀 UPDATED FUNCTION
    const getDisplayStatus = (req: Requisition): string => {
        let statusText: string = req.status;

        // Display 'Pending Owner Review' as 'Pending Admin Review'
        if (statusText === 'Pending Owner Review') {
            return 'Pending Admin Review'; 
        }

        if (statusText === 'Approved') {
            statusText = `Approved by ${req.ownerApprovedBy || 'Owner'}`;
        } else if (statusText === 'Approved by Supervisor') {
            statusText = `Approved by ${req.supervisorApprovedBy || 'Supervisor'}`;
        } else if (statusText.includes('Rejected')) {
            statusText = `Rejected by ${req.rejectedBy || 'Reviewer'}`;
        }

        return statusText;
    };
    // -----------------------------------------------------------

    // --- Loading and Auth Checks ---

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen text-black">
                <p>Loading requisitions...</p>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="flex justify-center items-center min-h-screen text-black">
                <p>Please log in to view your requisitions.</p>
            </div>
        );
    }
        
    const dashboardTitle = isStaff ? "My Requisitions" : 
                            isSupervisor ? `Supervisor Dashboard (${userDepartment})` :
                            "Admin Dashboard";

    const tableHeaderTitle = (activeView === 'action' ? 'Action Queue' : 
                             activeView === 'my-submissions' ? 'My Submissions' : 
                             'All Requisitions');

    return (
        <div className="mx-auto p-4 sm:p-8 bg-gray-100 min-h-screen text-black">
            {/* ... (Header and Tabs are unchanged) ... */}
            
            {/* --- Header (Unchanged) --- */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <Image src={logo} alt='Traceworka' width={150} height={150} className='ml-0 sm:ml-[10%]' />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    {dashboardTitle}
                </h1>
                <div className="flex space-x-4">
                    <Link href="/" className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                        Go Back
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* --- Tab Navigation for Reviewers (Pagination Reset Added) --- */}
            {(isSupervisor) && (
                <div className="flex border-b border-gray-300 mb-6">
                    {/* Supervisor Action Queue Tab */}
                    <button
                        onClick={() => { setActiveView('action'); setCurrentPage(1); }} // Added setCurrentPage(1)
                        className={`px-4 py-2 font-semibold ${activeView === 'action' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Action Queue ({isSupervisor ? 'Subordinates' : 'Pending'})
                    </button>

                    {/* Supervisor's Personal History Tab */}
                    <button
                        onClick={() => { setActiveView('my-submissions'); setCurrentPage(1); }} // Added setCurrentPage(1)
                        className={`px-4 py-2 font-semibold ${activeView === 'my-submissions' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        My Submissions
                    </button>
                </div>
            )}
            {(isOwner) && (
                <div className="flex border-b border-gray-300 mb-6">
                    <button
                        onClick={() => { setActiveView('action'); setCurrentPage(1); }} // Added setCurrentPage(1)
                        className={`px-4 py-2 font-semibold ${activeView === 'action' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Action Queue ({isSupervisor ? 'Subordinates' : 'Pending'})
                    </button>
                    <button
                        onClick={() => { setActiveView('all'); setCurrentPage(1); }} // Added setCurrentPage(1)
                        className={`px-4 py-2 font-semibold ${activeView === 'all' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Full History
                    </button>
                </div>
            )}


            
            <h2 className="text-xl font-bold mb-4 text-gray-700">{tableHeaderTitle}</h2>

            {/* --- Table --- */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                {myRequisitions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        {/* Table Header (Unchanged) */}
                        <thead className="bg-gray-50">
                            <tr>
                                {(!isStaff || activeView !== 'my-submissions') && (
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requester
                                    </th>
                                )}
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Cost
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted
                                </th>
                                <th scope="col" className="relative px-3 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        {/* Table Body (Updated Logic) */}
                        <tbody className="bg-white divide-y divide-gray-200 text-black">
                            {myRequisitions.map((req) => {
                                const needsSupervisorAction = isSupervisor && activeView === 'action' && req.status === 'Pending Supervisor Review';
                                // The Owner's action queue should include requests that skip the supervisor (like supervisor's own requests)
                                const needsOwnerAction = isOwner && activeView === 'action' && (req.status === 'Approved by Supervisor' || req.status === 'Pending Owner Review' );
                                
                                const canStaffCancel = isStaff && req.status.includes('Pending');
                                
                                // 🚀 CRITICAL NEW CHECK: Does the requisition belong to the current user?
                                const isOwnSubmission = req.requesterEmail === userEmail; 

                                const statusColor = req.status.includes('Approved') ? 'bg-green-100 text-green-800' :
                                                     req.status.includes('Rejected') || req.status.includes('Canceled') ? 'bg-red-100 text-red-800' : 
                                                     'bg-yellow-100 text-yellow-800';
                                const dynamicStatusText = getDisplayStatus(req);
                                
                                return (
                                    <tr key={req.id}>
                                        {(!isStaff || activeView !== 'my-submissions') && (
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                                {req.requesterName} ({req.department})
                                            </td>
                                        )}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">{req.itemName}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                            #{(req.quantity * req.unitCost).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                                {dynamicStatusText}
                                            </span>
                                            
                                            {(req.status.includes('Rejected')) && req.rejectionReason && (
                                                <p className="text-xs text-red-600 mt-1 italic max-w-xs truncate" title={req.rejectionReason}>
                                                    Reason: {req.rejectionReason}
                                                </p>
                                            )}
                                        </td>
                                        
                                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                                            {formatFirestoreTimestamp(req.created)} 
                                        </td>
                                        
                                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {canStaffCancel && (
                                                <button onClick={() => handleCancel(req.id)} className="text-red-600 hover:text-red-900">
                                                    Cancel
                                                </button>
                                            )}
                                            
                                            {/* Action buttons show only if action is needed AND it's NOT the user's own submission */}
                                            {((needsSupervisorAction || needsOwnerAction) && !isOwnSubmission) && (
                                                <>
                                                    <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:text-green-900 mr-2">
                                                        Approve
                                                    </button>
                                                    <button onClick={() => handleRejectClick(req.id)} className="text-red-600 hover:text-red-900">
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-6 text-center text-gray-500">
                        No requisitions found {activeView === 'action' ? "for your review." : "in your submissions."}
                    </div>
                )}
            </div>
            
            {/* --- NEW: Pagination Controls (Unchanged) --- */}
            {myRequisitions.length > 0 && (
                <div className="flex justify-between items-center mt-4 px-4 py-2 bg-white rounded-lg shadow">
                    <button
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        disabled={!meta.hasPrevPage}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition duration-150 ${!meta.hasPrevPage ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800'}`}
                    >
                        &larr; Previous
                    </button>
                    
                    <span className="text-sm text-gray-700">
                        Page <span className="font-semibold">{meta.currentPage}</span>
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!meta.hasNextPage}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition duration-150 ${!meta.hasNextPage ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800'}`}
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
            
            {/* --- Rejection Reason Modal (Unchanged) --- */}
            {showReasonModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Reason for Rejection</h2>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a detailed reason for rejecting this requisition."
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            required
                        />
                        <div className="mt-4 flex justify-end space-x-3">
                            <button
                                onClick={() => { setShowReasonModal(false); setRejectionReason(''); setSelectedRequisitionId(null); }}
                                className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
