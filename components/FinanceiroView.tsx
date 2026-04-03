import React, { useState, useRef } from 'react';
import { FileText, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialRecord } from '../types';

interface Props {
  financials: FinancialRecord[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);

const FinanceiroView: React.FC<Props> = ({ financials, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = {
    revenue: financials.filter(f => f.type === 'receita').reduce((a, b) => a + Number(b.value || 0), 0),
    expense: financials.filter(f => f.type === 'despesa').reduce((a, b) => a + Number(b.value || 0), 0),
  };

  // IMPORTAÇÃO PDF (mantida)
  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;

    if (!pdfjsLib) {
      notify("Motor de PDF carregando...");
      return;
    }

    notify("Processando PDF...");
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        let count = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const pageText = text.items.map((i: any) => i.str).join(" ");

          const regex = /(\d{2}\/\d{2})\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
          let match;

          while ((match = regex.exec(pageText)) !== null) {
            const [_, date, desc, valueStr] = match;

            const value = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
            const [day, month] = date.split('/');
            const formattedDate = `${new Date().getFullYear()}-${month}-${day}`;

            await addDoc(collection(db, 'financials'), {
              type: value >= 0 ? 'receita' : 'despesa',
              description: `[PDF] ${desc.toUpperCase()}`,
              value: Math.abs(value),
              date: formattedDate,
              status: 'pago',
              category: 'IMPORTADO PDF',
              createdAt: serverTimestamp()
            });

            count++;
          }
        }

        notify(`✅ ${count} lançamentos importados`);
      } catch (error) {
        console.error(error);
        notify("Erro ao ler PDF");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔥 SALVAMENTO CORRIGIDO
  const handleAddRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const formData = new FormData(e.currentTarget);

      const type = (formData.get('type') as 'receita' | 'despesa') || 'receita';
      const description = (formData.get('description')?.toString() || "LANÇAMENTO").toUpperCase();
      const category = (formData.get('category')?.toString() || "GERAL").toUpperCase();
      const valueRaw = formData.get('value');
      const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];

      const value = Math.abs(Number(valueRaw));

      if (!value || isNaN(value) || value <= 0) {
        notify("❌ Valor inválido");
        setIsProcessing(false);
        return;
      }

      const payload = {
        type,
        description,
        category,
        value,
        date,
        status: 'pago',
        createdAt: serverTimestamp()
      };

      console.log("📤 Enviando:", payload);

      await addDoc(collection(db, 'financials'), payload);

      notify("✅ Salvo com sucesso!");
      setShowModal(false);
      e.currentTarget.reset();

    } catch (error: any) {
      console.error("🔥 ERRO:", error);
      notify(`Erro: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <h3 className="text-2xl font-black">Financeiro</h3>

        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handlePDFImport} hidden />

          <button onClick={() => fileInputRef.current?.click()}>
            {isProcessing ? <RefreshCw className="animate-spin" /> : <FileText />}
          </button>

          <button onClick={() => setShowModal(true)}>
            <Plus />
          </button>
        </div>
      </div>

      <div>
        <p>Receita: {formatCurrency(stats.revenue)}</p>
        <p>Despesa: {formatCurrency(stats.expense)}</p>
        <p>Saldo: {formatCurrency(stats.revenue - stats.expense)}</p>
      </div>

      <div>
        {financials.map(f => (
          <div key={f.id}>
            {f.description} - {formatCurrency(f.value)}
          </div>
        ))}
      </div>

      {showModal && (
        <form onSubmit={handleAddRecord}>
          <input name="description" placeholder="Descrição" required />
          <input name="category" placeholder="Categoria" />
          <input name="value" type="number" required />
          <input name="date" type="date" required />

          <button type="submit">
            {isProcessing ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}
    </div>
  );
};

export default FinanceiroView;