// wallet-details.js

// Show/hide swap forms based on selected swap type
document.getElementById('swapType').addEventListener('change', function() {
  const selectedType = this.value;
  
  // Hide all forms
  document.getElementById('ethForTokensForm').style.display = 'none';
  document.getElementById('tokensForEthForm').style.display = 'none';
  document.getElementById('tokensForTokensForm').style.display = 'none';
  
  // Show selected form
  if (selectedType === 'ethForTokens') {
    document.getElementById('ethForTokensForm').style.display = 'block';
  } else if (selectedType === 'tokensForEth') {
    document.getElementById('tokensForEthForm').style.display = 'block';
  } else if (selectedType === 'tokensForTokens') {
    document.getElementById('tokensForTokensForm').style.display = 'block';
  }
});

// Send ETH Form
document.getElementById('sendEthForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const resultDiv = document.getElementById('sendEthResult');
  resultDiv.innerHTML = '<div class="alert alert-info">Processing transaction...</div>';
  resultDiv.style.display = 'block';
  
  const walletName = document.getElementById('walletName').value;
  
  fetch(`/api/wallets/${walletName}/send-eth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      toAddress: document.getElementById('ethRecipient').value,
      amount: document.getElementById('ethAmount').value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${data.message}<br>
          Transaction Hash: <span class="mono">${data.transactionHash}</span><br>
          Block Number: ${data.blockNumber}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${data.error}
        </div>
      `;
    }
  })
  .catch(error => {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  });
});

// Send Token Form
document.getElementById('sendTokenForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const resultDiv = document.getElementById('sendTokenResult');
  resultDiv.innerHTML = '<div class="alert alert-info">Processing transaction...</div>';
  resultDiv.style.display = 'block';
  
  const walletName = document.getElementById('walletName').value;
  
  fetch(`/api/wallets/${walletName}/send-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tokenAddress: document.getElementById('tokenAddress').value,
      toAddress: document.getElementById('tokenRecipient').value,
      amount: document.getElementById('tokenAmount').value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${data.message}<br>
          Transaction Hash: <span class="mono">${data.transactionHash}</span><br>
          Block Number: ${data.blockNumber}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${data.error}
        </div>
      `;
    }
  })
  .catch(error => {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  });
});

// ETH to Token Swap Form
document.getElementById('ethForTokensForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const resultDiv = document.getElementById('swapResult');
  resultDiv.innerHTML = '<div class="alert alert-info">Processing swap...</div>';
  resultDiv.style.display = 'block';
  
  const walletName = document.getElementById('walletName').value;
  
  fetch(`/api/wallets/${walletName}/swap-eth-for-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tokenAddress: document.getElementById('ethToTokenAddress').value,
      ethAmount: document.getElementById('ethToTokenAmount').value,
      slippagePercent: document.getElementById('ethToTokenSlippage').value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${data.message}<br>
          Transaction Hash: <span class="mono">${data.transactionHash}</span><br>
          Block Number: ${data.blockNumber}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${data.error}
        </div>
      `;
    }
  })
  .catch(error => {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  });
});

// Token to ETH Swap Form
document.getElementById('tokensForEthForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const resultDiv = document.getElementById('swapResult');
  resultDiv.innerHTML = '<div class="alert alert-info">Processing swap...</div>';
  resultDiv.style.display = 'block';
  
  const walletName = document.getElementById('walletName').value;
  
  fetch(`/api/wallets/${walletName}/swap-tokens-for-eth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tokenAddress: document.getElementById('tokenToEthAddress').value,
      tokenAmount: document.getElementById('tokenToEthAmount').value,
      slippagePercent: document.getElementById('tokenToEthSlippage').value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${data.message}<br>
          Transaction Hash: <span class="mono">${data.transactionHash}</span><br>
          Block Number: ${data.blockNumber}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${data.error}
        </div>
      `;
    }
  })
  .catch(error => {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  });
});

// Token to Token Swap Form
document.getElementById('tokensForTokensForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const resultDiv = document.getElementById('swapResult');
  resultDiv.innerHTML = '<div class="alert alert-info">Processing swap...</div>';
  resultDiv.style.display = 'block';
  
  const walletName = document.getElementById('walletName').value;
  
  fetch(`/api/wallets/${walletName}/swap-tokens-for-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromTokenAddress: document.getElementById('fromTokenAddress').value,
      toTokenAddress: document.getElementById('toTokenAddress').value,
      tokenAmount: document.getElementById('tokenToTokenAmount').value,
      slippagePercent: document.getElementById('tokenToTokenSlippage').value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${data.message}<br>
          Transaction Hash: <span class="mono">${data.transactionHash}</span><br>
          Block Number: ${data.blockNumber}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${data.error}
        </div>
      `;
    }
  })
  .catch(error => {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  });
});
