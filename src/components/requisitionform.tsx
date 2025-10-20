'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import InputField from '@/components/ui/inputfield';
import { useRouter } from 'next/navigation'; // Import useRouter
import toast from 'react-hot-toast'; // Import toast utility

interface RequisitionFormProps {
  requesterName: string;
}

// Define possible status types for reference
type RequisitionStatus = 'Pending Supervisor Review' | 'Approved by Supervisor' | 'Pending Owner Review' | 'Approved' | 'Rejected by Supervisor' | 'Rejected by Owner' | 'Canceled';


export default function RequisitionForm({ requesterName }: RequisitionFormProps) {
  const { data: session } = useSession();
  const router = useRouter(); // Initialize router
  
  // 1. Get user details from the session
  const userDepartment = (session?.user?.department as string) || '';
  const userRole = session?.user?.role; // Get the user role
  const userEmail = session?.user?.email;

  const [formData, setFormData] = useState({
    requesterName: requesterName,
    employeeId: '',
    itemName: '',
    quantity: 0,
    unitCost: 0,
    reason: '',
  });

  useEffect(() => {
    // Ensure requesterName is set on initial load or session change
    setFormData(prevData => ({
      ...prevData,
      requesterName: requesterName,
    }));
  }, [requesterName]);

  const reasons = ['Select Reason', 'Purchase', 'Procurement', 'Subscription', 'Office Supplies'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Special handling for number inputs to ensure state is numeric
    const parsedValue = (name === 'quantity' || name === 'unitCost') ? Number(value) : value;

    setFormData((prevData) => ({
      ...prevData,
      [name]: parsedValue,
    }));
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation for critical profile fields
    if (!userDepartment || userDepartment === 'global' || userDepartment === 'all') {
        toast.error('Submission failed: User profile department is not correctly set.');
        return;
    }
    
    // 2. CRITICAL LOGIC: Determine the starting status based on the role
    let initialStatus: RequisitionStatus;
    
    if (userRole === 'supervisor') {
        // Supervisors skip their own review step
        initialStatus = 'Pending Owner Review'; 
    } else if (userRole === 'owner' || userRole === 'admin') {
        // Owners/Admins skip all review steps and are auto-approved
        initialStatus = 'Approved'; 
    } else {
        // Default status for regular staff
        initialStatus = 'Pending Supervisor Review';
    }


    const loadingToastId = toast.loading('Submitting requisition...'); 

    try {
      // Create the requisition object with all required fields
      const requisitionData = {
        requesterName: formData.requesterName,
        requesterEmail: userEmail,
        department: userDepartment, 
        employeeId: formData.employeeId,
        itemName: formData.itemName,
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
        reason: formData.reason,
        // Use the dynamically determined status
        status: initialStatus, 
        created: new Date().toISOString(), 
        lastUpdated: new Date().toISOString(), 
      };

      const response = await fetch('/api/requisitions', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requisitionData),
      });

      if (response.ok) {
        // Success
        toast.success(`Requisition submitted! Status: ${initialStatus}`, { id: loadingToastId });
        
        // Reset form
        setFormData(prevData => ({
          ...prevData,
          requesterName: requesterName,
          employeeId: '',
          itemName: '',
          quantity: 0,
          unitCost: 0,
          reason: '',
        }));

        // Redirect after success
        setTimeout(() => {
            router.push('/my-requisitions');
        }, 1000);

      } else {
        // API Error
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Server failed to process the submission.';
        toast.error(`Submission Error: ${errorMessage}`, { id: loadingToastId });
      }
    } catch (error) {
      // Network Error
      toast.error('Network connection failed. Please try again.', { id: loadingToastId });
      console.error('An error occurred:', error);
    }
  };

  const totalCost = formData.quantity * formData.unitCost;

  return (
    <div className="flex justify-center p-4 sm:p-8 bg-gray-100 min-h-screen">
      <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Requisition Form
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Requestor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Your Full Name"
                name="requesterName"
                value={formData.requesterName}
                onChange={handleInputChange}
                placeholder="e.g., Jane Doe"
                readOnly 
              />
              {/* DISPLAY THE DEPARTMENT, DO NOT ASK THE USER TO SELECT IT */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <div className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-black sm:text-sm p-2">
                  {userDepartment || 'Loading...'} 
                </div>
              </div>
              <InputField
                label="Employee ID"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                placeholder="e.g., 12345"
                required
              />
            </div>
          </div>

          <hr className="my-6" />

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Item Details</h2>
            <InputField
              label="Item Name"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
              placeholder="e.g., Laptop"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
              <InputField
                label="Unit Cost ($)"
                name="unitCost"
                type="number"
                value={formData.unitCost}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="text-right font-bold text-lg text-gray-800">
              Total Cost: #{totalCost.toFixed(2)}
            </div>
          </div>

          <hr className="my-6" />

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Reason</h2>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm text-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            >
              {reasons.map((reason) => (
                <option key={reason} value={reason === 'Select Reason' ? '' : reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div className='w-full sm:w-[30%] sm:mx-auto'>
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}