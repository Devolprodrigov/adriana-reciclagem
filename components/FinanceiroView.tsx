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

  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Acessa a biblioteca PDF.js que você colocou no index.html
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    
    if (!pdfjsLib) {
      notify("O motor de PDF está inicializando. Tente em 3 segundos.");
      return;
    }

    notify("Lendo extrato bancário... Aguarde.");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let importedCount = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          
          // Regex para Extrato Itaú (Data DD/MM + Descrição + Valor)
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

        notify(importedCount > 0 ? `Sucesso! ${importedCount} lançamentos importados.` : "Nenhuma transação encontrada no PDF.");
      } catch (err) {
        notify("Falha ao processar o arquivo PDF.");
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
      notify("Lançamento financeiro registrado!");
    } catch (error) {
      notify("Erro ao registrar lançamento.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Financeiro</h3>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {isProcessing ? 'Processando...' : 'Importar Extrato (PDF)'}
          </button>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Plus size={16}/> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Receitas</span>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Despesas</span>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(stats.expense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
          <span className="text-[10px] font-black opacity-60 uppercase tracking-widest block mb-2">Saldo</span>
          <p className="text-3xl font-black text-indigo-400">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Data</th>
              <th className="px-8 py-5">Descrição</th>
              <th className="px-8 py-5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {financials.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => (
              <tr key={f.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-5 font-bold text-slate-500 text-sm">{f.date}</td>
                <td className="px-8 py-5 font-black text-slate-800 text-sm">{f.description}</td>
                <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-10">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Novo Registro</h2>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                 <label className="flex-1 text-center py-2 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-emerald-600 rounded-lg text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden" /> Receita
                 </label>
                 <label className="flex-1 text-center py-2 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-rose-600 rounded-lg text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="despesa" className="hidden" /> Despesa
                 </label>
              </div>
              <input name="description" required placeholder="Descrição" className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
              <input name="value" type="number" step="0.01" required placeholder="Valor R$" className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl">Salvar</button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;