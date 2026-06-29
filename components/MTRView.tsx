import React, { useState } from 'react';
import { Truck, ClipboardList, ExternalLink, ShieldCheck, ArrowUpRight, HelpCircle, AlertTriangle, FileText, UserPlus, CheckCircle2 } from 'lucide-react';

interface Props {
  notify: (m: string) => void;
}

const MTRView: React.FC<Props> = ({ notify }) => {
  const urlSinirMtr = "https://mtr.sinir.gov.br/#/";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* CARD PRINCIPAL DE ACESSO */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center shadow-sm">
          <Truck size={40} />
        </div>
        
        <div className="space-y-2 max-w-lg">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manifesto de Resíduos (MTR)</h3>
          <p className="text-xs font-bold text-slate-400">
            Para emitir o Manifesto de Transporte de Resíduos oficial e evitar multas ambientais pesadas, a operação deve ser registrada diretamente no órgão federal competente do SINIR.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
          <ShieldCheck size={14} /> Sistema Homologado SINIR / MMA
        </div>

        <hr className="w-full border-slate-100" />

        {/* BOTÃO DE DISPARO RÁPIDO PARA O GOVERNO */}
        <a 
          href={urlSinirMtr} 
          target="_blank" 
          rel="noreferrer"
          className="w-full max-w-md py-5 bg-amber-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-3 group"
        >
          Acessar Portal MTR SINIR 
          <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>

      {/* GUIA DE FLUXO DO PROCESSO */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <ClipboardList size={16} className="text-amber-600" /> Passos Obrigatórios para a Carga
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { id: 1, label: 'Cadastro Inicial', desc: 'Sua empresa e o destino devem estar cadastrados no portal do SINIR.', icon: <UserPlus size={16}/> },
            { id: 2, label: 'Emitir MTR', desc: 'Gere o manifesto informando a quantidade em KG e a placa do veículo.', icon: <FileText size={16}/> },
            { id: 3, label: 'Transportar', desc: 'O motorista deve portar obrigatoriamente o PDF impresso ou digital na viagem.', icon: <Truck size={16}/> },
            { id: 4, label: 'Baixar / CDF', desc: 'O destinador confirma o recebimento e encerra o ciclo gerando o CDF.', icon: <CheckCircle2 size={16}/> },
          ].map((s) => (
            <div key={s.id} className="p-5 bg-slate-50 border border-slate-100/70 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs font-black">
                  {s.id}
                </div>
                <div className="text-amber-600">{s.icon}</div>
              </div>
              <p className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{s.label}</p>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CARD DE ADVERTÊNCIA E INFORMAÇÕES EXTRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-wider">Atenção com a Fiscalização</h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              O transporte de sucatas e materiais recicláveis sem o devido MTR eletrônico é infração ambiental. Certifique-se de que a placa informada confere com o caminhão.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 items-start">
          <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
            <HelpCircle size={16} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Integração do Pátio</h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Utilize o peso final travado no módulo de **Pedidos** do seu ERP Adriana para preencher com precisão milimétrica a quantidade exata demandada no SINIR.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MTRView;
