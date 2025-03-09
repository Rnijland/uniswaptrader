// src/ui/controllers/transactionController.ts
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { 
  sendEth, 
  sendToken, 
  getTokenBalance, 
  swapEthForTokens, 
  swapTokensForEth, 
  swapTokensForTokens 
} from '../../core/transactions';

/**
 * Utility function to recursively convert all BigInt values in an object or array to strings
 */
function convertBigIntsToStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntsToStrings(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntsToStrings(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// Send ETH from a wallet to an address
export async function sendEthTransaction(req: Request, res: Response) {
  try {
    const { walletName } = req.params;
    const { toAddress, amount } = req.body;
    
    if (!walletName || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const receipt = await sendEth(walletName, toAddress, amount);
    
    return res.json({
      success: true,
      message: `Successfully sent ${amount} ETH to ${toAddress}`,
      transactionHash: receipt?.hash || 'Unknown',
      blockNumber: receipt?.blockNumber || 'Pending'
    });
  } catch (error: any) {
    logger.error(`Error in sendEthTransaction: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Send tokens from a wallet to an address
export async function sendTokenTransaction(req: Request, res: Response) {
  try {
    const { walletName } = req.params;
    const { tokenAddress, toAddress, amount } = req.body;
    
    if (!walletName || !tokenAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const receipt = await sendToken(walletName, tokenAddress, toAddress, amount);
    
    return res.json({
      success: true,
      message: `Successfully sent ${amount} tokens to ${toAddress}`,
      transactionHash: receipt?.hash || 'Unknown',
      blockNumber: receipt?.blockNumber || 'Pending'
    });
  } catch (error: any) {
    logger.error(`Error in sendTokenTransaction: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get token balance for a wallet
export async function getTokenBalanceForWallet(req: Request, res: Response) {
  try {
    const { walletName, tokenAddress } = req.params;
    
    if (!walletName || !tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const balanceInfo = await getTokenBalance(walletName, tokenAddress);
    
    return res.json({
      success: true,
      walletName,
      tokenAddress,
      balance: balanceInfo.balance,
      symbol: balanceInfo.symbol,
      decimals: balanceInfo.decimals
    });
  } catch (error: any) {
    logger.error(`Error in getTokenBalanceForWallet: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Swap ETH for tokens
export async function swapEthForTokensTransaction(req: Request, res: Response) {
  try {
    const { walletName } = req.params;
    const { tokenAddress, ethAmount, slippagePercent } = req.body;
    
    if (!walletName || !tokenAddress || !ethAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const receipt = await swapEthForTokens(
      walletName, 
      tokenAddress, 
      ethAmount, 
      slippagePercent || 2
    );
    
    return res.json({
      success: true,
      message: `Successfully swapped ${ethAmount} ETH for tokens`,
      transactionHash: receipt?.hash || 'Unknown',
      blockNumber: receipt?.blockNumber || 'Pending'
    });
  } catch (error: any) {
    logger.error(`Error in swapEthForTokensTransaction: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Swap tokens for ETH
export async function swapTokensForEthTransaction(req: Request, res: Response) {
  try {
    const { walletName } = req.params;
    const { tokenAddress, tokenAmount, slippagePercent } = req.body;
    
    if (!walletName || !tokenAddress || !tokenAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const receipt = await swapTokensForEth(
      walletName, 
      tokenAddress, 
      tokenAmount, 
      slippagePercent || 2
    );
    
    return res.json({
      success: true,
      message: `Successfully swapped ${tokenAmount} tokens for ETH`,
      transactionHash: receipt?.hash || 'Unknown',
      blockNumber: receipt?.blockNumber || 'Pending'
    });
  } catch (error: any) {
    logger.error(`Error in swapTokensForEthTransaction: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Swap tokens for tokens
export async function swapTokensForTokensTransaction(req: Request, res: Response) {
  try {
    const { walletName } = req.params;
    const { fromTokenAddress, toTokenAddress, tokenAmount, slippagePercent } = req.body;
    
    if (!walletName || !fromTokenAddress || !toTokenAddress || !tokenAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const receipt = await swapTokensForTokens(
      walletName, 
      fromTokenAddress, 
      toTokenAddress, 
      tokenAmount, 
      slippagePercent || 2
    );
    
    return res.json({
      success: true,
      message: `Successfully swapped ${tokenAmount} tokens for other tokens`,
      transactionHash: receipt?.hash || 'Unknown',
      blockNumber: receipt?.blockNumber || 'Pending'
    });
  } catch (error: any) {
    logger.error(`Error in swapTokensForTokensTransaction: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
