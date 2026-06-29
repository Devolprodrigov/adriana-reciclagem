import React, { useState } from 'react';
import { FileText, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

const NFView: React.FC = () => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const urlEmissorSebrae = "https://18560350000178.emissornfe.sebrae.com.br/index-sebrae.html#/home";

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col space-y-4 animate-in fade-in duration-500">
      
      {/* BARRA DE CONTROLE INTEGRADA */}
      <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Emissor SEBRAE Integrado</h3>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} /> Conexão Segura Oficial
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* BOTÃO PARA FORÇAR ATUALIZAÇÃO DO IFRAME SE NECESSÁRIO */}
          <button 
            onClick={() => {
              setIframeLoading(true);
              const iframe = document.getElementById('sebrae-iframe') as HTMLIFrameElement;
              if (iframe) iframe.src = urlEmissorSebrae;
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all"
          >
            <RefreshCw size={12} className={iframeLoading ? 'animate-spin' : ''} /> Recarregar Painel
          </button>

          {/* LINK EXTERNO DE SEGURANÇA CASO QUEIRA ABRIR FORA */}
          <a 
            href={urlEmissorSebrae} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            Abrir em Nova Aba <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* JANELA DE VISUALIZAÇÃO DA INTERNET (IFRAME) */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative min-h-[500px]">
        {iframeLoading && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 z-50">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
              Conectando com o Servidor do SEBRAE...
            </p>
          </div>
        )}
        
        <iframe
          id="sebrae-iframe"
          src={urlEmissorSebrae}
          title="Emissor Nota Fiscal SEBRAE"
          className="w-full h-full border-none"
          onLoad={() => setIframeLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default NFView;
