// 'use client';

// import { useState, FormEvent, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import InputField from '@/components/ui/inputfield';

// interface RequisitionFormProps {
//   requesterName: string;
// }

// export default function RequisitionForm({ requesterName }: RequisitionFormProps) {
//   const { data: session } = useSession();

//   const [formData, setFormData] = useState({
//     requesterName: requesterName,
//     department: '',
//     employeeId: '',
//     itemName: '',
//     quantity: 0,
//     unitCost: 0,
//     reason: '',
//   });

//   // Use useEffect to set the initial state from the prop
//   useEffect(() => {
//     setFormData(prevData => ({
//       ...prevData,
//       requesterName: requesterName,
//     }));
//   }, [requesterName]);

//   const departments = ['Select Department', 'Finance', 'HR', 'Engineering', 'Marketing', 'Sales'];
//   const reasons = ['Select Reason', 'Purchase', 'Procurement', 'Subscription', 'Office Supplies'];

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setFormData((prevData) => ({
//       ...prevData,
//       [name]: value,
//     }));
//   };


//   const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     try {
//       // Create the requisition object with all required fields
//       const requisitionData = {
//         requesterName: formData.requesterName,
//         requesterEmail: session?.user?.email,
//         department: formData.department,
//         employeeId: formData.employeeId,
//         itemName: formData.itemName,
//         quantity: Number(formData.quantity),
//         unitCost: Number(formData.unitCost),
//         reason: formData.reason,
//         status: 'Pending', 
//         created: new Date().toISOString(), 
//         lastUpdated: new Date().toISOString(), 
//       };

//       const response = await fetch('/api/requisitions', { 
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(requisitionData),
//       });

//       if (response.ok) {
//         console.log('Form data successfully sent to API!');
//         // Reset form to initial state
//         setFormData(prevData => ({
//           ...prevData,
//           requesterName: requesterName,
//           department: '',
//           employeeId: '',
//           itemName: '',
//           quantity: 0,
//           unitCost: 0,
//           reason: '',
//         }));
//       } else {
//         console.error('Form submission failed.');
//       }
//     } catch (error) {
//       console.error('An error occurred:', error);
//     }
//   };

//   const totalCost = formData.quantity * formData.unitCost;

//   return (
//     <div className="flex justify-center p-4 sm:p-8 bg-gray-100 min-h-screen">
//       <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-lg shadow-lg">
//         <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
//           Requisition Form
//         </h1>
//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-700">Requestor Information</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <InputField
//                 label="Your Full Name"
//                 name="requesterName"
//                 value={formData.requesterName}
//                 onChange={handleInputChange}
//                 placeholder="e.g., Jane Doe"
//                 readOnly 
//               />
//               <div>
//                 <label htmlFor="department" className="block text-sm font-medium text-gray-700">
//                   Department
//                   <span className="text-red-500 ml-1">*</span>
//                 </label>
//                 <select
//                   id="department"
//                   name="department"
//                   value={formData.department}
//                   onChange={handleInputChange}
//                   required
//                   className="block w-full rounded-md border-gray-300 shadow-sm text-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
//                 >
//                   {departments.map((dept) => (
//                     <option key={dept} value={dept === 'Select Department' ? '' : dept}>
//                       {dept}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <InputField
//                 label="Employee ID"
//                 name="employeeId"
//                 value={formData.employeeId}
//                 onChange={handleInputChange}
//                 placeholder="e.g., 12345"
//                 required
//               />
//             </div>
//           </div>

//           <hr className="my-6" />

//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-700">Item Details</h2>
//             <InputField
//               label="Item Name"
//               name="itemName"
//               value={formData.itemName}
//               onChange={handleInputChange}
//               placeholder="e.g., Laptop"
//               required
//             />
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <InputField
//                 label="Quantity"
//                 name="quantity"
//                 type="number"
//                 value={formData.quantity}
//                 onChange={handleInputChange}
//                 required
//               />
//               <InputField
//                 label="Unit Cost ($)"
//                 name="unitCost"
//                 type="number"
//                 value={formData.unitCost}
//                 onChange={handleInputChange}
//                 required
//               />
//             </div>
//             <div className="text-right font-bold text-lg text-gray-800">
//               Total Cost: #{totalCost.toFixed(2)}
//             </div>
//           </div>

//           <hr className="my-6" />

//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-700">Reason</h2>
//             <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
//               Reason
//               <span className="text-red-500 ml-1">*</span>
//             </label>
//             <select
//               id="reason"
//               name="reason"
//               value={formData.reason}
//               onChange={handleInputChange}
//               required
//               className="block w-full rounded-md border-gray-300 shadow-sm text-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
//             >
//               {reasons.map((reason) => (
//                 <option key={reason} value={reason === 'Select Reason' ? '' : reason}>
//                   {reason}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className='w-full sm:w-[30%] sm:mx-auto'>
//             <button
//               type="submit"
//               className="w-full py-2 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
//             >
//               Submit Requisition
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import InputField from '@/components/ui/inputfield';

interface RequisitionFormProps {
  requesterName: string;
}

export default function RequisitionForm({ requesterName }: RequisitionFormProps) {
  const { data: session } = useSession();
  
  // 1. Get the department from the user's session.
  // We assume the department field is now part of the session data, which is pulled from Firestore.
  // The 'as string' and 'as any' are necessary type assertions since the custom field is not default in NextAuth.
  const userDepartment = (session?.user?.department as string) || '';

  const [formData, setFormData] = useState({
    requesterName: requesterName,
    // We remove the department field from the state since it's now controlled by the user session
    employeeId: '',
    itemName: '',
    quantity: 0,
    unitCost: 0,
    reason: '',
  });

  // Use useEffect to set the initial state from the prop and automatically set the department
  useEffect(() => {
    setFormData(prevData => ({
      ...prevData,
      requesterName: requesterName,
    }));
  }, [requesterName]);

  const reasons = ['Select Reason', 'Purchase', 'Procurement', 'Subscription', 'Office Supplies'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent submission if the user's department is not set (indicates a user profile setup error)
    if (!userDepartment || userDepartment === 'global' || userDepartment === 'all') {
        console.error('Submission failed: User department is not defined or is set to a global role.');
        // You might want to show a toast/alert to the user here
        return;
    }

    try {
      // Create the requisition object with all required fields
      const requisitionData = {
        requesterName: formData.requesterName,
        requesterEmail: session?.user?.email,
        // 2. We use the department pulled directly from the session
        department: userDepartment, 
        employeeId: formData.employeeId,
        itemName: formData.itemName,
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
        reason: formData.reason,
        // New initial status to reflect the first approval step
        status: 'Pending Supervisor Review', 
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
        console.log('Requisition successfully submitted to API!');
        // Reset form to initial state
        setFormData(prevData => ({
          ...prevData,
          requesterName: requesterName,
          employeeId: '',
          itemName: '',
          quantity: 0,
          unitCost: 0,
          reason: '',
        }));
        // Optional: Show success message to the user
      } else {
        console.error('Requisition submission failed.');
        // Optional: Show error message to the user
      }
    } catch (error) {
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