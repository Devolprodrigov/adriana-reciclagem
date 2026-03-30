
import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, RefreshCw, ChevronRight, TrendingUp, AlertCircle, Target, Wallet, Package } from 'lucide-react';
import { FinancialRecord, Product } from '../types';


interface Props {
  financials: FinancialRecord[];
  products: Product[];
}

const AIInsightsView: React.FC<Props> = ({ financials, products }) => {
  const [insight, setInsight] = useState<string>("");
  const [financialHealth, setFinancialHealth] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const stats = {
        receita: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
        despesa: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
        saldo: 0
      };
      stats.saldo = stats.receita - stats.despesa;

      const prompt = `Como um consultor de inteligência industrial sênior especializado no mercado de reciclagem de metais e sucatas (ADRIANA RECICLAGEM), analise os dados abaixo e forneça:
      1. TRÊS INSIGHTS ESTRATÉGICOS: Curtos, diretos e acionáveis (máximo 2 frases cada).
      2. RESUMO DE SAÚDE FINANCEIRA: Uma análise breve do fluxo de caixa atual.
      3. RECOMENDAÇÃO DE ESTOQUE: Qual material focar ou liquidar.

      Dados Financeiros Recentes: ${JSON.stringify(financials.slice(-15))}
      Resumo Financeiro Total: Receita ${stats.receita}, Despesa ${stats.despesa}, Saldo ${stats.saldo}
      Dados de Estoque: ${JSON.stringify(products.map(p => ({ nome: p.name, qtd: p.stock, min: p.minStock })))}
      
      Responda em português, com tom profissional e focado em lucro e eficiência operacional.
      Use o formato:
      ### Insights Estratégicos
      * [Insight 1]
      * [Insight 2]
      * [Insight 3]
      
      ### Saúde Financeira
      [Texto aqui]
      
      ### Recomendação de Estoque
      [Texto aqui]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "Não foi possível gerar insights no momento.";
      setInsight(text);
    } catch (error) {
      console.error(error);
      setInsight("Erro ao conectar com a IA da IronCore. Verifique sua chave de API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (financials.length > 0 || products.length > 0) {
      generateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-indigo-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Sparkles size={200} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <BrainCircuit size={24} className="text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Cérebro IronCore v2.0</h2>
          </div>
          <p className="text-indigo-100 font-bold mb-8 leading-relaxed text-lg">
            Análise avançada de fluxo de caixa e gestão de pátio. Nossa IA identifica gargalos financeiros e oportunidades de mercado em tempo real.
          </p>
          <button 
            onClick={generateInsights}
            disabled={loading}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {loading ? 'Processando Inteligência...' : 'Recalcular Estratégia'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Target size={16} className="text-indigo-600"/> Relatório de Inteligência
            </h3>
            {loading ? (
              <div className="space-y-6">
                <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded-full animate-pulse w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded-full animate-pulse w-2/3"></div>
                <div className="pt-8 space-y-4">
                  <div className="h-20 bg-slate-50 rounded-3xl animate-pulse"></div>
                  <div className="h-20 bg-slate-50 rounded-3xl animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-line ai-content">
                  {insight.split('###').map((section, idx) => {
                    if (!section.trim()) return null;
                    const lines = section.trim().split('\n');
                    const title = lines[0];
                    const content = lines.slice(1).join('\n');
                    
                    return (
                      <div key={idx} className="mb-8 last:mb-0">
                        <h4 className="text-slate-900 font-black uppercase tracking-tight text-lg mb-4 flex items-center gap-2">
                          {title.includes('Insights') && <Sparkles size={18} className="text-amber-500"/>}
                          {title.includes('Financeira') && <Wallet size={18} className="text-emerald-500"/>}
                          {title.includes('Estoque') && <Package size={18} className="text-blue-500"/>}
                          {title}
                        </h4>
                        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50">
                          {content}
                        </div>
                      </div>
                    );
                  })}
                  {!insight && <p className="text-slate-400 italic">Clique em "Recalcular Estratégia" para começar.</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-lg shadow-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="opacity-80"/>
              <h4 className="font-black text-xs uppercase tracking-widest opacity-80">Mercado de Metais</h4>
            </div>
            <p className="text-sm font-bold mb-6 leading-relaxed">O mercado de Cobre teve alta de 4.2% em LME hoje. Sugerimos priorizar a venda do estoque acumulado para maximizar margem.</p>
            <button className="w-full py-4 bg-white/20 hover:bg-white/30 transition-colors rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
              Análise de Commodities <ChevronRight size={14}/>
            </button>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-lg shadow-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-amber-400"/>
              <h4 className="font-black text-xs uppercase tracking-widest opacity-60">Risco Operacional</h4>
            </div>
            <p className="text-sm font-bold mb-6 leading-relaxed">Detectamos 3 itens abaixo do estoque de segurança. Risco de perda de vendas por falta de material para processamento.</p>
            <button className="w-full py-4 bg-white/20 hover:bg-white/30 transition-colors rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
              Plano de Reposição <ChevronRight size={14}/>
            </button>
          </div>

          <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-4">Dica do Cérebro</h4>
            <p className="text-xs font-bold text-indigo-900 leading-relaxed">
              "Manter um saldo de caixa 15% superior às despesas fixas mensais garante fôlego para compras de oportunidade em grandes lotes de sucata."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsView;
