// src/core/transactions.ts
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { getWallet } from './wallet';
import { PoolDataService } from '../exchanges/poolDataService';

// Initialize the pool data service
const poolDataService = new PoolDataService();

// ERC20 token ABI (minimal for transfers)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// Uniswap V2 Router ABI (minimal for swaps)
const UNISWAP_V2_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

// Uniswap V2 Router address on Ethereum mainnet
const UNISWAP_V2_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

// WETH address on Ethereum mainnet
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

/**
 * Get token balance for a wallet
 */
export async function getTokenBalance(walletName: string, tokenAddress: string): Promise<{
  balance: string;
  symbol: string;
  decimals: number;
}> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get token details
    const [balance, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(wallet.address),
      tokenContract.decimals(),
      tokenContract.symbol()
    ]);
    
    // Format the balance based on token decimals
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    return {
      balance: formattedBalance,
      symbol,
      decimals
    };
  } catch (error: any) {
    logger.error(`Error getting token balance: ${error.message}`);
    throw error;
  }
}

/**
 * Send ETH from one wallet to another address
 */
export async function sendEth(
  walletName: string,
  toAddress: string,
  amount: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    // Validate the recipient address
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }
    
    // Validate the amount
    const amountWei = ethers.parseEther(amount);
    if (amountWei <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check if the wallet has enough balance
    const balance = await wallet.provider?.getBalance(wallet.address);
    if (!balance || balance < amountWei) {
      throw new Error('Insufficient balance');
    }
    
    // Create and send the transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei
    });
    
    logger.info(`Transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    logger.info(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    logger.error(`Error sending ETH: ${error.message}`);
    throw error;
  }
}

/**
 * Send ERC20 tokens from one wallet to another address
 */
export async function sendToken(
  walletName: string,
  tokenAddress: string,
  toAddress: string,
  amount: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    // Validate the token address
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Validate the recipient address
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    
    // Parse the amount based on token decimals
    const amountInTokenUnits = ethers.parseUnits(amount, decimals);
    if (amountInTokenUnits <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check if the wallet has enough balance
    const balance = await tokenContract.balanceOf(wallet.address);
    if (balance < amountInTokenUnits) {
      throw new Error('Insufficient token balance');
    }
    
    // Send the tokens
    const tx = await tokenContract.transfer(toAddress, amountInTokenUnits);
    
    logger.info(`Token transfer transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    logger.info(`Token transfer confirmed in block ${receipt?.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    logger.error(`Error sending tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Swap ETH for tokens using Uniswap
 */
export async function swapEthForTokens(
  walletName: string,
  tokenAddress: string,
  ethAmount: string,
  slippagePercent: number = 2 // Default 2% slippage
): Promise<ethers.TransactionReceipt | null> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    // Validate the token address
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Parse ETH amount
    const ethAmountWei = ethers.parseEther(ethAmount);
    if (ethAmountWei <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check if the wallet has enough ETH
    const balance = await wallet.provider?.getBalance(wallet.address);
    if (!balance || balance < ethAmountWei) {
      throw new Error('Insufficient ETH balance');
    }
    
    // Initialize Uniswap Router contract
    const router = new ethers.Contract(
      UNISWAP_V2_ROUTER_ADDRESS,
      UNISWAP_V2_ROUTER_ABI,
      wallet
    );
    
    // Define the swap path (ETH -> WETH -> Token)
    const path = [WETH_ADDRESS, tokenAddress];
    
    // Get expected output amount
    const amounts = await router.getAmountsOut(ethAmountWei, path);
    const expectedOutputAmount = amounts[1];
    
    // Calculate minimum output amount with slippage
    const slippageFactor = 100 - slippagePercent;
    const minOutputAmount = (expectedOutputAmount * BigInt(slippageFactor)) / 100n;
    
    // Set deadline to 20 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    // Execute the swap
    const tx = await router.swapExactETHForTokens(
      minOutputAmount,
      path,
      wallet.address,
      deadline,
      { value: ethAmountWei }
    );
    
    logger.info(`Swap transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    logger.info(`Swap confirmed in block ${receipt?.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    logger.error(`Error swapping ETH for tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Swap tokens for ETH using Uniswap
 */
export async function swapTokensForEth(
  walletName: string,
  tokenAddress: string,
  tokenAmount: string,
  slippagePercent: number = 2 // Default 2% slippage
): Promise<ethers.TransactionReceipt | null> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    // Validate the token address
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Initialize token contract
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    
    // Parse token amount
    const tokenAmountInUnits = ethers.parseUnits(tokenAmount, decimals);
    if (tokenAmountInUnits <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check if the wallet has enough tokens
    const balance = await tokenContract.balanceOf(wallet.address);
    if (balance < tokenAmountInUnits) {
      throw new Error('Insufficient token balance');
    }
    
    // Initialize Uniswap Router contract
    const router = new ethers.Contract(
      UNISWAP_V2_ROUTER_ADDRESS,
      UNISWAP_V2_ROUTER_ABI,
      wallet
    );
    
    // Define the swap path (Token -> WETH)
    const path = [tokenAddress, WETH_ADDRESS];
    
    // Get expected output amount
    const amounts = await router.getAmountsOut(tokenAmountInUnits, path);
    const expectedEthOutput = amounts[1];
    
    // Calculate minimum output amount with slippage
    const slippageFactor = 100 - slippagePercent;
    const minEthOutput = (expectedEthOutput * BigInt(slippageFactor)) / 100n;
    
    // Set deadline to 20 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    // Approve router to spend tokens
    const approveTx = await tokenContract.approve(UNISWAP_V2_ROUTER_ADDRESS, tokenAmountInUnits);
    await approveTx.wait();
    
    logger.info(`Approved Uniswap Router to spend ${tokenAmount} tokens`);
    
    // Execute the swap
    const tx = await router.swapExactTokensForETH(
      tokenAmountInUnits,
      minEthOutput,
      path,
      wallet.address,
      deadline
    );
    
    logger.info(`Swap transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    logger.info(`Swap confirmed in block ${receipt?.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    logger.error(`Error swapping tokens for ETH: ${error.message}`);
    throw error;
  }
}

/**
 * Swap tokens for tokens using Uniswap
 */
export async function swapTokensForTokens(
  walletName: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  tokenAmount: string,
  slippagePercent: number = 2 // Default 2% slippage
): Promise<ethers.TransactionReceipt | null> {
  try {
    const wallet = getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found`);
    }
    
    // Validate token addresses
    if (!ethers.isAddress(fromTokenAddress) || !ethers.isAddress(toTokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    // Initialize token contract
    const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, wallet);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    
    // Parse token amount
    const tokenAmountInUnits = ethers.parseUnits(tokenAmount, decimals);
    if (tokenAmountInUnits <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check if the wallet has enough tokens
    const balance = await tokenContract.balanceOf(wallet.address);
    if (balance < tokenAmountInUnits) {
      throw new Error('Insufficient token balance');
    }
    
    // Initialize Uniswap Router contract
    const router = new ethers.Contract(
      UNISWAP_V2_ROUTER_ADDRESS,
      UNISWAP_V2_ROUTER_ABI,
      wallet
    );
    
    // Define the swap path (FromToken -> WETH -> ToToken)
    // Using WETH as an intermediary for better liquidity
    const path = [fromTokenAddress, WETH_ADDRESS, toTokenAddress];
    
    // Get expected output amount
    const amounts = await router.getAmountsOut(tokenAmountInUnits, path);
    const expectedOutputAmount = amounts[2];
    
    // Calculate minimum output amount with slippage
    const slippageFactor = 100 - slippagePercent;
    const minOutputAmount = (expectedOutputAmount * BigInt(slippageFactor)) / 100n;
    
    // Set deadline to 20 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    // Approve router to spend tokens
    const approveTx = await tokenContract.approve(UNISWAP_V2_ROUTER_ADDRESS, tokenAmountInUnits);
    await approveTx.wait();
    
    logger.info(`Approved Uniswap Router to spend ${tokenAmount} tokens`);
    
    // Execute the swap
    const tx = await router.swapExactTokensForTokens(
      tokenAmountInUnits,
      minOutputAmount,
      path,
      wallet.address,
      deadline
    );
    
    logger.info(`Swap transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    logger.info(`Swap confirmed in block ${receipt?.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    logger.error(`Error swapping tokens for tokens: ${error.message}`);
    throw error;
  }
}
