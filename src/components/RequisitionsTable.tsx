'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    console.error("API Fetch Error:", res.status, res.statusText);
    throw error;
  }
  return res.json();
});

interface Requisition {
  id: string;
  itemName: string;
  quantity: number;
  department: string;
  requesterName: string;
  branch: string;
  unitCost: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created: string;
}

export default function RequisitionsTable() {
  const { data: requisitions, error, isLoading, mutate } = useSWR<Requisition[]>('/api/requisitions', fetcher);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this requisition? This action cannot be undone.')) {
      try {
        await fetch(`/api/requisitions/${id}`, {
          method: 'DELETE',
        });
        mutate(); // Re-fetch the data to update the table
      } catch (error) {
        console.error('Failed to delete requisition:', error);
      }
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading requisitions...</div>;
  if (error) {
    console.error("SWR Error:", error);
    return <div className="text-center py-8 text-red-600">Error fetching requisitions. Check console for details.</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">All Requisitions</h2>
      <div className="bg-white shadow mobile-scroll sm:rounded-lg">
        {requisitions && requisitions.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-black">
              {requisitions.map((req) => (
                <tr key={req.id}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.itemName}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.quantity}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">#{req.unitCost}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">#{(req.quantity * req.unitCost).toFixed(2)}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.reason}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.requesterName}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.department}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">{req.branch}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={async () => {
                            await fetch(`/api/requisitions/${req.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Approved' }),
                            });
                            mutate();
                          }}
                          className="text-green-600 hover:text-green-900 mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/requisitions/${req.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Rejected' }),
                            });
                            mutate();
                          }}
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                        onClick={() => handleDelete(req.id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                    >
                        Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-gray-500">No requisitions have been submitted yet.</p>
        )}
      </div>
    </div>
  );
}