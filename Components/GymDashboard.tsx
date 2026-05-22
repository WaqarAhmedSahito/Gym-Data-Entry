'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { UserPlus, LogOut, Loader2, Calendar, Clock } from 'lucide-react';
import MemberEditor from './MemberEditor';
import SearchBoard from './SearchBoard';

export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [feesList, setFeesList] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [statsMonth, setStatsMonth] = useState('All');
  const [editingMember, setEditingMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    serial_no: '', full_name: '', father_name: '', phone: '',
    join_date: new Date().toISOString().split('T')[0],
    shift: 'Both',
    admission_fee: '', monthly_fee: '', 
    cardio_fee: '', cardio_start_date: '',
    trainer_fee: '', trainer_name: '', trainer_start_date: '',
    paid_amount: '', discount_amount: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: fetchedMembers, error: memError } = await supabase
      .from('members')
      .select('*')
      .order('join_date', { ascending: false });

    const { data: fetchedFees, error: feesError } = await supabase
      .from('member_fees')
      .select('*')
      .order('fee_date', { ascending: false });
    
    if (!memError) setMembers(fetchedMembers || []);
    if (!feesError) setFeesList(fetchedFees || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const uniqueMonths = useMemo(() => {
    const memberJoinMonths = members.map(m => m.join_date?.slice(0, 7)).filter(Boolean);
    const transactionMonths = feesList.map(f => f.fee_date?.slice(0, 7)).filter(Boolean);
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    return ['All', ...Array.from(new Set([currentYearMonth, ...memberJoinMonths, ...transactionMonths])).sort((a, b) => b.localeCompare(a))];
  }, [members, feesList]);

  const stats = useMemo(() => {
    let totalDue = 0, clearCount = 0, dueCount = 0, totalCollected = 0, totalNewJoins = 0;

    if (statsMonth === 'All') {
      totalCollected = feesList.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      totalNewJoins = members.length;
    } else {
      totalCollected = feesList.filter(f => f.fee_date?.startsWith(statsMonth)).reduce((sum, f) => sum + Number(f.amount || 0), 0);
      totalNewJoins = members.filter(m => m.join_date?.startsWith(statsMonth)).length;
    }

    members.forEach(member => {
      const joinDate = new Date(member.join_date);
      let targetDate = new Date();
      if (statsMonth !== 'All') {
        const [year, month] = statsMonth.split('-').map(Number);
        targetDate = new Date(year, month, 0); 
      }
      if (joinDate > targetDate) return;

      let monthsDiff = (targetDate.getFullYear() - joinDate.getFullYear()) * 12 + (targetDate.getMonth() - joinDate.getMonth());
      const totalMonthsActiveContext = Math.max(1, monthsDiff + 1);

      const admission = Number(member.admission_fee) || 0;
      const monthly = Number(member.monthly_fee) || 0;
      const cardio = Number(member.cardio_fee) || 0;
      const trainer = Number(member.trainer_fee) || 0;
      const discount = Number(member.discount_amount) || 0;

      const cardioMonthsToBill = member.cardio_months !== null ? Math.min(Number(member.cardio_months), totalMonthsActiveContext) : totalMonthsActiveContext;
      const trainerMonthsToBill = member.trainer_months !== null ? Math.min(Number(member.trainer_months), totalMonthsActiveContext) : totalMonthsActiveContext;
      
      const finalCostAtContext = (monthly * totalMonthsActiveContext) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission - discount;
      const paidUpToContext = feesList
        .filter(f => f.member_id === member.id && (statsMonth === 'All' || f.fee_date <= statsMonth + '-31'))
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      const moneyLeftAtContext = finalCostAtContext - paidUpToContext;
      if (moneyLeftAtContext <= 0) clearCount++;
      else { dueCount++; totalDue += moneyLeftAtContext; }
    });

    return { totalNewJoins, totalDue, clearCount, dueCount, totalCollected };
  }, [members, feesList, statsMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = {
      serial_no: formData.serial_no,
      full_name: formData.full_name,
      father_name: formData.father_name || "",
      phone: formData.phone,
      join_date: formData.join_date,
      shift: formData.shift,
      admission_fee: Number(formData.admission_fee) || 0,
      monthly_fee: Number(formData.monthly_fee) || 0,
      cardio_fee: Number(formData.cardio_fee) || 0,
      cardio_start_date: formData.cardio_start_date || null,
      trainer_fee: Number(formData.trainer_fee) || 0,
      trainer_name: formData.trainer_name || "",
      trainer_start_date: formData.trainer_start_date || null,
      paid_amount: Number(formData.paid_amount) || 0,
      discount_amount: Number(formData.discount_amount) || 0 
    };

    const { data: newMember, error } = await supabase.from('members').insert([cleanData]).select().single();
    if (error) return alert("Failed to save member: " + error.message);

    if (Number(formData.paid_amount) > 0 && newMember) {
      await supabase.from('member_fees').insert([{
        member_id: newMember.id,
        serial_no: newMember.serial_no,
        fee_date: formData.join_date,
        amount: Number(formData.paid_amount)
      }]);
    }

    fetchData(); 
    setFormData({
      serial_no: '', full_name: '', father_name: '', phone: '',
      join_date: new Date().toISOString().split('T')[0], shift: 'Evening',
      admission_fee: '', monthly_fee: '', cardio_fee: '', cardio_start_date: '',
      trainer_fee: '', trainer_name: '', trainer_start_date: '', paid_amount: '', discount_amount: ''
    });
  };

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

      {/* Analytics Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
        <h2 className="text-xl font-bold text-white mb-2 md:mb-0">Analytics Overview</h2>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">Filter Metrics By:</span>
          <select className="bg-zinc-900 border border-zinc-800 py-1.5 px-3 rounded-lg text-sm text-yellow-500 font-bold outline-none" value={statsMonth} onChange={e => setStatsMonth(e.target.value)}>
            {uniqueMonths.map(m => <option key={m} value={m}>{m === 'All' ? 'All-Time' : m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-blue-500"><p className="text-[10px] font-bold uppercase text-zinc-500">New Joins</p><p className="text-2xl font-bold mt-1">{stats.totalNewJoins}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-green-500"><p className="text-[10px] font-bold uppercase text-zinc-500">Revenue</p><p className="text-2xl font-bold mt-1">Rs. {stats.totalCollected}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-red-500"><p className="text-[10px] font-bold uppercase text-zinc-500">Unpaid Dues</p><p className="text-2xl font-bold mt-1">Rs. {stats.totalDue}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold uppercase text-zinc-500">Cleared</p><p className="text-2xl font-bold mt-1">{stats.clearCount}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl border-l-4 border-l-yellow-500"><p className="text-[10px] font-bold uppercase text-zinc-500">Pending</p><p className="text-2xl font-bold mt-1">{stats.dueCount}</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 border-t border-zinc-800 pt-8">
        {/* Admission Form */}
        <div className="xl:col-span-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 self-start xl:sticky xl:top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center text-yellow-500"><UserPlus className="mr-2" /> NEW ADMISSION</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Serial No." className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white font-mono" value={formData.serial_no} onChange={e => setFormData({...formData, serial_no: e.target.value})} />
            <input required placeholder="Full Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            <input placeholder="Father Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
            <input required placeholder="Phone Number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1"><Calendar size={12}/> Join Date</label>
                 <input type="date" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark text-white" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1"><Clock size={12}/> Shift</label>
                 <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                   <option value="Morning">Morning</option>
                   <option value="Evening">Evening</option>
                   <option value="Both">Both</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
               <input type="number" placeholder="Admission Fee" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.admission_fee} onChange={e => setFormData({...formData, admission_fee: e.target.value})} />
               <input type="number" placeholder="Monthly Gym Fee" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-2 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
               <input type="number" placeholder="Cardio Fee" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg text-white" value={formData.cardio_fee} onChange={e => setFormData({...formData, cardio_fee: e.target.value})} />
               <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg scheme-dark text-white" value={formData.cardio_start_date} onChange={e => setFormData({...formData, cardio_start_date: e.target.value})} />
            </div>

            <div className="space-y-2 p-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
               <div className="grid grid-cols-2 gap-3">
                 <input type="number" placeholder="Trainer Fee" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg text-white" value={formData.trainer_fee} onChange={e => setFormData({...formData, trainer_fee: e.target.value})} />
                 <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg scheme-dark text-white" value={formData.trainer_start_date} onChange={e => setFormData({...formData, trainer_start_date: e.target.value})} />
               </div>
               <input placeholder="Trainer Name" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg text-white" value={formData.trainer_name} onChange={e => setFormData({...formData, trainer_name: e.target.value})} />
            </div>

            <input type="number" placeholder="Initial Payment Received" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
            <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg">SAVE MEMBER</button>
          </form>
        </div>

        {/* SearchBoard and Member Management Hub */}
        <div className="xl:col-span-8 space-y-4">
          <SearchBoard 
            members={members} 
            setMembers={setMembers}
            feesList={feesList} 
            setFeesList={setFeesList}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingMember={setEditingMember}
            refreshTrigger={fetchData}
          />
        </div>
      </div>

      {/* Profile Modification Portal */}
      {editingMember && (
        <MemberEditor 
          editingMember={editingMember} 
          setEditingMember={setEditingMember} 
          feesList={feesList} 
          setFeesList={setFeesList}
          onUpdateComplete={fetchData} 
        />
      )}
    </div>
  );
}