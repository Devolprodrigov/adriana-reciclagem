
import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/debug/env', (req, res) => {
    const mask = (s?: string) => s ? `${s.substring(0, 4)}...${s.substring(s.length - 4)}` : 'missing';
    res.json({
      PLUGGY_CLIENT_ID: mask(process.env.PLUGGY_CLIENT_ID),
      PLUGGY_CLIENT_SECRET: mask(process.env.PLUGGY_CLIENT_SECRET),
      FOCUS_NFE_API_TOKEN: mask(process.env.FOCUS_NFE_API_TOKEN),
      NODE_ENV: process.env.NODE_ENV
    });
  });

  // API Route for NF-e Emission
  // This is a real-world structure for integrating with a Tax API Gateway (e.g., Focus NFe)
  app.post('/api/nfe/emit', async (req, res) => {
    try {
      const nfeData = req.body;
      
      // Clean token from whitespace and potential quotes
      const API_TOKEN = process.env.FOCUS_NFE_API_TOKEN?.trim().replace(/['"]/g, '');
      const IS_PRODUCTION = process.env.NODE_ENV === 'production';
      const API_URL = IS_PRODUCTION 
        ? 'https://api.focusnfe.com.br/v2/nfe' 
        : 'https://homologacao.focusnfe.com.br/v2/nfe';

      if (!API_TOKEN) {
        // For demo purposes, if no token is provided, we simulate a successful response
        console.log("Simulating NF-e emission (No API Token found)");
        return res.json({
          status: 'sucesso',
          nfe_id: Math.floor(Math.random() * 100000),
          protocolo: '341230001234567',
          chave: '41230299999999000199550010000044581234567890',
          mensagem: 'Nota Fiscal emitida com sucesso (Simulação)'
        });
      }

      // Real API Call (Focus NFe)
      const response = await axios.post(API_URL, nfeData, {
        auth: {
          username: API_TOKEN,
          password: ''
        }
      });
      return res.json(response.data);

    } catch (error: any) {
      console.error('Erro na emissão da NF-e:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Falha na comunicação com a Receita Federal',
        details: error.response?.data || error.message 
      });
    }
  });

  // API Route for Bank Sync (Pluggy Integration)
  // This allows connecting to Itaú and other Brazilian banks
  app.post('/api/bank/token', async (req, res) => {
    try {
      // Clean keys from whitespace and potential quotes
      const CLIENT_ID = process.env.PLUGGY_CLIENT_ID?.trim().replace(/['"]/g, '');
      const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET?.trim().replace(/['"]/g, '');

      if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Pluggy credentials missing:', { 
          hasClientId: !!CLIENT_ID, 
          hasClientSecret: !!CLIENT_SECRET 
        });
        return res.status(400).json({ error: "Pluggy API credentials not configured in Settings." });
      }

      // 1. Get Auth Token
      console.log('Attempting Pluggy Auth with ID:', CLIENT_ID.substring(0, 8) + '...');
      const authResponse = await axios.post('https://api.pluggy.ai/auth', {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      });
      
      const apiKey = authResponse.data.apiKey;
      if (!apiKey) {
        console.error('Pluggy Auth falhou: apiKey não recebida', authResponse.data);
        throw new Error('Pluggy Auth successful but apiKey is missing in response');
      }

      // 2. Create Connect Token
      console.log('Autenticado na Pluggy, criando Connect Token...');
      const connectResponse = await axios.post('https://api.pluggy.ai/connect_token', {}, {
        headers: { 'X-API-KEY': apiKey }
      });

      console.log('Connect Response Status:', connectResponse.status);
      console.log('Connect Response Data:', JSON.stringify(connectResponse.data).substring(0, 100) + '...');

      if (!connectResponse.data.accessToken) {
        console.error('Pluggy Connect Token falhou:', connectResponse.data);
        throw new Error('Connect token missing in Pluggy response');
      }

      console.log('Connect Token gerado com sucesso');
      res.json({ accessToken: connectResponse.data.accessToken });
    } catch (error: any) {
      const errorDetail = error.response?.data?.message || error.response?.data?.error || error.message;
      console.error('Error getting bank connect token:', errorDetail);
      res.status(500).json({ 
        error: 'Falha ao inicializar a conexão bancária',
        details: errorDetail
      });
    }
  });

  app.get('/api/bank/transactions', async (req, res) => {
    try {
      const itemId = (req.query.itemId as string)?.trim();
      const CLIENT_ID = process.env.PLUGGY_CLIENT_ID?.trim().replace(/['"]/g, '');
      const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET?.trim().replace(/['"]/g, '');

      if (!CLIENT_ID || !CLIENT_SECRET || !itemId) {
        return res.status(400).json({ error: "Missing credentials or itemId." });
      }

      // 1. Get Auth Token
      const authResponse = await axios.post('https://api.pluggy.ai/auth', {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      });
      const accessToken = authResponse.data.apiKey;

      // 2. Fetch Transactions
      const transactionsResponse = await axios.get(`https://api.pluggy.ai/transactions?itemId=${itemId}`, {
        headers: { 'X-API-KEY': accessToken }
      });

      res.json(transactionsResponse.data.results);
    } catch (error: any) {
      console.error('Error fetching bank transactions:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
