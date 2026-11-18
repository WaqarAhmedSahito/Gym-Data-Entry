'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, CheckCircle2, AlertCircle, Settings, History, SlidersHorizontal, ArrowUpDown, X, Snowflake, Flame, UserX, UserCheck } from 'lucide-react';

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

function SearchBoard({ 
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
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // New specific day filter (1 to 31)
  const [joinDayFilter, setJoinDayFilter] = useState(''); 

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { feesByMember, freezesByMember } = useMemo(() => {
    const feesMap = new Map<string, any[]>();
    const freezesMap = new Map<string, any[]>();

    for (const fee of feesList) {
      if (!feesMap.has(fee.member_id)) feesMap.set(fee.member_id, []);
      feesMap.get(fee.member_id)!.push(fee);
    }

    for (const freeze of freezesList) {
      if (!freezesMap.has(freeze.member_id)) freezesMap.set(freeze.member_id, []);
      freezesMap.get(freeze.member_id)!.push(freeze);
    }

    return { feesByMember: feesMap, freezesByMember: freezesMap };
  }, [feesList, freezesList]);

  const balancesMap = useMemo(() => {
    const map = new Map<string, any>();
    const today = new Date();
    const todayTime = today.getTime();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    for (const member of members) {
      if (!member.join_date) {
        map.set(member.id, { totalMonthsActive: 1, moneyLeft: 0, activeRecurring: 0, totalDaysFrozen: 0, isCurrentlyFrozen: false });
        continue;
      }

      const userFreezes = freezesByMember.get(member.id) || [];
      let totalDaysFrozen = 0;
      let isCurrentlyFrozen = false;

      for (const freeze of userFreezes) {
        const start = new Date(freeze.freeze_start).getTime();
        if (!freeze.freeze_end) {
          isCurrentlyFrozen = true;
        }
        const end = freeze.freeze_end ? new Date(freeze.freeze_end).getTime() : todayTime;
        const freezeDiff = end - start;
        if (freezeDiff > 0) {
          totalDaysFrozen += Math.ceil(freezeDiff / 86400000);
        }
      }

      const [jYear, jMonth, jDay] = member.join_date.split('-').map(Number);
      let totalMonthsActive = (todayYear - jYear) * 12 + (todayMonth - (jMonth - 1));

      if (todayDate < jDay) {
        totalMonthsActive--;
      }

      const frozenMonths = Math.floor(totalDaysFrozen / 30);
      totalMonthsActive = Math.max(1, totalMonthsActive - frozenMonths + 1);

      const admission = Number(member.admission_fee) || 0;
      const monthly = Number(member.monthly_fee) || 0;
      const cardio = Number(member.cardio_fee) || 0;
      const trainer = Number(member.trainer_fee) || 0;
      const discount = Number(member.discount_amount) || 0;

      const cardioMonthsToBill = member.cardio_months !== null ? Math.min(Number(member.cardio_months), totalMonthsActive) : totalMonthsActive;
      const trainerMonthsToBill = member.trainer_months !== null ? Math.min(Number(member.trainer_months), totalMonthsActive) : totalMonthsActive;

      const finalTotalCost = (monthly * totalMonthsActive) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission - discount;
      
      const userPastPayments = feesByMember.get(member.id) || [];
      let totalPaidFromLedger = 0;
      for (const f of userPastPayments) {
        totalPaidFromLedger += Number(f.amount) || 0;
      }

      let activeRecurring = monthly;
      if (cardioMonthsToBill >= totalMonthsActive) activeRecurring += cardio;
      if (trainerMonthsToBill >= totalMonthsActive) activeRecurring += trainer;

      map.set(member.id, {
        totalMonthsActive,
        moneyLeft: finalTotalCost - totalPaidFromLedger,
        activeRecurring,
        totalDaysFrozen,
        isCurrentlyFrozen
      });
    }

    return map;
  }, [members, feesByMember, freezesByMember]);

  const handleToggleFreeze = async (member: any, isCurrentlyFrozen: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isCurrentlyFrozen) {
      const openFreeze = freezesList.find(f => f.member_id === member.id && (!f.freeze_end || f.freeze_end === null));
      if (openFreeze) {
        const { error } = await supabase
          .from('member_freezes')
          .update({ freeze_end: todayStr })
          .eq('id', openFreeze.id);
          
        if (!error) {
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

  const handleToggleInactive = async (member: any) => {
    const newStatus = !member.is_inactive;
    const confirmMsg = newStatus 
      ? `Mark ${member.full_name} as INACTIVE? (They left without informing)`
      : `Reactivate ${member.full_name}?`;

    if (confirm(confirmMsg)) {
      const { error } = await supabase
        .from('members')
        .update({ is_inactive: newStatus })
        .eq('id', member.id);

      if (!error) {
        setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_inactive: newStatus } : m));
        refreshTrigger();
      } else {
        alert("Error updating status: " + error.message);
      }
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all'); 
    setShiftFilter('all'); 
    setAddonFilter('all'); 
    setMonthFilter('all'); 
    setSearchQuery(''); 
    setSortOption('newest');
    setStartDate('');
    setEndDate('');
    setJoinDayFilter('');
  };

  const filteredAndSortedMembers = useMemo(() => {
    let result = members;

    result = result.filter(m => {
      const balance = balancesMap.get(m.id) || {};
      const moneyLeft = balance.moneyLeft || 0;
      const isCurrentlyFrozen = balance.isCurrentlyFrozen || false;
      
      if (statusFilter === 'due' && moneyLeft <= 0) return false;
      if (statusFilter === 'clear' && moneyLeft > 0) return false;
      if (statusFilter === 'frozen' && !isCurrentlyFrozen) return false;
      if (statusFilter === 'inactive' && !m.is_inactive) return false;
      if (statusFilter === 'active_only' && (m.is_inactive || isCurrentlyFrozen)) return false;

      if (shiftFilter !== 'all' && String(m.shift || '').toLowerCase() !== shiftFilter.toLowerCase()) return false;
      if (addonFilter === 'cardio' && (Number(m.cardio_fee) || 0) <= 0) return false;
      if (addonFilter === 'trainer' && (Number(m.trainer_fee) || 0) <= 0) return false;

      if (monthFilter !== 'all') {
        const joinParts = m.join_date ? m.join_date.split('-') : []; 
        if (joinParts.length === 3 && joinParts[1] !== monthFilter) return false;
      }

      if (startDate && (!m.join_date || m.join_date < startDate)) return false;
      if (endDate && (!m.join_date || m.join_date > endDate)) return false;

      // specific day of the month check
      if (joinDayFilter) {
        const joinParts = m.join_date ? m.join_date.split('-') : [];
        if (joinParts.length === 3) {
          const mDay = Number(joinParts[2]);
          const filterDay = Number(joinDayFilter);
          if (mDay !== filterDay) return false;
        } else {
          return false;
        }
      }

      return true;
    });

    const cleanQuery = deferredSearchQuery.trim();
    if (cleanQuery) {
      const searchTerms = cleanQuery.split(',').map(t => t.trim()).filter(Boolean);
      result = result.filter(m => {
        const { moneyLeft } = balancesMap.get(m.id) || { moneyLeft: 0 };
        return searchTerms.every(term => {
          if (term === 'due') return moneyLeft > 0;
          if (term === 'clear') return moneyLeft <= 0;

          if (term.startsWith('@')) {
            const dateQuery = term.slice(1).trim();
            if (!dateQuery) return true;
            const [qDay, qMonth] = dateQuery.split('/');
            if (!qDay || !qMonth) return false;
            const joinDateStr = m.join_date;
            if (!joinDateStr) return false;
            const [jYear, jMonth, jDay] = joinDateStr.split('-');
            if (!jYear || !jMonth || !jDay) return false;

            return String(Number(jDay)) === String(Number(qDay)) && String(Number(jMonth)) === String(Number(qMonth));
          }

          if (/^\d+$/.test(term)) {
            return String(m.serial_no || '').trim() === term;
          }

          if (term.startsWith('!')) {
            const numTerm = term.slice(1).toLowerCase();
            if (!numTerm) return true;
            return String(m.phone || '').toLowerCase().includes(numTerm) ||
                   String(m.serial_no || '').toLowerCase() === numTerm;
          }

          return String(m.full_name || '').toLowerCase().includes(term.toLowerCase());
        });
      });
    }

    return [...result].sort((a, b) => {
      const balA = (balancesMap.get(a.id)?.moneyLeft) || 0;
      const balB = (balancesMap.get(b.id)?.moneyLeft) || 0;
      switch (sortOption) {
        case 'oldest': return (Number(a.serial_no) || 0) - (Number(b.serial_no) || 0);
        case 'alpha': return String(a.full_name).localeCompare(String(b.full_name));
        case 'due_high': return balB - balA;
        case 'due_low': return balA - balB;
        default: return (Number(b.serial_no) || 0) - (Number(a.serial_no) || 0);
      }
    });
  }, [members, balancesMap, deferredSearchQuery, statusFilter, shiftFilter, addonFilter, monthFilter, sortOption, startDate, endDate, joinDayFilter]);

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
          <label htmlFor="member-search-input" className="sr-only">
            Search members by name, phone, or card number
          </label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input 
            id="member-search-input"
            placeholder="Search by name, phone or card..." 
            aria-label="Search members by name, phone, or card number"
            className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none text-white placeholder:text-zinc-500" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            aria-label="Toggle Filter Options"
            aria-expanded={showFilters}
            className={`flex items-center gap-2 px-5 py-4 rounded-xl border font-semibold transition-all ${showFilters ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}
          >
            <SlidersHorizontal size={18} /><span>Filters</span>
          </button>
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-zinc-300">
            <label htmlFor="member-sort-select" className="sr-only">
              Sort member list
            </label>
            <ArrowUpDown size={16} className="text-zinc-400 absolute pointer-events-none" />
            <select 
              id="member-sort-select"
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)} 
              aria-label="Sort member list"
              className="bg-transparent pl-7 pr-3 py-4 text-sm font-medium text-zinc-300 outline-none cursor-pointer rounded-xl"
            >
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
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status-filter" className="text-[11px] font-bold text-zinc-400 uppercase">Status</label>
            <select 
              id="status-filter"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"
            >
              <option value="all">All Members</option>
              <option value="active_only">Active Only</option>
              <option value="due">Due Balance</option>
              <option value="clear">Clear</option>
              <option value="frozen">Frozen Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="shift-filter" className="text-[11px] font-bold text-zinc-400 uppercase">Shift</label>
            <select 
              id="shift-filter"
              value={shiftFilter} 
              onChange={(e) => setShiftFilter(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="addon-filter" className="text-[11px] font-bold text-zinc-400 uppercase">Add-Ons</label>
            <select 
              id="addon-filter"
              value={addonFilter} 
              onChange={(e) => setAddonFilter(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"
            >
              <option value="all">Any Package</option>
              <option value="cardio">Cardio Pack</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="month-filter" className="text-[11px] font-bold text-zinc-400 uppercase">Join Month</label>
            <select 
              id="month-filter"
              value={monthFilter} 
              onChange={(e) => setMonthFilter(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-sm text-zinc-300 outline-none w-full"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="join-day-filter" className="text-[11px] font-bold text-zinc-400 uppercase">Day of Month</label>
            <input 
              type="number" 
              id="join-day-filter"
              min="1"
              max="31"
              placeholder="1-31"
              value={joinDayFilter}
              onChange={(e) => setJoinDayFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-sm text-zinc-300 outline-none w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="start-date" className="text-[11px] font-bold text-zinc-400 uppercase">Join Date (From)</label>
            <input 
              type="date" 
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-sm text-zinc-300 outline-none w-full [color-scheme:dark]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="end-date" className="text-[11px] font-bold text-zinc-400 uppercase">Join Date (To)</label>
            <input 
              type="date" 
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-sm text-zinc-300 outline-none w-full [color-scheme:dark]"
            />
          </div>

          <button 
            onClick={handleResetFilters} 
            aria-label="Reset active filters"
            className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 p-2.5 rounded-lg w-full hover:bg-zinc-900 transition-colors h-[38px]"
          >
            <X size={14} />Reset
          </button>
        </div>
      )}

      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        {filteredAndSortedMembers.map(member => {
          const { totalMonthsActive, moneyLeft, activeRecurring, totalDaysFrozen, isCurrentlyFrozen } = balancesMap.get(member.id) || {};
          const userPastPayments = feesByMember.get(member.id) || [];

          return (
            <div key={member.id} className={`group flex flex-col p-4 mb-3 rounded-xl border transition-all ${
              member.is_inactive 
                ? 'bg-zinc-950/40 border-zinc-800/80 opacity-60' 
                : isCurrentlyFrozen 
                  ? 'bg-blue-950/20 border-blue-900/60' 
                  : 'bg-zinc-900 border-zinc-800 hover:border-yellow-500/40'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                
                {/* Updated User Info Area with Image */}
                <div className="flex items-center gap-4">
                  {/* Image Avatar */}
                  <div className="h-16 w-16 md:h-14 md:w-14 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-950 flex-shrink-0 flex items-center justify-center">
                    {member.card_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.card_image_url} alt={member.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-zinc-600 font-bold text-xl">{member.full_name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  {/* Name and Tags */}
                  <div>
                    <h3 className="font-bold text-lg text-white flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-400 font-mono text-sm">#{member.serial_no || 'N/A'}</span>
                      {member.full_name}
                      {member.is_inactive ? (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-bold flex items-center gap-1 mt-1 md:mt-0">
                          <UserX size={12} /> INACTIVE
                        </span>
                      ) : isCurrentlyFrozen && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold flex items-center gap-1 mt-1 md:mt-0">
                          <Snowflake size={12} /> FROZEN
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-zinc-300 text-sm">{member.phone}</span>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="bg-zinc-800 text-yellow-400 px-2 py-0.5 rounded text-xs font-semibold uppercase">{member.shift || 'Evening'}</span>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-300 text-xs">Rs. {activeRecurring}/mo</span>
                    </div>
                    <p className="text-zinc-400 text-xs mt-1.5">
                      Joined: {member.join_date} 
                      <span className="text-zinc-500 mx-1">•</span> Billed Active Time: {totalMonthsActive}m
                    </p>
                  </div>
                </div>

                {/* Rest of the action buttons... (Unchanged) */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0">
                  <div className="mr-2">
                    {moneyLeft <= 0 ? (
                      <div className="flex items-center gap-1 text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 text-sm font-bold"><CheckCircle2 size={16} />Clear</div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-sm font-bold"><AlertCircle size={16} />Rs. {moneyLeft} Due</div>
                    )}
                  </div>

                  {/* ... buttons ... */}
                  <button onClick={() => handleToggleInactive(member)} className={`p-2 rounded-lg border transition-all ${member.is_inactive ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20' : 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40 hover:text-red-400 hover:bg-red-500/10'}`}>
                    {member.is_inactive ? <UserCheck size={18} /> : <UserX size={18} />}
                  </button>

                  <button onClick={() => handleToggleFreeze(member, isCurrentlyFrozen)} className={`p-2 rounded-lg border transition-all ${isCurrentlyFrozen ? 'text-green-400 bg-green-500/5 border-green-500/20 hover:bg-green-500/20' : 'text-blue-400 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/20'}`}>
                    {isCurrentlyFrozen ? <Flame size={18} /> : <Snowflake size={18} />}
                  </button>

                  <button onClick={() => setActiveHistoryUserId(activeHistoryUserId === member.id ? null : member.id)} className="text-zinc-400 hover:text-yellow-500 p-2 transition-colors">
                    <History size={18} />
                  </button>

                  <button onClick={() => setEditingMember(member)} className="text-zinc-400 hover:text-blue-500 p-2 transition-colors">
                    <Settings size={18} />
                  </button>

                  <button onClick={() => deleteMember(member.id)} className="text-zinc-400 hover:text-red-500 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {activeHistoryUserId === member.id && (
                <div className="mt-4 pt-4 border-t border-zinc-800 bg-black/40 p-3 rounded-lg">
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Itemized Payments Ledger</p>
                  {userPastPayments.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No historical cash transactions detected.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {userPastPayments.map((fee, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-zinc-950 p-2 rounded border border-zinc-900">
                          <span className="text-zinc-300 font-mono">📅 Date: {fee.fee_date}</span>
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

export default React.memo(SearchBoard);