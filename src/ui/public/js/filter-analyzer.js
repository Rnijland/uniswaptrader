// public/js/filter-analyzer.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const filterTypeRadios = document.querySelectorAll('input[name="filterType"]');
    const filterInstanceSelect = document.getElementById('filterInstance');
    const filterChainSelect = document.getElementById('filterChain');
    const filterInstanceContainer = document.getElementById('filterInstanceSelect');
    const filterChainContainer = document.getElementById('filterChainSelect');
    const poolAddressInput = document.getElementById('poolAddress');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const filterDetailsContainer = document.getElementById('filterDetails');
    const noFilterSelectedMessage = document.getElementById('noFilterSelectedMessage');
    const analysisResultSection = document.getElementById('analysisResultSection');
    const analysisResultsContainer = document.getElementById('analysisResults');
    const resultMatchBadge = document.getElementById('resultMatchBadge');
    const resultNoMatchBadge = document.getElementById('resultNoMatchBadge');
    const poolDataContainer = document.getElementById('poolData');
    
    // State
    let activeFilters = {};
    let filterChains = {};
    let selectedFilter = null;
    let lastAnalysisResult = null;
    
    // Initialize
    init();
    
    // Event Listeners
    filterTypeRadios.forEach(radio => {
      radio.addEventListener('change', handleFilterTypeChange);
    });
    
    filterInstanceSelect.addEventListener('change', handleFilterInstanceChange);
    filterChainSelect.addEventListener('change', handleFilterChainChange);
    analyzeBtn.addEventListener('click', handleAnalyzePool);
    
    // Initialize the page
    async function init() {
      try {
        // Load active filters
        await loadActiveFilters();
        
        // Load filter chains
        await loadFilterChains();
        
      } catch (error) {
        console.error('Error initializing filter analyzer:', error);
        showErrorMessage('Failed to initialize filter analyzer. Please check console for details.');
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
        populateFilterDropdown();
        
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
        populateChainDropdown();
        
      } catch (error) {
        console.error('Error loading filter chains:', error);
        throw error;
      }
    }
    
    // Populate filter dropdown
    function populateFilterDropdown() {
      filterInstanceSelect.innerHTML = '<option value="">Select a filter...</option>';
      
      for (const [instanceId, filter] of Object.entries(activeFilters)) {
        const option = document.createElement('option');
        option.value = instanceId;
        option.textContent = filter.name;
        filterInstanceSelect.appendChild(option);
      }
    }
    
    // Populate chain dropdown
    function populateChainDropdown() {
      filterChainSelect.innerHTML = '<option value="">Select a filter group...</option>';
      
      for (const [chainId, chain] of Object.entries(filterChains)) {
        const option = document.createElement('option');
        option.value = chainId;
        option.textContent = chainId;
        filterChainSelect.appendChild(option);
      }
    }
    
    // Handle filter type change
    function handleFilterTypeChange() {
      const filterType = document.querySelector('input[name="filterType"]:checked').value;
      
      if (filterType === 'instance') {
        filterInstanceContainer.style.display = '';
        filterChainContainer.style.display = 'none';
        handleFilterInstanceChange();
      } else {
        filterInstanceContainer.style.display = 'none';
        filterChainContainer.style.display = '';
        handleFilterChainChange();
      }
    }
    
    // Handle filter instance selection change
    function handleFilterInstanceChange() {
      const instanceId = filterInstanceSelect.value;
      
      if (!instanceId) {
        filterDetailsContainer.innerHTML = '';
        noFilterSelectedMessage.style.display = 'block';
        selectedFilter = null;
        return;
      }
      
      noFilterSelectedMessage.style.display = 'none';
      
      const filter = activeFilters[instanceId];
      if (!filter) {
        console.error(`Filter with instance ID ${instanceId} not found.`);
        return;
      }
      
      selectedFilter = {
        type: 'instance',
        id: instanceId
      };
      
      renderFilterDetails(filter);
    }
    
    // Handle filter chain selection change
    function handleFilterChainChange() {
      const chainId = filterChainSelect.value;
      
      if (!chainId) {
        filterDetailsContainer.innerHTML = '';
        noFilterSelectedMessage.style.display = 'block';
        selectedFilter = null;
        return;
      }
      
      noFilterSelectedMessage.style.display = 'none';
      
      const chain = filterChains[chainId];
      if (!chain) {
        console.error(`Filter chain with ID ${chainId} not found.`);
        return;
      }
      
      selectedFilter = {
        type: 'chain',
        id: chainId
      };
      
      renderChainDetails(chain);
    }
    
    // Render filter details
    function renderFilterDetails(filter) {
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
      
      filterDetailsContainer.innerHTML = `
        <h5>${filter.name}</h5>
        <p class="text-muted">${filter.description}</p>
        
        <div class="mt-2">
          <span class="badge ${filter.enabled ? 'bg-success' : 'bg-secondary'}">
            ${filter.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        ${parametersHtml}
      `;
    }
    
    // Render chain details
    function renderChainDetails(chain) {
      // Get filter names for this chain
      const filterNames = chain.filters.map(instanceId => {
        return activeFilters[instanceId] ? activeFilters[instanceId].name : 'Unknown Filter';
      });
      
      filterDetailsContainer.innerHTML = `
        <h5>Filter Group: ${chain.chainId}</h5>
        <p class="text-muted">
          <strong>Match Mode:</strong> ${chain.options.matchMode === 'all' ? 'All filters must match (AND)' : 'Any filter can match (OR)'}
        </p>
        
        <h6 class="mt-3">Filters in Group</h6>
        <ul class="list-group">
          ${filterNames.map(name => `<li class="list-group-item">${name}</li>`).join('')}
        </ul>
      `;
    }
    
    // Handle analyze pool button click
    async function handleAnalyzePool() {
      const poolAddress = poolAddressInput.value.trim();
      
      if (!poolAddress) {
        showErrorMessage('Please enter a pool address.');
        return;
      }
      
      if (!selectedFilter) {
        showErrorMessage('Please select a filter or filter chain.');
        return;
      }
      
      try {
        // Show loading indicator
        // TODO: Add loading indicator
        
        let response;
        
        if (selectedFilter.type === 'instance') {
          response = await fetch(`/api/filters/apply/${selectedFilter.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              poolAddress
            })
          });
        } else {
          response = await fetch(`/api/filters/chains/apply/${selectedFilter.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              poolAddress
            })
          });
        }
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Store result
        lastAnalysisResult = data.result;
        
        // Render result
        renderAnalysisResult(data.result, poolAddress);
        
      } catch (error) {
        console.error('Error analyzing pool:', error);
        showErrorMessage(`Failed to analyze pool: ${error.message}`);
      }
    }
    
    // Render analysis result
    function renderAnalysisResult(result, poolAddress) {
      // Show result section
      analysisResultSection.style.display = 'block';
      
      // Show match/no match badge
      resultMatchBadge.style.display = result.isMatch ? 'inline-block' : 'none';
      resultNoMatchBadge.style.display = !result.isMatch ? 'inline-block' : 'none';
      
      // Render result content based on type
      if (selectedFilter.type === 'instance') {
        renderFilterResult(result, poolAddress);
      } else {
        renderChainResult(result, poolAddress);
      }
    }
    
    // Render individual filter result
    function renderFilterResult(result, poolAddress) {
      const filter = activeFilters[result.instanceId];
      
      let resultHtml = `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">Filter: ${filter ? filter.name : result.filterName}</h5>
            <p class="card-text">
              <strong>Result:</strong> 
              <span class="badge ${result.isMatch ? 'bg-success' : 'bg-danger'}">
                ${result.isMatch ? 'MATCH' : 'NO MATCH'}
              </span>
            </p>
      `;
      
      // Add filter-specific data if available
      if (result.data) {
        resultHtml += `<div class="mt-3"><h6>Filter Data:</h6><pre class="bg-light p-3 rounded">${JSON.stringify(result.data, null, 2)}</pre></div>`;
      }
      
      // Add error if present
      if (result.error) {
        resultHtml += `
          <div class="alert alert-danger mt-3">
            <strong>Error:</strong> ${result.error}
          </div>
        `;
      }
      
      resultHtml += `</div></div>`;
      
      analysisResultsContainer.innerHTML = resultHtml;
      
      // Fetch and display pool data
      fetchPoolData(poolAddress);
    }
    
    // Render chain result
    function renderChainResult(result, poolAddress) {
      let resultHtml = `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">Filter Group: ${result.chainId}</h5>
            <p class="card-text">
              <strong>Result:</strong> 
              <span class="badge ${result.isMatch ? 'bg-success' : 'bg-danger'}">
                ${result.isMatch ? 'MATCH' : 'NO MATCH'}
              </span>
            </p>
            <p class="card-text">
              <strong>Match Mode:</strong> ${result.matchMode === 'all' ? 'All filters must match (AND)' : 'Any filter can match (OR)'}
            </p>
            
            <h6 class="mt-3">Individual Filter Results:</h6>
            <ul class="list-group">
      `;
      
      // Add individual filter results
      if (result.filterResults && result.filterResults.length > 0) {
        result.filterResults.forEach(filterResult => {
          const filter = activeFilters[filterResult.instanceId];
          
          resultHtml += `
            <li class="list-group-item">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>${filter ? filter.name : filterResult.filterName}</strong>
                </div>
                <span class="badge ${filterResult.isMatch ? 'bg-success' : 'bg-danger'}">
                  ${filterResult.isMatch ? 'MATCH' : 'NO MATCH'}
                </span>
              </div>
              ${filterResult.disabled ? '<div class="text-muted small">This filter is disabled</div>' : ''}
              ${filterResult.error ? `<div class="text-danger small">Error: ${filterResult.error}</div>` : ''}
            </li>
          `;
        });
      }
      
      resultHtml += `
            </ul>
          </div>
        </div>
      `;
      
      analysisResultsContainer.innerHTML = resultHtml;
      
      // Fetch and display pool data
      fetchPoolData(poolAddress);
    }
    
    // Fetch pool data to display
    async function fetchPoolData(poolAddress) {
      try {
        // You may want to create a dedicated endpoint for getting detailed pool data
        // For now, we'll use a simplified example
        const response = await fetch(`/api/pools/v3/${poolAddress}`);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        renderPoolData(data.pool);
        
      } catch (error) {
        console.error('Error fetching pool data:', error);
        poolDataContainer.innerHTML = `
          <div class="alert alert-warning">
            <strong>Warning:</strong> Failed to load detailed pool data. ${error.message}
          </div>
        `;
      }
    }
    
    // Render pool data
    function renderPoolData(poolData) {
      let poolHtml = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Pool Information</h5>
            
            <div class="row">
              <div class="col-md-6">
                <h6>Address</h6>
                <p class="text-monospace">${poolData.address}</p>
              </div>
              
              <div class="col-md-6">
                <h6>Pool Type</h6>
                <p>${poolData.fee ? 'Uniswap V3' : 'Uniswap V2'}</p>
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <h6>Token 0</h6>
                <p>${poolData.token0}</p>
              </div>
              
              <div class="col-md-6">
                <h6>Token 1</h6>
                <p>${poolData.token1}</p>
              </div>
            </div>
      `;
      
      // Add V3-specific data
      if (poolData.fee) {
        poolHtml += `
          <div class="row">
            <div class="col-md-4">
              <h6>Fee</h6>
              <p>${poolData.fee / 10000}%</p>
            </div>
            
            <div class="col-md-4">
              <h6>Liquidity</h6>
              <p>${formatNumber(poolData.liquidity)}</p>
            </div>
            
            <div class="col-md-4">
              <h6>Current Tick</h6>
              <p>${poolData.tick}</p>
            </div>
          </div>
        `;
      } else {
        // Add V2-specific data
        poolHtml += `
          <div class="row">
            <div class="col-md-6">
              <h6>Reserve 0</h6>
              <p>${formatNumber(poolData.reserve0)}</p>
            </div>
            
            <div class="col-md-6">
              <h6>Reserve 1</h6>
              <p>${formatNumber(poolData.reserve1)}</p>
            </div>
          </div>
        `;
      }
      
      poolHtml += `</div></div>`;
      
      poolDataContainer.innerHTML = poolHtml;
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
