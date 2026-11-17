import React, { useState, useMemo } from 'react';
import { History, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownLeft, Activity, Filter, BarChart2, Package } from 'lucide-react';
import { FinancialRecord, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  financials: FinancialRecord[];
  products: Product[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const StatBox = ({ title, value, sub, color, icon: Icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
    </div>
    <p className={`text-2xl font-black text-slate-800`}>{value}</p>
    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{sub}</p>
  </div>
);

const DashboardView: React.FC<Props> = ({ financials, products }) => {
  const [selectedFilter, setSelectedFilter] = useState<'mes_atual' | 'mes_anterior' | 'todos'>('todos');
  const [materialViewMode, setMaterialViewMode] = useState<'top15' | 'bottom15'>('top15');
  const [financialMetricMode, setFinancialMetricMode] = useState<'ambos' | 'receita' | 'despesa'>('ambos');

  const filteredFinancials = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    return financials.filter(f => {
      if (!f.date) return false;
      if (selectedFilter === 'mes_atual') return f.date.startsWith(currentYearMonth);
      if (selectedFilter === 'mes_anterior') return f.date.startsWith(prevYearMonth);
      return true;
    });
  }, [financials, selectedFilter]);

  const stats = useMemo(() => {
    const revenue = filteredFinancials
      .filter(f => f.type === 'receita' || f.type === 'entrada')
      .reduce((a, b) => a + Number(b.value), 0);
      
    const expense = filteredFinancials
      .filter(f => f.type === 'despesa' || f.type === 'saida')
      .reduce((a, b) => a + Number(b.value), 0);
      
    const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock)).length;
    const estimatedNetProfit = revenue > 0 ? (revenue - expense) * 0.85 : 0; 
    
    return { revenue, expense, balance: revenue - expense, lowStock, estimatedNetProfit };
  }, [filteredFinancials, products]);

  const yearlyComparisonData = useMemo(() => {
    const monthsMap: { [key: string]: { name: string; receita: number; despesa: number; saldo: number } } = {
      '01': { name: 'Jan', receita: 0, despesa: 0, saldo: 0 },
      '02': { name: 'Fev', receita: 0, despesa: 0, saldo: 0 },
      '03': { name: 'Mar', receita: 0, despesa: 0, saldo: 0 },
      '04': { name: 'Abr', receita: 0, despesa: 0, saldo: 0 },
      '05': { name: 'Mai', receita: 0, despesa: 0, saldo: 0 },
      '06': { name: 'Jun', receita: 0, despesa: 0, saldo: 0 },
      '07': { name: 'Jul', receita: 0, despesa: 0, saldo: 0 },
      '08': { name: 'Ago', receita: 0, despesa: 0, saldo: 0 },
      '09': { name: 'Set', receita: 0, despesa: 0, saldo: 0 },
      '10': { name: 'Out', receita: 0, despesa: 0, saldo: 0 },
      '11': { name: 'Nov', receita: 0, despesa: 0, saldo: 0 },
      '12': { name: 'Dez', receita: 0, despesa: 0, saldo: 0 },
    };

    const currentYear = new Date().getFullYear().toString();

    financials.forEach(f => {
      if (!f.date) return;
      const [year, month] = f.date.split('-');
      if (year === currentYear && monthsMap[month]) {
        const val = Number(f.value) || 0;
        if (f.type === 'receita' || f.type === 'entrada') {
          monthsMap[month].receita += val;
        } else if (f.type === 'despesa' || f.type === 'saida') {
          monthsMap[month].despesa += val;
        }
        monthsMap[month].saldo = monthsMap[month].receita - monthsMap[month].despesa;
      }
    });

    return Object.values(monthsMap);
  }, [financials]);

  // NOVO RANKING FOCADO EXCLUSIVAMENTE EM MATERIAIS / PRODUTOS
  const materialRankingData = useMemo(() => {
    const productMap: { [key: string]: { name: string; fullName: string; totalValor: number } } = {};

    // 1. Inicializar com todos os produtos/materiais cadastrados no catálogo
    products.forEach(p => {
      const prodName = p.name ? p.name.trim() : 'Material sem nome';
      const cleanName = prodName.length > 25 ? prodName.substring(0, 22) + '...' : prodName;
      if (!productMap[prodName]) {
        productMap[prodName] = { name: cleanName, fullName: prodName, totalValor: Number(p.stock) || 0 };
      }
    });

    // 2. Cruzar com lançamentos financeiros que contenham o nome do material na descrição ou categoria
    filteredFinancials.forEach(f => {
      const desc = (f.description || '').toUpperCase();
      const cat = (f.category || '').toUpperCase();
      const val = Number(f.value) || 0;

      products.forEach(p => {
        const pName = p.name ? p.name.trim() : '';
        const pNameUpper = pName.toUpperCase();
        if (pName && (desc.includes(pNameUpper) || cat.includes(pNameUpper))) {
          if (productMap[pName]) {
            productMap[pName].totalValor += val;
          }
        }
      });
    });

    const list = Object.values(productMap);
    list.sort((a, b) => b.totalValor - a.totalValor);

    if (materialViewMode === 'top15') {
      return list.slice(0, 15);
    } else {
      return [...list].reverse().slice(0, 15);
    }
  }, [products, filteredFinancials, materialViewMode]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">ADRIANA RECICLAGEM</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Painel de Gestão e Inteligência Operacional</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-sm">
            <Filter size={14} className="text-slate-400 ml-2" />
            <button onClick={() => setSelectedFilter('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedFilter === 'todos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Geral</button>
            <button onClick={() => setSelectedFilter('mes_atual')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedFilter === 'mes_atual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Mês Atual</button>
            <button onClick={() => setSelectedFilter('mes_anterior')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedFilter === 'mes_anterior' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Mês Anterior</button>
          </div>

          <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity size={16} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Status do Sistema</p>
              <p className="text-xs font-bold text-slate-700">Conectado ao Firestore</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatBox title="Receita Bruta" value={formatCurrency(stats.revenue)} sub="Total acumulado" color="bg-emerald-500 text-emerald-600" icon={ArrowUpRight} />
        <StatBox title="Gastos Operacionais" value={formatCurrency(stats.expense)} sub="Custos de compra" color="bg-rose-500 text-rose-600" icon={ArrowDownLeft} />
        <StatBox title="Saldo em Caixa" value={formatCurrency(stats.balance)} sub="Disponível real" color="bg-indigo-500 text-indigo-600" icon={TrendingUp} />
        <StatBox title="Lucro Líquido Est." value={formatCurrency(stats.estimatedNetProfit)} sub="Margem real aprox." color="bg-teal-500 text-teal-600" icon={BarChart2} />
        
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-amber-500 text-white">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.lowStock} Alertas</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">Itens abaixo do mínimo</p>
        </div>
      </div>

      {/* GRÁFICO 1: COMPARATIVO ANUAL */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
         <div>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight">
                <TrendingUp size={20} className="text-indigo-600"/> Comparativo Anual (Custos e Ganhos)
              </h3>
              
              <div className="bg-slate-50 p-1 rounded-xl flex items-center gap-1 border border-slate-100">
                <button onClick={() => setFinancialMetricMode('ambos')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${financialMetricMode === 'ambos' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Ambos</button>
                <button onClick={() => setFinancialMetricMode('receita')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${financialMetricMode === 'receita' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Ganhos</button>
                <button onClick={() => setFinancialMetricMode('despesa')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${financialMetricMode === 'despesa' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}>Custos</button>
              </div>
           </div>
           <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Evolução financeira mês a mês no ano atual</p>
         </div>

         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} formatter={(val: any) => formatCurrency(Number(val))} />
                <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '15px'}} />
                {(financialMetricMode === 'ambos' || financialMetricMode === 'receita') && (
                  <Bar dataKey="receita" name="Ganhos (R$)" fill="#10b981" radius={[8, 8, 0, 0]} barSize={22} />
                )}
                {(financialMetricMode === 'ambos' || financialMetricMode === 'despesa') && (
                  <Bar dataKey="despesa" name="Custos (R$)" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={22} />
                )}
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* GRÁFICO 2: RANKING EXCLUSIVO DE MATERIAIS */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
         <div>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight">
                <Package size={20} className="text-indigo-600"/> Ranking de Materiais (Produtos)
              </h3>
              
              <div className="bg-slate-50 p-1 rounded-xl flex items-center gap-1 border border-slate-100">
                <button onClick={() => setMaterialViewMode('top15')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${materialViewMode === 'top15' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Top 15 Mais</button>
                <button onClick={() => setMaterialViewMode('bottom15')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${materialViewMode === 'bottom15' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Top 15 Menos</button>
              </div>
           </div>
           <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-wider">
             {materialViewMode === 'top15' ? 'Materiais com maior saída e volume financeiro' : 'Materiais com menor movimentação'}
           </p>
         </div>

         <div className="h-[550px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialRankingData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                <YAxis type="category" dataKey="name" width={200} axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#475569'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} formatter={(val: any, name: any, item: any) => [formatCurrency(Number(val)), item.payload.fullName]} />
                <Bar dataKey="totalValor" name="Volume Financeiro (R$)" fill={materialViewMode === 'top15' ? '#4f46e5' : '#f59e0b'} radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* ÚLTIMOS LANÇAMENTOS */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-sm tracking-tight"><History size={20} className="text-indigo-600"/> Últimos Lançamentos Filtrados</h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {filteredFinancials.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhuma movimentação neste período</p>
            </div>
          ) : (
            filteredFinancials.slice(0, 5).map(f => (
              <div key={f.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                <div>
                  <p className="font-black text-slate-700 text-xs uppercase">{f.description || 'Lançamento sem título'}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                    {f.category} • {f.date ? new Date(f.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${f.type === 'receita' || f.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'receita' || f.type === 'entrada' ? '+' : '-'} {formatCurrency(f.value)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
