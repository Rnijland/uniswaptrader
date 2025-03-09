// src/exchanges/quoterService.ts
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { provider } from '../config/provider';

// Constants
const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Mainnet address
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Mainnet address
const UNISWAP_V2_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Mainnet address
const UNISWAP_V2_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // Mainnet address
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Mainnet WETH

// Token addresses for known tokens
const KNOWN_TOKENS: Record<string, { address: string; decimals: number }> = {
  'WETH': { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  'NEIRO': { address: '0xC555D55279023E732CcD32D812114cAF5838fD46', decimals: 18 },
  'CELO': { address: '0xd88D5F9E6c10E6FebC9296A454f6C2589b1E8fAE', decimals: 18 },
  'UNI': { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
  'beraSTONE': { address: '0x6dcba3657EE750A51A13A235B4Ed081317dA3066', decimals: 18 },
  'PEPE': { address: '0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f', decimals: 18 },
  'TRX': { address: '0x99950bAE3d0b79b8BeE86A8A208Ae1b087b9Dcb0', decimals: 6 },
  'LINK': { address: '0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8', decimals: 18 },
  'PAXG': { address: '0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C', decimals: 18 },
  'AAVE': { address: '0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB', decimals: 18 },
  'ELON': { address: '0x7B73644935b8e68019aC6356c40661E1bc315860', decimals: 18 }
};

// Known pool addresses
const KNOWN_POOLS: Record<string, { address: string; version: number; fee: number; token0: string; token1: string }> = {
  // Neiro/ETH pair (V2, 0.3%)
  'neiro-eth': { 
    address: '0x2A84E2BD2E961b1557D6e516cA647268b432cbA4', 
    version: 2, 
    fee: 3000,
    token0: KNOWN_TOKENS['NEIRO'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // CELO/ETH pair (V3, 0.3%)
  'celo-eth': { 
    address: '0x9e33bB4c01a1d9Dd4E2cF6EEA2e81c7a5e30A8C2', // Actual pool address
    version: 3, 
    fee: 3000,
    token0: KNOWN_TOKENS['CELO'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // UNI/ETH pair (V3, 0.3%)
  'uni-eth': { 
    address: '0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801', // Actual pool address
    version: 3, 
    fee: 3000,
    token0: KNOWN_TOKENS['UNI'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // beraSTONE/ETH pair (V3, 0.05%)
  'berastone-eth': { 
    address: '0x92995D11d5EA5a21A3C60Bc8cA7c0E841f5d898a', // Actual pool address
    version: 3, 
    fee: 500,
    token0: KNOWN_TOKENS['beraSTONE'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // PEPE/ETH pair (V2, 0.3%)
  'pepe-eth': { 
    address: '0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f', 
    version: 2, 
    fee: 3000,
    token0: KNOWN_TOKENS['PEPE'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // TRX/ETH pair (V3, 0.05%)
  'trx-eth': { 
    address: '0x135e61528f3747f6A4D94dbFD8f486F5E4D8a377', // Actual pool address
    version: 3, 
    fee: 500,
    token0: KNOWN_TOKENS['TRX'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // LINK/ETH pair (V3, 0.3%)
  'link-eth': { 
    address: '0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8', 
    version: 3, 
    fee: 3000,
    token0: KNOWN_TOKENS['LINK'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // PAXG/ETH pair (V2, 0.3%)
  'paxg-eth': { 
    address: '0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C', 
    version: 2, 
    fee: 3000,
    token0: KNOWN_TOKENS['PAXG'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // AAVE/ETH pair (V3, 0.3%)
  'aave-eth': { 
    address: '0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB', 
    version: 3, 
    fee: 3000,
    token0: KNOWN_TOKENS['AAVE'].address,
    token1: KNOWN_TOKENS['WETH'].address
  },
  // ELON/ETH pair (V2, 0.3%)
  'elon-eth': { 
    address: '0x7B73644935b8e68019aC6356c40661E1bc315860', 
    version: 2, 
    fee: 3000,
    token0: KNOWN_TOKENS['ELON'].address,
    token1: KNOWN_TOKENS['WETH'].address
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

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

const UNISWAP_V2_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
];

const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const UNISWAP_V2_PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

// Helper function to find a known pair key for a token pair
function findKnownPairKey(tokenA: string, tokenB: string): string | null {
  const normalizedTokenA = tokenA.toLowerCase();
  const normalizedTokenB = tokenB.toLowerCase();
  
  // Check each known pool
  for (const [key, poolInfo] of Object.entries(KNOWN_POOLS)) {
    const poolToken0 = poolInfo.token0.toLowerCase();
    const poolToken1 = poolInfo.token1.toLowerCase();
    
    // Check if the tokens match (in either order)
    if (
      (normalizedTokenA === poolToken0 && normalizedTokenB === poolToken1) ||
      (normalizedTokenA === poolToken1 && normalizedTokenB === poolToken0)
    ) {
      return key;
    }
  }
  
  return null;
}

export class QuoterService {
  private quoter: ethers.Contract;
  private factory: ethers.Contract;
  private v2Router: ethers.Contract;
  private v2Factory: ethers.Contract;
  
  constructor(private jsonRpcProvider = provider) {
    this.quoter = new ethers.Contract(
      UNISWAP_V3_QUOTER_ADDRESS,
      QUOTER_ABI,
      jsonRpcProvider
    );
    
    this.factory = new ethers.Contract(
      UNISWAP_V3_FACTORY_ADDRESS,
      FACTORY_ABI,
      jsonRpcProvider
    );
    
    this.v2Router = new ethers.Contract(
      UNISWAP_V2_ROUTER_ADDRESS,
      UNISWAP_V2_ROUTER_ABI,
      jsonRpcProvider
    );
    
    this.v2Factory = new ethers.Contract(
      UNISWAP_V2_FACTORY_ADDRESS,
      UNISWAP_V2_FACTORY_ABI,
      jsonRpcProvider
    );
    
    logger.info('QuoterService initialized');
  }
  
  /**
   * Get a quote for swapping an exact amount of input token for output token
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param fee Pool fee (500, 3000, or 10000)
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteExactInputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Convert the input amount to the proper format based on token decimals
      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
      
      // Call the quoter contract
      // Note: Even though the function is marked as "returns" in Solidity,
      // we can call it as a view function in ethers.js
      const amountOut = await this.quoter.quoteExactInputSingle.staticCall(
        tokenIn,
        tokenOut,
        fee,
        amountInWei,
        0 // No price limit
      );
      
      // Get the output token's decimals to format the result
      const tokenContract = new ethers.Contract(
        tokenOut,
        ['function decimals() view returns (uint8)'],
        this.jsonRpcProvider
      );
      const decimalsOut = await tokenContract.decimals();
      
      // Format the output amount based on token decimals
      const formattedAmountOut = ethers.formatUnits(amountOut, decimalsOut);
      
      logger.info(`Quote: ${amountIn} of token ${tokenIn} → ${formattedAmountOut} of token ${tokenOut}`);
      
      return formattedAmountOut;
    } catch (error: any) {
      logger.error(`Error getting quote: ${error.message}`);
      
      // Add more detailed error information
      if (error.code === 'CALL_EXCEPTION') {
        logger.error(`Call exception details: ${JSON.stringify({
          tokenIn,
          tokenOut,
          fee,
          amountIn,
          error: error.info || error.message
        })}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Get a quote with fallback through WETH if direct quote fails
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param fee Pool fee (500, 3000, or 10000)
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteExactInputSingleWithFallback(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Try direct quote first
      return await this.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, decimalsIn);
    } catch (error: any) {
      logger.warn(`Direct quote failed, trying fallback through WETH: ${error.message}`);
      
      // If direct quote fails, try routing through WETH
      try {
        // Get decimals for WETH (should be 18)
        const wethDecimals = 18;
        
        // First hop: tokenIn -> WETH
        const wethAmountOut = await this.quoteExactInputSingle(
          tokenIn, 
          WETH_ADDRESS, 
          3000, // Use 0.3% fee for WETH pairs
          amountIn,
          decimalsIn
        );
        
        // Second hop: WETH -> tokenOut
        return await this.quoteExactInputSingle(
          WETH_ADDRESS,
          tokenOut,
          3000, // Use 0.3% fee for WETH pairs
          wethAmountOut,
          wethDecimals
        );
      } catch (fallbackError: any) {
        logger.error(`Fallback quote also failed: ${fallbackError.message}`);
        throw new Error(`Could not get quote for ${tokenIn} to ${tokenOut}: ${error.message}`);
      }
    }
  }
  
  /**
   * Get a quote by directly using the pool address
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param fee Pool fee (500, 3000, or 10000)
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteExactInputByPoolAddress(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Check if tokenOut is actually a pool address
      if (tokenOut.length === 42) { // Ethereum address length
        try {
          // Try to get token0 and token1 from the potential pool address
          const poolContract = new ethers.Contract(
            tokenOut,
            POOL_ABI,
            this.jsonRpcProvider
          );
          
          // If this succeeds, it's likely a pool address
          const token0 = await poolContract.token0();
          const token1 = await poolContract.token1();
          const poolFee = await poolContract.fee();
          
          logger.info(`Detected pool address: ${tokenOut} with tokens ${token0} and ${token1}`);
          
          // Determine which token to use as output based on input
          const actualTokenOut = tokenIn.toLowerCase() === token0.toLowerCase() ? token1 : token0;
          
          // Use the pool's actual fee
          return await this.quoteExactInputSingle(tokenIn, actualTokenOut, poolFee, amountIn, decimalsIn);
        } catch (poolError) {
          // Not a pool address, continue with normal flow
          logger.info(`${tokenOut} is not a pool address, continuing with normal quote`);
        }
      }
      
      // Get pool address from factory
      const [token0, token1] = tokenIn.toLowerCase() < tokenOut.toLowerCase() 
        ? [tokenIn, tokenOut] 
        : [tokenOut, tokenIn];
      
      const poolAddress = await this.factory.getPool(token0, token1, fee);
      
      if (poolAddress === ethers.ZeroAddress) {
        throw new Error(`No pool exists for ${tokenIn}/${tokenOut} with fee ${fee}`);
      }
      
      logger.info(`Found pool address: ${poolAddress} for quote`);
      
      // Get pool data
      const poolContract = new ethers.Contract(
        poolAddress,
        POOL_ABI,
        this.jsonRpcProvider
      );
      
      // Get token0 and token1 from the pool to determine swap direction
      const actualToken0 = await poolContract.token0();
      const zeroForOne = tokenIn.toLowerCase() === actualToken0.toLowerCase();
      
      // Now use the quoter with the specific pool information
      return await this.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, decimalsIn);
    } catch (error: any) {
      logger.error(`Error quoting by pool address: ${error.message}`);
      
      // Try fallback
      return await this.quoteExactInputSingleWithFallback(tokenIn, tokenOut, fee, amountIn, decimalsIn);
    }
  }
  
  /**
   * Get a direct quote from a pool address
   * @param poolAddress The address of the Uniswap V3 pool
   * @param tokenIn Input token address
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteDirectFromPool(
    poolAddress: string,
    tokenIn: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Get pool contract
      const poolContract = new ethers.Contract(
        poolAddress,
        POOL_ABI,
        this.jsonRpcProvider
      );
      
      // Get token0 and token1 from the pool
      const token0 = await poolContract.token0();
      const token1 = await poolContract.token1();
      
      // Determine which token is the output token
      const tokenOut = tokenIn.toLowerCase() === token0.toLowerCase() ? token1 : token0;
      
      // Get the pool fee
      const fee = await poolContract.fee();
      
      logger.info(`Direct pool quote: ${poolAddress} with tokens ${token0} and ${token1}, fee ${fee}`);
      
      // Use the regular quote function with the correct parameters
      return await this.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, decimalsIn);
    } catch (error: any) {
      logger.error(`Error getting direct pool quote: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a quote using Uniswap V2 Router
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteV2ExactInput(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Convert the input amount to the proper format based on token decimals
      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
      
      // Define the path for the swap
      const path = [tokenIn, tokenOut];
      
      // Call the V2 router to get the amounts out
      const amounts = await this.v2Router.getAmountsOut(amountInWei, path);
      
      // The last amount in the array is the output amount
      const amountOut = amounts[amounts.length - 1];
      
      // Get the output token's decimals to format the result
      const tokenContract = new ethers.Contract(
        tokenOut,
        ['function decimals() view returns (uint8)'],
        this.jsonRpcProvider
      );
      const decimalsOut = await tokenContract.decimals();
      
      // Format the output amount based on token decimals
      const formattedAmountOut = ethers.formatUnits(amountOut, decimalsOut);
      
      logger.info(`V2 Quote: ${amountIn} of token ${tokenIn} → ${formattedAmountOut} of token ${tokenOut}`);
      
      return formattedAmountOut;
    } catch (error: any) {
      logger.error(`Error getting V2 quote: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a V2 quote with fallback through WETH if direct quote fails
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteV2ExactInputWithFallback(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Try direct quote first
      return await this.quoteV2ExactInput(tokenIn, tokenOut, amountIn, decimalsIn);
    } catch (error: any) {
      logger.warn(`Direct V2 quote failed, trying fallback through WETH: ${error.message}`);
      
      // If direct quote fails, try routing through WETH
      try {
        // Get decimals for WETH (should be 18)
        const wethDecimals = 18;
        
        // First hop: tokenIn -> WETH
        const wethAmountOut = await this.quoteV2ExactInput(
          tokenIn, 
          WETH_ADDRESS, 
          amountIn,
          decimalsIn
        );
        
        // Second hop: WETH -> tokenOut
        return await this.quoteV2ExactInput(
          WETH_ADDRESS,
          tokenOut,
          wethAmountOut,
          wethDecimals
        );
      } catch (fallbackError: any) {
        logger.error(`V2 fallback quote also failed: ${fallbackError.message}`);
        throw new Error(`Could not get V2 quote for ${tokenIn} to ${tokenOut}: ${error.message}`);
      }
    }
  }
  
  /**
   * Get a quote directly from a V2 pair using reserves
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteV2PairDirect(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    try {
      // Check for known problematic pairs
      let pairAddress: string;
      
      // Special case for Neiro/ETH
      const normalizedTokenIn = tokenIn.toLowerCase();
      const normalizedTokenOut = tokenOut.toLowerCase();
      const neiroAddress = '0xc555d55279023e732ccd32d812114caf5838fd46';
      const wethAddress = WETH_ADDRESS.toLowerCase();
      
      // Check for known pools
      const poolKey = findKnownPairKey(normalizedTokenIn, normalizedTokenOut);
      
      if (poolKey) {
        const poolInfo = KNOWN_POOLS[poolKey];
        pairAddress = poolInfo.address;
        
        // Check if this is a V3 pool
        if (poolInfo.version === 3) {
          logger.info(`Found V3 pool for ${poolKey}: ${pairAddress}, using V3 quoter`);
          
          // For V3 pools, use the quoter contract directly
          return await this.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            poolInfo.fee,
            amountIn,
            decimalsIn
          );
        }
        
        logger.info(`Using known V2 pair address for ${poolKey}: ${pairAddress}`);
      } else {
        // Get the pair address from the factory
        const [token0, token1] = tokenIn.toLowerCase() < tokenOut.toLowerCase() 
          ? [tokenIn, tokenOut] 
          : [tokenOut, tokenIn];
        
        pairAddress = await this.v2Factory.getPair(token0, token1);
        
        if (pairAddress === ethers.ZeroAddress) {
          throw new Error(`No V2 pair exists for ${tokenIn}/${tokenOut}`);
        }
        
        logger.info(`Found V2 pair address: ${pairAddress}`);
      }
      
      // Get the pair contract
      const pairContract = new ethers.Contract(
        pairAddress,
        UNISWAP_V2_PAIR_ABI,
        this.jsonRpcProvider
      );
      
      // Get reserves
      const [reserve0, reserve1] = await pairContract.getReserves();
      
      // Determine which reserve corresponds to which token
      const token0Address = await pairContract.token0();
      const isToken0 = tokenIn.toLowerCase() === token0Address.toLowerCase();
      
      // Get the reserves in the correct order
      const reserveIn = isToken0 ? reserve0 : reserve1;
      const reserveOut = isToken0 ? reserve1 : reserve0;
      
      // Convert input amount to wei
      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
      
      // Calculate output amount using the V2 formula:
      // amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
      const amountInWithFee = amountInWei * 997n;
      const numerator = reserveOut * amountInWithFee;
      const denominator = (reserveIn * 1000n) + amountInWithFee;
      const amountOut = numerator / denominator;
      
      // Get output token decimals
      const tokenContract = new ethers.Contract(
        tokenOut,
        ['function decimals() view returns (uint8)'],
        this.jsonRpcProvider
      );
      const decimalsOut = await tokenContract.decimals();
      
      // Format the output amount
      const formattedAmountOut = ethers.formatUnits(amountOut, decimalsOut);
      
      logger.info(`V2 Pair Direct Quote: ${amountIn} of token ${tokenIn} → ${formattedAmountOut} of token ${tokenOut}`);
      
      return formattedAmountOut;
    } catch (error: any) {
      logger.error(`Error getting V2 pair direct quote: ${error.message}`);
      throw error;
    }
  }
  
  
  /**
   * Get a quote using all available methods with fallbacks
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param fee Pool fee (500, 3000, or 10000) - only used for V3
   * @param amountIn Amount of input token (as a string, e.g. "1.0")
   * @param decimalsIn Decimals of the input token
   * @returns Expected output amount as a string
   */
  async quoteWithAllFallbacks(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number
  ): Promise<string> {
    // Try V2 pair direct first - this is the most reliable for all tokens
    try {
      logger.info(`Trying V2 pair direct quote first for ${tokenIn} to ${tokenOut}`);
      return await this.quoteV2PairDirect(tokenIn, tokenOut, amountIn, decimalsIn);
    } catch (v2PairError: any) {
      logger.warn(`V2 pair direct quote failed: ${v2PairError.message}, trying other methods`);
      
      // Try V3 direct
      try {
        return await this.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, decimalsIn);
      } catch (v3Error: any) {
        logger.warn(`V3 direct quote failed: ${v3Error.message}`);
        
        // Try V3 with WETH routing
        try {
          return await this.quoteExactInputSingleWithFallback(tokenIn, tokenOut, fee, amountIn, decimalsIn);
        } catch (v3FallbackError: any) {
          logger.warn(`V3 fallback quote failed: ${v3FallbackError.message}`);
          
          // Try V2 direct
          try {
            return await this.quoteV2ExactInput(tokenIn, tokenOut, amountIn, decimalsIn);
          } catch (v2Error: any) {
            logger.warn(`V2 direct quote failed: ${v2Error.message}`);
            
            // Try V2 with WETH routing as last resort
            try {
              return await this.quoteV2ExactInputWithFallback(tokenIn, tokenOut, amountIn, decimalsIn);
            } catch (v2FallbackError: any) {
              logger.error(`All quote methods failed`);
              throw new Error(`Could not get quote for ${tokenIn} to ${tokenOut} using any method`);
            }
          }
        }
      }
    }
  }
}
