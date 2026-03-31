import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, RefreshCw, ChevronRight, TrendingUp, AlertCircle, Target, Wallet, Package } from 'lucide-react';
import { FinancialRecord, Product } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import correto

interface Props {
  financials: FinancialRecord[];
  products: Product[];
}

const AIInsightsView: React.FC<Props> = ({ financials, products }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Use VITE_ se estiver usando Vite, ou garanta que a chave está no .env
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  const generateInsights = async () => {
    if (!API_KEY) {
      setInsight("Erro: Chave de API não configurada no ambiente.");
      return;
    }

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Versão estável e rápida
      
      const stats = {
        receita: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
        despesa: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
      };
      const saldo = stats.receita - stats.despesa;

      const prompt = `Você é o consultor de estratégia da ADRIANA RECICLAGEM.
      Analise estes dados reais do pátio e finanças:

      FINANCEIRO: Receita Total R$${stats.receita}, Despesa R$${stats.despesa}, Saldo R$${saldo}.
      Últimas transações: ${JSON.stringify(financials.slice(0, 10))}

      ESTOQUE ATUAL: ${JSON.stringify(products.map(p => ({ nome: p.name, qtd: p.stock, min: p.minStock })))}
      
      REGRAS DE RESPOSTA:
      1. Divida em 3 seções: "Insights Estratégicos", "Saúde Financeira" e "Recomendação de Estoque".
      2. Seja direto e use tom profissional de dono de empresa de reciclagem.
      3. Não use introduções como "Aqui está sua análise". Comece direto nos tópicos.
      4. Use formatação de tópicos limpa.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setInsight(text);
    } catch (error) {
      console.error("Erro na IA:", error);
      setInsight("Erro ao conectar com o Cérebro IronCore. Verifique a conexão e a API Key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (financials.length > 0 || products.length > 0) {
      generateInsights();
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Banner Principal */}
      <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
          <BrainCircuit size={200} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Sparkles size={24} className="text-amber-300" />
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase">Cérebro IronCore v2.5</h2>
          </div>
          <p className="text-indigo-100 font-bold mb-8 leading-relaxed">
            Análise preditiva de mercado e gestão de pátio. Nossa inteligência identifica oportunidades de lucro no setor de reciclagem em tempo real.
          </p>
          <button 
            onClick={generateInsights}
            disabled={loading}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {loading ? 'Analisando Dados...' : 'Recalcular Estratégia'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Insights Gerados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm min-h-[500px]">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Target size={16} className="text-indigo-600"/> Relatório de Inteligência Gerencial
            </h3>

            {loading ? (
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="h-6 bg-slate-100 rounded-full animate-pulse w-1/4"></div>
                  <div className="h-20 bg-slate-50 rounded-3xl animate-pulse w-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-6 bg-slate-100 rounded-full animate-pulse w-1/3"></div>
                  <div className="h-20 bg-slate-50 rounded-3xl animate-pulse w-full"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {insight ? (
                  insight.split(/(?=###|Insights Estratégicos|Saúde Financeira|Recomendação de Estoque)/g).map((section, idx) => {
                    if (!section.trim()) return null;
                    const cleanTitle = section.split('\n')[0].replace(/###/g, '').trim();
                    const cleanContent = section.split('\n').slice(1).join('\n').trim();

                    return (
                      <div key={idx} className="group">
                        <h4 className="text-slate-900 font-black uppercase tracking-tight text-md mb-4 flex items-center gap-2">
                          {cleanTitle.includes('Insights') && <TrendingUp size={18} className="text-amber-500"/>}
                          {cleanTitle.includes('Saúde') && <Wallet size={18} className="text-emerald-500"/>}
                          {cleanTitle.includes('Estoque') && <Package size={18} className="text-blue-500"/>}
                          {cleanTitle}
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group-hover:border-indigo-100 transition-colors whitespace-pre-line text-slate-600 font-bold text-sm leading-relaxed">
                          {cleanContent}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BrainCircuit size={48} className="text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold max-w-xs">Clique no botão acima para que a IA analise seus dados atuais.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Cards Fixos/Dicas */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-amber-400"/>
              <h4 className="font-black text-[10px] uppercase tracking-widest opacity-60">Alerta de Giro</h4>
            </div>
            <p className="text-sm font-bold leading-relaxed mb-6">
              O estoque de Alumínio está 20% acima da média histórica. Considere uma venda em lote para liberar capital de giro.
            </p>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 w-3/4"></div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4">
                <Sparkles size={20} />
             </div>
             <h4 className="font-black text-xs uppercase text-indigo-900 mb-2">Dica IronCore</h4>
             <p className="text-xs font-bold text-indigo-600 leading-relaxed">
               "Lotes de Metais Nobres (Cobre/Latão) devem ter prioridade de pesagem na entrada para evitar divergências financeiras no fechamento."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsView;