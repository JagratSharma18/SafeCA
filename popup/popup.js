/**
 * Safe CA - Popup Script
 * Handles manual scans, watchlist management, and settings
 */

// Constants
const CHAIN_NAMES = {
  '1': 'Ethereum',
  '56': 'BNB Chain',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '8453': 'Base',
  '43114': 'Avalanche',
  'solana': 'Solana'
};

// SVG Icons
const ICONS = {
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  checkCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

// State
let currentSettings = {};
let selectedChain = 'auto';
let watchlistCache = new Set(); // Cache of watchlist addresses

/**
 * Initialize popup
 */
async function init() {
  console.log('[SafeCA Popup] Initializing...');
  
  // Load settings
  await loadSettings();
  
  // Load watchlist cache
  await loadWatchlistCache();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load watchlist count
  await updateWatchlistCount();
  
  // Check for pending scan (from context menu)
  await checkPendingScan();
  
  console.log('[SafeCA Popup] Initialized');
}

/**
 * Load watchlist into cache
 */
async function loadWatchlistCache() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'WATCHLIST_GET' });
    watchlistCache.clear();
    if (response.success && response.items) {
      response.items.forEach(item => {
        const key = `${item.chain}:${item.address.toLowerCase()}`;
        watchlistCache.add(key);
      });
    }
  } catch (error) {
    console.error('[SafeCA Popup] Failed to load watchlist cache:', error);
  }
}

/**
 * Check if address is in watchlist
 */
function isInWatchlist(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  return watchlistCache.has(key);
}

/**
 * Add to watchlist cache
 */
function addToWatchlistCache(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  watchlistCache.add(key);
}

/**
 * Remove from watchlist cache
 */
function removeFromWatchlistCache(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  watchlistCache.delete(key);
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SETTINGS_GET' });
    if (response.success) {
      currentSettings = response.settings;
      applySettings();
    }
  } catch (error) {
    console.error('[SafeCA Popup] Failed to load settings:', error);
  }
}

/**
 * Apply settings to UI
 */
function applySettings() {
  // Toggle dark/light mode
  if (!currentSettings.darkMode) {
    document.body.classList.add('light-mode');
  }
  
  // Set toggle states
  document.getElementById('setting-autoscan').checked = currentSettings.autoScan !== false;
  document.getElementById('setting-badges').checked = currentSettings.showBadges !== false;
  document.getElementById('setting-darkmode').checked = currentSettings.darkMode !== false;
  document.getElementById('setting-notifications').checked = currentSettings.notifications !== false;
  document.getElementById('setting-polling').checked = currentSettings.watchlistPolling !== false;
  
  // Set threshold values
  const thresholds = currentSettings.alertThresholds || {};
  document.getElementById('threshold-liquidity').value = thresholds.LIQUIDITY_DROP || 10;
  document.getElementById('threshold-liquidity-value').textContent = `${thresholds.LIQUIDITY_DROP || 10}%`;
  document.getElementById('threshold-score').value = thresholds.SCORE_DROP || 15;
  document.getElementById('threshold-score-value').textContent = `${thresholds.SCORE_DROP || 15} pts`;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Scan button
  document.getElementById('scan-btn').addEventListener('click', handleScan);
  
  // Address input - Enter key
  document.getElementById('address-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleScan();
    }
  });
  
  // Chain selector
  document.querySelectorAll('.chain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chain-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedChain = btn.dataset.chain;
    });
  });
  
  // Watchlist refresh
  document.getElementById('refresh-watchlist').addEventListener('click', refreshWatchlist);
  
  // Settings toggles
  document.getElementById('setting-autoscan').addEventListener('change', (e) => {
    updateSetting('autoScan', e.target.checked);
  });
  
  document.getElementById('setting-badges').addEventListener('change', (e) => {
    updateSetting('showBadges', e.target.checked);
  });
  
  document.getElementById('setting-darkmode').addEventListener('change', (e) => {
    updateSetting('darkMode', e.target.checked);
    document.body.classList.toggle('light-mode', !e.target.checked);
  });
  
  document.getElementById('setting-notifications').addEventListener('change', (e) => {
    updateSetting('notifications', e.target.checked);
  });
  
  document.getElementById('setting-polling').addEventListener('change', (e) => {
    updateSetting('watchlistPolling', e.target.checked);
  });
  
  // Threshold sliders
  document.getElementById('threshold-liquidity').addEventListener('input', (e) => {
    document.getElementById('threshold-liquidity-value').textContent = `${e.target.value}%`;
    updateThreshold('LIQUIDITY_DROP', parseInt(e.target.value));
  });
  
  document.getElementById('threshold-score').addEventListener('input', (e) => {
    document.getElementById('threshold-score-value').textContent = `${e.target.value} pts`;
    updateThreshold('SCORE_DROP', parseInt(e.target.value));
  });
  
  // Action buttons
  document.getElementById('clear-cache').addEventListener('click', clearCache);
  document.getElementById('clear-watchlist').addEventListener('click', clearWatchlist);
  
  // Website management
  document.getElementById('add-website-btn').addEventListener('click', addWebsite);
  document.getElementById('website-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWebsite();
    }
  });
  
  // Load websites on settings tab
  document.querySelector('[data-tab="settings"]').addEventListener('click', () => {
    loadWebsites();
  });
  
  // Initial load
  loadWebsites();
}

/**
 * Switch active tab
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
  
  // Load tab-specific data
  if (tabName === 'watchlist') {
    loadWatchlist();
  }
}

/**
 * Handle scan button click
 */
async function handleScan() {
  const input = document.getElementById('address-input');
  const text = input.value.trim();
  
  if (!text) {
    showError('Please enter a contract address');
    return;
  }
  
  // Extract addresses from input
  const addresses = extractAddresses(text);
  
  if (addresses.length === 0) {
    showError('No valid contract addresses found');
    return;
  }
  
  // Show loading state
  showLoading();
  
  // Refresh watchlist cache before scanning
  await loadWatchlistCache();
  
  // Scan each address
  const results = [];
  for (const { address, chain } of addresses) {
    const finalChain = selectedChain !== 'auto' ? selectedChain : chain;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_TOKEN',
        payload: { address, chain: finalChain }
      });
      
      results.push({
        address,
        chain: finalChain,
        ...response
      });
    } catch (error) {
      results.push({
        address,
        chain: finalChain,
        success: false,
        error: error.message
      });
    }
  }
  
  // Display results
  displayResults(results);
}

/**
 * Extract addresses from text
 */
function extractAddresses(text) {
  const results = [];
  const seen = new Set();
  
  // Split by newlines and commas
  const lines = text.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // EVM address
    const evmMatch = line.match(/0x[a-fA-F0-9]{40}/);
    if (evmMatch && !seen.has(evmMatch[0].toLowerCase())) {
      seen.add(evmMatch[0].toLowerCase());
      results.push({ address: evmMatch[0], chain: '1' });
      continue;
    }
    
    // Solana address
    const solanaMatch = line.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (solanaMatch && !seen.has(solanaMatch[0]) && isValidSolana(solanaMatch[0])) {
      seen.add(solanaMatch[0]);
      results.push({ address: solanaMatch[0], chain: 'solana' });
    }
  }
  
  return results;
}

/**
 * Validate Solana address
 */
function isValidSolana(address) {
  if (address.length < 32 || address.length > 44) return false;
  if (/^[A-Za-z]+$/.test(address)) return false; // All letters = likely word
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;
  
  // Addresses ending in "pump" are common on pump.fun
  if (address.endsWith('pump')) return true;
  
  // Must have mix of characters
  const hasUpper = /[A-Z]/.test(address);
  const hasLower = /[a-z]/.test(address);
  const hasNumber = /[0-9]/.test(address);
  
  return hasNumber || (hasUpper && hasLower);
}

/**
 * Show loading state
 */
function showLoading() {
  const container = document.getElementById('results-container');
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">Scanning token...</p>
    </div>
  `;
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.getElementById('results-container');
  container.innerHTML = `
    <div class="error-state">
      <svg class="error-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p class="error-text">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Display scan results
 */
function displayResults(results) {
  const container = document.getElementById('results-container');
  container.innerHTML = '';
  
  for (const result of results) {
    const card = createResultCard(result);
    container.appendChild(card);
  }
}

/**
 * Create a result card element
 */
function createResultCard(result) {
  const card = document.createElement('div');
  card.className = 'result-card';
  
  if (!result.success) {
    card.innerHTML = `
      <div class="result-header">
        <div class="result-token">
          <span class="result-token-name">Error</span>
          <span class="result-token-symbol">${truncateAddress(result.address)}</span>
        </div>
        <div class="result-score error">
          <span class="result-score-value">!</span>
          <span class="result-score-label">Error</span>
        </div>
      </div>
      <div class="result-body">
        <div class="error-state">
          <p class="error-text">${escapeHtml(result.error || 'Failed to scan token')}</p>
        </div>
      </div>
    `;
    return card;
  }
  
  const data = result.data;
  const riskLevel = data.riskLevel || 'unknown';
  const scoreClass = riskLevel === 'safe' ? 'safe' : riskLevel === 'warning' ? 'warning' : 'danger';
  
  // Check if already in watchlist
  const inWatchlist = isInWatchlist(result.address, result.chain);
  
  card.innerHTML = `
    <div class="result-header">
      <div class="result-token">
        <span class="result-token-name">${escapeHtml(data.tokenName || 'Unknown Token')}</span>
        <span class="result-token-symbol">${escapeHtml(data.tokenSymbol || '???')}</span>
      </div>
      <div class="result-score ${scoreClass}">
        <span class="result-score-value">${data.score ?? '?'}</span>
        <span class="result-score-label">${capitalizeFirst(riskLevel)}</span>
      </div>
    </div>
    
    <div class="result-body">
      <div class="result-address">
        <code>${result.address}</code>
        <button class="copy-btn" data-copy="${result.address}" title="Copy">${ICONS.copy}</button>
      </div>
      
      <span class="result-chain">${CHAIN_NAMES[result.chain] || result.chain}</span>
      
      ${data.flags && data.flags.length > 0 ? `
        <div class="result-flags">
          ${data.flags.slice(0, 5).map(flag => `
            <div class="flag flag-${flag.type}">
              <span class="flag-icon">${getFlagIcon(flag.type)}</span>
              <span>${escapeHtml(flag.message)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="metrics-grid">
        ${createMetric('Price', data.priceUsd ? `$${formatPrice(data.priceUsd)}` : 'N/A')}
        ${createMetric('Liquidity', data.liquidity ? `$${formatNumber(data.liquidity)}` : 'N/A')}
        ${createMetric('Market Cap', data.marketCap ? `$${formatNumber(data.marketCap)}` : 'N/A')}
        ${createMetric('Holders', data.holderCount ? formatNumber(data.holderCount) : 'N/A')}
      </div>
      
      <div class="result-actions">
        ${inWatchlist ? `
          <button class="result-btn result-btn-remove remove-watchlist-btn" data-address="${result.address}" data-chain="${result.chain}">
            ${ICONS.x} Remove from Watchlist
          </button>
        ` : `
          <button class="result-btn result-btn-primary add-watchlist-btn" data-address="${result.address}" data-chain="${result.chain}">
            ${ICONS.plus} Add to Watchlist
          </button>
        `}
        <button class="result-btn result-btn-secondary view-dex-btn" data-address="${result.address}">
          ${ICONS.chart} DexScreener
        </button>
      </div>
    </div>
  `;
  
  // Set up event listeners
  setTimeout(() => {
    card.querySelector('.copy-btn')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      navigator.clipboard.writeText(btn.dataset.copy);
      btn.innerHTML = ICONS.check;
      setTimeout(() => btn.innerHTML = ICONS.copy, 1000);
    });
    
    const watchlistBtn = card.querySelector('.add-watchlist-btn');
    if (watchlistBtn) {
      watchlistBtn.addEventListener('click', async (e) => {
        const btn = e.target.closest('.add-watchlist-btn');
        const address = btn.dataset.address;
        const chain = btn.dataset.chain;
        
        // Double-check it's not already in watchlist
        if (isInWatchlist(address, chain)) {
          btn.outerHTML = `
            <button class="result-btn result-btn-remove remove-watchlist-btn" data-address="${address}" data-chain="${chain}">
              ${ICONS.x} Remove from Watchlist
            </button>
          `;
          // Re-attach remove handler
          attachRemoveHandler(card, data);
          return;
        }
        
        const tokenData = {
          ...data,
          address: address,
          chain: chain
        };
        
        const success = await addToWatchlist(tokenData);
        if (success) {
          addToWatchlistCache(address, chain);
          btn.outerHTML = `
            <button class="result-btn result-btn-remove remove-watchlist-btn" data-address="${address}" data-chain="${chain}">
              ${ICONS.x} Remove from Watchlist
            </button>
          `;
          // Attach remove handler
          attachRemoveHandler(card, data);
          updateWatchlistCount();
        }
      });
    }
    
    // Handle remove button if already in watchlist
    attachRemoveHandler(card, data);
    
    card.querySelector('.view-dex-btn')?.addEventListener('click', (e) => {
      const address = e.target.closest('.view-dex-btn').dataset.address;
      chrome.tabs.create({ url: `https://dexscreener.com/search?q=${address}` });
    });
  }, 0);
  
  return card;
}

/**
 * Attach remove button handler to a card
 */
function attachRemoveHandler(card, data) {
  const removeBtn = card.querySelector('.remove-watchlist-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', async (e) => {
      const btn = e.target.closest('.remove-watchlist-btn');
      const address = btn.dataset.address;
      const chain = btn.dataset.chain;
      
      await removeFromWatchlist(address, chain);
      removeFromWatchlistCache(address, chain);
      
      // Replace with add button
      btn.outerHTML = `
        <button class="result-btn result-btn-primary add-watchlist-btn" data-address="${address}" data-chain="${chain}">
          ${ICONS.plus} Add to Watchlist
        </button>
      `;
      
      // Re-attach add handler
      const newAddBtn = card.querySelector('.add-watchlist-btn');
      if (newAddBtn) {
        newAddBtn.addEventListener('click', async () => {
          const tokenData = {
            ...data,
            address: address,
            chain: chain
          };
          
          const success = await addToWatchlist(tokenData);
          if (success) {
            addToWatchlistCache(address, chain);
            newAddBtn.outerHTML = `
              <button class="result-btn result-btn-remove remove-watchlist-btn" data-address="${address}" data-chain="${chain}">
                ${ICONS.x} Remove from Watchlist
              </button>
            `;
            attachRemoveHandler(card, data);
            updateWatchlistCount();
          }
        });
      }
      
      updateWatchlistCount();
    });
  }
}

/**
 * Get flag icon based on type
 */
function getFlagIcon(type) {
  switch (type) {
    case 'critical': return ICONS.alert;
    case 'warning': return ICONS.warning;
    case 'info': return ICONS.checkCircle;
    default: return ICONS.alert;
  }
}

/**
 * Create metric HTML
 */
function createMetric(label, value) {
  return `
    <div class="metric">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}</span>
    </div>
  `;
}

/**
 * Load watchlist
 */
async function loadWatchlist() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'WATCHLIST_GET' });
    
    if (!response.success || !response.items || response.items.length === 0) {
      document.getElementById('watchlist-empty').classList.remove('hidden');
      document.getElementById('watchlist-items').classList.add('hidden');
      return;
    }
    
    document.getElementById('watchlist-empty').classList.add('hidden');
    document.getElementById('watchlist-items').classList.remove('hidden');
    
    const container = document.getElementById('watchlist-items');
    container.innerHTML = '';
    
    // Update cache
    watchlistCache.clear();
    response.items.forEach(item => {
      const key = `${item.chain}:${item.address.toLowerCase()}`;
      watchlistCache.add(key);
    });
    
    for (const item of response.items) {
      const el = createWatchlistItem(item);
      container.appendChild(el);
    }
  } catch (error) {
    console.error('[SafeCA Popup] Failed to load watchlist:', error);
  }
}

/**
 * Create watchlist item element
 */
function createWatchlistItem(item) {
  const el = document.createElement('div');
  el.className = 'watchlist-item';
  
  const riskLevel = item.riskLevel || 'unknown';
  const scoreClass = riskLevel === 'safe' ? 'safe' : riskLevel === 'warning' ? 'warning' : 'danger';
  
  el.innerHTML = `
    <div class="watchlist-item-score ${scoreClass}">${item.score ?? '?'}</div>
    <div class="watchlist-item-info">
      <div class="watchlist-item-name">${escapeHtml(item.tokenSymbol || item.tokenName || 'Unknown')}</div>
      <div class="watchlist-item-address">${truncateAddress(item.address)}</div>
      <span class="watchlist-item-chain">${CHAIN_NAMES[item.chain] || item.chain}</span>
    </div>
    <button class="watchlist-item-remove" data-address="${item.address}" data-chain="${item.chain}" title="Remove">${ICONS.x}</button>
  `;
  
  // Click to view details
  el.addEventListener('click', (e) => {
    if (!e.target.closest('.watchlist-item-remove')) {
      // Fill in scan input and switch to scan tab
      document.getElementById('address-input').value = item.address;
      switchTab('scan');
      handleScan();
    }
  });
  
  // Remove button
  el.querySelector('.watchlist-item-remove').addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.target.closest('.watchlist-item-remove');
    const { address, chain } = btn.dataset;
    await removeFromWatchlist(address, chain);
    
    // Remove from cache
    const key = `${chain}:${address.toLowerCase()}`;
    watchlistCache.delete(key);
    
    el.remove();
    updateWatchlistCount();
    
    // Check if empty
    const items = document.querySelectorAll('.watchlist-item');
    if (items.length === 0) {
      document.getElementById('watchlist-empty').classList.remove('hidden');
      document.getElementById('watchlist-items').classList.add('hidden');
    }
  });
  
  return el;
}

/**
 * Add token to watchlist
 */
async function addToWatchlist(token) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'WATCHLIST_ADD',
      payload: { token }
    });
    return response.success;
  } catch (error) {
    console.error('[SafeCA Popup] Failed to add to watchlist:', error);
    return false;
  }
}

/**
 * Remove token from watchlist
 */
async function removeFromWatchlist(address, chain) {
  try {
    await chrome.runtime.sendMessage({
      type: 'WATCHLIST_REMOVE',
      payload: { address, chain }
    });
  } catch (error) {
    console.error('[SafeCA Popup] Failed to remove from watchlist:', error);
  }
}

/**
 * Refresh watchlist
 */
async function refreshWatchlist() {
  const btn = document.getElementById('refresh-watchlist');
  btn.classList.add('spinning');
  
  await loadWatchlistCache();
  await loadWatchlist();
  
  setTimeout(() => {
    btn.classList.remove('spinning');
  }, 500);
}

/**
 * Update watchlist count badge
 */
async function updateWatchlistCount() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'WATCHLIST_GET' });
    const count = response.items?.length || 0;
    const badge = document.getElementById('watchlist-count');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch (error) {
    console.error('[SafeCA Popup] Failed to update watchlist count:', error);
  }
}

/**
 * Update a setting
 */
async function updateSetting(key, value) {
  try {
    currentSettings[key] = value;
    await chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATE',
      payload: { updates: { [key]: value } }
    });
  } catch (error) {
    console.error('[SafeCA Popup] Failed to update setting:', error);
  }
}

/**
 * Update a threshold setting
 */
async function updateThreshold(key, value) {
  try {
    const thresholds = currentSettings.alertThresholds || {};
    thresholds[key] = value;
    currentSettings.alertThresholds = thresholds;
    
    await chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATE',
      payload: { updates: { alertThresholds: thresholds } }
    });
  } catch (error) {
    console.error('[SafeCA Popup] Failed to update threshold:', error);
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
    const btn = document.getElementById('clear-cache');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `${ICONS.check} Cache Cleared!`;
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
  } catch (error) {
    console.error('[SafeCA Popup] Failed to clear cache:', error);
  }
}

/**
 * Clear watchlist
 */
async function clearWatchlist() {
  if (!confirm('Are you sure you want to clear your entire watchlist?')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'WATCHLIST_GET' });
    if (response.items) {
      for (const item of response.items) {
        await removeFromWatchlist(item.address, item.chain);
      }
    }
    
    watchlistCache.clear();
    await loadWatchlist();
    await updateWatchlistCount();
    
    const btn = document.getElementById('clear-watchlist');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `${ICONS.check} Watchlist Cleared!`;
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
  } catch (error) {
    console.error('[SafeCA Popup] Failed to clear watchlist:', error);
  }
}

/**
 * Load and display allowed websites
 */
async function loadWebsites() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SETTINGS_GET' });
    const websites = response.settings?.allowedWebsites || [];
    const container = document.getElementById('websites-list');
    
    container.innerHTML = '';
    
    for (const website of websites) {
      const item = createWebsiteItem(website);
      container.appendChild(item);
    }
  } catch (error) {
    console.error('[SafeCA Popup] Failed to load websites:', error);
  }
}

/**
 * Create a website item element
 */
function createWebsiteItem(website) {
  const el = document.createElement('div');
  el.className = 'website-item';
  el.innerHTML = `
    <span class="website-item-name">${escapeHtml(website)}</span>
    <button class="website-item-remove" data-website="${escapeHtml(website)}" title="Remove">
      ${ICONS.x}
    </button>
  `;
  
  el.querySelector('.website-item-remove').addEventListener('click', async (e) => {
    const website = e.target.closest('.website-item-remove').dataset.website;
    await removeWebsite(website);
  });
  
  return el;
}

/**
 * Add a website to allowed list
 */
async function addWebsite() {
  const input = document.getElementById('website-input');
  const domain = input.value.trim().toLowerCase();
  
  if (!domain) {
    return;
  }
  
  // Validate domain format
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
  if (!domainRegex.test(domain)) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SETTINGS_GET' });
    const websites = response.settings?.allowedWebsites || [];
    
    if (websites.includes(domain)) {
      alert('This website is already in the list');
      return;
    }
    
    websites.push(domain);
    
    await updateSetting('allowedWebsites', websites);
    
    // Inject content script on the new domain if needed
    await chrome.runtime.sendMessage({
      type: 'INJECT_CONTENT_SCRIPT',
      payload: { domain }
    });
    
    input.value = '';
    await loadWebsites();
  } catch (error) {
    console.error('[SafeCA Popup] Failed to add website:', error);
    alert('Failed to add website. Please try again.');
  }
}

/**
 * Remove a website from allowed list
 */
async function removeWebsite(website) {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SETTINGS_GET' });
    const websites = response.settings?.allowedWebsites || [];
    
    const filtered = websites.filter(w => w !== website);
    
    await updateSetting('allowedWebsites', filtered);
    await loadWebsites();
  } catch (error) {
    console.error('[SafeCA Popup] Failed to remove website:', error);
    alert('Failed to remove website. Please try again.');
  }
}

/**
 * Check for pending scan from context menu
 */
async function checkPendingScan() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_SCAN' });
    if (response.pendingScan) {
      const { address, chain } = response.pendingScan;
      document.getElementById('address-input').value = address;
      
      // Set chain if specific
      if (chain && chain !== 'auto') {
        document.querySelectorAll('.chain-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.chain === chain);
        });
        selectedChain = chain;
      }
      
      // Trigger scan
      handleScan();
    }
  } catch (error) {
    console.error('[SafeCA Popup] Failed to check pending scan:', error);
  }
}

// Utility functions
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function truncateAddress(address, start = 6, end = 4) {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  num = Number(num);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatPrice(price) {
  if (price === null || price === undefined || isNaN(price)) return 'N/A';
  price = Number(price);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toExponential(2);
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
