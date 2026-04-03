import React, { useState, useRef } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0),
  };

  // --- LÓGICA DE IMPORTAÇÃO DE PDF ---
  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
    
    if (!pdfjsLib) {
      notify("Motor de PDF carregando... Tente em instantes.");
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

            await addDoc(collection(db, 'financials'), {
              type: cleanValue >= 0 ? 'receita' : 'despesa',
              description: `[PDF] ${description.trim().toUpperCase()}`,
              value: Math.abs(cleanValue),
              date: formattedDate,
              status: 'pago',
              category: 'IMPORTADO PDF',
              createdAt: serverTimestamp()
            });
            importedCount++;
          }
        }
        notify(`Sucesso! ${importedCount} lançamentos importados.`);
      } catch (err) {
        console.error("Erro no PDF:", err);
        notify("Erro ao processar arquivo.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LÓGICA DE SALVAMENTO MANUAL CORRIGIDA (SEM TRAVAMENTO) ---
  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      const type = formData.get('type') as 'receita' | 'despesa' || 'receita';
      const description = (formData.get('description')?.toString() || "LANÇAMENTO").toUpperCase();
      const category = (formData.get('category')?.toString() || "GERAL").toUpperCase();
      const value = Math.abs(Number(formData.get('value'))) || 0;
      const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];

      if (value <= 0) {
        notify("Insira um valor maior que zero!");
        setIsProcessing(false);
        return;
      }

      const payload = {
        type,
        description,
        value,
        category,
        date,
        status: 'pago',
        createdAt: serverTimestamp()
      };

      // Tenta gravar no Firestore (Projeto 0910721167)
      await addDoc(collection(db, 'financials'), payload);
      
      setShowModal(false); 
      notify("Lançamento financeiro salvo!");
      e.currentTarget.reset();

    } catch (error: any) {
  console.error("🔥 ERRO REAL DO FIREBASE:", error);
  
  alert("ERRO REAL: " + error.message);
}
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Financeiro Industrial</h3>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Adriana Reciclagem</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:border-indigo-600 transition-all disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {isProcessing ? 'PROCESSANDO...' : 'IMPORTAR PDF'}
          </button>
          <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Plus size={16}/> NOVO LANÇAMENTO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganhos</span></div>
          <p className="text-4xl font-black text-emerald-600 leading-none">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos</span></div>
          <p className="text-4xl font-black text-rose-600 leading-none">{formatCurrency(stats.expense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/10 text-indigo-400 rounded-xl"><DollarSign size={20}/></div><span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo Geral</span></div>
          <p className="text-4xl font-black text-indigo-400 leading-none">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Transações</h4>
           <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">{financials.length} LANÇAMENTOS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financials.length === 0 ? (
                <tr>
                   <td colSpan={3} className="px-8 py-10 text-center font-bold text-slate-300 uppercase text-xs">Nenhum registro encontrado no banco.</td>
                </tr>
              ) : (
                financials.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-400 text-xs">{f.date.split('-').reverse().join('/')}</td>
                    <td className="px-8 py-5 font-black text-slate-700 text-xs uppercase">{f.description}</td>
                    <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-8">Novo Lançamento</h2>
            <form onSubmit={handleAddRecord} className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 text-center py-4 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-emerald-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden" /> Receita
                 </label>
                 <label className="flex-1 text-center py-4 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-rose-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="despesa" className="hidden" /> Despesa
                 </label>
              </div>
              <input name="description" required placeholder="DESCRIÇÃO" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 ring-indigo-100" />
              <input name="category" placeholder="CATEGORIA (SUCATA, PEÇAS, ETC)" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 ring-indigo-100" />
              <div className="grid grid-cols-2 gap-4">
                <input name="value" type="number" step="0.01" required placeholder="VALOR R$" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs outline-none" />
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs outline-none" />
              </div>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'SALVANDO...' : 'CONFIRMAR LANÇAMENTO'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full py-2 text-slate-300 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;