// src/ui/controllers/poolController.ts
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { Token } from '@uniswap/sdk-core';
import { PoolDataService } from '../../exchanges/poolDataService';

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

// Initialize the pool data service
const poolDataService = new PoolDataService();

// Common tokens on Ethereum mainnet
const COMMON_TOKENS = [
  new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
  new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD Coin'),
  new Token(1, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT', 'Tether USD'),
  new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin'),
  new Token(1, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8, 'WBTC', 'Wrapped Bitcoin')
];

// Get pools for a given token
export async function getPoolsForToken(req: Request, res: Response) {
  try {
    const { tokenAddress } = req.params;
    
    if (!tokenAddress || !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid token address format' 
      });
    }
    
    // Create a token object
    // Note: We don't know the token details yet, so we use placeholders
    const token = new Token(1, tokenAddress, 18, 'UNKNOWN', 'Unknown Token');
    
    logger.info(`Finding pools for token: ${tokenAddress}`);
    
    // Get all pools (both V2 and V3)
    const pools = await poolDataService.getAllPoolsForToken(token, COMMON_TOKENS);
    
    return res.json({
      success: true,
      tokenAddress,
      v3Pools: convertBigIntsToStrings(pools.v3Pools),
      v2Pools: convertBigIntsToStrings(pools.v2Pools),
      totalPools: pools.v3Pools.length + pools.v2Pools.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    logger.error(`Error getting pools: ${errorMessage}`);
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}

// Get pool details
export async function getPoolDetails(req: Request, res: Response) {
  try {
    const { poolAddress, version } = req.params;
    
    if (!poolAddress || !poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid pool address format' 
      });
    }
    
    logger.info(`Getting details for ${version} pool: ${poolAddress}`);
    
    let poolData;
    if (version === 'v3') {
      poolData = await poolDataService.getV3PoolData(poolAddress);
    } else if (version === 'v2') {
      poolData = await poolDataService.getV2PoolData(poolAddress);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid version. Must be "v2" or "v3"' 
      });
    }
    
    return res.json({
      success: true,
      pool: convertBigIntsToStrings(poolData)
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    logger.error(`Error getting pool details: ${errorMessage}`);
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}

// Get all V3 pools
export async function getAllV3Pools(req: Request, res: Response) {
  try {
    // This would be an expensive operation, so we'll implement a paginated version
    // that allows fetching the most active pools
    
    // In a real implementation, we might query an indexer or The Graph
    return res.json({
      success: true,
      message: "This endpoint would return paginated V3 pools ordered by TVL or volume"
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    logger.error(`Error getting all V3 pools: ${errorMessage}`);
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}
