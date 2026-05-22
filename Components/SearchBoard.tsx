'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, CheckCircle2, AlertCircle, Settings, History } from 'lucide-react';

interface SearchBoardProps {
  members: any[];
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;  
  feesList: any[];
  setFeesList: React.Dispatch<React.SetStateAction<any[]>>; 
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingMember: (member: any) => void;
  refreshTrigger: () => void;
}

export default function SearchBoard({ 
  members, 
  setMembers,  
  feesList, 
  setFeesList,  
  searchQuery, 
  setSearchQuery, 
  setEditingMember, 
  refreshTrigger 
}: SearchBoardProps) {
  const [activeHistoryUserId, setActiveHistoryUserId] = useState<string | null>(null);

  const calculateBalance = (member: any) => {
    const today = new Date();
    const joinDate = new Date(member.join_date);
    let monthsDiff = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
    if (today.getDate() < joinDate.getDate()) monthsDiff--;
    const totalMonthsActive = Math.max(1, monthsDiff + 1);

    const admission = Number(member.admission_fee) || 0;
    const monthly = Number(member.monthly_fee) || 0;
    const cardio = Number(member.cardio_fee) || 0;
    const trainer = Number(member.trainer_fee) || 0;
    const discount = Number(member.discount_amount) || 0;

    const cardioMonthsToBill = member.cardio_months !== null ? Number(member.cardio_months) : totalMonthsActive;
    const trainerMonthsToBill = member.trainer_months !== null ? Number(member.trainer_months) : totalMonthsActive;
    
    const finalTotalCost = (monthly * totalMonthsActive) + (cardio * cardioMonthsToBill) + (trainer * trainerMonthsToBill) + admission - discount;
    const totalPaidFromLedger = feesList.filter(f => f.member_id === member.id).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    
    let activeRecurring = monthly;
    if (cardioMonthsToBill >= totalMonthsActive) activeRecurring += cardio;
    if (trainerMonthsToBill >= totalMonthsActive) activeRecurring += trainer;

    return { totalMonthsActive, moneyLeft: finalTotalCost - totalPaidFromLedger, activeRecurring };
  };

  const filteredAndSortedMembers = useMemo(() => {
    let result = members;
    const cleanQuery = searchQuery.toLowerCase().trim();

    if (cleanQuery) {
      const searchTerms = cleanQuery.split(',').map(t => t.trim()).filter(Boolean);
      result = members.filter(m => {
        const { moneyLeft } = calculateBalance(m);
        return searchTerms.every(term => {
          if (term === 'due') return moneyLeft > 0;
          if (term === 'clear') return moneyLeft <= 0;
          if (term.startsWith('@')) {
            const dateQuery = term.substring(1).trim();
            const joinParts = m.join_date ? m.join_date.split('-') : []; 
            if (joinParts.length === 3) {
              const [, month, day] = joinParts;
              return dateQuery.includes('/') ? (day === dateQuery.split('/')[0].padStart(2, '0') && month === dateQuery.split('/')[1].padStart(2, '0')) : month === dateQuery.padStart(2, '0');
            }
            return false;
          }
          return String(m.full_name || '').toLowerCase().includes(term) || 
                 String(m.shift || '').toLowerCase().includes(term) || 
                 String(m.serial_no || '') === term || 
                 (term === 'cardio' && (Number(m.cardio_fee) || 0) > 0) || 
                 (term === 'trainer' && (Number(m.trainer_fee) || 0) > 0);
        });
      });
    }
    return [...result].sort((a, b) => cleanQuery === 'due' ? calculateBalance(a).moneyLeft - calculateBalance(b).moneyLeft : (Number(b.serial_no) || 0) - (Number(a.serial_no) || 0));
  }, [members, feesList, searchQuery]);

  const deleteMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (!error) refreshTrigger();
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          placeholder="Search by name, card number, 'due, morning', or package tags..." 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none text-white" 
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        {filteredAndSortedMembers.map(member => {
          const { totalMonthsActive, moneyLeft, activeRecurring } = calculateBalance(member);
          const userPastPayments = feesList.filter(f => f.member_id === member.id);

          return (
            <div key={member.id} className="group flex flex-col p-4 mb-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-yellow-500/40 transition-all">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="text-zinc-600 font-mono text-sm">#{member.serial_no || 'N/A'}</span>
                    {member.full_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-zinc-400 text-sm">{member.phone}</span>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="bg-zinc-800 text-yellow-500 px-2 py-0.5 rounded text-xs font-semibold uppercase">{member.shift || 'Evening'}</span>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="text-zinc-400 text-xs">Rs. {activeRecurring}/mo</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-2">Joined: {member.join_date} <span className="text-zinc-600 mx-1">•</span> Active: {totalMonthsActive}m</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0">
                  <div className="mr-2">
                    {moneyLeft <= 0 ? (
                      <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 text-sm font-bold"><CheckCircle2 size={16} />Clear</div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-sm font-bold"><AlertCircle size={16} />Rs. {moneyLeft} Due</div>
                    )}
                  </div>

                  <button onClick={() => setActiveHistoryUserId(activeHistoryUserId === member.id ? null : member.id)} className="text-zinc-600 hover:text-yellow-500 p-2" title="View Ledger Logs">
                    <History size={18} />
                  </button>
                  <button onClick={() => setEditingMember(member)} className="text-zinc-600 hover:text-blue-500 p-2" title="Modify Record">
                    <Settings size={18} />
                  </button>
                  <button onClick={() => deleteMember(member.id)} className="text-zinc-600 hover:text-red-500 p-2" title="Delete Profile">
                    <Trash2 size={18} />
                  </button>
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