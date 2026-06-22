import React, { useState, useRef, useMemo } from 'react';
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
  
  // --- INICIALIZAÇÃO INTELIGENTE DE DATAS (MÊS CORRENTE) ---
  const defaultDates = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    
    // Primeiro dia do mês: YYYY-MM-01
    const firstDay = `${year}-${month}-01`;
    
    // Último dia do mês
    const lastDayNum = new Date(year, d.getMonth() + 1, 0).getDate();
    const lastDay = `${year}-${month}-${String(lastDayNum).padStart(2, '0')}`;
    
    return { firstDay, lastDay };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.firstDay);
  const [endDate, setEndDate] = useState<string>(defaultDates.lastDay);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE FILTRO DIÁRIO + BUSCA POR NOME/TERMO ---
  const filteredFinancials = financials.filter(f => {
    if (!f.date) return false;
    
    // Filtro por intervalo exato de dias (Inclusivo)
    const matchesStartDate = startDate ? f.date >= startDate : true;
    const matchesEndDate = endDate ? f.date <= endDate : true;
    
    // Busca inteligente por texto na descrição
    const descriptionText = (f.description || '').toLowerCase();
    const searchText = searchDescription.toLowerCase();
    const matchesDescription = descriptionText.includes(searchText);
    
    return matchesStartDate && matchesEndDate && matchesDescription;
  });

  // --- STATS CALCULADOS ---
  // Saldo Geral: Soma TUDO (Histórico Completo) para bater com o Extrato Bancário
  const totalHistoricoReceita = financials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0);
  const totalHistoricoDespesa = financials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0);
  const saldoBancarioPrevisto = totalHistoricoReceita - totalHistoricoDespesa;

  // Stats do Intervalo de Dias Selecionado (Para ver lucro/prejuízo no período filtrado)
  const periodStats = {
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
        
        const currentYear = new Date(startDate || new Date()).getFullYear();

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
            const formattedDate = `${currentYear}-${month}-${day}`;

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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganhos no Período</span>
          </div>
          <p className="text-4xl font-black text-emerald-600 leading-none">{formatCurrency(periodStats.revenue)}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos no Período</span>
          </div>
          <p className="text-4xl font-black text-rose-600 leading-none">{formatCurrency(periodStats.expense)}</p>
        </div>
      </div>

      {/* FILTROS DE NAVEGAÇÃO POR INTERVALO DE DATAS (DIA A DIA) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          
          {/* BUSCA POR NOME/TERMO NA DESCRIÇÃO */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text"
              value={searchDescription}
              onChange={e => setSearchDescription(e.target.value)}
              placeholder="Buscar por nome ou termo na descrição..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:ring-2 ring-indigo-500/20 transition-all"
            />
          </div>

          {/* CONTROLE DE INTERVALO DIÁRIO */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase">De:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent font-black text-[10px] outline-none cursor-pointer text-slate-700 uppercase"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Até:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent font-black text-[10px] outline-none cursor-pointer text-slate-700 uppercase"
              />
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center lg:text-right">
           Exibindo {filteredFinancials.length} transações no período filtrado
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
                      <p className="font-bold text-slate-300 uppercase text-xs">Nenhum lançamento localizado neste dia/período.</p>
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
