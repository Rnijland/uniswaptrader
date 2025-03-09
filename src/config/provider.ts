// src/config/provider.ts
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Environment variables
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ETHEREUM_NETWORK = process.env.ETHEREUM_NETWORK || 'mainnet';

// Create JSON-RPC provider
export const createJsonRpcProvider = (): ethers.JsonRpcProvider => {
  if (!INFURA_API_KEY) {
    throw new Error('INFURA_API_KEY is not defined in .env file');
  }

  const url = `https://${ETHEREUM_NETWORK}.infura.io/v3/${INFURA_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(url);
  
  logger.info(`JSON-RPC provider initialized for ${ETHEREUM_NETWORK}`);
  return provider;
};

// Default provider for general use
export const provider = createJsonRpcProvider();

// Export for backward compatibility
export const jsonRpcProvider = provider;