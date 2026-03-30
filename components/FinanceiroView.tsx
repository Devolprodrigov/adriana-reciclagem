
import React, { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw, Landmark, FileUp, ExternalLink, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

// Configuração do motor de PDF usando uma versão estável e compatível
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
import { db, auth } from '../firebase';
import { FinancialRecord, BankTransaction } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

declare global {
  interface Window {
    PluggyConnect: any;
  }
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankItemId, setBankItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBankItemId = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setBankItemId(userDoc.data().bankItemId || null);
        }
      } catch (error) {
        console.error("Error fetching bankItemId:", error);
      }
    };
    fetchBankItemId();
  }, []);

  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + b.value, 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + b.value, 0),
  };

  const handleConnectBank = async () => {
    try {
      if (!window.PluggyConnect) {
        notify("Carregando biblioteca bancária... Aguarde um momento.");
        
        // Tenta injetar o script dinamicamente caso não tenha carregado
        if (!document.querySelector('script[src*="pluggy-connect"]')) {
          const script = document.createElement('script');
          script.src = "https://cdn.pluggy.ai/pluggy-connect/v2/index.js";
          script.async = true;
          document.body.appendChild(script);
        }

        let attempts = 0;
        while (!window.PluggyConnect && attempts < 15) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
        
        if (!window.PluggyConnect) {
          const isIframe = window.self !== window.top;
          if (isIframe) {
            notify("A biblioteca bancária foi bloqueada pelo navegador dentro do painel. Por favor, clique em 'ABRIR EM NOVA ABA' para conectar seu banco com segurança.");
          } else {
            notify("Não foi possível carregar a biblioteca bancária. Verifique sua conexão ou tente recarregar a página.");
          }
          return;
        }
      }

      const response = await fetch('/api/bank/token', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        notify(data.error || "Erro ao inicializar conexão bancária.");
        return;
      }

      const { accessToken } = data;

      const pluggyConnect = new window.PluggyConnect({
        connectToken: accessToken,
        includeSandbox: true,
        onSuccess: async (itemData: any) => {
          const itemId = itemData.item.id;
          setBankItemId(itemId);
          if (auth.currentUser) {
            await setDoc(doc(db, 'users', auth.currentUser.uid), { bankItemId: itemId }, { merge: true });
          }
          notify("Banco conectado com sucesso!");
          handleSyncTransactions(itemId);
        },
        onError: (error: any) => {
          notify(`Erro no widget: ${error.message}`);
        }
      });

      pluggyConnect.init();
    } catch (error: any) {
      notify(`Erro ao conectar ao banco: ${error.message}`);
    }
  };

  const handleSyncTransactions = async (itemId: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/bank/transactions?itemId=${itemId}`);
      const transactions: BankTransaction[] = await response.json();

      if (!Array.isArray(transactions)) throw new Error("Invalid response");

      const existingIds = new Set(financials.map(f => f.bankTransactionId));
      const newTransactions = transactions.filter(t => !existingIds.has(t.id));

      if (newTransactions.length === 0) {
        notify("Nenhuma transação nova encontrada.");
        return;
      }

      for (const t of newTransactions) {
        const newRecord = {
          type: t.amount > 0 ? 'receita' : 'despesa',
          description: `[BANCO] ${t.description}`,
          value: Math.abs(t.amount),
          date: t.date.split('T')[0],
          status: 'pago',
          category: t.category || 'Outros',
          bankTransactionId: t.id
        };
        await addDoc(collection(db, 'financials'), newRecord);
      }

      notify(`${newTransactions.length} novas transações importadas!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financials');
      notify("Erro ao sincronizar transações.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    notify("Importando extrato... Aguarde um instante.");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let importedCount = 0;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items as any[];
          
          items.sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) < 2) return a.transform[4] - b.transform[4];
            return b.transform[5] - a.transform[5];
          });

          let lastY = -1;
          let pageLines: string[] = [];
          let currentLine = "";
          
          for (const item of items) {
            // Aumentado o threshold para 5 para agrupar melhor as linhas de extratos bancários
            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
              pageLines.push(currentLine);
              currentLine = "";
            }
            currentLine += item.str + " ";
            lastY = item.transform[5];
          }
          if (currentLine) pageLines.push(currentLine);

          const promises = pageLines.map(async (line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Ignorar linhas de saldo e cabeçalho
            const upperLine = trimmedLine.toUpperCase();
            if (upperLine.includes("SALDO DO DIA") || 
                upperLine.includes("SALDO ANTERIOR") ||
                upperLine.includes("EXTRATO CONTA") ||
                upperLine.includes("TOTAL DE") ||
                upperLine.includes("LANÇAMENTOS")) return;

            // Regex mais flexível para extrato Itaú: Data (DD/MM ou DD/MM/AAAA) + Descrição + Valor (R$)
            // Suporta: 26/03 PIX TRANSF 70,00 ou 26/03/2026 PIX TRANSF 70,00
            const match = trimmedLine.match(/(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/);
            
            if (match) {
              let dateStr = match[1];
              const description = match[2].trim();
              const valueStr = match[3].replace(/\./g, '').replace(',', '.');
              const value = parseFloat(valueStr);

              // Se a data for DD/MM, adiciona o ano atual
              if (dateStr.length === 5) {
                dateStr += `/${new Date().getFullYear()}`;
              }

              if (!isNaN(value) && Math.abs(value) > 0.01) {
                try {
                  await addDoc(collection(db, 'financials'), {
                    type: value >= 0 ? 'receita' : 'despesa',
                    description: `[PDF] ${description}`,
                    value: Math.abs(value),
                    date: dateStr.split('/').reverse().join('-'),
                    status: 'pago',
                    category: 'Importado'
                  });
                  importedCount++;
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, 'financials');
                }
              }
            }
          });

          await Promise.all(promises);
        }

        if (importedCount > 0) {
          notify(`Sucesso! ${importedCount} lançamentos importados do PDF.`);
        } else {
          notify("Nenhuma transação encontrada. Verifique se o PDF é um extrato válido do Itaú.");
        }
      } catch (err: any) {
        console.error("Erro no processamento:", err);
        notify("Erro ao ler o arquivo PDF.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newRecord = {
      type: fd.get('type') as 'receita' | 'despesa',
      description: fd.get('description') as string,
      value: Number(fd.get('value')),
      category: fd.get('category') as string,
      date: fd.get('date') as string,
      status: 'pago'
    };
    try {
      await addDoc(collection(db, 'financials'), newRecord);
      setShowModal(false);
      notify("Lançamento financeiro registrado!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financials');
      notify("Erro ao registrar lançamento.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Controle Financeiro</h3>
          
          <div className="flex flex-wrap gap-2">
            {bankItemId ? (
              <button 
                onClick={() => handleSyncTransactions(bankItemId)} 
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Itaú'}
              </button>
            ) : (
              <button 
                onClick={handleConnectBank}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <Landmark size={14} />
                Conectar Banco Direto
              </button>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePDFImport} 
              accept=".pdf" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
              title="Selecione o arquivo PDF do seu extrato bancário"
            >
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
              {isProcessing ? 'Processando...' : 'Importar Extrato (PDF)'}
            </button>

            <button 
              onClick={async () => {
                const testData = [
                  { type: 'receita', description: 'Venda Sucata Cobre', value: 4500, category: 'Vendas', date: new Date().toISOString().split('T')[0], status: 'pago' },
                  { type: 'despesa', description: 'Pagamento Frete', value: 350, category: 'Operacional', date: new Date().toISOString().split('T')[0], status: 'pago' },
                  { type: 'despesa', description: 'Energia Elétrica', value: 890, category: 'Operacional', date: new Date().toISOString().split('T')[0], status: 'pago' },
                ];
                for (const d of testData) {
                  await addDoc(collection(db, 'financials'), d);
                }
                notify("Dados de teste gerados com sucesso!");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Gerar Dados de Teste
            </button>
          </div>
        </div>
        
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg w-full lg:w-auto justify-center">
          <Plus size={20}/> Novo Lançamento Manual
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Receitas</span></div>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownCircle size={20}/></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Despesas</span></div>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(stats.expense)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/20 rounded-xl"><DollarSign size={20}/></div><span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Saldo em Caixa</span></div>
          <p className="text-3xl font-black text-indigo-400">{formatCurrency(stats.revenue - stats.expense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Extrato Geral</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Descrição / Categoria</th>
                <th className="px-8 py-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financials.slice().reverse().map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-5 font-bold text-slate-500 text-sm">{f.date}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${f.type === 'receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 text-sm">{f.description}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.category}</p>
                  </td>
                  <td className={`px-8 py-5 text-right font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Novo Lançamento</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">X</button>
            </div>
            <form onSubmit={handleAddRecord} className="p-10 space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="receita" defaultChecked className="hidden peer" />
                    <div className="py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest peer-checked:bg-white peer-checked:text-emerald-600 transition-all text-slate-400">Receita</div>
                 </label>
                 <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="despesa" className="hidden peer" />
                    <div className="py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest peer-checked:bg-white peer-checked:text-rose-600 transition-all text-slate-400">Despesa</div>
                 </label>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Descrição</label>
                <input name="description" required placeholder="Ex: Pagamento Frete" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Valor (R$)</label>
                  <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Data</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Categoria</label>
                <select name="category" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold">
                  <option value="Operacional">Operacional</option>
                  <option value="Suprimentos">Suprimentos</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Salários">Salários</option>
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroView;
