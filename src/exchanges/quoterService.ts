// src/exchanges/quoterService.ts
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { provider } from '../config/provider';

// Constants
const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Mainnet address
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Mainnet address
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Mainnet WETH

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

export class QuoterService {
  private quoter: ethers.Contract;
  private factory: ethers.Contract;
  
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
}
