import React, { useState, useRef, useMemo } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, Calendar, Filter, Landmark, Search, Trash2, Coins } from 'lucide-react';
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
  
  // --- INICIALIZAÇÃO DE DATAS ---
  const defaultDates = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDayNum = new Date(year, d.getMonth() + 1, 0).getDate();
    const lastDay = `${year}-${month}-${String(lastDayNum).padStart(2, '0')}`;
    return { firstDay, lastDay };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.firstDay);
  const [endDate, setEndDate] = useState<string>(defaultDates.lastDay);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LISTA DE CATEGORIAS OFICIAIS SOLICITADAS ---
  const categoriasPredefinidas = [
    "COMPRA DE MATERIAIS RECO",
    "TROCA DE PIX POR DINHEIRO VIVO",
    "ÁGUA",
    "INTERNET",
    "TELEFONIA",
    "ALUGUEL GALPÃO",
    "IPTU",
    "CONTABILIDADE",
    "ERP / SISTEMA",
    "ENERGIA ELÉTRICA INDUSTRIAL",
    "MANUTENÇÃO DE PRENSAS",
    "MANUTENÇÃO DE TRITURADORES",
    "SEGURANÇA PATRIMONIAL",
    "MÃO DE OBRA OPERACIONAL",
    "MANUTENÇÃO PREVENTIVA",
    "MANUTENÇÃO CORRETIVA",
    "PNEUS",
    "SEGURO FROTA",
    "IPVA / LICENCIAMENTO",
    "RASTREAMENTO",
    "COMPRA VEÍCULO",
    "SALÁRIOS",
    "TRABALHO TEMPORARIO",
    "ADICIONAL INSALUBRIDADE",
    "FGTS",
    "13º (PROVISÃO)",
    "FÉRIAS (PROVISÃO)",
    "RESCISÕES (PROVISÃO)",
    "INSS",
    "SIMPLES NACIONAL",
    "MEI FUNCIONARIO",
    "ASSISTENCIA ODONTOLOGICA",
    "ASSISTENCIA MEDICA",
    "VALE REFEICAO",
    "CESTA BASICA",
    "SALÁRIO ADRIANA",
    "CONSORCIO",
    "CARTÃO DE CREDITO",
    "FACULDADE",
    "OUTRAS DESPESAS"
  ];

  // --- LÓGICA DE FILTRO DIÁRIO + BUSCA ---
  const filteredFinancials = financials.filter(f => {
    if (!f.date) return false;
    const matchesStartDate = startDate ? f.date >= startDate : true;
    const matchesEndDate = endDate ? f.date <= endDate : true;
    
    const descriptionText = (f.description || '').toLowerCase();
    const categoryText = (f.category || '').toLowerCase();
    const searchText = searchDescription.toLowerCase();
    
    const matchesSearch = descriptionText.includes(searchText) || categoryText.includes(searchText);
    
    return matchesStartDate && matchesEndDate && matchesSearch;
  });

  // --- STATS CALCULADOS ---
  // 1. Saldo Real Geral (Banco + Caixinha)
  const totalHistoricoReceita = financials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0);
  const totalHistoricoDespesa = financials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0);
  const saldoTotalGeral = totalHistoricoReceita - totalHistoricoDespesa;

  // 2. Quadro Caixinha (Dinheiro Vivo em mãos no Local)
  // Calcula tudo que foi marcado com a forma de pagamento 'dinheiro' no histórico geral
  const caixinhaEntradas = financials.filter(f => f.type === 'receita' && f.paymentMethod === 'dinheiro').reduce((a, b) => a + Number(b.value || 0), 0);
  const caixinhaSaidas = financials.filter(f => f.type === 'despesa' && f.paymentMethod === 'dinheiro').reduce((a, b) => a + Number(b.value || 0), 0);
  
  // Tratamento da Categoria Especial de Troca de PIX por Dinheiro Vivo (Gera dinheiro físico no local)
  const trocasPixParaDinheiro = financials.filter(f => f.category === 'TROCA DE PIX POR DINHEIRO VIVO').reduce((a, b) => a + Number(b.value || 0), 0);
  
  const saldoCaixinhaFisico = (caixinhaEntradas + trocasPixParaDinheiro) - caixinhaSaidas;

  // 3. Saldo Líquido na Conta Bancária (Total Geral menos o que está em espécie)
  const saldoBancarioDisponivel = saldoTotalGeral - saldoCaixinhaFisico;

  // Stats do período filtrado
  const periodStats = {
    revenue: filteredFinancials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0),
    expense: filteredFinancials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0),
  };

  const handleClearAll = async () => {
    const confirm = window.confirm("🚨 ATENÇÃO: Isso vai apagar TODOS os lançamentos financeiros permanentemente do Firebase. Confirma?");
    if (!confirm) return;
    setIsCleaning(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'financials'));
      const batch = writeBatch(db);
      querySnapshot.forEach((documento) => { batch.delete(doc(db, 'financials', documento.id)); });
      await batch.commit();
      notify("Financeiro zerado com sucesso!");
    } catch (error: any) { alert("Erro ao limpar banco: " + error.message); } finally { setIsCleaning(false); }
  };

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
              paymentMethod: 'banco', // PDF presume movimentação bancária
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
        paymentMethod: fd.get('paymentMethod') as string, // Capta se é PIX/Banco ou Dinheiro Vivo
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
          <button onClick={handleClearAll} disabled={isCleaning} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all">
            <Trash2 size={14}/> {isCleaning ? 'ZERANDO...' : 'ZERAR CAIXA'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:border-indigo-600 transition-all">
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />} IMPORTAR PDF
          </button>
          <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
            <Plus size={16}/> NOVO LANÇAMENTO
          </button>
        </div>
      </div>

      {/* QUADROS DE RESUMO INTEGRADOS (SALDO TOTAL / DISPONÍVEL BANCO / CAIXINHA FISICO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10"><Landmark size={90} /></div>
          <div className="relative z-10">
            <span className="text-[9px] font-black opacity-60 uppercase tracking-widest block mb-2">Saldo Geral Conciliado</span>
            <p className="text-2xl font-black text-indigo-400 leading-none">{formatCurrency(saldoTotalGeral)}</p>
          </div>
        </div>

        {/* NOVO QUADRO: CAIXINHA DINHEIRO VIVO */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 text-emerald-600"><Coins size={90} /></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Coins size={14}/></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dinheiro no Local (Caixinha)</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 leading-none">{formatCurrency(saldoCaixinhaFisico)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ganhos Filtrados</span>
          <p className="text-2xl font-black text-emerald-600 leading-none">{formatCurrency(periodStats.revenue)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gastos Filtrados</span>
          <p className="text-2xl font-black text-rose-600 leading-none">{formatCurrency(periodStats.expense)}</p>
        </div>
      </div>

      {/* FILTROS DE DIAS E BUSCA */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" value={searchDescription} onChange={e => setSearchDescription(e.target.value)}
              placeholder="Buscar por descrição ou categoria..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:ring-2 ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase">De:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-[10px] outline-none text-slate-700 uppercase cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-auto">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Até:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-[10px] outline-none text-slate-700 uppercase cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
           Exibindo {filteredFinancials.length} transações
        </div>
      </div>

      {/* TABELA DE HISTÓRICO FILTRADA */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Meio</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredFinancials.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-8 py-16 text-center"><p className="font-bold text-slate-300 uppercase text-xs">Nenhum lançamento localizado neste período.</p></td>
                </tr>
              ) : (
                filteredFinancials.sort((a, b) => b.date.localeCompare(a.date)).map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-400 text-xs">{f.date.split('-').reverse().join('/')}</td>
                    <td className="px-8 py-5 font-bold text-slate-500 text-xs"><span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] uppercase font-black">{f.category || 'GERAL'}</span></td>
                    <td className="px-8 py-5 font-bold text-slate-400 text-[10px] uppercase">
                      <span className={`px-2 py-0.5 rounded ${f.paymentMethod === 'dinheiro' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {f.paymentMethod === 'dinheiro' ? 'DINHEIRO VIVO' : 'PIX / BANCO'}
                      </span>
                    </td>
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

      {/* MODAL COM CAMPOS ADAPTADOS */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">Novo Lançamento</h2>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 text-center py-3.5 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-emerald-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden" /> Receita
                 </label>
                 <label className="flex-1 text-center py-3.5 cursor-pointer has-[:checked]:bg-white has-[:checked]:text-rose-600 has-[:checked]:shadow-sm rounded-xl text-[10px] font-black uppercase transition-all">
                    <input type="radio" name="type" value="despesa" className="hidden" /> Despesa
                 </label>
              </div>

              {/* SELEÇÃO DO MEIO DE PAGAMENTO: DIRECIONA PRO CAIXINHA OU BANCO */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Meio de Movimentação</label>
                <select name="paymentMethod" required className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs uppercase outline-none cursor-pointer">
                  <option value="banco">PIX / CONTA BANCÁRIA</option>
                  <option value="dinheiro">DINHEIRO VIVO (RETIRAR/INSERIR NO CAIXINHA)</option>
                </select>
              </div>

              {/* SELEÇÃO DE CATEGORIAS OFICIAIS REESTRUTURADA */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Categoria de Lançamento</label>
                <select name="category" required className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs uppercase outline-none cursor-pointer">
                  {categoriasPredefinidas.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Descrição Detalhada</label>
                <input name="description" required placeholder="EX: COMPRA DE LUVAS / TROCA DE VALOR" className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 ring-indigo-100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Valor (R$)</label>
                  <input name="value" type="number" step="0.01" required placeholder="R$ 0,00" className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Data</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none" />
                </div>
              </div>

              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all mt-4">
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
