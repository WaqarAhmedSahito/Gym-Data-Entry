'use client';

import React, { useMemo } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, Banknote, Settings, Trash2 } from 'lucide-react';

interface SearchBoardProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMembers: any[];
  loading: boolean;
  calculateBalance: (member: any) => any;
  handlePayment: (member: any) => void;
  setEditingMember: (member: any) => void;
  deleteMember: (id: string) => void;
}

export default function SearchBoard({
  searchQuery,
  setSearchQuery,
  filteredMembers,
  loading,
  calculateBalance,
  handlePayment,
  setEditingMember,
  deleteMember
}: SearchBoardProps) {

  // Dynamically sort based on what is being searched
  const sortedMembers = useMemo(() => {
    const isDueSearch = searchQuery.toLowerCase().trim() === 'due';

    return [...filteredMembers].sort((a, b) => {
     
      if (isDueSearch) {
        const dueA = calculateBalance(a).moneyLeft;
        const dueB = calculateBalance(b).moneyLeft;
        
        // Ascending order: 500 first, then 1000, highest dues at the bottom
        return dueA - dueB;
      }

      // Default: Sort numerically by serial_no in descending order
      const serialA = Number(a.serial_no) || 0;
      const serialB = Number(b.serial_no) || 0;
      return serialB - serialA; 
    });
  }, [filteredMembers, searchQuery, calculateBalance]);

  return (
    <div className="xl:col-span-8 space-y-4">
      {/* Search Bar */}
      <div className="relative z-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          placeholder="Search name, serial, shift or 'due', 'trainer', 'cardio', '@month'" 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-yellow-500 outline-none" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
        />
      </div>

      {/* Member List */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 min-h-100">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-yellow-500" /></div>
        ) : sortedMembers.map(member => {
          const { totalMonthsActive, moneyLeft, activeRecurring } = calculateBalance(member);

          return (
            <div key={member.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 mb-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-yellow-500/40 transition-all">
              
              {/* Left Side: Info */}
              <div className="mb-3 md:mb-0">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="text-zinc-600 font-mono text-sm">#{member.serial_no || 'N/A'}</span>
                  {member.full_name}
                </h3>

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
        {sortedMembers.length === 0 && !loading && <div className="text-center text-zinc-500 py-10">No members found.</div>}
      </div>
    </div>
  );
}