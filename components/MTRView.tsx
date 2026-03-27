
import React, { useState } from 'react';
import { Truck, ClipboardList, ExternalLink, CheckCircle2, AlertTriangle, FileText, Download, UserPlus, MapPin, ShieldAlert } from 'lucide-react';

interface Props {
  notify: (m: string) => void;
}

const MTRView: React.FC<Props> = ({ notify }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSimulateMTR = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      notify("MTR Gerado com Sucesso! (Simulação)");
      setStep(3);
      // Automatically trigger print simulation
      handlePrint();
    }, 1500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify("Erro ao abrir janela de impressão. Verifique se o bloqueador de popups está ativo.");
      return;
    }

    const mtrNumber = "2024-88592";
    const date = new Date().toLocaleDateString('pt-BR');

    printWindow.document.write(`
      <html>
        <head>
          <title>MTR - ${mtrNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: bold; }
            .section { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .label { font-size: 10px; color: #888; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">MANIFESTO DE TRANSPORTE DE RESÍDUOS (MTR)</div>
            <div style="text-align: right">
              <div>NÚMERO: <strong>${mtrNumber}</strong></div>
              <div>DATA: ${date}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">1. Dados do Gerador</div>
            <div class="grid">
              <div>
                <div class="label">Razão Social</div>
                <div class="value">ADRIANA RECICLAGEM LTDA</div>
              </div>
              <div>
                <div class="label">CNPJ</div>
                <div class="value">18.560.350/0001-78</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Identificação do Resíduo</div>
            <div class="grid">
              <div>
                <div class="label">Código ABNT/NBR 10004</div>
                <div class="value">15 01 04 - Embalagens metálicas</div>
              </div>
              <div>
                <div class="label">Classe</div>
                <div class="value">Classe II A - Não Inerte</div>
              </div>
              <div>
                <div class="label">Quantidade Estimada</div>
                <div class="value">1.250 KG</div>
              </div>
              <div>
                <div class="label">Estado Físico</div>
                <div class="value">Sólido</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. Dados do Transportador</div>
            <div class="grid">
              <div>
                <div class="label">Razão Social</div>
                <div class="value">TRANS-RESÍDUOS LOGÍSTICA</div>
              </div>
              <div>
                <div class="label">Placa do Veículo</div>
                <div class="value">ABC-1234</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">4. Dados do Destinador</div>
            <div class="grid">
              <div>
                <div class="label">Razão Social</div>
                <div class="value">ATERRO SANITÁRIO CENTRAL S/A</div>
              </div>
              <div>
                <div class="label">Localização</div>
                <div class="value">Curitiba - PR</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div style="border-top: 1px solid #000; text-align: center; padding-top: 10px;">
              <div class="label">Assinatura do Gerador</div>
            </div>
            <div style="border-top: 1px solid #000; text-align: center; padding-top: 10px;">
              <div class="label">Assinatura do Transportador</div>
            </div>
          </div>

          <div class="footer">
            Este documento foi gerado eletronicamente através do Sistema Integrado de Gestão de Resíduos.
            <br>Autenticidade pode ser verificada em mtr.sinir.gov.br
          </div>

          <script>
            window.onload = function() {
              window.print();
              // window.close(); // Optional: close after print
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Truck size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manifesto de Transporte de Resíduos (MTR)</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Controle Ambiental & Logística de Resíduos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { id: 1, label: 'Cadastro SINIR', icon: <UserPlus size={18}/> },
            { id: 2, label: 'Emissão MTR', icon: <ClipboardList size={18}/> },
            { id: 3, label: 'Transporte', icon: <Truck size={18}/> },
            { id: 4, label: 'Destinação / CDF', icon: <CheckCircle2 size={18}/> },
          ].map((s) => (
            <div key={s.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${step >= s.id ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${step >= s.id ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {s.id}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Passo a Passo Informativo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Info size={16} className="text-amber-600" /> Guia de Emissão
              </h4>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-6 h-6 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black">1</div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Cadastro no SINIR</p>
                    <p className="text-[10px] text-slate-500 mt-1">Acesse o portal oficial e cadastre-se como Gerador, Transportador ou Destinador.</p>
                    <a href="https://mtr.sinir.gov.br" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 mt-2 hover:underline">
                      mtr.sinir.gov.br <ExternalLink size={10}/>
                    </a>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black">2</div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Dados Obrigatórios</p>
                    <p className="text-[10px] text-slate-500 mt-1">Informe código ABNT/NBR 10004, classe do resíduo (I ou II) e dados das partes envolvidas.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black">3</div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Geração & Transporte</p>
                    <p className="text-[10px] text-slate-500 mt-1">O sistema gera o número do MTR. O motorista deve portar o PDF durante todo o trajeto.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black">4</div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Confirmação & CDF</p>
                    <p className="text-[10px] text-slate-500 mt-1">O destinador confirma o recebimento e gera o Certificado de Destinação Final (CDF).</p>
                  </div>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3">
                <ShieldAlert className="text-rose-600 shrink-0" size={18} />
                <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
                  A falta do MTR ou informações incorretas podem resultar em multas ambientais pesadas e apreensão da carga.
                </p>
              </div>
            </div>
          </div>

          {/* Simulador de Emissão */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-600" /> Simulador de Emissão MTR
              </h4>

              {/* Dados do Gerador (Sua Empresa) */}
              <div className="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h5 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-4">1. Dados do Gerador (Sua Empresa)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Razão Social</label>
                    <p className="font-bold text-slate-700 text-xs uppercase">ADRIANA RECICLAGEM LTDA</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">CNPJ</label>
                    <p className="font-bold text-slate-700 text-xs">18.560.350/0001-78</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Endereço</label>
                    <p className="font-bold text-slate-700 text-xs uppercase">Rua Rio Iguaçu, 1267 - Weissópolis, Pinhais - PR</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSimulateMTR} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Tipo de Resíduo (Código ABNT/NBR 10004)</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none">
                      <option>13 02 05 - Óleos minerais não clorados de motores</option>
                      <option>15 01 01 - Embalagens de papel e papelão</option>
                      <option>15 01 02 - Embalagens de plástico</option>
                      <option>15 01 03 - Embalagens de madeira</option>
                      <option>15 01 04 - Embalagens metálicas</option>
                      <option>20 01 40 - Metais (Resíduos Municipais)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Quantidade (KG)</label>
                    <input type="number" required placeholder="0.00" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Classe do Resíduo</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none">
                      <option>Classe I - Perigoso</option>
                      <option>Classe II A - Não Inerte</option>
                      <option>Classe II B - Inerte</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Placa do Veículo</label>
                    <input required placeholder="ABC-1234" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none uppercase" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Estado de Origem</label>
                    <input defaultValue="PR" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none uppercase" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Destinador Final</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input required placeholder="Razão Social do Destinador / Aterro" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-amber-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <>Gerar Manifesto MTR <FileText size={18}/></>
                  )}
                </button>
              </form>

              {step === 3 && (
                <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">MTR #2024-88592</p>
                        <p className="text-sm font-black text-slate-800">Documento Gerado com Sucesso</p>
                      </div>
                    </div>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      <Download size={14}/> Baixar PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><ClipboardList size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">MTRs Emitidos</p>
              <p className="text-sm font-black text-slate-800 mt-1">42 Documentos</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ExternalLink size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status SINIR</p>
              <p className="text-sm font-black text-emerald-600 mt-1 uppercase">CONECTADO</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pendências CDF</p>
              <p className="text-sm font-black text-slate-800 mt-1">03 Aguardando</p>
            </div>
         </div>
      </div>
    </div>
  );
};

const Info = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

export default MTRView;
