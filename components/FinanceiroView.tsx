import React, { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FinancialRecord } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NOVO: Esse efeito acorda o motor de PDF assim que a aba abre
  useEffect(() => {
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
      console.log("Motor de PDF ativado com sucesso!");
    }
  }, []);

  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    
    if (!pdfjsLib) {
      notify("O motor de PDF ainda está carregando. Aguarde 3 segundos e tente novamente.");
      return;
    }

    notify("Lendo extrato bancário... Isso pode levar alguns segundos.");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let importedCount = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          
          // Regex para Extrato Itaú/Padrão (Data DD/MM + Descrição + Valor)
          const regex = /(\d{2}\/\d{2})\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
          let match;

          while ((match = regex.exec(pageText)) !== null) {
            const [_, date, description, valueStr] = match;
            const cleanValue = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
            const [day, month] = date.split('/');
            const formattedDate = `${new Date().getFullYear()}-${month}-${day}`;

            await addDoc(collection(db, 'financials'), {
              type: cleanValue >= 0 ? 'receita' : 'despesa',
              description: `[PDF] ${description.trim()}`,
              value: Math.abs(cleanValue),
              date: formattedDate,
              status: 'pago',
              category: 'Importado PDF'
            });
            importedCount++;
          }
        }

        notify(importedCount > 0 ? `Sucesso! ${importedCount} lançamentos importados!` : "Nenhuma transação encontrada no arquivo.");
      } catch (err) {
        notify("Erro ao processar PDF. Verifique se o arquivo está correto.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'financials'), {
        type: fd.get('type') as 'receita' | 'despesa',
        description: fd.get('description') as string,
        value: Number(fd.get('value')),
        category: fd.get('category') as string,
        date: fd.get('date') as string,
        status: 'pago'
      });
      setShowModal(false);
      notify("Lançamento financeiro registrado com sucesso!");
    } catch (error) {
      notify("Erro ao registrar lançamento.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fluxo Financeiro</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de caixa industrial</p>
        </div>
        <div className="flex gap-3">
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50 shadow-sm"
          >
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {isProcessing ? 'Processando...' : 'Importar PDF'}
          </button>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
            <Plus size={16}/> Novo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saídas</span>
          </div>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(stats.expense)}</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-white/10 text-indigo-400 rounded-xl"><DollarSign size={20}/></div>
             <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo Atual</span>
          </div>
          <p className="text-3xl font-black text-indigo-400">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimas Movimentações</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financials.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-500 text-sm">{f.date}</td>
                  <td className="px-8 py-5 font-black text-slate-800 text-sm uppercase group-hover:text-indigo-600 transition-colors">{f.description}</td>
                  <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Novo Lançamento</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600 transition-colors font-black">X</button>
            </div>
            
            <form onSubmit={handleAddRecord} className="space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 text-center py-3 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-emerald-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden" /> Receita
                 </label>
                 <label className="flex-1 text-center py-3 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-rose-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400">
                    <input type="radio" name="type" value="despesa" className="hidden" /> Despesa
                 </label>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">O que é?</label>
                <input name="description" required placeholder="Ex: Venda de Cobre" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none p-5 rounded-2xl font-bold transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quanto?</label>
                  <input name="value" type="number" step="0.01" required placeholder="0,00" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none p-5 rounded-2xl font-bold transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quando?</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none p-5 rounded-2xl font-bold transition-all" />
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;