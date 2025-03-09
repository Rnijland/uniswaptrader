// src/ui/cli.ts
import readline from 'readline';
import { createWallet, getWallet, listWallets, deleteWallet } from '../core/wallet';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';
import { provider } from '../config/provider';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main menu
async function showMainMenu() {
  console.clear();
  console.log('=== Uniswap Trading Bot ===');
  console.log('1. Wallet Management');
  console.log('2. Check Pool Information');
  console.log('3. Execute Trade');
  console.log('4. Exit');
  
  const choice = await prompt('Enter your choice (1-4): ');
  
  switch (choice) {
    case '1':
      await showWalletMenu();
      break;
    case '2':
      await showPoolInfoMenu();
      break;
    case '3':
      await showTradeMenu();
      break;
    case '4':
      console.log('Exiting...');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('Invalid choice. Please try again.');
      await showMainMenu();
  }
}

// Wallet management menu
async function showWalletMenu() {
  console.clear();
  console.log('=== Wallet Management ===');
  console.log('1. Create New Wallet');
  console.log('2. List Wallets');
  console.log('3. Check Wallet Balance');
  console.log('4. Delete Wallet');
  console.log('5. Back to Main Menu');
  
  const choice = await prompt('Enter your choice (1-5): ');
  
  switch (choice) {
    case '1':
      await createNewWallet();
      break;
    case '2':
      await showWalletList();
      break;
    case '3':
      await checkWalletBalance();
      break;
    case '4':
      await deleteWalletPrompt();
      break;
    case '5':
      await showMainMenu();
      break;
    default:
      console.log('Invalid choice. Please try again.');
      await showWalletMenu();
  }
}

// Create new wallet
async function createNewWallet() {
  const name = await prompt('Enter a name for the wallet: ');
  
  try {
    const walletData = createWallet(name);
    console.log('\nWallet created successfully!');
    console.log(`Address: ${walletData.address}`);
    console.log(`Private Key: ${walletData.privateKey}`);
    console.log(`Mnemonic: ${walletData.mnemonic}`);
    console.log('\nIMPORTANT: Store your private key and mnemonic securely!');
    
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
  } catch (error: any) {
    console.error(`Error creating wallet: ${error.message}`);
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
  }
}

// List wallets
async function showWalletList() {
  const wallets = listWallets();
  
  console.log('\nAvailable Wallets:');
  if (wallets.length === 0) {
    console.log('No wallets found.');
  } else {
    wallets.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.name} - ${wallet.address} (Created: ${wallet.createdAt})`);
    });
  }
  
  await prompt('\nPress Enter to continue...');
  await showWalletMenu();
}

// Check wallet balance
async function checkWalletBalance() {
  const name = await prompt('Enter wallet name: ');
  
  const wallet = getWallet(name);
  if (!wallet) {
    console.log(`Wallet "${name}" not found.`);
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
    return;
  }
  
  try {
    const balance = await wallet.provider?.getBalance(wallet.address);
    if (!balance) {
      throw new Error("Failed to get balance");
    }
    
    console.log(`\nWallet: ${name} (${wallet.address})`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
  } catch (error: any) {
    console.error(`Error checking balance: ${error.message}`);
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
  }
}

// Delete wallet
async function deleteWalletPrompt() {
  const name = await prompt('Enter wallet name to delete: ');
  
  const confirmDelete = await prompt(`Are you sure you want to delete wallet "${name}"? (yes/no): `);
  if (confirmDelete.toLowerCase() !== 'yes') {
    console.log('Deletion cancelled.');
    await prompt('\nPress Enter to continue...');
    await showWalletMenu();
    return;
  }
  
  const success = deleteWallet(name);
  if (success) {
    console.log(`Wallet "${name}" deleted successfully.`);
  } else {
    console.log(`Failed to delete wallet "${name}".`);
  }
  
  await prompt('\nPress Enter to continue...');
  await showWalletMenu();
}

// Pool information menu
async function showPoolInfoMenu() {
  console.log('Pool information functionality will be implemented soon.');
  await prompt('\nPress Enter to continue...');
  await showMainMenu();
}

// Trade execution menu
async function showTradeMenu() {
  console.log('Trade execution functionality will be implemented soon.');
  await prompt('\nPress Enter to continue...');
  await showMainMenu();
}

// Export main function to start the CLI
export async function startCLI() {
  console.log('Starting Uniswap Trading Bot CLI...');
  await showMainMenu();
}