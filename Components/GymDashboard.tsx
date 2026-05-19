'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { UserPlus, LogOut, Users, Wallet, CheckCircle2, AlertCircle, Calendar, Clock } from 'lucide-react';
import SearchBoard from './SearchBoard';
import MemberEditor from './MemberEditor';

export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    serial_no: '', full_name: '', father_name: '', phone: '',
    join_date: new Date().toISOString().split('T')[0],
    shift: 'Both',
    trainer_name: '', trainer_start_date: '',
    cardio_start_date: '',
    admission_fee: '', monthly_fee: '', cardio_fee: '', trainer_fee: '', paid_amount: ''
  });

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('join_date', { ascending: false });
    
    if (!error) setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const calculateBalance = (member: any) => {
    // Helper function that respects the EXACT day of the month
    const getMonthsBilled = (startDateStr: string) => {
      if (!startDateStr) return 0;
      const today = new Date();
      const startDate = new Date(startDateStr);
      
      let months = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
      
      // If today's date is BEFORE the anniversary day, subtract 1 month
      if (today.getDate() < startDate.getDate()) {
        months--;
      }
      
      // 1st month is paid upfront, so we always bill at least 1 month
      return Math.max(1, months + 1);
    };

    const totalMonthsActive = getMonthsBilled(member.join_date);

    // Fallbacks: If no specific date is given, fallback to join_date
    const trainerStart = member.trainer_start_date || member.join_date;
    const cardioStart = member.cardio_start_date || member.join_date;

    const trainerActiveMonths = Number(member.trainer_fee) > 0 ? getMonthsBilled(trainerStart) : 0;
    const cardioActiveMonths = Number(member.cardio_fee) > 0 ? getMonthsBilled(cardioStart) : 0;

    const admission = Number(member.admission_fee) || 0;
    const monthly = Number(member.monthly_fee) || 0;
    const cardio = Number(member.cardio_fee) || 0;
    const trainer = Number(member.trainer_fee) || 0;

    // Limit Logic
    const cardioMonthsToBill = (member.cardio_months !== null && member.cardio_months !== '') 
      ? Math.min(Number(member.cardio_months), cardioActiveMonths) : cardioActiveMonths;
      
    const trainerMonthsToBill = (member.trainer_months !== null && member.trainer_months !== '') 
      ? Math.min(Number(member.trainer_months), trainerActiveMonths) : trainerActiveMonths;
    
    const totalCost = (monthly * totalMonthsActive) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission;
    const paid = Number(member.paid_amount) || 0;
    const moneyLeft = totalCost - paid;

    let activeRecurring = monthly;
    if ((member.cardio_months === null || member.cardio_months === '') || cardioActiveMonths < Number(member.cardio_months)) {
      if (cardio > 0) activeRecurring += cardio;
    }
    if ((member.trainer_months === null || member.trainer_months === '') || trainerActiveMonths < Number(member.trainer_months)) {
      if (trainer > 0) activeRecurring += trainer;
    }

    return { totalMonthsActive, trainerActiveMonths, cardioActiveMonths, moneyLeft, totalCost, activeRecurring };
  };

  const stats = useMemo(() => {
    let totalDue = 0; let clearCount = 0; let dueCount = 0;
    members.forEach(member => {
      const { moneyLeft } = calculateBalance(member);
      if (moneyLeft <= 0) clearCount++;
      else { dueCount++; totalDue += moneyLeft; }
    });
    return { totalUsers: members.length, totalDue, clearCount, dueCount };
  }, [members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = formData; 
    
    const cleanData = {
      serial_no: data.serial_no, full_name: data.full_name, father_name: data.father_name || "",
      phone: data.phone, join_date: data.join_date, shift: data.shift,
      trainer_name: data.trainer_name || null,
      trainer_start_date: data.trainer_start_date || null,
      cardio_start_date: data.cardio_start_date || null,
      admission_fee: Number(data.admission_fee) || 0, monthly_fee: Number(data.monthly_fee) || 0,
      cardio_fee: Number(data.cardio_fee) || 0, trainer_fee: Number(data.trainer_fee) || 0,
      paid_amount: Number(data.paid_amount) || 0
    };

    const { error } = await supabase.from('members').insert([cleanData]);
    if (error) return alert("Failed to save member: " + error.message);

    fetchMembers(); 
    setFormData({
      serial_no: '', full_name: '', father_name: '', phone: '',
      join_date: new Date().toISOString().split('T')[0], shift: 'Both',
      trainer_name: '', trainer_start_date: '', cardio_start_date: '',
      admission_fee: '', monthly_fee: '', cardio_fee: '', trainer_fee: '', paid_amount: ''
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = {
      serial_no: editingMember.serial_no, full_name: editingMember.full_name, father_name: editingMember.father_name,
      phone: editingMember.phone, join_date: editingMember.join_date, shift: editingMember.shift,
      trainer_name: editingMember.trainer_name || null,
      trainer_start_date: editingMember.trainer_start_date || null,
      cardio_start_date: editingMember.cardio_start_date || null,
      admission_fee: Number(editingMember.admission_fee) || 0, monthly_fee: Number(editingMember.monthly_fee) || 0,
      cardio_fee: Number(editingMember.cardio_fee) || 0, trainer_fee: Number(editingMember.trainer_fee) || 0,
      paid_amount: Number(editingMember.paid_amount) || 0,
      cardio_months: editingMember.cardio_months === '' || editingMember.cardio_months === null ? null : Number(editingMember.cardio_months),
      trainer_months: editingMember.trainer_months === '' || editingMember.trainer_months === null ? null : Number(editingMember.trainer_months),
    };

    const { error } = await supabase.from('members').update(cleanData).eq('id', editingMember.id);
    if (error) alert("Error saving: " + error.message);
    else { setEditingMember(null); fetchMembers(); }
  };

  const handlePayment = async (member: any) => {
    const amountStr = prompt(`Enter payment amount for ${member.full_name}:`);
    if (!amountStr) return; 
    const paymentAmount = Number(amountStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return alert("Valid number required.");

    const newTotalPaid = (Number(member.paid_amount) || 0) + paymentAmount;
    const { error } = await supabase.from('members').update({ paid_amount: newTotalPaid }).eq('id', member.id);
    if (!error) fetchMembers();
  };

  const deleteMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (!error) fetchMembers();
    }
  };

  // ADVANCED SEARCH & FILTER LOGIC
  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return members;

    // 1. Special Keyword: "due"
    if (query === 'due') {
      return members.filter(m => calculateBalance(m).moneyLeft > 0);
    }
    
    // 2. Special Keyword: "trainer"
    if (query === 'trainer') {
      return members.filter(m => Number(m.trainer_fee) > 0 || m.trainer_name);
    }
    
    // 3. Special Keyword: "cardio"
    if (query === 'cardio') {
      return members.filter(m => Number(m.cardio_fee) > 0);
    }

    // 4. Special Command: "@4" for joining month
    if (query.startsWith('@')) {
      const targetMonth = parseInt(query.replace('@', ''), 10);
      if (!isNaN(targetMonth)) {
        return members.filter(m => {
          if (!m.join_date) return false;
          // Extract month from YYYY-MM-DD
          const parts = m.join_date.split('-');
          if (parts.length >= 2) {
            return parseInt(parts[1], 10) === targetMonth;
          }
          return false;
        });
      }
    }

    // 5. Default Text Search
    return members.filter(m => {
      const nameMatch = String(m.full_name || '').toLowerCase().includes(query);
      const shiftMatch = String(m.shift || '').toLowerCase().includes(query); 
      const trainerMatch = String(m.trainer_name || '').toLowerCase().includes(query);

      let serialMatch = false;
      if (m.serial_no && (String(m.serial_no).toLowerCase() === query || (!isNaN(Number(query)) && Number(m.serial_no) === Number(query)))) {
        serialMatch = true;
      }
      return nameMatch || shiftMatch || serialMatch || trainerMatch;
    });
  }, [members, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between pb-6">
        <div>
          <h1 className="text-4xl font-extrabold italic text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-yellow-600 uppercase">Al-Mehran</h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">Fitness & Bodybuilding Club</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg border border-zinc-800 transition-all">
          <LogOut size={18} /> Sign Out
        </button>
      </header>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Users size={24} /></div>
          <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Members</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Wallet size={24} /></div>
          <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Due</p><p className="text-2xl font-bold text-white">Rs. {stats.totalDue}</p></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><CheckCircle2 size={24} /></div>
          <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Cleared</p><p className="text-2xl font-bold text-white">{stats.clearCount}</p></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl"><AlertCircle size={24} /></div>
          <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-white">{stats.dueCount}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 border-t border-zinc-800 pt-8">
        
        {/* Registration Form */}
        <div className="xl:col-span-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 self-start z-10 xl:sticky xl:top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center text-yellow-500"><UserPlus className="mr-2" /> NEW ADMISSION</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Serial No." className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none font-mono" value={formData.serial_no} onChange={e => setFormData({...formData, serial_no: e.target.value})} />
            <input required placeholder="Full Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            <input placeholder="Father Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
            <input required placeholder="Phone Number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-yellow-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-3 pt-2">
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Calendar size={12}/> Join Date</label>
                 <input type="date" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500 scheme-dark" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Clock size={12}/> Shift</label>
                 <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500 text-white" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                   <option value="Morning">Morning</option><option value="Evening">Evening</option><option value="Both">Both</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 mt-2 bg-zinc-900/40 p-2 rounded-xl">
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Trainer Name (Optional)</label>
                 <input placeholder="e.g. Ali" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-blue-500" value={formData.trainer_name} onChange={e => setFormData({...formData, trainer_name: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Calendar size={12}/> Trainer Start Date</label>
                 <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-blue-500 scheme-dark" value={formData.trainer_start_date} onChange={e => setFormData({...formData, trainer_start_date: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Trainer Fee (/mo)</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-blue-500" value={formData.trainer_fee} onChange={e => setFormData({...formData, trainer_fee: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Cardio Fee (/mo)</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-red-500" value={formData.cardio_fee} onChange={e => setFormData({...formData, cardio_fee: e.target.value})} />
               </div>
               <div className="col-span-2">
                 <label className="text-xs text-zinc-500 ml-1 mb-1 flex items-center gap-1"><Calendar size={12}/> Cardio Start Date</label>
                 <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-red-500 scheme-dark" value={formData.cardio_start_date} onChange={e => setFormData({...formData, cardio_start_date: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 mt-2">
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Admission Fee</label>
                 <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500" value={formData.admission_fee} onChange={e => setFormData({...formData, admission_fee: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 ml-1 mb-1 block">Monthly Gym Fee</label>
                 <input type="number" placeholder="0" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500" value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} />
               </div>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Initial Payment Received</label>
              <input type="number" placeholder="Amount Paid Today" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg outline-none focus:border-green-500" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
            </div>
            
            <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 mt-4 rounded-lg transition-transform active:scale-95">SAVE MEMBER</button>
          </form>
        </div>

        <SearchBoard searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredMembers={filteredMembers} loading={loading} calculateBalance={calculateBalance} handlePayment={handlePayment} setEditingMember={setEditingMember} deleteMember={deleteMember} />
      </div>

      <MemberEditor editingMember={editingMember} setEditingMember={setEditingMember} handleUpdateMember={handleUpdateMember} />
    </div>
  );
}