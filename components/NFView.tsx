import React, { useState, useMemo } from 'react';
import { FileText, ExternalLink, ShieldCheck, ArrowUpRight, HelpCircle, Calendar, Printer, Search, Layers } from 'lucide-react';
import { FinancialRecord, Product } from '../types';

interface Props {
  financials?: FinancialRecord[];
  products?: Product[];
  notify?: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const NFView: React.FC<Props> = ({ financials = [], products = [], notify = () => {} }) => {
  const urlEmissorSebrae = "https://18560350000178.emissornfe.sebrae.com.br/index-sebrae.html#/home";
  
  const [activeTab, setActiveTab] = useState<'emissor' | 'relatorio'>('emissor');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');

  const filteredEntries = useMemo(() => {
    return financials.filter(f => {
      if (!f.date) return false;
      const matchesStart = startDate ? f.date >= startDate : true;
      const matchesEnd = endDate ? f.date <= endDate : true;
      const desc = (f.description || '').toUpperCase();
      const matchesPart = selectedPartner ? desc.includes(selectedPartner.toUpperCase()) : true;
      return matchesStart && matchesEnd && matchesPart;
    });
  }, [financials, startDate, endDate, selectedPartner]);

  const partnersList = useMemo(() => {
    const setNames = new Set<string>();
    financials.forEach(f => {
      if (f.description && f.description.includes(' - ')) {
        const parts = f.description.split(' - ');
        if (parts[1]) setNames.add(parts[1].trim().toUpperCase());
      }
    });
    return Array.from(setNames).sort();
  }, [financials]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* ESTILOS CSS PARA IMPRESSÃO LIMPA (OCULTA MENUS E BOTÕES) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* SELETOR DE ABAS (Oculto na impressão) */}
      <div className="flex bg-white p-2 rounded-3xl border border-slate-100 shadow-sm max-w-md mx-auto no-print">
        <button
          onClick={() => setActiveTab('emissor')}
          className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'emissor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText size={16} /> Emissor de Notas
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'relatorio' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers size={16} /> Relatório Analítico
        </button>
      </div>

      {activeTab === 'emissor' ? (
        <div className="no-print space-y-6">
          {/* CARD PRINCIPAL DE ACESSO */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-sm">
              <FileText size={40} />
            </div>
            
            <div className="space-y-2 max-w-lg">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Emissor Fiscal Integrado</h3>
              <p className="text-xs font-bold text-slate-400">
                Por normas de segurança da SEFAZ e do SEBRAE, o painel de faturamento deve ser operado em ambiente isolado e seguro para garantir a validação do seu Certificado Digital.
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={14} /> Link Verificado e Criptografado
            </div>

            <hr className="w-full border-slate-100" />

            <a 
              href={urlEmissorSebrae} 
              target="_blank" 
              rel="noreferrer"
              className="w-full max-w-md py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group"
            >
              Acessar Painel SEBRAE Agora 
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
              <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
                <ExternalLink size={16} />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Sessão Exclusiva</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-1">
                  O link acima aponta diretamente para o ambiente dedicado da **Adriana Reciclagem**.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
              <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
                <HelpCircle size={16} />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Fechamento de Caixa</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-1">
                  Após emitir a nota fiscal, lembre-se de conferir se a movimentação foi lançada na aba **Financeiro**.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ABA DE RELATÓRIO ANALÍTICO - ENVOLVIDA PELA TAG COM ID printable-report */
        <div id="printable-report" className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">ADRIANA RECICLAGEM LTDA</span>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatório Analítico de Entradas / Operações</h3>
              {startDate && endDate && (
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  Período de: {startDate.split('-').reverse().join('/')} até {endDate.split('-').reverse().join('/')}
                </p>
              )}
            </div>
            <button
              onClick={handlePrint}
              className="no-print flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-900 transition-all shadow-md"
            >
              <Printer size={16} /> Imprimir / Salvar PDF
            </button>
          </div>

          {/* FILTROS DO RELATÓRIO (Ocultos na impressão) */}
          <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Filtrar por Fornecedor/Parceiro</label>
              <select
                value={selectedPartner}
                onChange={e => setSelectedPartner(e.target.value)}
                className="w-full bg-white p-3 rounded-xl font-black text-xs uppercase outline-none border border-slate-200"
              >
                <option value="">TODOS OS FORNECEDORES</option>
                {partnersList.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Data Inicial</label>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200">
                <Calendar size={14} className="text-indigo-600 shrink-0" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-xs outline-none text-slate-700 uppercase w-full" />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Data Final</label>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200">
                <Calendar size={14} className="text-indigo-600 shrink-0" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-xs outline-none text-slate-700 uppercase w-full" />
              </div>
            </div>
          </div>

          {/* TABELA DO RELATÓRIO */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição / Fornecedor</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-bold uppercase">
                      Nenhum registro encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.sort((a, b) => b.date.localeCompare(a.date)).map((entry, idx) => (
                    <tr key={entry.id || idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-500">{entry.date.split('-').reverse().join('/')}</td>
                      <td className="px-6 py-4 font-black text-slate-800 uppercase">{entry.description}</td>
                      <td className="px-6 py-4 font-bold text-slate-500 uppercase">
                        <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black">
                          {entry.category || 'GERAL'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${entry.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(entry.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default NFView;
