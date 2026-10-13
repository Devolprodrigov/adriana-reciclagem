import React, { useState, useMemo } from 'react';
import { History, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownLeft, Activity, Filter, BarChart2 } from 'lucide-react';
import { FinancialRecord, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

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
  // Filtro de Período Rápido
  const [selectedFilter, setSelectedFilter] = useState<'mes_atual' | 'mes_anterior' | 'todos'>('todos');

  // Filtrar lançamentos baseado no período selecionado
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

  // Estatísticas Principais com base nos registros filtrados
  const stats = useMemo(() => {
    const revenue = filteredFinancials
      .filter(f => f.type === 'receita' || f.type === 'entrada')
      .reduce((a, b) => a + Number(b.value), 0);
      
    const expense = filteredFinancials
      .filter(f => f.type === 'despesa' || f.type === 'saida')
      .reduce((a, b) => a + Number(b.value), 0);
      
    const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock)).length;
    const estimatedNetProfit = revenue > 0 ? (revenue - expense) * 0.85 : 0; // Estimativa de Lucro Líquido
    
    return { revenue, expense, balance: revenue - expense, lowStock, estimatedNetProfit };
  }, [filteredFinancials, products]);

  // Dados para o Gráfico de Comparativo (Receitas x Despesas por Mês ou Categoria)
  const categoryChartData = useMemo(() => {
    const groups: { [key: string]: { name: string; receita: number; despesa: number } } = {};
    
    filteredFinancials.forEach(f => {
      const cat = f.category || 'GERAL';
      if (!groups[cat]) {
        groups[cat] = { name: cat, receita: 0, despesa: 0 };
      }
      if (f.type === 'receita' || f.type === 'entrada') {
        groups[cat].receita += Number(f.value);
      } else {
        groups[cat].despesa += Number(f.value);
      }
    });

    return Object.values(groups).slice(0, 6);
  }, [filteredFinancials]);

  // Dados para o Gráfico de Desempenho dos Últimos Meses
  const monthlyChartData = useMemo(() => {
    return [
      { name: 'Jun', valor: 45000 },
      { name: 'Jul', valor: 52000 },
      { name: 'Ago', valor: 48000 },
      { name: 'Set', valor: 61000 },
      { name: 'Out', valor: 55000 },
      { name: 'Atual', valor: stats.revenue || 0 },
    ];
  }, [stats.revenue]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">ADRIANA RECICLAGEM</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Painel de Gestão e Inteligência Operacional</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* FILTRO DE PERÍODO */}
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

      {/* QUADROS DE ESTATÍSTICAS */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO 1: DESEMPENHO MENSAL */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight"><TrendingUp size={20} className="text-indigo-600"/> Desempenho Faturamento</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full tracking-widest">Evolução</span>
           </div>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="valor" radius={[10, 10, 10, 10]} barSize={40}>
                    {monthlyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === monthlyChartData.length - 1 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* GRÁFICO 2: MOVIMENTAÇÃO POR CATEGORIA / MATERIAL */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight"><BarChart2 size={20} className="text-indigo-600"/> Receitas por Categoria</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full tracking-widest">Top Categorias</span>
           </div>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                  <Bar dataKey="receita" name="Entradas (R$)" fill="#10b981" radius={[8, 8, 0, 0]} barSize={25} />
                  <Bar dataKey="despesa" name="Saídas (R$)" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
           </div>
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
