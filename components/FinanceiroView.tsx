import React, { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw, Landmark, FileUp, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FinancialRecord, BankTransaction } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bankItemId, setBankItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBankItemId = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setBankItemId(userDoc.data().bankItemId || null);
        }
      } catch (error) {
        console.error("Error fetching bankItemId:", error);
      }
    };
    fetchBankItemId();
  }, []);

  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
  };

  const handlePDFImport = () => {
    notify("A importação de PDF está temporariamente em manutenção para estabilizar o sistema.");
  };

  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newRecord = {
      type: fd.get('type') as 'receita' | 'despesa',
      description: fd.get('description') as string,
      value: Number(fd.get('value')),
      category: fd.get('category') as string,
      date: fd.get('date') as string,
      status: 'pago'
    };
    try {
      await addDoc(collection(db, 'financials'), newRecord);
      setShowModal(false);
      notify("Lançamento financeiro registrado!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financials');
      notify("Erro ao registrar lançamento.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Controle Financeiro</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handlePDFImport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
            >
              <FileText size={14} />
              Importar Extrato (PDF)
            </button>
          </div>
        </div>
        
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg w-full lg:w-auto justify-center">
          <Plus size={20}/> Novo Lançamento Manual
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receitas</span></div>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Despesas</span></div>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(stats.expense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/20 rounded-xl"><DollarSign size={20}/></div><span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo em Caixa</span></div>
          <p className="text-3xl font-black text-indigo-400">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Extrato Geral</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financials.slice().reverse().map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-5 font-bold text-slate-500 text-sm">{f.date}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${f.type === 'receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 text-sm">{f.description}</p>
                  </td>
                  <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Novo Lançamento</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">X</button>
            </div>
            <form onSubmit={handleAddRecord} className="p-10 space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden peer" />
                    <div className="py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest peer-checked:bg-white peer-checked:text-emerald-600 transition-all text-slate-400">Receita</div>
                 </label>
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="despesa" className="hidden peer" />
                    <div className="py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest peer-checked:bg-white peer-checked:text-rose-600 transition-all text-slate-400">Despesa</div>
                 </label>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;