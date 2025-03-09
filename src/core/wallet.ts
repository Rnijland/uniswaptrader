// src/core/wallet.ts
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { provider } from '../config/provider';
import * as fs from 'fs';
import * as path from 'path';

// Path for storing wallet data
const WALLETS_DIR = path.join(process.cwd(), 'wallets');
const WALLETS_FILE = path.join(WALLETS_DIR, 'wallets.json');

// Ensure wallet directory exists
if (!fs.existsSync(WALLETS_DIR)) {
  fs.mkdirSync(WALLETS_DIR, { recursive: true });
}

// Load existing wallets
function loadWallets(): Record<string, any> {
  if (!fs.existsSync(WALLETS_FILE)) {
    return {};
  }
  
  try {
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error loading wallets file');
    return {};
  }
}

// Save wallets to file
function saveWallets(wallets: Record<string, any>): void {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
  } catch (error) {
    logger.error('Error saving wallets file');
  }
}

// Create a new wallet
export function createWallet(name: string): {
  address: string;
  privateKey: string;
  mnemonic: string;
} {
  try {
    // Create a random wallet with mnemonic
    const wallet = ethers.Wallet.createRandom();
    
    // Extract wallet data
    const walletData = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || "No mnemonic available"
    };
    
    // Save wallet data
    const wallets = loadWallets();
    wallets[name] = {
      ...walletData,
      createdAt: new Date().toISOString()
    };
    saveWallets(wallets);
    
    logger.info(`Created new wallet "${name}" with address ${wallet.address}`);
    
    return walletData;
  } catch (error: any) {
    logger.error(`Error creating wallet: ${error.message}`);
    throw error;
  }
}

// Get a wallet by name
export function getWallet(name: string): ethers.Wallet | null {
  try {
    const wallets = loadWallets();
    const walletData = wallets[name];
    
    if (!walletData) {
      logger.error(`Wallet "${name}" not found`);
      return null;
    }
    
    // Create a wallet instance from the private key
    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    return wallet;
  } catch (error: any) {
    logger.error(`Error getting wallet: ${error.message}`);
    return null;
  }
}

// List all available wallets
export function listWallets(): Array<{ name: string; address: string; createdAt: string }> {
  try {
    const wallets = loadWallets();
    return Object.entries(wallets).map(([name, data]: [string, any]) => ({
      name,
      address: data.address,
      createdAt: data.createdAt || 'Unknown'
    }));
  } catch (error: any) {
    logger.error(`Error listing wallets: ${error.message}`);
    return [];
  }
}

// Delete a wallet
export function deleteWallet(name: string): boolean {
  try {
    const wallets = loadWallets();
    
    if (!wallets[name]) {
      logger.error(`Wallet "${name}" not found`);
      return false;
    }
    
    delete wallets[name];
    saveWallets(wallets);
    
    logger.info(`Deleted wallet "${name}"`);
    return true;
  } catch (error: any) {
    logger.error(`Error deleting wallet: ${error.message}`);
    return false;
  }
}