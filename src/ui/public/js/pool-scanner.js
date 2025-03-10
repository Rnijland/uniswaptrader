// public/js/pool-scanner.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const scanFilterTypeRadios = document.querySelectorAll('input[name="scanFilterType"]');
    const scanFilterInstanceSelect = document.getElementById('scanFilterInstance');
    const scanFilterChainSelect = document.getElementById('scanFilterChain');
    const scanFilterInstanceContainer = document.getElementById('scanFilterInstanceSelect');
    const scanFilterChainContainer = document.getElementById('scanFilterChainSelect');
    const scanTypeSelect = document.getElementById('scanType');
    const topPoolsOptions = document.getElementById('topPoolsOptions');
    const customPoolsOptions = document.getElementById('customPoolsOptions');
    const poolCountSelect = document.getElementById('poolCount');
    const customPoolsTextarea = document.getElementById('customPools');
    const scanBtn = document.getElementById('scanBtn');
    const scanFilterDetailsContainer = document.getElementById('scanFilterDetails');
    const noScanFilterSelectedMessage = document.getElementById('noScanFilterSelectedMessage');
    const scanResultsSection = document.getElementById('scanResultsSection');
    const scanStatsTotal = document.getElementById('scanStatsTotal');
    const scanStatsMatches = document.getElementById('scanStatsMatches');
    const scanResultsTable = document.getElementById('scanResultsTable');
    const noScanResultsMessage = document.getElementById('noScanResultsMessage');
    const showOnlyMatches = document.getElementById('showOnlyMatches');
    const poolDetailsBody = document.getElementById('poolDetailsBody');
    
    // State
    let activeFilters = {};
    let filterChains = {};
    let selectedScanFilter = null;
    let scanResults = [];
    
    // Initialize
    init();
    
    // Event Listeners
    scanFilterTypeRadios.forEach(radio => {
      radio.addEventListener('change', handleScanFilterTypeChange);
    });
    
    scanFilterInstanceSelect.addEventListener('change', handleScanFilterInstanceChange);
    scanFilterChainSelect.addEventListener('change', handleScanFilterChainChange);
    scanTypeSelect.addEventListener('change', handleScanTypeChange);
    scanBtn.addEventListener('click', handleScanPools);
    showOnlyMatches.addEventListener('change', handleShowOnlyMatchesChange);
    
    // Initialize the page
    async function init() {
      try {
        // Load active filters
        await loadActiveFilters();
        
        // Load filter chains
        await loadFilterChains();
        
      } catch (error) {
        console.error('Error initializing pool scanner:', error);
        showErrorMessage('Failed to initialize pool scanner. Please check console for details.');
      }
    }
    
    // Load active filters from the API
    async function loadActiveFilters() {
      try {
        const response = await fetch('/api/filters/active');
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        activeFilters = data.filters;
        
        // Populate filter dropdown
        populateScanFilterDropdown();
        
      } catch (error) {
        console.error('Error loading active filters:', error);
        throw error;
      }
    }
    
    // Load filter chains from the API
    async function loadFilterChains() {
      try {
        const response = await fetch('/api/filters/chains');
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        filterChains = data.chains;
        
        // Populate chain dropdown
        populateScanChainDropdown();
        
      } catch (error) {
        console.error('Error loading filter chains:', error);
        throw error;
      }
    }
    
    // Populate filter dropdown for scanning
    function populateScanFilterDropdown() {
      scanFilterInstanceSelect.innerHTML = '<option value="">Select a filter...</option>';
      
      for (const [instanceId, filter] of Object.entries(activeFilters)) {
        const option = document.createElement('option');
        option.value = instanceId;
        option.textContent = filter.name;
        scanFilterInstanceSelect.appendChild(option);
      }
    }
    
    // Populate chain dropdown for scanning
    function populateScanChainDropdown() {
      scanFilterChainSelect.innerHTML = '<option value="">Select a filter group...</option>';
      
      for (const [chainId, chain] of Object.entries(filterChains)) {
        const option = document.createElement('option');
        option.value = chainId;
        option.textContent = chainId;
        scanFilterChainSelect.appendChild(option);
      }
    }
    
    // Handle scan filter type change
    function handleScanFilterTypeChange() {
      const filterType = document.querySelector('input[name="scanFilterType"]:checked').value;
      
      if (filterType === 'instance') {
        scanFilterInstanceContainer.style.display = '';
        scanFilterChainContainer.style.display = 'none';
        handleScanFilterInstanceChange();
      } else {
        scanFilterInstanceContainer.style.display = 'none';
        scanFilterChainContainer.style.display = '';
        handleScanFilterChainChange();
      }
    }
    
    // Handle scan filter instance selection change
    function handleScanFilterInstanceChange() {
      const instanceId = scanFilterInstanceSelect.value;
      
      if (!instanceId) {
        scanFilterDetailsContainer.innerHTML = '';
        noScanFilterSelectedMessage.style.display = 'block';
        selectedScanFilter = null;
        return;
      }
      
      noScanFilterSelectedMessage.style.display = 'none';
      
      const filter = activeFilters[instanceId];
      if (!filter) {
        console.error(`Filter with instance ID ${instanceId} not found.`);
        return;
      }
      
      selectedScanFilter = {
        type: 'instance',
        id: instanceId
      };
      
      renderScanFilterDetails(filter);
    }
    
    // Handle scan filter chain selection change
    function handleScanFilterChainChange() {
      const chainId = scanFilterChainSelect.value;
      
      if (!chainId) {
        scanFilterDetailsContainer.innerHTML = '';
        noScanFilterSelectedMessage.style.display = 'block';
        selectedScanFilter = null;
        return;
      }
      
      noScanFilterSelectedMessage.style.display = 'none';
      
      const chain = filterChains[chainId];
      if (!chain) {
        console.error(`Filter chain with ID ${chainId} not found.`);
        return;
      }
      
      selectedScanFilter = {
        type: 'chain',
        id: chainId
      };
      
      renderScanChainDetails(chain);
    }
    
    // Handle scan type change
    function handleScanTypeChange() {
      const scanType = scanTypeSelect.value;
      
      if (scanType === 'top') {
        topPoolsOptions.style.display = '';
        customPoolsOptions.style.display = 'none';
      } else {
        topPoolsOptions.style.display = 'none';
        customPoolsOptions.style.display = '';
      }
    }
    
    // Render scan filter details
    function renderScanFilterDetails(filter) {
      let parametersHtml = '';
      
      if (filter.parameters) {
        parametersHtml = '<h6 class="mt-3">Parameters</h6><ul class="list-group">';
        
        for (const [paramName, paramValue] of Object.entries(filter.parameters)) {
          parametersHtml += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              ${formatParamName(paramName)}
              <span class="badge bg-primary">${formatParamValue(paramValue)}</span>
            </li>
          `;
        }
        
        parametersHtml += '</ul>';
      }
      
      scanFilterDetailsContainer.innerHTML = `
        <div class="alert alert-primary mb-3">
          <h5 class="alert-heading">${filter.name}</h5>
          <p class="mb-0">${filter.description}</p>
        </div>
        
        <div>
          <span class="badge ${filter.enabled ? 'bg-success' : 'bg-secondary'} mb-3">
            ${filter.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        ${parametersHtml}
      `;
    }
    
    // Render scan chain details
    function renderScanChainDetails(chain) {
      // Get filter names for this chain
      const filterNames = chain.filters.map(instanceId => {
        return activeFilters[instanceId] ? activeFilters[instanceId].name : 'Unknown Filter';
      });
      
      scanFilterDetailsContainer.innerHTML = `
        <div class="alert alert-primary mb-3">
          <h5 class="alert-heading">Filter Group: ${chain.chainId}</h5>
          <p class="mb-0">
            <strong>Match Mode:</strong> ${chain.options.matchMode === 'all' ? 'All filters must match (AND)' : 'Any filter can match (OR)'}
          </p>
        </div>
        
        <h6 class="mt-3">Filters in Group</h6>
        <ul class="list-group">
          ${filterNames.map(name => `<li class="list-group-item">${name}</li>`).join('')}
        </ul>
      `;
    }
    
    // Handle scan pools button click
    async function handleScanPools() {
      if (!selectedScanFilter) {
        showErrorMessage('Please select a filter or filter chain.');
        return;
      }
      
      const scanType = scanTypeSelect.value;
      let poolAddresses = [];
      
      if (scanType === 'top') {
        // Get top pools by volume
        // This would typically call an API to get the top pools
        // For now, we'll use a placeholder method
        try {
          poolAddresses = await getTopPools(parseInt(poolCountSelect.value, 10));
        } catch (error) {
          console.error('Error fetching top pools:', error);
          showErrorMessage(`Failed to fetch top pools: ${error.message}`);
          return;
        }
      } else {
        // Parse custom pool addresses
        const customPools = customPoolsTextarea.value.trim();
        
        if (!customPools) {
          showErrorMessage('Please enter at least one pool address.');
          return;
        }
        
        // Split by newlines and filter out empty lines
        poolAddresses = customPools.split('\n')
          .map(addr => addr.trim())
          .filter(addr => addr);
        
        if (poolAddresses.length === 0) {
          showErrorMessage('Please enter at least one valid pool address.');
          return;
        }
      }
      
      try {
        // Show loading indicator
        // TODO: Add loading indicator
        
        let requestBody = {
          poolAddresses
        };
        
        if (selectedScanFilter.type === 'instance') {
          requestBody.instanceId = selectedScanFilter.id;
        } else {
          requestBody.chainId = selectedScanFilter.id;
        }
        
        const response = await fetch('/api/filters/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Store results
        scanResults = data.results;
        
        // Render results
        renderScanResults(data);
        
      } catch (error) {
        console.error('Error scanning pools:', error);
        showErrorMessage(`Failed to scan pools: ${error.message}`);
      }
    }
    
    // Render scan results
    function renderScanResults(data) {
      // Show results section
      scanResultsSection.style.display = 'block';
      
      // Update stats
      scanStatsTotal.textContent = `Total: ${data.totalProcessed}`;
      scanStatsMatches.textContent = `Matches: ${data.matchCount}`;
      
      // Check if we have any results
      if (data.results.length === 0) {
        scanResultsTable.innerHTML = '';
        noScanResultsMessage.style.display = 'block';
        return;
      }
      
      // Filter results based on showOnlyMatches checkbox
      const filteredResults = showOnlyMatches.checked
        ? data.results.filter(r => r.result && r.result.isMatch)
        : data.results;
      
      if (filteredResults.length === 0) {
        scanResultsTable.innerHTML = '';
        noScanResultsMessage.style.display = 'block';
        return;
      }
      
      noScanResultsMessage.style.display = 'none';
      
      // Generate table rows
      let tableHtml = '';
      
      filteredResults.forEach(result => {
        const isMatch = result.result && result.result.isMatch;
        const hasError = result.error || (result.result && result.result.error);
        
        tableHtml += `
          <tr>
            <td class="small">${result.poolAddress}</td>
            <td>
              ${hasError
                ? `<span class="badge bg-warning text-dark">ERROR</span>`
                : `<span class="badge ${isMatch ? 'bg-success' : 'bg-danger'}">${isMatch ? 'MATCH' : 'NO MATCH'}</span>`
              }
            </td>
            <td>
              ${hasError
                ? `<div class="text-danger small">${result.error || result.result.error}</div>`
                : isMatch
                  ? `<div class="text-success">Matched filter criteria</div>`
                  : `<div class="text-muted">Did not match filter criteria</div>`
              }
            </td>
            <td>
              <button class="btn btn-sm btn-outline-primary view-pool-details-btn" data-pool-address="${result.poolAddress}">
                View Details
              </button>
            </td>
          </tr>
        `;
      });
      
      scanResultsTable.innerHTML = tableHtml;
      
      // Add event listeners to view details buttons
      document.querySelectorAll('.view-pool-details-btn').forEach(btn => {
        btn.addEventListener('click', () => viewPoolDetails(btn.dataset.poolAddress));
      });
    }
    
    // Handle show only matches checkbox change
    function handleShowOnlyMatchesChange() {
      if (scanResults.length > 0) {
        renderScanResults({ results: scanResults, totalProcessed: scanResults.length, matchCount: scanResults.filter(r => r.result && r.result.isMatch).length });
      }
    }
    
    // View pool details
    async function viewPoolDetails(poolAddress) {
      try {
        // Show loading in modal
        poolDetailsBody.innerHTML = `
          <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading pool details...</p>
          </div>
        `;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('poolDetailsModal'));
        modal.show();
        
        // Fetch pool data
        const response = await fetch(`/api/pools/v3/${poolAddress}`);
        
        if (!response.ok) {
          // Try V2 endpoint if V3 fails
          const v2Response = await fetch(`/api/pools/v2/${poolAddress}`);
          
          if (!v2Response.ok) {
            throw new Error(`Failed to fetch pool details from both V3 and V2 endpoints.`);
          }
          
          const v2Data = await v2Response.json();
          
          if (!v2Data.success) {
            throw new Error(v2Data.error || 'Unknown error occurred');
          }
          
          renderPoolDetailsInModal(v2Data.pool, 'v2');
          return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        renderPoolDetailsInModal(data.pool, 'v3');
        
      } catch (error) {
        console.error('Error fetching pool details:', error);
        poolDetailsBody.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error:</strong> ${error.message}
          </div>
        `;
      }
    }
    
    // Render pool details in modal
    function renderPoolDetailsInModal(pool, version) {
      if (version === 'v3') {
        poolDetailsBody.innerHTML = `
          <div class="mb-3">
            <h6>Pool Address</h6>
            <p class="small">${pool.address}</p>
          </div>
          <div class="row">
            <div class="col-md-6">
              <h6>Token 0</h6>
              <p class="small">${pool.token0}</p>
            </div>
            <div class="col-md-6">
              <h6>Token 1</h6>
              <p class="small">${pool.token1}</p>
            </div>
          </div>
          <div class="row">
            <div class="col-md-4">
              <h6>Fee</h6>
              <p>${pool.fee / 10000}%</p>
            </div>
            <div class="col-md-4">
              <h6>Current Tick</h6>
              <p>${pool.tick}</p>
            </div>
            <div class="col-md-4">
              <h6>Liquidity</h6>
              <p>${formatNumber(pool.liquidity)}</p>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <h6>SqrtPriceX96</h6>
              <p class="small">${pool.sqrtPriceX96}</p>
            </div>
          </div>
        `;
      } else {
        poolDetailsBody.innerHTML = `
          <div class="mb-3">
            <h6>Pool Address</h6>
            <p class="small">${pool.address}</p>
          </div>
          <div class="row">
            <div class="col-md-6">
              <h6>Token 0</h6>
              <p class="small">${pool.token0}</p>
            </div>
            <div class="col-md-6">
              <h6>Token 1</h6>
              <p class="small">${pool.token1}</p>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <h6>Reserve 0</h6>
              <p>${formatNumber(pool.reserve0)}</p>
            </div>
            <div class="col-md-6">
              <h6>Reserve 1</h6>
              <p>${formatNumber(pool.reserve1)}</p>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <h6>Last Block Timestamp</h6>
              <p>${new Date(pool.blockTimestampLast * 1000).toLocaleString()}</p>
            </div>
          </div>
        `;
      }
    }
    
    // Helper function to get top pools
    async function getTopPools(count) {
      try {
        // This would typically call an API endpoint to get top pools
        // For now, we'll use a placeholder endpoint
        const response = await fetch(`/api/pools/top?limit=${count}`);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        return data.pools.map(pool => pool.address);
        
      } catch (error) {
        console.error('Error fetching top pools:', error);
        throw error;
      }
    }
    
    // Helper function to format parameter name
    function formatParamName(name) {
      // Convert camelCase to Title Case with spaces
      return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    }
    
    // Helper function to format parameter value
    function formatParamValue(value) {
      if (typeof value === 'boolean') {
        return value ? 'True' : 'False';
      } else if (typeof value === 'number') {
        return value.toString();
      } else {
        return value;
      }
    }
    
    // Helper function to format numbers
    function formatNumber(value) {
      if (!value) return '0';
      
      // Handle large numbers
      if (value > 1000000) {
        return (value / 1000000).toFixed(2) + 'M';
      } else if (value > 1000) {
        return (value / 1000).toFixed(2) + 'K';
      } else {
        return value.toString();
      }
    }
    
    // Show error message
    function showErrorMessage(message) {
      // You could implement a toast or notification system here
      alert(message);
    }
  });
