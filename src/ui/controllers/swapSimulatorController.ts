// src/ui/controllers/swapSimulatorController.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { QuoterService } from '../../exchanges/quoterService';
import { provider } from '../../config/provider';

// Initialize the quoter service
const quoterService = new QuoterService();

// USDC address for USD price calculations
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_DECIMALS = 6;

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
  }
};

/**
 * Get the USD price of a token using USDC pairs
 * @param tokenAddress The token address to get the price for
 * @param decimals The token's decimals
 * @returns The USD price per token
 */
async function getTokenUsdPrice(tokenAddress: string, decimals: number): Promise<number> {
  try {
    // If the token is USDC, return 1
    if (tokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
      return 1.0;
    }
    
    // Use the quoter service to get the price in USDC
    const quoterService = new QuoterService();
    
    // Get how much USDC you get for 1 token
    const oneToken = '1';
    const usdcAmount = await quoterService.quoteExactInputSingleWithFallback(
      tokenAddress,
      USDC_ADDRESS,
      3000, // 0.3% fee tier
      oneToken,
      decimals
    );
    
    // Parse the USDC amount to a number
    return parseFloat(usdcAmount);
  } catch (error: any) {
    logger.error(`Error getting USD price for token ${tokenAddress}: ${error.message}`);
    return 0; // Return 0 if we can't get the price
  }
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
    
    // Check if tokenOut is a pool address
    let amountOut;
    let isPoolAddress = false;
    
    try {
      // Try to detect if tokenOut is a pool address
      const poolContract = new ethers.Contract(
        tokenOut,
        ['function token0() external view returns (address)', 'function token1() external view returns (address)'],
        provider
      );
      
      // If this succeeds, it's likely a pool address
      await poolContract.token0();
      isPoolAddress = true;
      
      // Use direct pool quote
      logger.info(`Using direct pool quote for pool address: ${tokenOut}`);
      amountOut = await quoterService.quoteDirectFromPool(
        tokenOut,
        tokenIn,
        amountIn,
        decimalsIn
      );
    } catch (poolError) {
      // Not a pool address, use normal flow
      logger.info(`${tokenOut} is not a pool address or couldn't be accessed directly`);
      
      try {
        // Try using the pool address lookup
        amountOut = await quoterService.quoteExactInputByPoolAddress(
          tokenIn,
          tokenOut,
          parseInt(fee),
          amountIn,
          decimalsIn
        );
      } catch (error: any) {
        // If that fails, try with fallback through WETH
        logger.warn(`Pool address quote failed, trying fallback: ${error.message}`);
        amountOut = await quoterService.quoteExactInputSingleWithFallback(
          tokenIn,
          tokenOut,
          parseInt(fee),
          amountIn,
          decimalsIn
        );
      }
    }
    
    // Get USD prices for tokens
    const amountInNumber = parseFloat(amountIn);
    const amountOutNumber = parseFloat(amountOut);
    
    // Get USD price for input token
    const tokenInUsdPrice = await getTokenUsdPrice(tokenIn, decimalsIn);
    const amountInUsd = amountInNumber * tokenInUsdPrice;
    
    // Get USD price for output token
    let tokenOutDecimals = 18; // Default
    try {
      // Try to get decimals from contract
      const tokenContract = new ethers.Contract(
        tokenOut,
        ['function decimals() view returns (uint8)'],
        provider
      );
      tokenOutDecimals = await tokenContract.decimals();
    } catch (error) {
      // If we can't get decimals, check if it's a common token
      const tokenOutInfo = Object.values(COMMON_TOKENS).find(
        token => token.address.toLowerCase() === tokenOut.toLowerCase()
      );
      if (tokenOutInfo) {
        tokenOutDecimals = tokenOutInfo.decimals;
      }
      // Otherwise use default of 18
    }
    
    const tokenOutUsdPrice = await getTokenUsdPrice(tokenOut, tokenOutDecimals);
    const amountOutUsd = amountOutNumber * tokenOutUsdPrice;
    
    return res.json({
      success: true,
      amountIn,
      amountOut,
      amountInUsd,
      amountOutUsd,
      tokenInUsdPrice,
      tokenOutUsdPrice,
      tokenIn,
      tokenOut,
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
