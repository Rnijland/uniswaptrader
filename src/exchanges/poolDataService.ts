// src/exchanges/poolDataService.ts
import { ethers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { logger } from '../utils/logger';
import { provider } from '../config/provider';

// Constants
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V2_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

// ABIs
const FACTORY_V3_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

const FACTORY_V2_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const POOL_V3_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
];

const POOL_V2_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'event Swap(address indexed sender, address indexed to, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out)'
];

// Fee tiers for Uniswap V3
const FEE_TIERS = [500, 3000, 10000];

// In-memory cache
const poolCache = new Map();
const tokenPairsCache = new Map();
const priceFeedsCache = new Map();

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

export class PoolDataService {
  private v3Factory: ethers.Contract;
  private v2Factory: ethers.Contract;

  constructor(private jsonRpcProvider = provider) {
    this.v3Factory = new ethers.Contract(
      UNISWAP_V3_FACTORY_ADDRESS,
      FACTORY_V3_ABI,
      jsonRpcProvider
    );
    
    this.v2Factory = new ethers.Contract(
      UNISWAP_V2_FACTORY_ADDRESS,
      FACTORY_V2_ABI,
      jsonRpcProvider
    );
    
    logger.info('PoolDataService initialized');
    
    // Start listening for swap events on active pools
    this.startSwapEventListeners();
  }
  
  /**
   * Get V3 pool address for a token pair and fee
   */
  async getV3PoolAddress(tokenA: Token, tokenB: Token, fee: number): Promise<string> {
    // Create a unique key for this token pair + fee
    const key = `${tokenA.address}:${tokenB.address}:${fee}`;
    
    // Check cache first
    if (poolCache.has(key)) {
      return poolCache.get(key);
    }
    
    try {
      // Make sure tokenA and tokenB are in the correct order
      const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
        
      const poolAddress = await this.v3Factory.getPool(
        token0.address,
        token1.address,
        fee
      );
      
      if (poolAddress === ethers.ZeroAddress) {
        throw new Error(`No V3 pool exists for ${token0.symbol}/${token1.symbol} with fee ${fee}`);
      }
      
      // Cache the result
      poolCache.set(key, poolAddress);
      
      logger.info(`Found V3 pool address: ${poolAddress} for ${token0.symbol}/${token1.symbol}`);
      return poolAddress;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting V3 pool address: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Get V2 pool address for a token pair
   */
  async getV2PoolAddress(tokenA: Token, tokenB: Token): Promise<string> {
    // Create a unique key for this token pair
    const key = `${tokenA.address}:${tokenB.address}:v2`;
    
    // Check cache first
    if (poolCache.has(key)) {
      return poolCache.get(key);
    }
    
    try {
      // Make sure tokenA and tokenB are in the correct order
      const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
        
      const pairAddress = await this.v2Factory.getPair(
        token0.address,
        token1.address
      );
      
      if (pairAddress === ethers.ZeroAddress) {
        throw new Error(`No V2 pair exists for ${token0.symbol}/${token1.symbol}`);
      }
      
      // Cache the result
      poolCache.set(key, pairAddress);
      
      logger.info(`Found V2 pair address: ${pairAddress} for ${token0.symbol}/${token1.symbol}`);
      return pairAddress;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting V2 pair address: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Get V3 pool data including current price, liquidity, etc.
   */
  async getV3PoolData(poolAddress: string): Promise<any> {
    // Create a cache key for this pool
    const cacheKey = `data:${poolAddress}`;
    
    // Check if we have recent data in cache (less than 5 seconds old)
    const cachedData = poolCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 5000) {
      return cachedData.data;
    }
    
    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        POOL_V3_ABI,
        this.jsonRpcProvider
      );
      
      // Execute all calls in parallel
      const [token0, token1, fee, slot0Data, liquidity] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.slot0(),
        poolContract.liquidity()
      ]);
      
      const poolData = {
        address: poolAddress,
        token0,
        token1,
        fee,
        sqrtPriceX96: slot0Data[0].toString(),
        tick: slot0Data[1],
        liquidity: liquidity.toString()
      };
      
      // Cache the result with a timestamp
      poolCache.set(cacheKey, {
        data: poolData,
        timestamp: Date.now()
      });
      
      return poolData;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting V3 pool data: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Get V2 pool data including reserves
   */
  async getV2PoolData(poolAddress: string): Promise<any> {
    // Create a cache key for this pool
    const cacheKey = `data:${poolAddress}:v2`;
    
    // Check if we have recent data in cache (less than 5 seconds old)
    const cachedData = poolCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 5000) {
      return cachedData.data;
    }
    
    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        POOL_V2_ABI,
        this.jsonRpcProvider
      );
      
      // Execute all calls in parallel
      const [token0, token1, reserves] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.getReserves()
      ]);
      
      const poolData = {
        address: poolAddress,
        token0,
        token1,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        blockTimestampLast: reserves[2].toString()
      };
      
      // Cache the result with a timestamp
      poolCache.set(cacheKey, {
        data: poolData,
        timestamp: Date.now()
      });
      
      return poolData;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting V2 pool data: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Find all V3 pools for a specific token
   */
  async findAllV3PoolsForToken(token: Token, commonTokens: Token[]): Promise<any[]> {
    // Create a cache key for this token
    const cacheKey = `pools:${token.address}:v3`;
    
    // Check if we have cached data and it's less than 30 seconds old
    const cachedData = tokenPairsCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 30000) {
      return cachedData.data;
    }
    
    const poolPromises = [];
    
    // For each common token, check if pools exist for all fee tiers
    for (const pairedToken of commonTokens) {
      // Skip if the same token
      if (token.address === pairedToken.address) continue;
      
      // Check all fee tiers in parallel
      for (const fee of FEE_TIERS) {
        const promise = this.getV3PoolAddress(token, pairedToken, fee)
          .then(poolAddress => this.getV3PoolData(poolAddress))
          .catch(() => null); // Suppress errors if pool doesn't exist
        
        poolPromises.push(promise);
      }
    }
    
    // Wait for all pool queries to complete
    const results = await Promise.all(poolPromises);
    
    // Filter out null results (non-existent pools)
    const pools = results.filter(pool => pool !== null);
    
    // Cache the result
    tokenPairsCache.set(cacheKey, {
      data: pools,
      timestamp: Date.now()
    });
    
    return pools;
  }
  
  /**
   * Find all V2 pools for a specific token 
   */
  async findAllV2PoolsForToken(token: Token, commonTokens: Token[]): Promise<any[]> {
    // Create a cache key for this token
    const cacheKey = `pools:${token.address}:v2`;
    
    // Check if we have cached data and it's less than 30 seconds old
    const cachedData = tokenPairsCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 30000) {
      return cachedData.data;
    }
    
    const poolPromises = [];
    
    // For each common token, check if pools exist
    for (const pairedToken of commonTokens) {
      // Skip if the same token
      if (token.address === pairedToken.address) continue;
      
      const promise = this.getV2PoolAddress(token, pairedToken)
        .then(poolAddress => this.getV2PoolData(poolAddress))
        .catch(() => null); // Suppress errors if pool doesn't exist
      
      poolPromises.push(promise);
    }
    
    // Wait for all pool queries to complete
    const results = await Promise.all(poolPromises);
    
    // Filter out null results (non-existent pools)
    const pools = results.filter(pool => pool !== null);
    
    // Cache the result
    tokenPairsCache.set(cacheKey, {
      data: pools,
      timestamp: Date.now()
    });
    
    return pools;
  }
  
  /**
   * Get both V2 and V3 pools for a given token
   */
  async getAllPoolsForToken(token: Token, commonTokens: Token[]): Promise<any> {
    try {
      // Execute both queries in parallel
      const [v3Pools, v2Pools] = await Promise.all([
        this.findAllV3PoolsForToken(token, commonTokens),
        this.findAllV2PoolsForToken(token, commonTokens)
      ]);
      
      // Convert any BigInt values to strings before returning
      return {
        v3Pools: convertBigIntsToStrings(v3Pools),
        v2Pools: convertBigIntsToStrings(v2Pools)
      };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting all pools for token: ${errorMessage}`);
      throw error;
    }
  }
  
  /**
   * Listen for swap events on important pools to get real-time price updates
   */
  private startSwapEventListeners() {
    // This method would be implemented to subscribe to real-time events
    // For high-performance, we would selectively listen to only the most
    // relevant pools based on trading strategy
    logger.info('Swap event listeners initialized');
  }
  
/**
 * Calculate current price from pool data
 */
calculateV3Price(poolData: any): { price01: number, price10: number } {
    // For V3, convert sqrtPriceX96 (which is now stored as a string) to price
    // No need to change this part as BigInt() can handle string inputs
    const sqrtPriceX96 = BigInt(poolData.sqrtPriceX96);
    const price = (sqrtPriceX96 * sqrtPriceX96 * 10n**18n) / (2n**192n);
    
    return {
      price01: Number(price) / 10**18, // token0 per token1
      price10: 10**18 / Number(price)  // token1 per token0
    };
  }
  
  calculateV2Price(poolData: any): { price01: number, price10: number } {
    // For V2, use reserves (which are now stored as strings)
    const reserve0 = Number(poolData.reserve0);
    const reserve1 = Number(poolData.reserve1);
    
    return {
      price01: reserve1 / reserve0, // token0 per token1
      price10: reserve0 / reserve1  // token1 per token0
    };
  }
  
  /**
   * Find arbitrage opportunities between pools
   */
  async findArbitrageOpportunities(tokens: Token[]): Promise<any[]> {
    // Implementation would scan for price differences between pools
    // that exceed transaction costs
    return [];
  }
  
  /**
   * Get pool data for a given pool address (tries both V3 and V2)
   */
  async getPoolData(poolAddress: string): Promise<any> {
    try {
      // Try to get V3 pool data first
      try {
        const v3Data = await this.getV3PoolData(poolAddress);
        return v3Data;
      } catch (v3Error) {
        // If V3 fails, try V2
        try {
          const v2Data = await this.getV2PoolData(poolAddress);
          return v2Data;
        } catch (v2Error) {
          // If both fail, throw an error
          throw new Error(`Could not get data for pool ${poolAddress} (tried both V3 and V2)`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      logger.error(`Error getting pool data: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Clear old cache entries to prevent memory leaks
   */
  clearStaleCache() {
    const now = Date.now();
    
    // Clear pools data older than 1 minute
    for (const [key, value] of poolCache.entries()) {
      if (value.timestamp && now - value.timestamp > 60000) {
        poolCache.delete(key);
      }
    }
    
    // Clear token pairs data older than 5 minutes
    for (const [key, value] of tokenPairsCache.entries()) {
      if (value.timestamp && now - value.timestamp > 300000) {
        tokenPairsCache.delete(key);
      }
    }
  }
}
