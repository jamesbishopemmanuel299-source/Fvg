/**
 * BONAGO AI — Full-Stack Server
 * Express entry point with Vite middlewares in development,
 * API routes for Deriv trading, Groq/Gemini AI analysis, and auto-bot engine.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { derivClient } from './server/derivClient';
import { aiTradingService } from './server/aiService';
import { botEngine } from './server/botEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // --- API Endpoints ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'BONAGO AI Deriv Trading Terminal',
      timestamp: Date.now(),
      derivConnected: derivClient.getStatus().connected,
    });
  });

  // Deriv Status & Account Info (NEVER reveals access token)
  app.get('/api/deriv/status', (req, res) => {
    try {
      const status = derivClient.getStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Re-authorize using the private DERIV_ACCESS_TOKEN configured on Render.
  // Never accept access tokens from browser requests.
  app.post('/api/deriv/reconnect', async (_req, res) => {
    try {
      const status = await derivClient.reauthorize();
      if (!status.hasEnvToken) {
        return res.status(400).json({
          ...status,
          error: 'DERIV_ACCESS_TOKEN is missing from Render Environment Variables.',
        });
      }
      if (!status.authorized) {
        return res.status(401).json(status);
      }
      res.json(status);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Active Symbols (Dynamic from Deriv API)
  app.get('/api/deriv/symbols', async (req, res) => {
    try {
      const symbols = await derivClient.fetchActiveSymbols();
      res.json(symbols);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Historical Ticks / Candles for Chart
  app.get('/api/deriv/ticks', async (req, res) => {
    try {
      const symbol = String(req.query.symbol || '1HZ100V');
      const count = Number(req.query.count || 100);
      const style = req.query.style === 'candles' ? 'candles' : 'ticks';
      const granularity = Number(req.query.granularity || 60);

      const history = await derivClient.getHistoricalTicks(symbol, count, style, granularity);
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Contract Proposal / Payout Calculation & Validation
  app.post('/api/deriv/proposal', async (req, res) => {
    try {
      const { symbol, contract_type, amount, duration, duration_unit, currency, basis, barrier } = req.body;

      if (!symbol || !contract_type || !amount || !duration || !duration_unit) {
        return res.status(400).json({ error: 'Missing required proposal parameters (symbol, contract_type, amount, duration, duration_unit)' });
      }

      const proposal = await derivClient.getProposal({
        symbol,
        contract_type,
        amount: Number(amount),
        duration: Number(duration),
        duration_unit,
        currency,
        basis,
        barrier,
      });

      res.json(proposal);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Order Execution (Buy Contract)
  app.post('/api/deriv/buy', async (req, res) => {
    try {
      const { symbol, contract_type, amount, duration, duration_unit, currency, basis, barrier } = req.body;

      if (!symbol || !contract_type || !amount || !duration || !duration_unit) {
        return res.status(400).json({ error: 'Missing required order parameters' });
      }

      const orderResult = await derivClient.buyContract({
        symbol,
        contract_type,
        amount: Number(amount),
        duration: Number(duration),
        duration_unit,
        currency,
        basis,
        barrier,
      });

      if (!orderResult.success) {
        return res.status(400).json(orderResult);
      }

      res.json(orderResult);
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // Open Positions Monitoring
  app.get('/api/deriv/open-positions', async (req, res) => {
    try {
      const positions = await derivClient.syncOpenPositions();
      res.json(positions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Trade History
  app.get('/api/deriv/history', async (req, res) => {
    try {
      const history = await derivClient.getTradeHistory();
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI Chat Copilot
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, context } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const aiReply = await aiTradingService.processChat(message, history || [], context || {});
      res.json(aiReply);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auto Bot Controls
  app.get('/api/bot/state', (req, res) => {
    res.json(botEngine.getState());
  });

  app.post('/api/bot/start', (req, res) => {
    try {
      const config = req.body?.config;
      const state = botEngine.start(config);
      res.json(state);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/bot/stop', (req, res) => {
    try {
      const reason = req.body?.reason || 'User requested stop';
      const state = botEngine.stop(reason);
      res.json(state);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/bot/config', (req, res) => {
    try {
      const state = botEngine.updateConfig(req.body);
      res.json(state);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Vite Dev Middleware or Static Serving ---
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[BONAGO AI] Trading terminal server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BONAGO AI] Fatal startup error:', err);
  process.exit(1);
});
