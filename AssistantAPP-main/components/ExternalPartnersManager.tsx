'use client';

import { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';

// Define types for our data
interface Partner {
  id: string;
  name: string;
  email: string | null;
  type: string;
}

interface RoleOption {
  value: string;
  label: string;
}

interface ExternalPartnersManagerProps {
  caseId: string;
}

export default function ExternalPartnersManager({ caseId }: ExternalPartnersManagerProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);

  // Fetch existing partners and roles when the component loads
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const partnersRes = await fetch(`/api/cases/${caseId}/external-partners`);
      if(partnersRes.ok) {
        const partnersData = await partnersRes.json();
        setPartners(partnersData.partners || []);
      }

      const rolesRes = await fetch('/api/partner-roles');
      if(rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (rolesData.roles) {
          setRoleOptions(
            rolesData.roles.map((role: { name: string }) => ({
              value: role.name,
              label: role.name,
            }))
          );
        }
      }
      setIsLoading(false);
    }
    fetchData();
  }, [caseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !selectedRole) {
      alert('Partner name and role are required.');
      return;
    }

    const res = await fetch(`/api/cases/${caseId}/external-partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        roleName: selectedRole.value,
      }),
    });

    if (res.ok) {
      const { partner: newPartner } = await res.json();
      setPartners([...partners, newPartner]);
      setNewName('');
      setNewEmail('');
      setSelectedRole(null);
    } else {
      alert('Failed to add partner.');
    }
  };

  if (isLoading) {
    return <div>Loading partners...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">External Partners</h3>
        <div className="mt-4 space-y-2">
          {partners.length > 0 ? (
            partners.map((partner) => (
              <div key={partner.id} className="p-2 border rounded-md">
                <p className="font-semibold">{partner.name} - <span className="text-sm text-gray-600">{partner.type}</span></p>
                {partner.email && <p className="text-sm text-gray-500">{partner.email}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No external partners have been added to this case yet.</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <h4 className="font-medium text-gray-800">Add New Partner</h4>
        <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
          <div>
            <label htmlFor="partner-name" className="block text-sm font-medium text-gray-700">Partner Name</label>
            <input type="text" id="partner-name" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
          </div>
          <div>
            <label htmlFor="partner-email" className="block text-sm font-medium text-gray-700">Partner Email (Optional)</label>
            <input type="email" id="partner-email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="partner-role" className="block text-sm font-medium text-gray-700">Partner Role</label>
            <CreatableSelect isClearable options={roleOptions} value={selectedRole} onChange={(newValue) => setSelectedRole(newValue)} placeholder="Select or type a new role..." className="mt-1" required />
          </div>
        </div>
        <div className="mt-6">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Partner
          </button>
        </div>
      </form>
    </div>
  );
}
