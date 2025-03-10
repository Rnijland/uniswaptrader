// public/js/filters.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const activeFiltersContainer = document.getElementById('activeFilters');
    const filterChainsContainer = document.getElementById('filterChains');
    const recentResultsContainer = document.getElementById('recentResults');
    const noFiltersMessage = document.getElementById('noFiltersMessage');
    const noChainsMessage = document.getElementById('noChainsMessage');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    // Filter Creation
    const filterTypeSelect = document.getElementById('filterType');
    const filterNameInput = document.getElementById('filterName');
    const filterParametersContainer = document.getElementById('filterParameters');
    const createFilterBtn = document.getElementById('createFilterBtn');
    
  // Group Creation
  const chainNameInput = document.getElementById('chainName');
  const matchModeSelect = document.getElementById('matchMode');
  const filterSelectionContainer = document.getElementById('filterSelection');
  const noFiltersForChainMessage = document.getElementById('noFiltersForChainMessage');
  const createChainBtn = document.getElementById('createChainBtn');
    
    // State
    let availableFilters = [];
    let activeFilters = {};
    let filterChains = {};
    let recentResults = [];
    let selectedFiltersForChain = new Set();
    
    // Initialize
    init();
    
    // Event Listeners
    filterTypeSelect.addEventListener('change', handleFilterTypeChange);
    createFilterBtn.addEventListener('click', handleCreateFilter);
    createChainBtn.addEventListener('click', handleCreateChain);
    
    // Initialize the dashboard
    async function init() {
      try {
        // Load available filters
        await loadAvailableFilters();
        
        // Load active filters
        await loadActiveFilters();
        
        // Load filter chains
        await loadFilterChains();
        
      } catch (error) {
        console.error('Error initializing filters dashboard:', error);
        showErrorMessage('Failed to initialize filters dashboard. Please check console for details.');
      }
    }
    
    // Load available filters from the API
    async function loadAvailableFilters() {
      try {
        const response = await fetch('/api/filters/available');
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        availableFilters = data.filters;
        
        // Populate filter type dropdown
        populateFilterTypes();
        
      } catch (error) {
        console.error('Error loading available filters:', error);
        throw error;
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
        
        // Render active filters
        renderActiveFilters();
        
      } catch (error) {
        console.error('Error loading active filters:', error);
        throw error;
      }
    }
    
  // Load filter groups from the API
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
      
      // Render filter groups
      renderFilterChains();
      
    } catch (error) {
      console.error('Error loading filter groups:', error);
        throw error;
      }
    }
    
    // Populate filter types dropdown
    function populateFilterTypes() {
      filterTypeSelect.innerHTML = '<option value="">Select filter type...</option>';
      
      availableFilters.forEach(filter => {
        const option = document.createElement('option');
        option.value = filter.id;
        option.textContent = filter.name;
        filterTypeSelect.appendChild(option);
      });
    }
    
    // Handle filter type change
    function handleFilterTypeChange() {
      const filterId = filterTypeSelect.value;
      
      if (!filterId) {
        filterParametersContainer.innerHTML = `
          <div class="text-center py-3 text-muted">
            <p>Select a filter type to configure parameters.</p>
          </div>
        `;
        return;
      }
      
      const selectedFilter = availableFilters.find(f => f.id === filterId);
      
      if (!selectedFilter) {
        console.error(`Filter with ID ${filterId} not found.`);
        return;
      }
      
      // Generate parameter form
      let parametersHtml = `<h5 class="mb-3">${selectedFilter.name} Parameters</h5>`;
      parametersHtml += `<p class="text-muted mb-3">${selectedFilter.description}</p>`;
      
      for (const [paramName, paramValue] of Object.entries(selectedFilter.defaultParameters)) {
        const paramId = `param_${paramName}`;
        
        parametersHtml += `
          <div class="mb-3">
            <label for="${paramId}" class="form-label">${formatParamName(paramName)}</label>
        `;
        
        // Render different input types based on parameter value type
        if (typeof paramValue === 'boolean') {
          parametersHtml += `
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="${paramId}" ${paramValue ? 'checked' : ''}>
            </div>
          `;
        } else if (typeof paramValue === 'number') {
          parametersHtml += `
            <input type="number" class="form-control" id="${paramId}" value="${paramValue}" step="0.01">
          `;
        } else {
          parametersHtml += `
            <input type="text" class="form-control" id="${paramId}" value="${paramValue}">
          `;
        }
        
        parametersHtml += `</div>`;
      }
      
      filterParametersContainer.innerHTML = parametersHtml;
    }
    
    // Handle create filter button click
    async function handleCreateFilter() {
      const filterId = filterTypeSelect.value;
      
      if (!filterId) {
        showErrorMessage('Please select a filter type.');
        return;
      }
      
      const filterName = filterNameInput.value.trim() || null;
      
      // Collect parameters
      const parameters = {};
      const selectedFilter = availableFilters.find(f => f.id === filterId);
      
      if (selectedFilter) {
        for (const paramName of Object.keys(selectedFilter.defaultParameters)) {
          const paramId = `param_${paramName}`;
          const paramElement = document.getElementById(paramId);
          
          if (paramElement) {
            // Handle different input types
            if (paramElement.type === 'checkbox') {
              parameters[paramName] = paramElement.checked;
            } else if (paramElement.type === 'number') {
              parameters[paramName] = parseFloat(paramElement.value);
            } else {
              parameters[paramName] = paramElement.value;
            }
          }
        }
      }
      
      try {
        const response = await fetch('/api/filters/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterId,
            instanceId: filterName,
            parameters
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createFilterModal'));
        modal.hide();
        
        // Reset form
        filterTypeSelect.value = '';
        filterNameInput.value = '';
        filterParametersContainer.innerHTML = `
          <div class="text-center py-3 text-muted">
            <p>Select a filter type to configure parameters.</p>
          </div>
        `;
        
        // Reload active filters
        await loadActiveFilters();
        
        showSuccessMessage('Filter created successfully!');
        
      } catch (error) {
        console.error('Error creating filter:', error);
        showErrorMessage(`Failed to create filter: ${error.message}`);
      }
    }
    
    // Render active filters
    function renderActiveFilters() {
      if (Object.keys(activeFilters).length === 0) {
        activeFiltersContainer.innerHTML = '';
        noFiltersMessage.style.display = 'block';
        
        // Update filter selection for chain creation
        filterSelectionContainer.innerHTML = '';
        noFiltersForChainMessage.style.display = 'block';
        
        return;
      }
      
      noFiltersMessage.style.display = 'none';
      noFiltersForChainMessage.style.display = 'none';
      
      let filtersHtml = '';
      let filterSelectionHtml = '';
      
      for (const [instanceId, filter] of Object.entries(activeFilters)) {
        // Filter card for active filters list
        filtersHtml += `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-1">${filter.name}</h5>
              <div>
                <button type="button" class="btn btn-sm btn-outline-primary me-1 edit-filter-btn" data-instance-id="${instanceId}">
                  Edit
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-filter-btn" data-instance-id="${instanceId}">
                  Delete
                </button>
              </div>
            </div>
            <p class="mb-1 text-muted">${filter.description}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <small>
                <span class="badge ${filter.enabled ? 'bg-success' : 'bg-secondary'}">
                  ${filter.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </small>
              <small class="text-muted">
                ${filter.lastRun ? `Last run: ${new Date(filter.lastRun).toLocaleString()}` : 'Never run'}
              </small>
            </div>
          </div>
        `;
        
        // Checkbox for chain creation
        filterSelectionHtml += `
          <div class="list-group-item">
            <div class="form-check">
              <input class="form-check-input filter-selection-checkbox" type="checkbox" value="${instanceId}" id="filter_select_${instanceId}">
              <label class="form-check-label" for="filter_select_${instanceId}">
                <strong>${filter.name}</strong>
                <p class="mb-0 small text-muted">${filter.description}</p>
              </label>
            </div>
          </div>
        `;
      }
      
      activeFiltersContainer.innerHTML = filtersHtml;
      filterSelectionContainer.innerHTML = filterSelectionHtml;
      
      // Add event listeners to filter action buttons
      document.querySelectorAll('.edit-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleEditFilter(btn.dataset.instanceId));
      });
      
      document.querySelectorAll('.delete-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteFilter(btn.dataset.instanceId));
      });
      
      // Add event listeners to filter selection checkboxes
      document.querySelectorAll('.filter-selection-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedFiltersForChain.add(checkbox.value);
          } else {
            selectedFiltersForChain.delete(checkbox.value);
          }
        });
      });
    }
    
  // Render filter groups
  function renderFilterChains() {
    if (Object.keys(filterChains).length === 0) {
      filterChainsContainer.innerHTML = '';
      noChainsMessage.style.display = 'block';
      return;
    }
    
    noChainsMessage.style.display = 'none';
    
    let chainsHtml = '';
      
      for (const [chainId, chain] of Object.entries(filterChains)) {
        // Get filter names for this chain
        const filterNames = chain.filters.map(instanceId => {
          return activeFilters[instanceId] ? activeFilters[instanceId].name : 'Unknown Filter';
        });
        
        chainsHtml += `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-1">${chainId}</h5>
              <div>
                <button type="button" class="btn btn-sm btn-outline-danger delete-chain-btn" data-chain-id="${chainId}">
                  Delete
                </button>
              </div>
            </div>
            <p class="mb-1 text-muted">
              <strong>Match Mode:</strong> ${chain.options.matchMode === 'all' ? 'All filters must match (AND)' : 'Any filter can match (OR)'}
            </p>
              <div class="mt-2">
                <div class="mb-1"><strong>Filters in this group:</strong></div>
              <ul class="list-group list-group-flush">
                ${filterNames.map(name => `<li class="list-group-item py-1">${name}</li>`).join('')}
              </ul>
            </div>
            <div class="d-flex justify-content-end align-items-center mt-2">
              <small class="text-muted">
                ${chain.lastRun ? `Last run: ${new Date(chain.lastRun).toLocaleString()}` : 'Never run'}
              </small>
            </div>
          </div>
        `;
      }
      
      filterChainsContainer.innerHTML = chainsHtml;
      
      // Add event listeners to chain action buttons
      document.querySelectorAll('.delete-chain-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteChain(btn.dataset.chainId));
      });
    }
    
    // Handle edit filter button click
    function handleEditFilter(instanceId) {
      // TODO: Implement edit filter functionality
      console.log('Edit filter:', instanceId);
      alert('Edit filter functionality is not implemented yet.');
    }
    
    // Handle delete filter button click
    async function handleDeleteFilter(instanceId) {
      if (!confirm(`Are you sure you want to delete this filter?`)) {
        return;
      }
      
      try {
        const response = await fetch(`/api/filters/${instanceId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Reload active filters
        await loadActiveFilters();
        
        // Reload filter chains as they might reference this filter
        await loadFilterChains();
        
        showSuccessMessage('Filter deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting filter:', error);
        showErrorMessage(`Failed to delete filter: ${error.message}`);
      }
    }
    
  // Handle create group button click
  async function handleCreateChain() {
      const chainName = chainNameInput.value.trim() || null;
      const matchMode = matchModeSelect.value;
      
      if (selectedFiltersForChain.size === 0) {
      showErrorMessage('Please select at least one filter for the group.');
        return;
      }
      
      try {
        const response = await fetch('/api/filters/chains/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chainId: chainName,
            filterInstanceIds: Array.from(selectedFiltersForChain),
            options: {
              matchMode
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createChainModal'));
        modal.hide();
        
        // Reset form
        chainNameInput.value = '';
        matchModeSelect.value = 'all';
        selectedFiltersForChain.clear();
        document.querySelectorAll('.filter-selection-checkbox').forEach(checkbox => {
          checkbox.checked = false;
        });
        
        // Reload filter groups
        await loadFilterChains();
        
        showSuccessMessage('Filter group created successfully!');
        
      } catch (error) {
        console.error('Error creating filter chain:', error);
        showErrorMessage(`Failed to create filter chain: ${error.message}`);
      }
    }
    
  // Handle delete group button click
  async function handleDeleteChain(chainId) {
    if (!confirm(`Are you sure you want to delete this filter group?`)) {
        return;
      }
      
      try {
        const response = await fetch(`/api/filters/chains/${chainId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred');
        }
        
        // Reload filter groups
        await loadFilterChains();
        
        showSuccessMessage('Filter group deleted successfully!');
        
      } catch (error) {
      console.error('Error deleting filter group:', error);
      showErrorMessage(`Failed to delete filter group: ${error.message}`);
      }
    }
    
    // Helper function to format parameter name
    function formatParamName(name) {
      // Convert camelCase to Title Case with spaces
      return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    }
    
    // Show error message
    function showErrorMessage(message) {
      // You could implement a toast or notification system here
      alert(message);
    }
    
    // Show success message
    function showSuccessMessage(message) {
      // You could implement a toast or notification system here
      alert(message);
    }
  });
