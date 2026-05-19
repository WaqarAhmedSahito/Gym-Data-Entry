'use client';

import React from 'react';
import { X } from 'lucide-react';

interface MemberEditorProps {
  editingMember: any;
  setEditingMember: (member: any) => void;
  handleUpdateMember: (e: React.FormEvent) => void;
}

export default function MemberEditor({ editingMember, setEditingMember, handleUpdateMember }: MemberEditorProps) {
  if (!editingMember) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-500">Edit Member Profile</h2>
          <button type="button" onClick={() => setEditingMember(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleUpdateMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-zinc-500 ml-1">Serial Number</label><input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg font-mono" value={editingMember.serial_no || ''} onChange={e => setEditingMember({...editingMember, serial_no: e.target.value})} /></div>
            <div><label className="text-xs text-zinc-500 ml-1">Full Name</label><input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.full_name} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})} /></div>
            <div><label className="text-xs text-zinc-500 ml-1">Father Name</label><input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.father_name || ''} onChange={e => setEditingMember({...editingMember, father_name: e.target.value})} /></div>
            <div><label className="text-xs text-zinc-500 ml-1">Phone Number</label><input className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4">
             <div><label className="text-xs text-zinc-500 ml-1">Join Date (Gym)</label><input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark" value={editingMember.join_date} onChange={e => setEditingMember({...editingMember, join_date: e.target.value})} /></div>
             <div><label className="text-xs text-zinc-500 ml-1">Shift</label><select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white" value={editingMember.shift} onChange={e => setEditingMember({...editingMember, shift: e.target.value})}><option value="Morning">Morning</option><option value="Evening">Evening</option><option value="Both">Both</option></select></div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4 bg-blue-500/5 p-4 rounded-xl">
             <div><label className="text-xs text-blue-400 font-bold ml-1">Trainer Name</label><input placeholder="Optional" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.trainer_name || ''} onChange={e => setEditingMember({...editingMember, trainer_name: e.target.value})} /></div>
             <div><label className="text-xs text-blue-400 font-bold ml-1">Trainer Start Date</label><input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg scheme-dark" value={editingMember.trainer_start_date || ''} onChange={e => setEditingMember({...editingMember, trainer_start_date: e.target.value})} /></div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4 mt-4">
             <div><label className="text-xs text-zinc-500 ml-1">Admission Fee</label><input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.admission_fee} onChange={e => setEditingMember({...editingMember, admission_fee: e.target.value})} /></div>
             <div><label className="text-xs text-zinc-500 ml-1">Monthly Gym Fee</label><input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.monthly_fee} onChange={e => setEditingMember({...editingMember, monthly_fee: e.target.value})} /></div>
             <div><label className="text-xs text-zinc-500 ml-1">Total Paid So Far</label><input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-green-500" value={editingMember.paid_amount} onChange={e => setEditingMember({...editingMember, paid_amount: e.target.value})} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-4 bg-zinc-900/50 p-4 rounded-xl">
             <div>
                <label className="text-xs text-zinc-400 font-bold ml-1">Cardio Fee Amount</label>
                <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-2" value={editingMember.cardio_fee} onChange={e => setEditingMember({...editingMember, cardio_fee: e.target.value})} />
                <label className="text-xs text-red-400 font-bold ml-1">Cardio Start Date</label>
                <input type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-2 scheme-dark" value={editingMember.cardio_start_date || ''} onChange={e => setEditingMember({...editingMember, cardio_start_date: e.target.value})} />
                <label className="text-xs text-red-400 font-bold ml-1">Limit Cardio (Months Billed)</label>
                <input type="number" placeholder="Leave empty to bill forever" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.cardio_months !== null ? editingMember.cardio_months : ''} onChange={e => setEditingMember({...editingMember, cardio_months: e.target.value})} />
             </div>
             
             <div>
                <label className="text-xs text-zinc-400 font-bold ml-1">Trainer Fee Amount</label>
                <input type="number" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-2" value={editingMember.trainer_fee} onChange={e => setEditingMember({...editingMember, trainer_fee: e.target.value})} />
                <label className="text-xs text-red-400 font-bold ml-1">Limit Trainer (Months Billed)</label>
                <input type="number" placeholder="Leave empty to bill forever" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg" value={editingMember.trainer_months !== null ? editingMember.trainer_months : ''} onChange={e => setEditingMember({...editingMember, trainer_months: e.target.value})} />
             </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-800 mt-2">
             <button type="button" onClick={() => setEditingMember(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-lg transition-colors">Cancel</button>
             <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-transform active:scale-95">Save Profile Updates</button>
          </div>
        </form>
      </div>
    </div>
  );
}