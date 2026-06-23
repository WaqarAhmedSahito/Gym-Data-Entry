'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, CheckCircle2, AlertCircle, Settings, History, SlidersHorizontal, ArrowUpDown, X, Snowflake, Flame } from 'lucide-react';

interface SearchBoardProps {
  members: any[];
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;  
  feesList: any[];
  setFeesList: React.Dispatch<React.SetStateAction<any[]>>; 
  freezesList: any[];
  setFreezesList: React.Dispatch<React.SetStateAction<any[]>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingMember: (member: any) => void;
  refreshTrigger: () => void;
}

export default function SearchBoard({ 
  members, setMembers, feesList, setFeesList, freezesList, setFreezesList,
  searchQuery, setSearchQuery, setEditingMember, refreshTrigger 
}: SearchBoardProps) {
  const [activeHistoryUserId, setActiveHistoryUserId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [shiftFilter, setShiftFilter] = useState('all');   
  const [addonFilter, setAddonFilter] = useState('all');   
  const [monthFilter, setMonthFilter] = useState('all');   
  const [sortOption, setSortOption] = useState('newest');

  // Improved Balance & Freeze Evaluation
  const calculateBalance = (member: any) => {
    const today = new Date();
    const joinDate = new Date(member.join_date);
    
    if (!member.join_date) {
      return { totalMonthsActive: 1, moneyLeft: 0, activeRecurring: 0, totalDaysFrozen: 0, isCurrentlyFrozen: false };
    }

    const baseTimeDiff = Math.abs(today.getTime() - joinDate.getTime());
    let totalBaseDays = Math.ceil(baseTimeDiff / (1000 * 60 * 60 * 24));

    let totalDaysFrozen = 0;
    let isCurrentlyFrozen = false;
    
    // Filter out freezes for this specific member
    const userFreezes = freezesList.filter(f => f.member_id === member.id);

    userFreezes.forEach(freeze => {
      const start = new Date(freeze.freeze_start);
      
      // If freeze_end doesn't exist, it means they are actively frozen right now
      if (!freeze.freeze_end) {
        isCurrentlyFrozen = true;
      }

      const end = freeze.freeze_end ? new Date(freeze.freeze_end) : today;
      const freezeDiff = end.getTime() - start.getTime();
      
      if (freezeDiff > 0) {
        totalDaysFrozen += Math.ceil(freezeDiff / (1000 * 60 * 60 * 24));
      }
    });

    const netBillableDays = Math.max(0, totalBaseDays - totalDaysFrozen);
    const totalMonthsActive = Math.max(1, Math.floor(netBillableDays / 30) + 1);

    const admission = Number(member.admission_fee) || 0;
    const monthly = Number(member.monthly_fee) || 0;
    const cardio = Number(member.cardio_fee) || 0;
    const trainer = Number(member.trainer_fee) || 0;
    const discount = Number(member.discount_amount) || 0;

    const cardioMonthsToBill = member.cardio_months !== null ? Math.min(Number(member.cardio_months), totalMonthsActive) : totalMonthsActive;
    const trainerMonthsToBill = member.trainer_months !== null ? Math.min(Number(member.trainer_months), totalMonthsActive) : totalMonthsActive;
    
    const finalTotalCost = (monthly * totalMonthsActive) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission - discount;
    const totalPaidFromLedger = feesList.filter(f => f.member_id === member.id).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    
    let activeRecurring = monthly;
    if (cardioMonthsToBill >= totalMonthsActive) activeRecurring += cardio;
    if (trainerMonthsToBill >= totalMonthsActive) activeRecurring += trainer;

    return { 
      totalMonthsActive, 
      moneyLeft: finalTotalCost - totalPaidFromLedger, 
      activeRecurring,
      totalDaysFrozen,
      isCurrentlyFrozen
    };
  };

  const handleToggleFreeze = async (member: any, isCurrentlyFrozen: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isCurrentlyFrozen) {
      // Find the active open freeze row
      const openFreeze = freezesList.find(f => f.member_id === member.id && (!f.freeze_end || f.freeze_end === null));
      if (openFreeze) {
        const { error } = await supabase
          .from('member_freezes')
          .update({ freeze_end: todayStr })
          .eq('id', openFreeze.id);
          
        if (!error) {
          // Update client-side state mapping right away
          setFreezesList(prev => prev.map(f => f.id === openFreeze.id ? { ...f, freeze_end: todayStr } : f));
          refreshTrigger();
        } else {
          alert("Error unfreezing: " + error.message);
        }
      }
    } else {
      if (confirm(`Freeze billing dues for ${member.full_name}?`)) {
        const { data: newFreezeRow, error } = await supabase
          .from('member_freezes')
          .insert([{ member_id: member.id, freeze_start: todayStr }])
          .select()
          .single();
          
        if (!error && newFreezeRow) {
          setFreezesList(prev => [newFreezeRow, ...prev]);
          refreshTrigger();
        } else if (error) {
          alert("Error freezing: " + error.message);
        }
      }
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all'); setShiftFilter('all'); setAddonFilter('all'); setMonthFilter('all'); setSearchQuery(''); setSortOption('newest');
  };

  const filteredAndSortedMembers = useMemo(() => {
    let result = members;

    result = result.filter(m => {
      const { moneyLeft, isCurrentlyFrozen } = calculateBalance(m);
      
      if (statusFilter === 'due' && moneyLeft <= 0) return false;
      if (statusFilter === 'clear' && moneyLeft > 0) return false;
      if (statusFilter === 'frozen' && !isCurrentlyFrozen) return false;

      if (shiftFilter !== 'all' && String(m.shift || '').toLowerCase() !== shiftFilter.toLowerCase()) return false;
      if (addonFilter === 'cardio' && (Number(m.cardio_fee) || 0) <= 0) return false;
      if (addonFilter === 'trainer' && (Number(m.trainer_fee) || 0) <= 0) return false;

      if (monthFilter !== 'all') {
        const joinParts = m.join_date ? m.join_date.split('-') : []; 
        if (joinParts.length === 3 && joinParts[1] !== monthFilter) return false;
      }
      return true;
    });

    const cleanQuery = searchQuery.toLowerCase().trim();
    if (cleanQuery) {
      const searchTerms = cleanQuery.split(',').map(t => t.trim()).filter(Boolean);
      result = result.filter(m => {
        const { moneyLeft } = calculateBalance(m);
        return searchTerms.every(term => {
          if (term === 'due') return moneyLeft > 0;
          if (term === 'clear') return moneyLeft <= 0;
          return String(m.full_name || '').toLowerCase().includes(term) || 
                 String(m.phone || '').includes(term) ||
                 String(m.serial_no || '') === term;
        });
      });
    }

    return [...result].sort((a, b) => {
      const balA = calculateBalance(a).moneyLeft; const balB = calculateBalance(b).moneyLeft;
      switch (sortOption) {
        case 'oldest': return (Number(a.serial_no) || 0) - (Number(b.serial_no) || 0);
        case 'alpha': return String(a.full_name).localeCompare(String(b.full_name));
        case 'due_high': return balB - balA;
        case 'due_low': return balA - balB;
        default: return (Number(b.serial_no) || 0) - (Number(a.serial_no) || 0);
      }
    });
  }, [members, feesList, freezesList, searchQuery, statusFilter, shiftFilter, addonFilter, monthFilter, sortOption]);

  const deleteMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (!error) refreshTrigger();
    }
  };

  return (
    <div className="space-y-4 w-full text-white">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input placeholder="Search by name, phone or card..." className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-4 rounded-xl border font-semibold transition-all ${showFilters ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>
            <SlidersHorizontal size={18} /><span>Filters</span>
          </button>
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-zinc-400">
            <ArrowUpDown size={16} className="text-zinc-500 absolute pointer-events-none" />
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="bg-transparent pl-7 pr-3 py-4 text-sm font-medium text-zinc-300 outline-none cursor-pointer rounded-xl">
              <option value="newest" className="bg-zinc-900">Newest First</option>
              <option value="oldest" className="bg-zinc-900">Oldest First</option>
              <option value="alpha" className="bg-zinc-900">Alphabetical (A-Z)</option>
              <option value="due_high" className="bg-zinc-900">Due: High to Low</option>
              <option value="due_low" className="bg-zinc-900">Due: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full">
              <option value="all">All Members</option>
              <option value="due">Due Balance</option>
              <option value="clear">Clear</option>
              <option value="frozen">Frozen Accounts</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Shift</label>
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"><option value="all">All Shifts</option><option value="morning">Morning</option><option value="evening">Evening</option></select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Add-Ons</label>
            <select value={addonFilter} onChange={(e) => setAddonFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"><option value="all">Any Package</option><option value="cardio">Cardio Pack</option><option value="trainer">Trainer</option></select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase">Join Month</label>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"><option value="all">All Months</option><option value="01">January</option><option value="02">February</option><option value="03">March</option><option value="04">April</option><option value="05">May</option><option value="06">June</option><option value="07">July</option><option value="08">August</option><option value="09">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select>
          </div>
          <button onClick={handleResetFilters} className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 text-sm text-zinc-400 p-2.5 rounded-lg w-full"><X size={14} />Reset</button>
        </div>
      )}

      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        {filteredAndSortedMembers.map(member => {
          const { totalMonthsActive, moneyLeft, activeRecurring, totalDaysFrozen, isCurrentlyFrozen } = calculateBalance(member);
          const userPastPayments = feesList.filter(f => f.member_id === member.id);

          return (
            <div key={member.id} className={`group flex flex-col p-4 mb-3 rounded-xl border transition-all ${isCurrentlyFrozen ? 'bg-blue-950/20 border-blue-900/60' : 'bg-zinc-900 border-zinc-800 hover:border-yellow-500/40'}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="text-zinc-600 font-mono text-sm">#{member.serial_no || 'N/A'}</span>
                    {member.full_name}
                    {isCurrentlyFrozen && (
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold flex items-center gap-1">
                        <Snowflake size={12} /> FROZEN
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-zinc-400 text-sm">{member.phone}</span>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="bg-zinc-800 text-yellow-500 px-2 py-0.5 rounded text-xs font-semibold uppercase">{member.shift || 'Evening'}</span>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="text-zinc-400 text-xs">Rs. {activeRecurring}/mo</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-2">
                    Joined: {member.join_date} 
                    <span className="text-zinc-600 mx-1">•</span> Billed Active Time: {totalMonthsActive}m
                    {totalDaysFrozen > 0 && (
                      <>
                        <span className="text-zinc-600 mx-1">•</span> 
                        <span className="text-blue-400">Total Unbilled Time: {totalDaysFrozen} days</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0">
                  <div className="mr-2">
                    {moneyLeft <= 0 ? (
                      <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 text-sm font-bold"><CheckCircle2 size={16} />Clear</div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-sm font-bold"><AlertCircle size={16} />Rs. {moneyLeft} Due</div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleToggleFreeze(member, isCurrentlyFrozen)}
                    className={`p-2 rounded-lg border transition-all ${
                      isCurrentlyFrozen 
                        ? 'text-green-400 bg-green-500/5 border-green-500/20 hover:bg-green-500/20' 
                        : 'text-blue-400 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                    title={isCurrentlyFrozen ? "Resume Billing (Unfreeze)" : "Freeze Billing (Mark Absent)"}
                  >
                    {isCurrentlyFrozen ? <Flame size={18} /> : <Snowflake size={18} />}
                  </button>

                  <button onClick={() => setActiveHistoryUserId(activeHistoryUserId === member.id ? null : member.id)} className="text-zinc-600 hover:text-yellow-500 p-2"><History size={18} /></button>
                  <button onClick={() => setEditingMember(member)} className="text-zinc-600 hover:text-blue-500 p-2"><Settings size={18} /></button>
                  <button onClick={() => deleteMember(member.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                </div>
              </div>

              {activeHistoryUserId === member.id && (
                <div className="mt-4 pt-4 border-t border-zinc-800 bg-black/40 p-3 rounded-lg">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Itemized Payments Ledger</p>
                  {userPastPayments.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">No historical cash transactions detected.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {userPastPayments.map((fee, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-zinc-950 p-2 rounded border border-zinc-900">
                          <span className="text-zinc-400 font-mono">📅 Date: {fee.fee_date}</span>
                          <span className="text-green-400 font-bold">Processed: Rs. {fee.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}