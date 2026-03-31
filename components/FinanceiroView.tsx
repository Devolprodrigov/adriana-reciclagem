import React, { useState, useRef } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialRecord } from '../types';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculados em tempo real
  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
  };

  // --- LÓGICA DE IMPORTAÇÃO DE PDF ---
  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
    
    if (!pdfjsLib) {
      notify("O motor de PDF está carregando. Tente novamente em instantes.");
      return;
    }

    notify("Lendo extrato bancário... Aguarde.");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        let importedCount = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          
          const regex = /(\d{2}\/\d{2})\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
          let match;

          while ((match = regex.exec(pageText)) !== null) {
            const [_, date, description, valueStr] = match;
            const cleanValue = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
            const [day, month] = date.split('/');
            const formattedDate = `${new Date().getFullYear()}-${month}-${day}`;

            // Grava cada linha do PDF no Firebase
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
        console.error("Erro no PDF:", err);
        notify("Erro ao processar o arquivo.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LÓGICA DE SALVAMENTO MANUAL ---
  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const payload = {
      type: fd.get('type') as 'receita' | 'despesa',
      description: fd.get('description') as string,
      value: Number(fd.get('value')),
      category: fd.get('category') || 'Geral',
      date: fd.get('date') as string,
      status: 'pago'
    };

    try {
      // Grava na coleção 'financials' conforme solicitado
      await addDoc(collection(db, 'financials'), payload);
      setShowModal(false); 
      notify("Lançamento financeiro salvo!");
    } catch (error) {
      console.error(error);
      notify("Erro ao gravar no banco.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Financeiro Industrial</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão Adriana Reciclagem</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {isProcessing ? 'Lendo...' : 'Importar PDF'}
          </button>
          <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Plus size={16}/> Novo Lançamento
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganhos</span></div>
          <p className="text-4xl font-black text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos</span></div>
          <p className="text-4xl font-black text-rose-600">{formatCurrency(stats.expense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/10 text-indigo-400 rounded-xl"><DollarSign size={20}/></div><span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo Geral</span></div>
          <p className="text-4xl font-black text-indigo-400">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      {/* TABELA DE REGISTROS */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Transações</h4>
           <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-bold uppercase">{financials.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Ocorrência</th>
                <th className="px-8 py-5 text-right">Montante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financials.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-400 text-xs">{f.date.split('-').reverse().join('/')}</td>
                  <td className="px-8 py-5 font-black text-slate-700 text-sm uppercase">{f.description}</td>
                  <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE LANÇAMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-8">Novo Registro Manual</h2>
            <form onSubmit={handleAddRecord} className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 text-center py-3 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-emerald-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden" /> Receita
                 </label>
                 <label className="flex-1 text-center py-3 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-rose-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="despesa" className="hidden" /> Despesa
                 </label>
              </div>
              <input name="description" required placeholder="Descrição (Ex: Venda de Metal)" className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-100" />
              <input name="category" placeholder="Categoria (Ex: Operacional)" className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-100" />
              <div className="grid grid-cols-2 gap-4">
                <input name="value" type="number" step="0.01" required placeholder="Valor R$" className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none" />
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 p-5 rounded-2xl font-bold outline-none" />
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Salvar Lançamento</button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full py-2 text-slate-400 font-bold uppercase text-[10px]">Fechar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;