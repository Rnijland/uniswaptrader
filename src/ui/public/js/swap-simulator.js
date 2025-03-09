// swap-simulator.js

// Handle custom token selection
document.getElementById('tokenIn').addEventListener('change', function() {
  const customDiv = document.getElementById('customTokenInDiv');
  customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
});

document.getElementById('tokenOut').addEventListener('change', function() {
  const customDiv = document.getElementById('customTokenOutDiv');
  customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
});

// Handle form submission
document.getElementById('swapSimulatorForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Show loading, hide other states
  document.getElementById('initialMessage').style.display = 'none';
  document.getElementById('quoteResult').style.display = 'none';
  document.getElementById('quoteError').style.display = 'none';
  document.getElementById('quoteLoading').style.display = 'block';
  
  // Get form values
  let tokenIn = document.getElementById('tokenIn').value;
  if (tokenIn === 'custom') {
    tokenIn = document.getElementById('customTokenIn').value;
  }
  
  let tokenOut = document.getElementById('tokenOut').value;
  if (tokenOut === 'custom') {
    tokenOut = document.getElementById('customTokenOut').value;
  }
  
  const fee = document.getElementById('fee').value;
  const amountIn = document.getElementById('amountIn').value;
  
  try {
    // Call API to get quote
    const response = await fetch('/api/swap-simulator/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokenIn,
        tokenOut,
        fee,
        amountIn
      })
    });
    
    const data = await response.json();
    
    // Hide loading
    document.getElementById('quoteLoading').style.display = 'none';
    
    if (data.success) {
      // Show result
      document.getElementById('quoteAmountIn').textContent = `${data.amountIn} ${data.tokenInSymbol}`;
      document.getElementById('quoteAmountOut').textContent = `${data.amountOut} ${data.tokenOutSymbol}`;
      
      // Calculate and display rate
      const rate = parseFloat(data.amountOut) / parseFloat(data.amountIn);
      document.getElementById('quoteRate').textContent = `1 ${data.tokenInSymbol} = ${rate.toFixed(6)} ${data.tokenOutSymbol}`;
      
      document.getElementById('quoteResult').style.display = 'block';
    } else {
      // Show error
      document.getElementById('errorMessage').textContent = data.error;
      document.getElementById('errorHelp').style.display = 'block';
      document.getElementById('quoteError').style.display = 'block';
    }
  } catch (error) {
    // Hide loading, show error
    document.getElementById('quoteLoading').style.display = 'none';
    document.getElementById('errorMessage').textContent = error.message;
    document.getElementById('errorHelp').style.display = 'block';
    document.getElementById('quoteError').style.display = 'block';
  }
});

// Helper to get token symbol from address
function getTokenSymbol(address) {
  // Get token data from the data attribute
  const tokenDataElement = document.getElementById('tokenData');
  const tokens = JSON.parse(tokenDataElement.getAttribute('data-tokens'));
  
  const symbol = tokens[address.toLowerCase()];
  if (symbol) return symbol;
  
  // If not, return shortened address
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
