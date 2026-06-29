import React from 'react';
import { FileText, ExternalLink, ShieldCheck, ArrowUpRight, HelpCircle } from 'lucide-react';

const NFView: React.FC = () => {
  const urlEmissorSebrae = "https://18560350000178.emissornfe.sebrae.com.br/index-sebrae.html#/home";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      
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

        {/* BOTÃO DE DISPARO RÁPIDO */}
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

      {/* CARD DE INFORMAÇÕES EXTRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
          <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
            <ExternalLink size={16} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Sessão Exclusiva</h4>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              O link acima aponta diretamente para o ambiente dedicado da **Adriana Reciclagem**, agilizando o preenchimento dos dados.
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
              Após emitir a nota fiscal por lá, lembre-se de conferir se a movimentação financeira foi devidamente lançada na aba **Financeiro** do seu ERP.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default NFView;
