// src/ui/controllers/swapSimulatorController.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { QuoterService } from '../../exchanges/quoterService';
import { provider } from '../../config/provider';

// Initialize the quoter service
const quoterService = new QuoterService();

// Common tokens on Ethereum mainnet with their decimals
const COMMON_TOKENS: Record<string, { address: string; decimals: number }> = {
  'WETH': {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18
  },
  'USDC': {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6
  },
  'USDT': {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6
  },
  'DAI': {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18
  },
  'WBTC': {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8
  },
  'MKR': {
    address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    decimals: 18
  },
  'NEIRO': {
    address: '0xC555D55279023E732CcD32D812114cAF5838fD46',
    decimals: 18
  },
  'CELO': {
    address: '0xd88D5F9E6c10E6FebC9296A454f6C2589b1E8fAE',
    decimals: 18
  },
  'UNI': {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18
  },
  'beraSTONE': {
    address: '0x6dcba3657EE750A51A13A235B4Ed081317dA3066',
    decimals: 18
  },
  'PEPE': {
    address: '0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f',
    decimals: 18
  },
  'TRX': {
    address: '0x99950bAE3d0b79b8BeE86A8A208Ae1b087b9Dcb0',
    decimals: 6
  },
  'LINK': {
    address: '0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8',
    decimals: 18
  },
  'PAXG': {
    address: '0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C',
    decimals: 18
  },
  'AAVE': {
    address: '0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB',
    decimals: 18
  },
  'ELON': {
    address: '0x7B73644935b8e68019aC6356c40661E1bc315860',
    decimals: 18
  }
};

/**
 * Get the symbol for a token address
 * @param address Token address
 * @returns Token symbol or shortened address if not found
 */
function getTokenSymbol(address: string): string {
  // Normalize the address
  const normalizedAddress = address.toLowerCase();
  
  // Look up in COMMON_TOKENS
  for (const [symbol, token] of Object.entries(COMMON_TOKENS)) {
    if (token.address.toLowerCase() === normalizedAddress) {
      return symbol;
    }
  }
  
  // If not found, return a shortened address
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Get a quote for a swap
export async function getSwapQuote(req: Request, res: Response) {
  try {
    const { tokenIn, tokenOut, fee, amountIn } = req.body;
    
    if (!tokenIn || !tokenOut || !fee || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Get token symbols
    const tokenInSymbol = getTokenSymbol(tokenIn);
    const tokenOutSymbol = getTokenSymbol(tokenOut);
    
    // Get token decimals (either from our list or fetch from contract)
    let decimalsIn = 18; // Default to 18
    
    // Check if it's a common token
    const tokenInInfo = Object.values(COMMON_TOKENS).find(
      token => token.address.toLowerCase() === tokenIn.toLowerCase()
    );
    
    if (tokenInInfo) {
      decimalsIn = tokenInInfo.decimals;
    } else {
      // Fetch decimals from contract
      try {
        const tokenContract = new ethers.Contract(
          tokenIn,
          ['function decimals() view returns (uint8)'],
          provider
        );
        decimalsIn = await tokenContract.decimals();
      } catch (error) {
        logger.error(`Error fetching token decimals: ${error}`);
        // Keep default of 18 if we can't fetch
      }
    }
    
    // Try to get a quote using all available methods with fallbacks
    let amountOut;
    
    try {
      // First check if tokenOut is a pool address
      try {
        const poolContract = new ethers.Contract(
          tokenOut,
          ['function token0() external view returns (address)', 'function token1() external view returns (address)'],
          provider
        );
        
        // If this succeeds, it's likely a pool address
        await poolContract.token0();
        
        // Use direct pool quote
        logger.info(`Using direct pool quote for pool address: ${tokenOut}`);
        amountOut = await quoterService.quoteDirectFromPool(
          tokenOut,
          tokenIn,
          amountIn,
          decimalsIn
        );
      } catch (poolError) {
        // Not a pool address, use comprehensive fallback system
        logger.info(`${tokenOut} is not a pool address or couldn't be accessed directly, using all fallbacks`);
        
        // Try all quote methods with fallbacks
        amountOut = await quoterService.quoteWithAllFallbacks(
          tokenIn,
          tokenOut,
          parseInt(fee),
          amountIn,
          decimalsIn
        );
      }
    } catch (error: any) {
      // If all methods fail, try one last attempt with V2 directly
      logger.warn(`All standard quote methods failed, trying V2 as last resort: ${error.message}`);
      
      try {
        // Last resort: try V2 with WETH routing
        amountOut = await quoterService.quoteV2ExactInputWithFallback(
          tokenIn,
          tokenOut,
          amountIn,
          decimalsIn
        );
      } catch (finalError: any) {
        logger.error(`Final quote attempt failed: ${finalError.message}`);
        throw error; // Throw the original error
      }
    }
    
    return res.json({
      success: true,
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      tokenInSymbol,
      tokenOutSymbol,
      fee
    });
  } catch (error: any) {
    logger.error(`Error getting swap quote: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Render the swap simulator page
export function renderSwapSimulator(req: Request, res: Response) {
  res.render('swap-simulator', {
    title: 'Swap Simulator',
    tokens: COMMON_TOKENS
  });
}
