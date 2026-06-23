'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; 
import { UserPlus, LogOut, Calendar, Clock, Users, ShieldAlert, BadgeCheck, Hourglass } from 'lucide-react';
import MemberEditor from './MemberEditor';
import SearchBoard from './SearchBoard';

export default function GymDashboard() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [feesList, setFeesList] = useState<any[]>([]); 
  const [freezesList, setFreezesList] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [statsMonth, setStatsMonth] = useState('All');
  const [editingMember, setEditingMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    serial_no: '', 
    full_name: '', 
    father_name: '', 
    phone: '',
    join_date: new Date().toISOString().split('T')[0],
    shift: 'Evening',
    admission_fee: '', 
    monthly_fee: '', 
    cardio_fee: '', 
    cardio_start_date: '',
    cardio_months: '', 
    trainer_fee: '', 
    trainer_name: '', 
    trainer_start_date: '',
    trainer_months: '', 
    paid_amount: '', 
    discount_amount: ''
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

    const { data: fetchedFreezes, error: freezeError } = await supabase
      .from('member_freezes')
      .select('*');
    
    if (!memError && fetchedMembers) {
      const uniqueMembersMap = new Map();
      fetchedMembers.forEach(member => {
        if (member.id) uniqueMembersMap.set(member.id, member);
      });
      setMembers(Array.from(uniqueMembersMap.values()));
    }
    if (!feesError) setFeesList(fetchedFees || []);
    if (!freezeError) setFreezesList(fetchedFreezes || []); 
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
    let unfrozenMembersCount = 0;
    let totalMembersInContext = 0;

    if (statsMonth === 'All') {
      totalCollected = feesList.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      totalNewJoins = members.length;
    } else {
      totalCollected = feesList.filter(f => f.fee_date?.startsWith(statsMonth)).reduce((sum, f) => sum + Number(f.amount || 0), 0);
      totalNewJoins = members.filter(m => m.join_date?.startsWith(statsMonth)).length;
    }

    members.forEach(member => {
      const today = new Date();
      let targetDateForBalance = today;
      if (statsMonth !== 'All') {
        const [year, month] = statsMonth.split('-').map(Number);
        targetDateForBalance = new Date(year, month, 0);
      }

      const joinDate = member.join_date ? new Date(member.join_date) : null;
      
      if (statsMonth !== 'All' && joinDate && joinDate > targetDateForBalance) {
        return;
      }

      totalMembersInContext++;

      // 1. COUNT UNFROZEN MEMBERS RIGHT NOW (Direct Array Verification)
      const hasOpenFreeze = freezesList.some(f => f.member_id === member.id && (!f.freeze_end || f.freeze_end === null || f.freeze_end === ''));
      if (!hasOpenFreeze) {
        unfrozenMembersCount++;
      }

      // 2. Active Billing Months Calculation Block
      let totalMonthsActiveContext = 1;
      if (joinDate) {
        const diffTime = Math.abs(targetDateForBalance.getTime() - joinDate.getTime());
        let totalBaseDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let totalDaysFrozen = 0;
        const userFreezes = freezesList.filter(f => f.member_id === member.id);

        userFreezes.forEach(freeze => {
          const start = new Date(freeze.freeze_start);
          const end = freeze.freeze_end ? new Date(freeze.freeze_end) : targetDateForBalance;

          if (start <= targetDateForBalance) {
            const activeEnd = end > targetDateForBalance ? targetDateForBalance : end;
            const freezeDiff = activeEnd.getTime() - start.getTime();
            if (freezeDiff > 0) {
              totalDaysFrozen += Math.ceil(freezeDiff / (1000 * 60 * 60 * 24));
            }
          }
        });

        const netDays = Math.max(0, totalBaseDays - totalDaysFrozen);
        totalMonthsActiveContext = Math.max(1, Math.floor(netDays / 30) + 1);
      }

      // 3. Consolidated Balance System Evaluation
      const admission = Number(member.admission_fee) || 0;
      const monthly = Number(member.monthly_fee) || 0;
      const cardio = Number(member.cardio_fee) || 0;
      const trainer = Number(member.trainer_fee) || 0;
      const discount = Number(member.discount_amount) || 0;

      const cardioMonthsToBill = member.cardio_months !== null ? Math.min(Number(member.cardio_months), totalMonthsActiveContext) : totalMonthsActiveContext;
      const trainerMonthsToBill = member.trainer_months !== null ? Math.min(Number(member.trainer_months), totalMonthsActiveContext) : totalMonthsActiveContext;
      
      const finalCostAtContext = (monthly * totalMonthsActiveContext) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission - discount;
      
      // Fix evaluation parsing boundary logic
      const paidUpToContext = feesList
        .filter(f => f.member_id === member.id && (statsMonth === 'All' || f.fee_date?.slice(0, 7) <= statsMonth))
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      const moneyLeftAtContext = finalCostAtContext - paidUpToContext;

      // Force absolute allocation placement tracking
      if (moneyLeftAtContext <= 0) {
        clearCount++;
      } else { 
        dueCount++; 
        totalDue += moneyLeftAtContext; 
      }
    });

    return { 
      totalNewJoins, 
      totalDue, 
      clearCount, 
      dueCount, 
      totalCollected, 
      totalMembersInDb: statsMonth === 'All' ? members.length : totalMembersInContext,
      contextActiveMembersCount: unfrozenMembersCount 
    };
  }, [members, feesList, freezesList, statsMonth]);

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
      discount_amount: Number(formData.discount_amount) || 0,
      cardio_months: formData.cardio_months === '' ? null : Number(formData.cardio_months),
      trainer_months: formData.trainer_months === '' ? null : Number(formData.trainer_months),
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
      admission_fee: '', monthly_fee: '', cardio_fee: '', cardio_start_date: '', cardio_months: '',
      trainer_fee: '', trainer_name: '', trainer_start_date: '', trainer_months: '', paid_amount: '', discount_amount: ''
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

      {/* Analytics Controllers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
        <h2 className="text-xl font-bold text-white mb-2 md:mb-0">Analytics Overview</h2>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">Filter Metrics By:</span>
          <select className="bg-zinc-900 border border-zinc-800 py-1.5 px-3 rounded-lg text-sm text-yellow-500 font-bold outline-none cursor-pointer" value={statsMonth} onChange={e => setStatsMonth(e.target.value)}>
            {uniqueMonths.map(m => <option key={m} value={m}>{m === 'All' ? 'All-Time' : m}</option>)}
          </select>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-zinc-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Members</p><p className="text-2xl font-bold mt-1">{stats.totalMembersInDb}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-indigo-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active (Unfrozen)</p><p className="text-2xl font-bold mt-1 text-indigo-400">{stats.contextActiveMembersCount}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-blue-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">New Joins</p><p className="text-2xl font-bold mt-1">{stats.totalNewJoins}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-green-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Revenue</p><p className="text-2xl font-bold mt-1 text-green-400">Rs. {stats.totalCollected}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-red-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending Dues</p><p className="text-2xl font-bold mt-1 text-red-500">Rs. {stats.totalDue}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cleared</p><p className="text-2xl font-bold mt-1 text-emerald-400">{stats.clearCount}</p></div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl border-l-4 border-l-yellow-500"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Defaulters</p><p className="text-2xl font-bold mt-1 text-yellow-500">{stats.dueCount}</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 border-t border-zinc-800 pt-8">
        {/* New Admission Form */}
        <div className="xl:col-span-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 self-start xl:sticky xl:top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center text-yellow-500"><UserPlus className="mr-2" /> NEW ADMISSION</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Serial No." className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white font-mono" value={formData.serial_no} onChange={e => setFormData({...formData, serial_no: e.target.value})} />
              <input required placeholder="Full Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Father Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
              <input required placeholder="Phone Number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">Join Date</label>
                 <input type="date" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark text-white" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">Shift</label>
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
            <div className="space-y-2 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
               <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Cardio Premium Package</label>
               <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="Cardio Fee" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg text-white" value={formData.cardio_fee} onChange={e => setFormData({...formData, cardio_fee: e.target.value})} />
                 <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg scheme-dark text-white" value={formData.cardio_start_date} onChange={e => setFormData({...formData, cardio_start_date: e.target.value})} />
               </div>
               <input type="number" placeholder="Cardio Limit Months" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs rounded-lg text-white" value={formData.cardio_months} onChange={e => setFormData({...formData, cardio_months: e.target.value})} />
            </div>
            <div className="space-y-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
               <label className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Personal Training</label>
               <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="Trainer Fee" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg text-white" value={formData.trainer_fee} onChange={e => setFormData({...formData, trainer_fee: e.target.value})} />
                 <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm rounded-lg scheme-dark text-white" value={formData.trainer_start_date} onChange={e => setFormData({...formData, trainer_start_date: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <input placeholder="Trainer Name" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs rounded-lg text-white" value={formData.trainer_name} onChange={e => setFormData({...formData, trainer_name: e.target.value})} />
                 <input type="number" placeholder="Limit Months" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs rounded-lg text-white" value={formData.trainer_months} onChange={e => setFormData({...formData, trainer_months: e.target.value})} />
               </div>
            </div>
            <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
              <input type="number" placeholder="Discount Amount (Rs.)" className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-sm rounded-lg text-white" value={formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: e.target.value})} />
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <input type="number" placeholder="Initial Payment Received" required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white font-mono font-bold" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg">SAVE NEW MEMBER</button>
          </form>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <SearchBoard 
            members={members} setMembers={setMembers}
            feesList={feesList} setFeesList={setFeesList}
            freezesList={freezesList} setFreezesList={setFreezesList} 
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            setEditingMember={setEditingMember} refreshTrigger={fetchData}
          />
        </div>
      </div>

      {editingMember && (
        <MemberEditor 
          editingMember={editingMember} setEditingMember={setEditingMember} 
          feesList={feesList} setFeesList={setFeesList} onUpdateComplete={fetchData} 
        />
      )}
    </div>
  );
}