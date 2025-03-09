// src/exchanges/uniswapService.ts
import { ethers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { logger } from '../utils/logger';
import { jsonRpcProvider } from '../config/provider';

// Constants
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Mainnet address

// ABIs
const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

const POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)'
];

export class UniswapService {
  private factory: ethers.Contract;
  
  constructor(private provider = jsonRpcProvider) {
    this.factory = new ethers.Contract(
      UNISWAP_V3_FACTORY_ADDRESS,
      FACTORY_ABI,
      provider
    );
    
    logger.info('UniswapService initialized');
  }
  
  // Get pool address for a token pair and fee
  async getPoolAddress(tokenA: Token, tokenB: Token, fee: number): Promise<string> {
    try {
      // Make sure tokenA and tokenB are in the correct order
      const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
        
      const poolAddress = await this.factory.getPool(
        token0.address,
        token1.address,
        fee
      );
      
      if (poolAddress === ethers.ZeroAddress) {
        throw new Error(`No pool exists for ${token0.symbol}/${token1.symbol} with fee ${fee}`);
      }
      
      logger.info(`Found pool address: ${poolAddress} for ${token0.symbol}/${token1.symbol}`);
      return poolAddress;
    } catch (error: any) {
      logger.error(`Error getting pool address: ${error.message}`);
      throw error;
    }
  }
  
  // Get pool data
  async getPoolData(poolAddress: string): Promise<{
    token0: string;
    token1: string;
    fee: number;
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
  }> {
    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        POOL_ABI,
        this.provider
      );
      
      const [token0, token1, fee, slot0Data, liquidity] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.slot0(),
        poolContract.liquidity()
      ]);
      
      return {
        token0,
        token1,
        fee,
        sqrtPriceX96: slot0Data[0],
        tick: slot0Data[1],
        liquidity
      };
    } catch (error: any) {
      logger.error(`Error getting pool data: ${error.message}`);
      throw error;
    }
  }
  
  // Get all pools for a token
  async getAllPoolsForToken(token: Token, commonTokens: Token[]): Promise<any[]> {
    const pools = [];
    const fees = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    
    for (const pairedToken of commonTokens) {
      // Skip if same token
      if (token.address === pairedToken.address) continue;
      
      for (const fee of fees) {
        try {
          const poolAddress = await this.getPoolAddress(token, pairedToken, fee);
          const poolData = await this.getPoolData(poolAddress);
          
          pools.push({
            address: poolAddress,
            token0: poolData.token0,
            token1: poolData.token1,
            fee,
            liquidity: poolData.liquidity.toString(),
            sqrtPriceX96: poolData.sqrtPriceX96.toString(),
            tick: poolData.tick
          });
        } catch (error) {
          // Pool doesn't exist, just skip
          continue;
        }
      }
    }
    
    return pools;
  }
}