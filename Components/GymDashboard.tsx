'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust this path if your lib folder is elsewhere
import { Search, UserPlus, Trash2, LogOut, Loader2, CheckCircle2, AlertCircle, Banknote } from 'lucide-react';

export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '', father_name: '', phone: '',
    join_date: new Date().toISOString().split('T')[0],
    fee_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    admission_fee: '', monthly_fee: '', cardio_fee: '', paid_amount: ''
  });

  // 1. Fetch Data
  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setMembers(data || []);
    setLoading(false);
  };

  // Run fetchMembers when the page loads
  useEffect(() => { 
    fetchMembers(); 
  }, []);

  // 2. Add New Member
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = formData; 

    // Clean the data (catches misspellings and forces empty boxes to be 0)
    const cleanData = {
      full_name: data.full_name || data.fullName,
      father_name: data.father_name || data.fatherName || "",
      phone: data.phone,
      join_date: data.join_date || data.joinDate,
      fee_month: data.fee_month || data.feeMonth,
      admission_fee: Number(data.admission_fee || data.admissionFee) || 0,
      monthly_fee: Number(data.monthly_fee || data.monthlyFee) || 0,
      cardio_fee: Number(data.cardio_fee || data.cardioFee) || 0,
      paid_amount: Number(data.paid_amount || data.paidAmount) || 0
    };

    const { error } = await supabase.from('members').insert([cleanData]);
    
    if (error) {
      console.error("Database Error:", error);
      alert("Failed to save member: " + error.message);
      return; 
    }

    fetchMembers(); 
    setFormData({
      full_name: '', father_name: '', phone: '',
      join_date: new Date().toISOString().split('T')[0],
      fee_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      admission_fee: '', monthly_fee: '', cardio_fee: '', paid_amount: ''
    } as any);
  };

  // 3. Add Payment for Existing Member
  const handlePayment = async (member: any) => {
    const amountStr = prompt(`Enter payment amount for ${member.full_name}:`);
    if (!amountStr) return; // Cancelled
    
    const paymentAmount = Number(amountStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid number.");
      return;
    }

    // Add new payment to their existing paid total
    const currentPaid = Number(member.paid_amount) || 0;
    const newTotalPaid = currentPaid + paymentAmount;

    const { error } = await supabase
      .from('members')
      .update({ paid_amount: newTotalPaid })
      .eq('id', member.id);

    if (error) {
      alert("Failed to update payment: " + error.message);
    } else {
      fetchMembers();
    }
  };

  // 4. Delete Member
  const deleteMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (!error) fetchMembers();
    }
  };

  // 5. The Automatic Calculator
  const calculateBalance = (member: any) => {
    const today = new Date();
    const joinDate = new Date(member.join_date);
    
    // Calculate how many months active
    const monthsDiff = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
    const totalMonthsActive = Math.max(1, monthsDiff + 1);

    // Calculate Total Cost
    const admission = Number(member.admission_fee) || 0;
    const monthly = Number(member.monthly_fee) || 0;
    const cardio = Number(member.cardio_fee) || 0;
    const totalCost = (monthly * totalMonthsActive) + admission + cardio;
    
    // Calculate what's left
    const paid = Number(member.paid_amount) || 0;
    const moneyLeft = totalCost - paid;

    return { totalMonthsActive, moneyLeft, totalCost };
  };

  // 6. Live Search Logic
  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.phone.includes(searchQuery)
    );
  }, [members, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <header className="mb-10 flex flex-col md:flex-row items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase">Al-Mehran</h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">Fitness & Bodybuilding Club</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg border border-zinc-800 transition-all"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Registration Form */}
        <div className="xl:col-span-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 self-start z-10 xl:sticky xl:top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center text-yellow-500">
            <UserPlus className="mr-2" /> NEW ADMISSION
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Full Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" 
              value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            <input placeholder="Father Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" 
              value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
            <input required placeholder="Phone Number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" 
              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-3 pt-2">
               <input type="number" placeholder="Admission Fee" className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none"
                 value={formData.admission_fee} onChange={e => setFormData({...formData, admission_fee: e.target.value})} />
               <input type="number" placeholder="Monthly Fee" required className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500"
                 value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} />
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Initial Payment</label>
              <input type="number" placeholder="Amount Paid Today" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-green-500"
                  value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
            </div>
            
            <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 mt-4 rounded-lg transition-transform active:scale-95">
              SAVE MEMBER
            </button>
          </form>
        </div>

        {/* Search & List */}
        <div className="xl:col-span-8 space-y-4">
          <div className="relative z-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              placeholder="Search by name or phone..." 
              className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-yellow-500" /></div>
            ) : filteredMembers.map(member => {
              const { totalMonthsActive, moneyLeft } = calculateBalance(member);

              return (
                <div key={member.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 mb-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-yellow-500/40 transition-all">
                  
                  {/* Left Side: Info */}
                  <div className="mb-3 md:mb-0">
                    <h3 className="font-bold text-lg text-white">{member.full_name}</h3>
                    <p className="text-zinc-500 text-sm">{member.phone} • Joined: {member.join_date}</p>
                    <p className="text-zinc-400 text-xs mt-1">Active for {totalMonthsActive} month(s)</p>
                  </div>

                  {/* Right Side: Status & Actions */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    
                    {/* Status Badge */}
                    <div className="text-right">
                      {moneyLeft <= 0 ? (
                        <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                          <CheckCircle2 size={16} />
                          <span className="font-bold text-sm">Clear</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                          <AlertCircle size={16} />
                          <span className="font-bold text-sm">Rs. {moneyLeft} Due</span>
                        </div>
                      )}
                    </div>

                    {/* Add Payment Button */}
                    <button 
                      onClick={() => handlePayment(member)} 
                      className="text-zinc-600 hover:text-green-500 p-2 transition-colors"
                      title="Add Payment"
                    >
                      <Banknote size={18} />
                    </button>

                    {/* Delete Button */}
                    <button 
                      onClick={() => deleteMember(member.id)} 
                      className="text-zinc-600 hover:text-red-500 p-2 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {filteredMembers.length === 0 && !loading && (
              <div className="text-center text-zinc-500 py-10">No members found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}