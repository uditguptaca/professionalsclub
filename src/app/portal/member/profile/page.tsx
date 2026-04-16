'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { useRouter } from 'next/navigation';
import { Save, Trash2, AlertTriangle, UserCircle } from 'lucide-react';

export default function MemberProfilePage() {
  const router = useRouter();
  const { setIsAuthenticated } = useApp();
  
  // Mock initial state from when the user signed up
  const [firstName, setFirstName] = useState('Priya');
  const [lastName, setLastName] = useState('Sharma');
  const [email, setEmail] = useState('priya.sharma@gmail.com');
  const [phone, setPhone] = useState('+1-416-555-0101');
  const [city, setCity] = useState('Toronto');
  const [industry, setIndustry] = useState('Technology');
  const [professionalTitle, setProfessionalTitle] = useState('Software Engineer');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleDelete = () => {
    if (window.confirm("Are you incredibly sure you want to delete your profile? This will permanently erase your data and remove you from the Professionals Club network.")) {
      // Simulate account deletion
      setIsAuthenticated(false);
      localStorage.removeItem('pc_auth');
      localStorage.removeItem('pc_role');
      alert("Your account has been deleted.");
      router.replace('/');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCircle size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display mb-1">My Profile</h1>
          <p className="text-secondary">Update the information you provided during signup or manage your account status.</p>
        </div>
      </div>

      <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
        <h2 className="text-xl font-bold mb-6 border-b pb-4">Personal Details</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="input-group">
            <label>First Name</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Last Name</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Phone Number</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="input-group">
            <label>City & Province</label>
            <input className="input" value={city} onChange={e => setCity(e.target.value)} />
          </div>
        </div>
        
        <h2 className="text-xl font-bold mt-10 mb-6 border-b pb-4">Professional Information</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="input-group">
            <label>Industry</label>
            <input className="input" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Job Title / Profession</label>
            <input className="input" value={professionalTitle} onChange={e => setProfessionalTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
          {saveSuccess && <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}>Changes saved successfully!</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} style={{ marginRight: 8 }} />
            {isSaving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ borderRadius: 16, border: '1px solid #fecaca', background: '#fef2f2', padding: 32 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} /> Danger Zone
        </h2>
        <p style={{ color: '#991b1b', fontSize: '0.95rem', marginBottom: 24, maxWidth: 600 }}>
          Once you delete your member profile, there is no going back. All of your requests, volunteer history, and networking access will be permanently erased. Please be certain.
        </p>
        <button 
          onClick={handleDelete}
          style={{ 
            padding: '12px 24px', background: '#dc2626', color: 'white', borderRadius: 8, 
            fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8
          }}
        >
          <Trash2 size={16} /> Delete My Profile
        </button>
      </div>

    </div>
  );
}
