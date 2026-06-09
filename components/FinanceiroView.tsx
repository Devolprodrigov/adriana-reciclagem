import React, { useState, useRef } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, Calendar, Filter, Landmark, Search, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, writeBatch, doc } from 'firebase/firestore';
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
  const [isCleaning, setIsCleaning] = useState(false);
  const [searchDescription, setSearchDescription] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE FILTRO INTEGRADA (DATA + BUSCA POR NOME/TERMO NA DESCRIÇÃO) ---
  const filteredFinancials = financials.filter(f => {
    const recordDate = new Date(f.date + "T12:00:00"); // Garante o fuso horário correto
    const matchesDate = recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    
    // Busca inteligente: varre o texto procurando o nome ou termo digitado
    const descriptionText = (f.description || '').toLowerCase();
    const searchText = searchDescription.toLowerCase();
    const matchesDescription = descriptionText.includes(searchText);
    
    return matchesDate && matchesDescription;
  });

  // --- STATS CALCULADOS ---
  // Saldo Geral: Soma TUDO (Histórico Completo) para bater com o Extrato Bancário
  const totalHistoricoReceita = financials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0);
  const totalHistoricoDespesa = financials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0);
  const saldoBancarioPrevisto = totalHistoricoReceita - totalHistoricoDespesa;

  // Stats do Mês Selecionado (Para ver lucro/prejuízo no período)
  const monthStats = {
    revenue: filteredFinancials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0),
    expense: filteredFinancials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0),
  };

  // --- LÓGICA DE LIMPEZA DO HISTÓRICO ---
  const handleClearAll = async () => {
    const confirm = window.confirm("🚨 ATENÇÃO: Isso vai apagar TODOS os lançamentos financeiros permanentemente do Firebase. Confirma?");
    if (!confirm) return;

    setIsCleaning(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'financials'));
      const batch = writeBatch(db);

      querySnapshot.forEach((documento) => {
        batch.delete(doc(db, 'financials', documento.id));
      });

      await batch.commit();
      notify("Financeiro zerado com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao limpar banco: " + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  // --- LÓGICA DE IMPORTAÇÃO DE PDF ---
  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
    if (!pdfjsLib) { notify("Motor de PDF carregando..."); return; }

    notify("Lendo extrato bancário...");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
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
            const formattedDate = `${selectedYear}-${month}-${day}`;

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
        notify(`${importedCount} lançamentos importados!`);
      } catch (err) { notify("Erro ao processar PDF."); } finally { 
        setIsProcessing(false); 
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        type: fd.get('type') as any,
        description: (fd.get('description') as string).toUpperCase(),
        category: (fd.get('category') as string).toUpperCase(),
        value: Math.abs(Number(fd.get('value'))),
        date: fd.get('date') as string,
        status: 'pago',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'financials'), payload);
      setShowModal(false);
      notify("Lançamento salvo!");
    } catch (error) { notify("Erro ao salvar."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Financeiro Industrial</h3>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Controle de Fluxo e Conciliação</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleClearAll}
            disabled={isCleaning}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all disabled:opacity-40"
          >
            <Trash2 size={14}/> {isCleaning ? 'ZERANDO...' : 'ZERAR CAIXA'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:border-indigo-600 transition-all">
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />} IMPORTAR PDF
          </button>
          <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Plus size={16}/> NOVO LANÇAMENTO
          </button>
        </div>
      </div>

      {/* QUADROS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
             <Landmark size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-white/10 text-indigo-400 rounded-xl"><Landmark size={18}/></div>
              <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo Real em Conta</span>
            </div>
            <p className="text-4xl font-black text-indigo-400 leading-none">{formatCurrency(saldoBancarioPrevisto)}</p>
            <p className="text-[9px] font-bold mt-4 opacity-40 uppercase tracking-widest">Valor acumulado de todo o histórico</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganhos no Mês</span>
          </div>
          <p className="text-4xl font-black text-emerald-600 leading-none">{formatCurrency(monthStats.revenue)}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos no Mês</span>
          </div>
          <p className="text-4xl font-black text-rose-600 leading-none">{formatCurrency(monthStats.expense)}</p>
        </div>
      </div>

      {/* FILTROS DE NAVEGAÇÃO E BUSCA POR DESCRIÇÃO */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* INPUT DE BUSCA POR NOME/TERMO NA DESCRIÇÃO */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text"
              value={searchDescription}
              onChange={e => setSearchDescription(e.target.value)}
              placeholder="Buscar por nome ou termo na descrição..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:ring-2 ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
            <Calendar size={16} className="text-indigo-600" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
            >
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
            <Filter size={16} className="text-indigo-600" />
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
           Exibindo {filteredFinancials.length} transações em {selectedMonth + 1}/{selectedYear}
        </div>
      </div>

      {/* TABELA DE HISTÓRICO FILTRADA */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredFinancials.length === 0 ? (
                <tr>
                   <td colSpan={3} className="px-8 py-16 text-center">
                      <p className="font-bold text-slate-300 uppercase text-xs">Nenhum lançamento neste período.</p>
                   </td>
                </tr>
              ) : (
                filteredFinancials.sort((a, b) => b.date.localeCompare(a.date)).map(f => (
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

      {/* MODAL */}
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
              <input name="category" placeholder="CATEGORIA" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 ring-indigo-100" />
              <div className="grid grid-cols-2 gap-4">
                <input name="value" type="number" step="0.01" required placeholder="VALOR R$" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs outline-none" />
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xs outline-none" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700">
                {isProcessing ? 'SALVANDO...' : 'CONFIRMAR LANÇAMENTO'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full py-2 text-slate-300 font-black uppercase text-[10px]">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;
// import React, { useState } from 'react';
// import { db } from '../firebase';
// import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
// import { Trash2, AlertTriangle } from 'lucide-react';
// import { FinancialRecord } from '../types';

// interface Props {
//   financials: FinancialRecord[];
//   notify: (m: string) => void;
// }

// const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
//   const [isCleaning, setIsCleaning] = useState(false);

//   // FUNÇÃO QUE LIMPA O BANCO INTEIRO
//   const handleClearAll = async () => {
//     const confirm = window.confirm("🚨 ATENÇÃO: Isso vai apagar TODOS os lançamentos financeiros permanentemente. Confirma?");
//     if (!confirm) return;

//     setIsCleaning(true);
//     try {
//       const querySnapshot = await getDocs(collection(db, 'financials'));
//       const batch = writeBatch(db);

//       querySnapshot.forEach((documento) => {
//         batch.delete(doc(db, 'financials', documento.id));
//       });

//       await batch.commit();
//       notify("Financeiro zerado com sucesso!");
//     } catch (error: any) {
//       console.error(error);
//       alert("Erro ao limpar: " + error.message);
//     } finally {
//       setIsCleaning(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
//         <div>
//           <h2 className="text-xl font-black uppercase text-slate-800">Financeiro Industrial</h2>
//           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Fluxo de Caixa</p>
//         </div>

//         {/* BOTÃO DE LIMPEZA */}
//         <button 
//           onClick={handleClearAll}
//           disabled={isCleaning}
//           className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase hover:bg-rose-100 transition-all border border-rose-100"
//         >
//           {isCleaning ? "LIMPANDO..." : <><Trash2 size={16}/> Limpar Tudo (Zerar)</>}
//         </button>
//       </div>

//       {/* LISTA DE TRANSAÇÕES ABAIXO... (Mantenha o resto do seu código de tabela aqui) */}
//       <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
//           <p className="text-center font-bold text-slate-400 py-10">
//             {financials.length === 0 ? "Nenhum lançamento encontrado. Banco limpo!" : `Existem ${financials.length} lançamentos no banco.`}
//           </p>
//       </div>
//     </div>
//   );
// };

// export default FinanceiroView;
