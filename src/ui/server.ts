// src/ui/server.ts
import express, { Request, Response } from 'express';
import path from 'path';
import { logger } from '../utils/logger';
import { createWallet, getWallet, listWallets, deleteWallet } from '../core/wallet';
import { ethers } from 'ethers';
import * as poolController from './controllers/poolController';
import * as transactionController from './controllers/transactionController';
import * as swapSimulatorController from './controllers/swapSimulatorController';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Uniswap Trading Bot' });
});

// Wallet management routes
app.get('/wallets', (req: Request, res: Response) => {
  const wallets = listWallets();
  res.render('wallets', { title: 'Wallet Management', wallets });
});

app.post('/wallets/create', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Wallet name is required' });
    }
    
    const walletData = createWallet(name);
    res.render('wallet-details', { 
      title: 'Wallet Created', 
      name,
      wallet: walletData
    });
  } catch (error: any) {
    logger.error(`Error creating wallet: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/wallets/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const wallet = getWallet(name);
    
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }
    
    const balance = await wallet.provider?.getBalance(wallet.address);
    const ethBalance = ethers.formatEther(balance || 0);
    
    res.render('wallet-details', { 
      title: 'Wallet Details',
      name,
      wallet: {
        address: wallet.address,
        balance: ethBalance
      }
    });
  } catch (error: any) {
    logger.error(`Error getting wallet: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/wallets/:name/delete', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const success = deleteWallet(name);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }
    
    res.redirect('/wallets');
  } catch (error: any) {
    logger.error(`Error deleting wallet: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transaction routes
app.post('/api/wallets/:walletName/send-eth', transactionController.sendEthTransaction);
app.post('/api/wallets/:walletName/send-token', transactionController.sendTokenTransaction);
app.get('/api/wallets/:walletName/token-balance/:tokenAddress', transactionController.getTokenBalanceForWallet);
app.post('/api/wallets/:walletName/swap-eth-for-tokens', transactionController.swapEthForTokensTransaction);
app.post('/api/wallets/:walletName/swap-tokens-for-eth', transactionController.swapTokensForEthTransaction);
app.post('/api/wallets/:walletName/swap-tokens-for-tokens', transactionController.swapTokensForTokensTransaction);

// Pool routes
app.get('/api/pools/token/:tokenAddress', poolController.getPoolsForToken);
app.get('/api/pools/:version/:poolAddress', poolController.getPoolDetails);
app.get('/api/pools/v3', poolController.getAllV3Pools);
app.get('/pools', (req, res) => {
  res.render('pools', { title: 'Pool Explorer' });
});

// Swap Simulator routes
app.get('/swap-simulator', swapSimulatorController.renderSwapSimulator);
app.post('/api/swap-simulator/quote', swapSimulatorController.getSwapQuote);


// Import the filter routes
import filterRoutes from '../routes/filters';
import filterViewRoutes from '../routes/filterViews';

// Register the routes (find where other routes are registered)
app.use('/api/filters', filterRoutes);
app.use('/filters', filterViewRoutes);

// Start server
export function startServer() {
  app.listen(PORT, () => {
    logger.info(`Web interface running at http://localhost:${PORT}`);
  });
}
