import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Trash2, AlertTriangle } from 'lucide-react';
import { FinancialRecord } from '../types';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [isCleaning, setIsCleaning] = useState(false);

  // FUNÇÃO QUE LIMPA O BANCO INTEIRO
  const handleClearAll = async () => {
    const confirm = window.confirm("🚨 ATENÇÃO: Isso vai apagar TODOS os lançamentos financeiros permanentemente. Confirma?");
    if (!confirm) return;

    setIsCleaning(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'financials'));
      const batch = writeBatch(db);

      querySnapshot.forEach((documento) => {
        batch.delete(doc(db, 'financials', documento.id));
      });

      await batch.commit();
      notify("Financeiro zerado com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao limpar: " + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
        <div>
          <h2 className="text-xl font-black uppercase text-slate-800">Financeiro Industrial</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Fluxo de Caixa</p>
        </div>

        {/* BOTÃO DE LIMPEZA */}
        <button 
          onClick={handleClearAll}
          disabled={isCleaning}
          className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase hover:bg-rose-100 transition-all border border-rose-100"
        >
          {isCleaning ? "LIMPANDO..." : <><Trash2 size={16}/> Limpar Tudo (Zerar)</>}
        </button>
      </div>

      {/* LISTA DE TRANSAÇÕES ABAIXO... (Mantenha o resto do seu código de tabela aqui) */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
          <p className="text-center font-bold text-slate-400 py-10">
            {financials.length === 0 ? "Nenhum lançamento encontrado. Banco limpo!" : `Existem ${financials.length} lançamentos no banco.`}
          </p>
      </div>
    </div>
  );
};

export default FinanceiroView;