'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Search, UserPlus, Trash2, LogOut, Loader2, CheckCircle2, AlertCircle, Banknote, Calendar, Clock, Settings, X } from 'lucide-react';

export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for the Edit Modal
  const [editingMember, setEditingMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    full_name: '', father_name: '', phone: '',
    join_date: new Date().toISOString().split('T')[0],
    shift: 'Evening',
    fee_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    admission_fee: '', monthly_fee: '', cardio_fee: '', trainer_fee: '', paid_amount: ''
  });

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  // Add New Member
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = formData; 
    const cleanData = {
      full_name: data.full_name || data.fullName,
      father_name: data.father_name || data.fatherName || "",
      phone: data.phone,
      join_date: data.join_date || data.joinDate,
      shift: data.shift,
      admission_fee: Number(data.admission_fee || data.admissionFee) || 0,
      monthly_fee: Number(data.monthly_fee || data.monthlyFee) || 0,
      cardio_fee: Number(data.cardio_fee || data.cardioFee) || 0,
      trainer_fee: Number(data.trainer_fee || data.trainerFee) || 0,
      paid_amount: Number(data.paid_amount || data.paidAmount) || 0
    };

    const { error } = await supabase.from('members').insert([cleanData]);
    
    if (error) {
      alert("Failed to save member: " + error.message);
      return; 
    }

    fetchMembers(); 
    setFormData({
      full_name: '', father_name: '', phone: '',
      join_date: new Date().toISOString().split('T')[0],
      shift: 'Evening',
      fee_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      admission_fee: '', monthly_fee: '', cardio_fee: '', trainer_fee: '', paid_amount: ''
    } as any);
  };

  // Save changes from the Edit Modal
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = {
      full_name: editingMember.full_name,
      father_name: editingMember.father_name,
      phone: editingMember.phone,
      join_date: editingMember.join_date,
      shift: editingMember.shift,
      admission_fee: Number(editingMember.admission_fee) || 0,
      monthly_fee: Number(editingMember.monthly_fee) || 0,
      cardio_fee: Number(editingMember.cardio_fee) || 0,
      trainer_fee: Number(editingMember.trainer_fee) || 0,
      paid_amount: Number(editingMember.paid_amount) || 0,
      // If empty string, send null (meaning bill forever). Otherwise, send the number limit.
      cardio_months: editingMember.cardio_months === '' || editingMember.cardio_months === null ? null : Number(editingMember.cardio_months),
      trainer_months: editingMember.trainer_months === '' || editingMember.trainer_months === null ? null : Number(editingMember.trainer_months),
    };

    const { error } = await supabase.from('members').update(cleanData).eq('id', editingMember.id);
    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setEditingMember(null);
      fetchMembers();
    }
  };

  // Add Payment
  const handlePayment = async (member: any) => {
    const amountStr = prompt(`Enter payment amount for ${member.full_name}:`);
    if (!amountStr) return; 
    const paymentAmount = Number(amountStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return alert("Valid number required.");

    const newTotalPaid = (Number(member.paid_amount) || 0) + paymentAmount;
    const { error } = await supabase.from('members').update({ paid_amount: newTotalPaid }).eq('id', member.id);
    if (!error) fetchMembers();
  };

  // Delete Member
  const deleteMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (!error) fetchMembers();
    }
  };

  // AUTOMATIC CALCULATOR (UPDATED FOR DROPPED SERVICES)
  const calculateBalance = (member: any) => {
    const today = new Date();
    const joinDate = new Date(member.join_date);
    
    const monthsDiff = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
    const totalMonthsActive = Math.max(1, monthsDiff + 1);

    const admission = Number(member.admission_fee) || 0;
    const monthly = Number(member.monthly_fee) || 0;
    const cardio = Number(member.cardio_fee) || 0;
    const trainer = Number(member.trainer_fee) || 0;

    // IMPORTANT MATH FIX: If they have a limit set, use the limit. If not, bill for all active months.
    const cardioMonthsToBill = member.cardio_months !== null ? Number(member.cardio_months) : totalMonthsActive;
    const trainerMonthsToBill = member.trainer_months !== null ? Number(member.trainer_months) : totalMonthsActive;
    
    // Calculate total cost accurately
    const totalCost = (monthly * totalMonthsActive) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission;
    const paid = Number(member.paid_amount) || 0;
    const moneyLeft = totalCost - paid;

    // Display logic for current active recurring fee
    let activeRecurring = monthly;
    if (cardioMonthsToBill >= totalMonthsActive) activeRecurring += cardio;
    if (trainerMonthsToBill >= totalMonthsActive) activeRecurring += trainer;

    return { totalMonthsActive, moneyLeft, totalCost, activeRecurring };
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery));
  }, [members, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <header className="mb-10 flex flex-col md:flex-row items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase">Al-Mehran</h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">Fitness & Bodybuilding Club</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg border border-zinc-800 transition-all">
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
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Calendar size={12}/> Join Date</label>
                 <input type="date" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500 [color-scheme:dark]"
                   value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Clock size={12}/> Shift</label>
                 <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500 text-white"
                   value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                   <option value="Morning">Morning</option>
                   <option value="Evening">Evening</option>
                   <option value="Both">Both</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 mt-2">
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Admission Fee</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500"
                   value={formData.admission_fee} onChange={e => setFormData({...formData, admission_fee: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Monthly Gym Fee</label>
                 <input type="number" placeholder="0" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500"
                   value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Cardio Fee</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500"
                   value={formData.cardio_fee} onChange={e => setFormData({...formData, cardio_fee: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Trainer Fee</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500"
                   value={formData.trainer_fee} onChange={e => setFormData({...formData, trainer_fee: e.target.value})} />
               </div>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Initial Payment Received</label>
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
            <input placeholder="Search by name or phone..." className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-yellow-500" /></div>
            ) : filteredMembers.map(member => {
              const { totalMonthsActive, moneyLeft, activeRecurring } = calculateBalance(member);

              return (
                <div key={member.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 mb-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-yellow-500/40 transition-all">
                  
                  {/* Left Side: Info */}
                  <div className="mb-3 md:mb-0">
                    <h3 className="font-bold text-lg text-white">{member.full_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-zinc-400 text-sm">{member.phone}</span>
                      <span className="text-zinc-600 text-xs">•</span>
                      <span className="bg-zinc-800 text-yellow-500 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">{member.shift || 'Evening'}</span>
                      <span className="text-zinc-600 text-xs">•</span>
                      <span className="text-zinc-400 text-xs">Rs. {activeRecurring}/mo</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2">Joined: {member.join_date} <span className="text-zinc-600 mx-1">•</span> Active for {totalMonthsActive} month(s)</p>
                  </div>

                  {/* Right Side: Status & Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0">
                    <div className="text-right mr-2">
                      {moneyLeft <= 0 ? (
                        <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                          <CheckCircle2 size={16} /><span className="font-bold text-sm">Clear</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                          <AlertCircle size={16} /><span className="font-bold text-sm">Rs. {moneyLeft} Due</span>
                        </div>
                      )}
                    </div>

                    <button onClick={() => handlePayment(member)} className="text-zinc-600 hover:text-green-500 p-2 transition-colors" title="Add Payment">
                      <Banknote size={18} />
                    </button>
                    {/* NEW: Edit Member Button */}
                    <button onClick={() => setEditingMember(member)} className="text-zinc-600 hover:text-blue-500 p-2 transition-colors" title="Edit Member/Settings">
                      <Settings size={18} />
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors" title="Remove Member">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredMembers.length === 0 && !loading && <div className="text-center text-zinc-500 py-10">No members found.</div>}
          </div>
        </div>
      </div>

      {/* NEW: THE EDIT MEMBER MODAL OVERLAY */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-500">Edit Member Profile</h2>
              <button onClick={() => setEditingMember(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-zinc-500 ml-1">Full Name</label>
                <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.full_name} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})} /></div>
                <div><label className="text-xs text-zinc-500 ml-1">Phone Number</label>
                <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                 <div><label className="text-xs text-zinc-500 ml-1">Monthly Gym Fee</label>
                 <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.monthly_fee} onChange={e => setEditingMember({...editingMember, monthly_fee: e.target.value})} /></div>
                 <div><label className="text-xs text-zinc-500 ml-1">Total Paid So Far</label>
                 <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-green-500" value={editingMember.paid_amount} onChange={e => setEditingMember({...editingMember, paid_amount: e.target.value})} /></div>
              </div>

              {/* The Magic "Drop Service" Controls */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4 bg-zinc-900/50 p-4 rounded-xl">
                 <div>
                    <label className="text-xs text-zinc-400 font-bold ml-1">Cardio Fee Amount</label>
                    <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-2" value={editingMember.cardio_fee} onChange={e => setEditingMember({...editingMember, cardio_fee: e.target.value})} />
                    
                    <label className="text-xs text-red-400 font-bold ml-1">Limit Cardio (Months Billed)</label>
                    <input type="number" placeholder="Leave empty to bill forever" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.cardio_months !== null ? editingMember.cardio_months : ''} onChange={e => setEditingMember({...editingMember, cardio_months: e.target.value})} />
                    <p className="text-[10px] text-zinc-500 mt-1">Example: Type "1" if they dropped cardio after month 1.</p>
                 </div>
                 
                 <div>
                    <label className="text-xs text-zinc-400 font-bold ml-1">Trainer Fee Amount</label>
                    <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-2" value={editingMember.trainer_fee} onChange={e => setEditingMember({...editingMember, trainer_fee: e.target.value})} />
                    
                    <label className="text-xs text-red-400 font-bold ml-1">Limit Trainer (Months Billed)</label>
                    <input type="number" placeholder="Leave empty to bill forever" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.trainer_months !== null ? editingMember.trainer_months : ''} onChange={e => setEditingMember({...editingMember, trainer_months: e.target.value})} />
                    <p className="text-[10px] text-zinc-500 mt-1">Type the exact number of months they used the trainer.</p>
                 </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                 <button type="button" onClick={() => setEditingMember(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-transform active:scale-95">Save Profile Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}