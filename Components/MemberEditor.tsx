'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, CalendarDays, Loader2 } from 'lucide-react';

interface MemberEditorProps {
  editingMember: any;
  setEditingMember: (member: any) => void;
  feesList: any[];
  setFeesList: React.Dispatch<React.SetStateAction<any[]>>;
  onUpdateComplete: () => void;
}

export default function MemberEditor({ editingMember, setEditingMember, feesList, setFeesList, onUpdateComplete }: MemberEditorProps) {
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isSaving, setIsSaving] = useState(false);
  const [localMonthAmount, setLocalMonthAmount] = useState<string>('0');

  // 1. Calculate historical global total ledger payments safely
  const totalPaidFromLedger = useMemo(() => {
    if (!editingMember?.id) return 0;
    return feesList
      .filter(f => String(f.member_id) === String(editingMember.id))
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [editingMember.id, feesList]);

  // 2. Locate contextual payment record for the currently selected targetMonth using month-string matching
  const contextualFeeRecord = useMemo(() => {
    if (!editingMember?.id) return null;
    return feesList.find(f => 
      String(f.member_id) === String(editingMember.id) && 
      f.fee_date?.startsWith(targetMonth) // FIXED: Uses startsWith to safely capture any date in that month
    );
  }, [editingMember.id, feesList, targetMonth]);

  // Dynamically pull current month values whenever targetMonth or global feesList arrays shift
  useEffect(() => {
    if (contextualFeeRecord) {
      setLocalMonthAmount(String(contextualFeeRecord.amount || 0));
    } else {
      setLocalMonthAmount('0');
    }
  }, [targetMonth, contextualFeeRecord]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Step A: Update Profile Table Data
      const cleanProfileData = {
        serial_no: editingMember.serial_no,
        full_name: editingMember.full_name,
        father_name: editingMember.father_name || '',
        phone: editingMember.phone,
        join_date: editingMember.join_date,
        shift: editingMember.shift,
        admission_fee: Number(editingMember.admission_fee) || 0,
        monthly_fee: Number(editingMember.monthly_fee) || 0,
        cardio_fee: Number(editingMember.cardio_fee) || 0,
        cardio_start_date: editingMember.cardio_start_date || null,
        trainer_fee: Number(editingMember.trainer_fee) || 0,
        trainer_name: editingMember.trainer_name || "",
        trainer_start_date: editingMember.trainer_start_date || null,
        discount_amount: Number(editingMember.discount_amount) || 0,
        cardio_months: editingMember.cardio_months === '' || editingMember.cardio_months === null ? null : Number(editingMember.cardio_months),
        trainer_months: editingMember.trainer_months === '' || editingMember.trainer_months === null ? null : Number(editingMember.trainer_months),
      };

      const { error: profileError } = await supabase
        .from('members')
        .update(cleanProfileData)
        .eq('id', editingMember.id);

      if (profileError) throw profileError;

      // Step B: Save the Monthly Fee Entry safely
      const finalAmount = Number(localMonthAmount) || 0;

      if (contextualFeeRecord) {
        // SCENARIO 1: Update existing record match row
        const { error: ledgerUpdateError } = await supabase
          .from('member_fees')
          .update({ amount: finalAmount })
          .eq('id', contextualFeeRecord.id);

        if (ledgerUpdateError) throw ledgerUpdateError;

        // Force local state arrays to synchronize instantly
        setFeesList(prev => prev.map(f => f.id === contextualFeeRecord.id ? { ...f, amount: finalAmount } : f));
      } else {
        // SCENARIO 2: No record exists for this month yet, build a clean entry
        const fallbackFeeDate = `${targetMonth}-10`;
        const { data: newInsertedRow, error: ledgerInsertError } = await supabase
          .from('member_fees')
          .insert([{
            member_id: editingMember.id,
            serial_no: editingMember.serial_no || '0',
            fee_date: fallbackFeeDate,
            amount: finalAmount
          }])
          .select()
          .single();

        if (ledgerInsertError) throw ledgerInsertError;

        if (newInsertedRow) {
          setFeesList(prev => [newInsertedRow, ...prev]);
        }
      }

      setEditingMember(null);
      onUpdateComplete();
    } catch (err: any) {
      alert("Database Synchronization Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 font-sans text-white">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-500">Edit Member Profile</h2>
          <button type="button" onClick={() => setEditingMember(null)} className="text-zinc-500 hover:text-white" disabled={isSaving}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Core Info Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 ml-1">Card Serial Number</label>
              <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg font-mono text-white" value={editingMember.serial_no || ''} onChange={e => setEditingMember({...editingMember, serial_no: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 ml-1">Full Name</label>
              <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.full_name || ''} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 ml-1">Father Name</label>
              <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.father_name || ''} onChange={e => setEditingMember({...editingMember, father_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 ml-1">Phone Number</label>
              <input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.phone || ''} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} />
            </div>
          </div>

          {/* Timing Parameters */}
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4">
             <div>
               <label className="text-xs text-zinc-500 ml-1">Join Date</label>
               <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark text-white" value={editingMember.join_date || ''} onChange={e => setEditingMember({...editingMember, join_date: e.target.value})} />
             </div>
             <div>
               <label className="text-xs text-zinc-500 ml-1">Shift Selection</label>
               <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.shift || 'Evening'} onChange={e => setEditingMember({...editingMember, shift: e.target.value})}>
                 <option value="Morning">Morning</option>
                 <option value="Evening">Evening</option>
                 <option value="Both">Both</option>
               </select>
             </div>
          </div>

          {/* Core Financial Row */}
          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4 mt-4">
             <div>
               <label className="text-xs text-zinc-500 ml-1">Admission Cost</label>
               <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.admission_fee ?? ''} onChange={e => setEditingMember({...editingMember, admission_fee: e.target.value === '' ? 0 : Number(e.target.value)})} />
             </div>
             <div>
               <label className="text-xs text-zinc-500 ml-1">Monthly Gym Fee</label>
               <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.monthly_fee ?? ''} onChange={e => setEditingMember({...editingMember, monthly_fee: e.target.value === '' ? 0 : Number(e.target.value)})} />
             </div>
             <div>
               <label className="text-xs text-green-400 font-bold ml-1">Total Ledger Paid (All-Time)</label>
               <input type="number" disabled className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg font-mono text-green-400 cursor-not-allowed" value={totalPaidFromLedger} />
             </div>
          </div>

          {/* INTEGRATED MONTHLY FEE LEDGER INPUT PANEL */}
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
            <div>
              <label className="text-xs text-yellow-500 font-bold ml-1 flex items-center gap-1">
                <CalendarDays size={14} /> 1. Select Month to Edit
              </label>
              <input 
                type="month" 
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg mt-1.5 text-white scheme-dark outline-none focus:border-yellow-500"
                value={targetMonth}
                onChange={e => setTargetMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium ml-1 flex justify-between">
                <span>2. Amount Paid in This Month (Rs.)</span>
                <span className="text-[10px] text-zinc-500">
                  {contextualFeeRecord ? "Row Exists" : "Will Create New"}
                </span>
              </label>
              <input 
                type="number"
                placeholder="0"
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg mt-1.5 text-white focus:border-emerald-500 outline-none font-mono font-bold"
                value={localMonthAmount}
                onChange={e => setLocalMonthAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Balance Overrides Adjustments Row */}
          <div className="border-t pt-4 mt-4 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
            <label className="text-xs text-yellow-500 font-bold ml-1">Adjustments Pool / Balance Override (Rs.)</label>
            <input type="number" placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mt-2 focus:border-yellow-500 text-white" value={editingMember.discount_amount ?? ''} onChange={e => setEditingMember({...editingMember, discount_amount: e.target.value === '' ? 0 : Number(e.target.value)})} />
            <p className="text-[10px] text-zinc-500 mt-1">Use this field to modify core balances without breaking logs.</p>
          </div>

          {/* Premium Add-ons Configuration Block */}
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4 bg-zinc-900/50 p-4 rounded-xl">
             <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold ml-1">Cardio Premium Fee</label>
                <input type="number" placeholder="Cardio Fee" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.cardio_fee ?? ''} onChange={e => setEditingMember({...editingMember, cardio_fee: e.target.value === '' ? 0 : Number(e.target.value)})} />
                <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark text-white" value={editingMember.cardio_start_date || ''} onChange={e => setEditingMember({...editingMember, cardio_start_date: e.target.value})} />
                <input type="number" placeholder="Cardio Limit Months" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.cardio_months ?? ''} onChange={e => setEditingMember({...editingMember, cardio_months: e.target.value === '' ? null : Number(e.target.value)})} />
             </div>
             <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold ml-1">Trainer Premium Fee</label>
                <input type="number" placeholder="Trainer Fee" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.trainer_fee ?? ''} onChange={e => setEditingMember({...editingMember, trainer_fee: e.target.value === '' ? 0 : Number(e.target.value)})} />
                <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark text-white" value={editingMember.trainer_start_date || ''} onChange={e => setEditingMember({...editingMember, trainer_start_date: e.target.value})} />
                <input placeholder="Trainer Name" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white text-sm" value={editingMember.trainer_name || ''} onChange={e => setEditingMember({...editingMember, trainer_name: e.target.value})} />
                <input type="number" placeholder="Trainer Limit Months" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.trainer_months ?? ''} onChange={e => setEditingMember({...editingMember, trainer_months: e.target.value === '' ? null : Number(e.target.value)})} />
             </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t border-zinc-800 mt-2">
             <button type="button" onClick={() => setEditingMember(null)} disabled={isSaving} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-lg transition-colors">
               Cancel
             </button>
             <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-transform active:scale-95 flex justify-center items-center gap-2">
               {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Save Profile Updates"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}