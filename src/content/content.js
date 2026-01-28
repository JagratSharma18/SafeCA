/**
 * Safe CA - Content Script
 * Detects contract addresses on X/Twitter and injects safety badges
 */

// Constants
const CA_PATTERNS = {
  // EVM: Must be exactly 42 chars (0x + 40 hex)
  EVM: /(?<![a-zA-Z0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g,
  // Solana: 32-44 base58 chars, not part of a URL or longer string
  SOLANA: /(?<![a-zA-Z0-9\/])([1-9A-HJ-NP-Za-km-z]{32,44})(?![a-zA-Z0-9])/g
};

const CHAIN_IDS = {
  ETHEREUM: '1',
  SOLANA: 'solana'
};

const BADGE_COLORS = {
  safe: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  error: '#6b7280',
  loading: '#3b82f6'
};

// SVG Icons (inline for content script)
const ICONS = {
  shield: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L21 6V11C21 16.55 17.16 21.74 12 23C6.84 21.74 3 16.55 3 11V6L12 2Z"/></svg>',
  check: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  alert: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chart: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
};

// State management
const state = {
  processedElements: new WeakMap(), // Map element -> Set of processed addresses
  addressCache: new Map(), // Map cacheKey -> scan result
  watchlistCache: new Set(), // Set of addresses in watchlist
  observer: null,
  settings: null,
  isInitialized: false,
  scanQueue: [],
  isProcessingQueue: false,
  pendingScans: new Set() // Track addresses currently being scanned
};

/**
 * Check if current domain is allowed
 */
function isDomainAllowed(hostname, allowedWebsites) {
  if (!allowedWebsites || allowedWebsites.length === 0) {
    // Default to Twitter/X if no websites configured
    return hostname.includes('x.com') || hostname.includes('twitter.com');
  }
  
  // Normalize hostname (remove www prefix for comparison)
  const normalizedHostname = hostname.replace(/^www\./, '');
  
  return allowedWebsites.some(domain => {
    // Normalize domain (remove www prefix)
    const normalizedDomain = domain.replace(/^www\./, '');
    
    // Support exact match, subdomain match, and www prefix
    return normalizedHostname === normalizedDomain || 
           normalizedHostname.endsWith('.' + normalizedDomain) ||
           hostname === 'www.' + normalizedDomain;
  });
}

/**
 * Initialize the content script
 */
async function initialize() {
  if (state.isInitialized) return;
  
  console.log('[SafeCA] Content script initializing...');
  
  // Check if current domain is allowed
  const hostname = window.location.hostname;
  
  // Load settings with retry
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SETTINGS_GET' });
      state.settings = response.settings || { autoScan: true, showBadges: true };
      
      // Check if domain is allowed
      const allowedWebsites = state.settings.allowedWebsites || [];
      if (!isDomainAllowed(hostname, allowedWebsites)) {
        console.log('[SafeCA] Domain not in allowed list:', hostname);
        return; // Don't initialize on disallowed domains
      }
      
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('[SafeCA] Failed to load settings after retries:', error);
        // Default check for Twitter/X
        if (!isDomainAllowed(hostname, ['x.com', 'twitter.com'])) {
          return;
        }
        state.settings = { autoScan: true, showBadges: true };
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  // Load watchlist
  await loadWatchlist();
  
  state.isInitialized = true;
  
  // Always set up observer first
  setupObserver();
  
  // Listen for settings changes
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Initial scan after a short delay to let page render
  setTimeout(() => {
    if (state.settings.autoScan && state.settings.showBadges) {
      scanPage();
    }
  }, 500);
  
  // Expose scanPage globally for re-scanning
  window.__safeca_scanPage = scanPage;
  window.__safeca_initialized = true;
  
  console.log('[SafeCA] Content script initialized, autoScan:', state.settings.autoScan);
}

/**
 * Load watchlist from storage
 */
async function loadWatchlist() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'WATCHLIST_GET' });
    state.watchlistCache.clear();
    if (response.success && response.items) {
      response.items.forEach(item => {
        const key = `${item.chain}:${item.address.toLowerCase()}`;
        state.watchlistCache.add(key);
      });
    }
  } catch (error) {
    console.error('[SafeCA] Failed to load watchlist:', error);
  }
}

/**
 * Check if address is in watchlist
 */
function isInWatchlist(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  return state.watchlistCache.has(key);
}

/**
 * Add address to watchlist cache
 */
function addToWatchlistCache(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  state.watchlistCache.add(key);
}

/**
 * Remove address from watchlist cache
 */
function removeFromWatchlistCache(address, chain) {
  const key = `${chain}:${address.toLowerCase()}`;
  state.watchlistCache.delete(key);
}

/**
 * Handle messages from background/popup
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'SETTINGS_UPDATED':
      state.settings = message.settings;
      if (state.settings.autoScan && state.settings.showBadges) {
        scanPage();
      }
      break;
      
    case 'RESCAN_PAGE':
      // Clear all caches and rescan
      state.processedElements = new WeakMap();
      state.addressCache.clear();
      state.pendingScans.clear();
      loadWatchlist().then(() => scanPage());
      break;
      
    case 'WATCHLIST_UPDATED':
      loadWatchlist();
      break;
  }
}

/**
 * Set up MutationObserver for dynamic content
 */
function setupObserver() {
  if (state.observer) return;
  
  const config = {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
  };
  
  // Debounce mutations
  let mutationTimeout = null;
  let pendingMutations = [];
  
  const processMutations = () => {
    if (!state.settings?.autoScan || !state.settings?.showBadges) return;
    
    // Get unique added nodes
    const addedNodes = new Set();
    pendingMutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addedNodes.add(node);
        }
      });
    });
    pendingMutations = [];
    
    // Process added nodes
    addedNodes.forEach(node => {
      processNode(node);
    });
  };
  
  state.observer = new MutationObserver((mutations) => {
    pendingMutations.push(...mutations);
    
    if (mutationTimeout) clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(processMutations, 300);
  });
  
  const targetNode = document.body;
  if (targetNode) {
    state.observer.observe(targetNode, config);
  }
}

/**
 * Process a specific DOM node for CAs
 */
function processNode(node) {
  if (!state.settings?.showBadges) return;
  
  // Find tweet text elements within this node
  const tweetSelectors = [
    '[data-testid="tweetText"]',
    '.tweet-text',
    '.js-tweet-text'
  ];
  
  let elements = [];
  
  // Check if node itself matches
  if (node.matches && tweetSelectors.some(sel => node.matches(sel))) {
    elements.push(node);
  }
  
  // Find matching children
  if (node.querySelectorAll) {
    tweetSelectors.forEach(selector => {
      elements.push(...node.querySelectorAll(selector));
    });
  }
  
  // Process unique elements
  const uniqueElements = [...new Set(elements)];
  uniqueElements.forEach(el => processElement(el));
}

/**
 * Scan the entire page for contract addresses
 */
function scanPage() {
  if (!state.settings?.showBadges) return;
  
  console.log('[SafeCA] Scanning page...');
  
  // Find all tweet text elements (Twitter-specific)
  const tweetSelectors = [
    '[data-testid="tweetText"]',
    '.tweet-text',
    '.js-tweet-text'
  ];
  
  let elements = document.querySelectorAll(tweetSelectors.join(', '));
  
  // If no Twitter elements found, scan common text containers (for custom websites)
  if (elements.length === 0) {
    const genericSelectors = [
      'p', 'span', 'div', 'article', 'section',
      '[class*="post"]', '[class*="comment"]', '[class*="text"]',
      '[class*="content"]', '[class*="message"]'
    ];
    elements = document.querySelectorAll(genericSelectors.join(', '));
    
    // Filter to only elements with substantial text content (likely to contain CAs)
    elements = Array.from(elements).filter(el => {
      const text = el.textContent || '';
      // Must have at least 20 chars and contain potential CA patterns
      return text.length >= 20 && (
        text.includes('0x') || 
        /[1-9A-HJ-NP-Za-km-z]{32,}/.test(text)
      );
    });
  }
  
  console.log('[SafeCA] Found', elements.length, 'elements to scan');
  
  elements.forEach(element => {
    processElement(element);
  });
}

/**
 * Process an element for contract addresses
 */
function processElement(element) {
  if (!element || !element.textContent) return;
  
  const textContent = element.textContent;
  const addresses = extractAddresses(textContent);
  
  if (addresses.length === 0) return;
  
  // Get or create processed set for this element
  let processedInElement = state.processedElements.get(element);
  if (!processedInElement) {
    processedInElement = new Set();
    state.processedElements.set(element, processedInElement);
  }
  
  // Process each unique address
  addresses.forEach(({ address, chain }) => {
    const cacheKey = `${chain}:${address.toLowerCase()}`;
    
    // Skip if already processed in this element
    if (processedInElement.has(cacheKey)) return;
    
    // Skip if currently being scanned
    if (state.pendingScans.has(cacheKey)) return;
    
    // Check if badge already exists for this address in this element
    const existingBadge = element.querySelector(`[data-safeca-address="${address.toLowerCase()}"]`);
    if (existingBadge) {
      processedInElement.add(cacheKey);
      return;
    }
    
    // Mark as processed
    processedInElement.add(cacheKey);
    
    // Check cache first
    if (state.addressCache.has(cacheKey)) {
      const cachedData = state.addressCache.get(cacheKey);
      injectBadgeForAddress(element, address, cachedData);
    } else {
      // Queue for scanning
      queueScan(address, chain, element);
    }
  });
}

/**
 * Extract contract addresses from text
 */
function extractAddresses(text) {
  if (!text || typeof text !== 'string') return [];
  
  const results = [];
  const seen = new Set();
  
  // Find EVM addresses - allow after colon (:) for formats like "CA:0x..."
  let evmMatch;
  const evmRegex = /(?<![a-fA-F0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
  while ((evmMatch = evmRegex.exec(text)) !== null) {
    const address = evmMatch[0];
    const normalized = address.toLowerCase();
    if (!seen.has(normalized) && isValidEVMAddress(address)) {
      seen.add(normalized);
      results.push({
        address: address,
        chain: CHAIN_IDS.ETHEREUM
      });
    }
  }
  
  // Find Solana addresses - improved regex to handle "CA:address" format
  // Allow addresses after common prefixes like "CA:", "ca:", "Contract:", etc.
  let solMatch;
  // This regex allows Solana addresses that may come right after a colon
  const solRegex = /(?:^|[^a-zA-Z0-9])([1-9A-HJ-NP-Za-km-z]{32,44})(?![a-zA-Z0-9])/g;
  while ((solMatch = solRegex.exec(text)) !== null) {
    const address = solMatch[1];
    if (!seen.has(address) && isValidSolanaAddress(address, text, solMatch.index)) {
      seen.add(address);
      results.push({
        address: address,
        chain: CHAIN_IDS.SOLANA
      });
    }
  }
  
  return results;
}

/**
 * Validate EVM address
 */
function isValidEVMAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address with context checking
 */
function isValidSolanaAddress(address, fullText, matchIndex) {
  if (address.length < 32 || address.length > 44) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;
  
  // Check context - reject if part of URL (but allow after "CA:" or similar)
  const before = fullText.substring(Math.max(0, matchIndex - 15), matchIndex);
  // Reject if it looks like a URL path (has // or www. before it)
  if (/https?:\/\/|www\./i.test(before)) {
    // But allow if there's "CA:" or similar right before
    if (!/[Cc][Aa]:?\s*$/.test(before)) return false;
  }
  
  // Reject common false positives
  const falsePositivePatterns = [
    /^[A-Za-z]+$/, // All letters (likely a word)
    /^[A-Z][a-z]+[A-Z][a-z]+$/, // CamelCase words like "JavaScript"
    /^(https?|www|com|org|net|io|app|dev)$/i,
  ];
  
  if (falsePositivePatterns.some(p => p.test(address))) return false;
  
  // Must have numbers OR mixed case for valid Solana address
  const hasUpper = /[A-Z]/.test(address);
  const hasLower = /[a-z]/.test(address);
  const hasNumber = /[0-9]/.test(address);
  
  // Valid Solana addresses typically have numbers or mixed case
  // Addresses ending in "pump" are common on pump.fun
  if (address.endsWith('pump')) return true;
  
  if (!hasNumber && !(hasUpper && hasLower)) return false;
  
  return true;
}

/**
 * Queue an address for scanning
 */
function queueScan(address, chain, element) {
  const cacheKey = `${chain}:${address.toLowerCase()}`;
  
  // Mark as pending
  state.pendingScans.add(cacheKey);
  
  state.scanQueue.push({ address, chain, element, cacheKey });
  
  if (!state.isProcessingQueue) {
    processQueue();
  }
}

/**
 * Process the scan queue
 */
async function processQueue() {
  if (state.isProcessingQueue || state.scanQueue.length === 0) return;
  
  state.isProcessingQueue = true;
  
  while (state.scanQueue.length > 0) {
    // Process in batches of 3 to avoid overwhelming API
    const batch = state.scanQueue.splice(0, 3);
    
    await Promise.all(batch.map(async ({ address, chain, element, cacheKey }) => {
      try {
        // Show loading badge first
        injectBadgeForAddress(element, address, { 
          score: null, 
          riskLevel: 'loading',
          loading: true,
          chain: chain
        });
        
        // Request scan from background
        const response = await chrome.runtime.sendMessage({
          type: 'SCAN_TOKEN',
          payload: { address, chain }
        });
        
        if (response.success && response.data) {
          // Cache the result
          state.addressCache.set(cacheKey, response.data);
          // Update badge
          injectBadgeForAddress(element, address, response.data);
        } else {
          const errorData = { 
            score: null, 
            riskLevel: 'error',
            error: response.error || 'Scan failed',
            chain: chain,
            address: address
          };
          state.addressCache.set(cacheKey, errorData);
          injectBadgeForAddress(element, address, errorData);
        }
      } catch (error) {
        console.error('[SafeCA] Scan error:', error);
        const errorData = { 
          score: null, 
          riskLevel: 'error',
          error: error.message,
          chain: chain,
          address: address
        };
        state.addressCache.set(cacheKey, errorData);
        injectBadgeForAddress(element, address, errorData);
      } finally {
        // Remove from pending
        state.pendingScans.delete(cacheKey);
      }
    }));
    
    // Small delay between batches
    if (state.scanQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  state.isProcessingQueue = false;
}

/**
 * Inject a badge for a specific address in an element
 */
function injectBadgeForAddress(element, address, data) {
  const normalizedAddr = address.toLowerCase();
  
  // Check if badge already exists
  const existingWrapper = element.querySelector(`[data-safeca-address="${normalizedAddr}"]`);
  if (existingWrapper) {
    // Update existing badge
    updateBadge(existingWrapper, data);
    return;
  }
  
  // Find the text node containing the address
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip if inside our wrapper
        if (node.parentElement?.closest('[data-safeca-address]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent.toLowerCase().includes(normalizedAddr) 
          ? NodeFilter.FILTER_ACCEPT 
          : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  const textNode = walker.nextNode();
  if (!textNode) return;
  
  // Find exact position (case-insensitive search, preserve original case)
  const text = textNode.textContent;
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(normalizedAddr);
  
  if (index === -1) return;
  
  // Get the original-case address from the text
  const originalAddress = text.substring(index, index + address.length);
  
  // Create wrapper span
  const wrapper = document.createElement('span');
  wrapper.className = 'safeca-address';
  wrapper.setAttribute('data-safeca-address', normalizedAddr);
  wrapper.setAttribute('data-chain', data.chain || '');
  
  // Create address span
  const addressSpan = document.createElement('span');
  addressSpan.className = 'safeca-address-text';
  addressSpan.textContent = originalAddress;
  
  // Create badge
  const badge = createBadge(data);
  
  // Assemble wrapper
  wrapper.appendChild(addressSpan);
  wrapper.appendChild(badge);
  
  // Split and replace text node
  const before = document.createTextNode(text.substring(0, index));
  const after = document.createTextNode(text.substring(index + address.length));
  
  const parent = textNode.parentNode;
  parent.insertBefore(before, textNode);
  parent.insertBefore(wrapper, textNode);
  parent.insertBefore(after, textNode);
  parent.removeChild(textNode);
  
  // Add event handlers
  wrapper.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showDetailPopup(wrapper, data, originalAddress);
  });
  
  wrapper.addEventListener('mouseenter', () => {
    showTooltip(wrapper, data);
  });
  
  wrapper.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

/**
 * Create a badge element
 */
function createBadge(data) {
  const badge = document.createElement('span');
  badge.className = `safeca-badge safeca-badge-${data.riskLevel || 'loading'}`;
  
  if (data.loading) {
    badge.innerHTML = '<span class="safeca-spinner"></span>';
    badge.title = 'Scanning...';
  } else if (data.error) {
    badge.textContent = '!';
    badge.title = `Error: ${data.error}`;
  } else if (data.score !== null && data.score !== undefined) {
    badge.textContent = data.score;
    badge.title = `Safety Score: ${data.score}/100`;
  } else {
    badge.textContent = '?';
    badge.title = 'Unknown';
  }
  
  return badge;
}

/**
 * Update an existing badge
 */
function updateBadge(wrapper, data) {
  const badge = wrapper.querySelector('.safeca-badge');
  if (!badge) return;
  
  // Update classes
  badge.className = `safeca-badge safeca-badge-${data.riskLevel || 'loading'}`;
  
  if (data.loading) {
    badge.innerHTML = '<span class="safeca-spinner"></span>';
    badge.title = 'Scanning...';
  } else if (data.error) {
    badge.textContent = '!';
    badge.title = `Error: ${data.error}`;
  } else if (data.score !== null && data.score !== undefined) {
    badge.textContent = data.score;
    badge.title = `Safety Score: ${data.score}/100`;
  }
  
  wrapper.setAttribute('data-chain', data.chain || '');
  
  // Update click handler with new data
  const newWrapper = wrapper.cloneNode(true);
  wrapper.parentNode.replaceChild(newWrapper, wrapper);
  
  const address = newWrapper.getAttribute('data-safeca-address');
  newWrapper.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showDetailPopup(newWrapper, data, address);
  });
  
  newWrapper.addEventListener('mouseenter', () => {
    showTooltip(newWrapper, data);
  });
  
  newWrapper.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

/**
 * Show tooltip on hover
 */
function showTooltip(wrapper, data) {
  hideTooltip();
  
  if (data.loading || data.error) return;
  
  const tooltip = document.createElement('div');
  tooltip.className = 'safeca-tooltip';
  tooltip.id = 'safeca-tooltip';
  
  const scoreColor = BADGE_COLORS[data.riskLevel] || BADGE_COLORS.error;
  
  tooltip.innerHTML = `
    <div class="safeca-tooltip-header">
      <span class="safeca-tooltip-name">${escapeHtml(data.tokenSymbol || 'Unknown')}</span>
      <span class="safeca-tooltip-score" style="background: ${scoreColor}">${data.score}</span>
    </div>
    <div class="safeca-tooltip-body">
      <div class="safeca-tooltip-row">
        <span>Risk Level:</span>
        <span class="safeca-tooltip-value safeca-${data.riskLevel}">${capitalizeFirst(data.riskLevel)}</span>
      </div>
      ${data.liquidity ? `
        <div class="safeca-tooltip-row">
          <span>Liquidity:</span>
          <span class="safeca-tooltip-value">$${formatNumber(data.liquidity)}</span>
        </div>
      ` : ''}
      ${data.holderCount ? `
        <div class="safeca-tooltip-row">
          <span>Holders:</span>
          <span class="safeca-tooltip-value">${formatNumber(data.holderCount)}</span>
        </div>
      ` : ''}
    </div>
    <div class="safeca-tooltip-footer">Click for details</div>
  `;
  
  document.body.appendChild(tooltip);
  
  // Position tooltip
  const rect = wrapper.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  
  // Adjust if off-screen
  requestAnimationFrame(() => {
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
    }
    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 8}px`;
    }
  });
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  const existing = document.getElementById('safeca-tooltip');
  if (existing) existing.remove();
}

/**
 * Show detail popup on click
 */
async function showDetailPopup(wrapper, data, address) {
  hideDetailPopup();
  hideTooltip();
  
  // Check if in watchlist
  const chain = data.chain || wrapper.getAttribute('data-chain') || CHAIN_IDS.ETHEREUM;
  const inWatchlist = isInWatchlist(address, chain);
  
  const popup = document.createElement('div');
  popup.className = 'safeca-popup';
  popup.id = 'safeca-popup';
  
  const scoreColor = BADGE_COLORS[data.riskLevel] || BADGE_COLORS.error;
  
  popup.innerHTML = `
    <div class="safeca-popup-header">
      <div class="safeca-popup-title">
        ${ICONS.shield}
        <span>Safe CA Analysis</span>
      </div>
      <button class="safeca-popup-close" id="safeca-popup-close">${ICONS.x}</button>
    </div>
    
    <div class="safeca-popup-content">
      <div class="safeca-popup-token">
        <div class="safeca-popup-token-info">
          <h3>${escapeHtml(data.tokenName || 'Unknown Token')}</h3>
          <span class="safeca-popup-symbol">${escapeHtml(data.tokenSymbol || '???')}</span>
        </div>
        <div class="safeca-popup-score" style="background: ${scoreColor}">
          <span class="safeca-popup-score-value">${data.score ?? '?'}</span>
          <span class="safeca-popup-score-label">${capitalizeFirst(data.riskLevel || 'unknown')}</span>
        </div>
      </div>
      
      <div class="safeca-popup-address">
        <code>${escapeHtml(address)}</code>
        <button class="safeca-copy-btn" data-copy="${escapeHtml(address)}" title="Copy address">${ICONS.copy}</button>
      </div>
      
      <div class="safeca-popup-chain">
        <span class="safeca-chain-badge">${escapeHtml(data.chainName || getChainName(chain))}</span>
      </div>
      
      ${data.flags && data.flags.length > 0 ? `
        <div class="safeca-popup-flags">
          <h4>Risk Indicators</h4>
          <div class="safeca-flags-list">
            ${data.flags.map(flag => `
              <div class="safeca-flag safeca-flag-${flag.type}">
                <span class="safeca-flag-icon">${getFlagIcon(flag.type)}</span>
                <span class="safeca-flag-message">${escapeHtml(flag.message)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="safeca-popup-metrics">
        <h4>Token Metrics</h4>
        <div class="safeca-metrics-grid">
          ${createMetricItem('Price', data.priceUsd ? `$${formatPrice(data.priceUsd)}` : 'N/A')}
          ${createMetricItem('Liquidity', data.liquidity ? `$${formatNumber(data.liquidity)}` : 'N/A')}
          ${createMetricItem('Market Cap', data.marketCap ? `$${formatNumber(data.marketCap)}` : 'N/A')}
          ${createMetricItem('24h Volume', data.volume24h ? `$${formatNumber(data.volume24h)}` : 'N/A')}
          ${createMetricItem('Holders', data.holderCount ? formatNumber(data.holderCount) : 'N/A')}
          ${createMetricItem('24h Change', data.priceChange24h !== undefined ? `${data.priceChange24h > 0 ? '+' : ''}${data.priceChange24h.toFixed(2)}%` : 'N/A', data.priceChange24h)}
        </div>
      </div>
      
      ${data.breakdown ? `
      <div class="safeca-popup-breakdown">
        <h4>Safety Breakdown</h4>
        <div class="safeca-breakdown-list">
          ${createBreakdownItem('Liquidity Lock', data.breakdown.liquidityLock, data.liquidityLocked)}
          ${createBreakdownItem('Ownership', data.breakdown.ownershipRenounced, data.ownershipRenounced)}
          ${createBreakdownItem('Honeypot Check', data.breakdown.honeypotCheck, data.isHoneypot === false)}
          ${createBreakdownItem('Holder Distribution', data.breakdown.holderDistribution)}
          ${createBreakdownItem('Tax Rate', data.breakdown.taxRate, (data.buyTax || 0) + (data.sellTax || 0) < 10)}
          ${createBreakdownItem('Contract Verified', data.breakdown.contractVerified, data.isVerified)}
        </div>
      </div>
      ` : ''}
      
      <div class="safeca-popup-actions">
        ${inWatchlist ? `
          <button class="safeca-btn safeca-btn-remove" id="safeca-remove-btn">
            ${ICONS.x} Remove from Watchlist
          </button>
        ` : `
          <button class="safeca-btn safeca-btn-watchlist" id="safeca-watchlist-btn">
            ${ICONS.plus} Add to Watchlist
          </button>
        `}
        <button class="safeca-btn safeca-btn-dex" id="safeca-dex-btn">
          ${ICONS.chart} View on DexScreener
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Position popup
  const rect = wrapper.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 10;
  
  if (left + popupRect.width > window.innerWidth) {
    left = window.innerWidth - popupRect.width - 20;
  }
  if (top + popupRect.height > window.innerHeight + window.scrollY) {
    top = rect.top + window.scrollY - popupRect.height - 10;
  }
  
  popup.style.left = `${Math.max(10, left)}px`;
  popup.style.top = `${Math.max(10, top)}px`;
  
  // Event handlers
  document.getElementById('safeca-popup-close').addEventListener('click', hideDetailPopup);
  
  const watchlistBtn = document.getElementById('safeca-watchlist-btn');
  if (watchlistBtn) {
    watchlistBtn.addEventListener('click', async () => {
      try {
        const tokenData = {
          ...data,
          address: address,
          chain: chain
        };
        
        const response = await chrome.runtime.sendMessage({
          type: 'WATCHLIST_ADD',
          payload: { token: tokenData }
        });
        
        if (response.success) {
          addToWatchlistCache(address, chain);
          // Replace button with remove button
          watchlistBtn.outerHTML = `
            <button class="safeca-btn safeca-btn-remove" id="safeca-remove-btn">
              ${ICONS.x} Remove from Watchlist
            </button>
          `;
          // Add handler for the new remove button
          document.getElementById('safeca-remove-btn')?.addEventListener('click', handleRemoveFromWatchlist);
        }
      } catch (error) {
        console.error('[SafeCA] Failed to add to watchlist:', error);
      }
    });
  }
  
  const removeBtn = document.getElementById('safeca-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', handleRemoveFromWatchlist);
  }
  
  async function handleRemoveFromWatchlist() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'WATCHLIST_REMOVE',
        payload: { address: address, chain: chain }
      });
      
      if (response.success) {
        removeFromWatchlistCache(address, chain);
        const btn = document.getElementById('safeca-remove-btn');
        if (btn) {
          btn.outerHTML = `
            <button class="safeca-btn safeca-btn-watchlist" id="safeca-watchlist-btn">
              ${ICONS.plus} Add to Watchlist
            </button>
          `;
          // Re-add the add handler
          document.getElementById('safeca-watchlist-btn')?.addEventListener('click', async () => {
            const tokenData = { ...data, address: address, chain: chain };
            const addResponse = await chrome.runtime.sendMessage({
              type: 'WATCHLIST_ADD',
              payload: { token: tokenData }
            });
            if (addResponse.success) {
              addToWatchlistCache(address, chain);
              showDetailPopup(wrapper, data, address); // Refresh popup
            }
          });
        }
      }
    } catch (error) {
      console.error('[SafeCA] Failed to remove from watchlist:', error);
    }
  }
  
  document.getElementById('safeca-dex-btn').addEventListener('click', () => {
    window.open(`https://dexscreener.com/search?q=${encodeURIComponent(address)}`, '_blank');
  });
  
  // Copy buttons
  popup.querySelectorAll('.safeca-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.copy);
      btn.innerHTML = ICONS.check;
      setTimeout(() => btn.innerHTML = ICONS.copy, 1000);
    });
  });
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

/**
 * Hide detail popup
 */
function hideDetailPopup() {
  const existing = document.getElementById('safeca-popup');
  if (existing) existing.remove();
  document.removeEventListener('click', handleOutsideClick);
}

/**
 * Handle click outside popup
 */
function handleOutsideClick(e) {
  const popup = document.getElementById('safeca-popup');
  if (popup && !popup.contains(e.target) && !e.target.closest('.safeca-address')) {
    hideDetailPopup();
  }
}

/**
 * Get chain name from ID
 */
function getChainName(chainId) {
  const names = {
    '1': 'Ethereum',
    '56': 'BNB Chain',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '8453': 'Base',
    'solana': 'Solana'
  };
  return names[chainId] || chainId;
}

/**
 * Get flag icon based on type
 */
function getFlagIcon(type) {
  switch (type) {
    case 'critical': return ICONS.x;
    case 'warning': return ICONS.alert;
    case 'info': return ICONS.check;
    default: return ICONS.alert;
  }
}

/**
 * Create a metric item HTML
 */
function createMetricItem(label, value, changeValue = null) {
  let changeClass = '';
  if (changeValue !== null && changeValue !== undefined) {
    changeClass = changeValue > 0 ? 'safeca-positive' : changeValue < 0 ? 'safeca-negative' : '';
  }
  return `
    <div class="safeca-metric">
      <span class="safeca-metric-label">${escapeHtml(label)}</span>
      <span class="safeca-metric-value ${changeClass}">${escapeHtml(String(value))}</span>
    </div>
  `;
}

/**
 * Create a breakdown item HTML
 */
function createBreakdownItem(label, score, isGood = null) {
  const scoreValue = score ?? 0;
  const barColor = scoreValue >= 80 ? '#22c55e' : scoreValue >= 50 ? '#eab308' : '#ef4444';
  let statusIcon = '';
  if (isGood === true) statusIcon = ICONS.check;
  else if (isGood === false) statusIcon = ICONS.x;
  
  return `
    <div class="safeca-breakdown-item">
      <div class="safeca-breakdown-header">
        <span class="safeca-breakdown-label">${escapeHtml(label)}</span>
        <span class="safeca-breakdown-status">${statusIcon}</span>
      </div>
      <div class="safeca-breakdown-bar">
        <div class="safeca-breakdown-fill" style="width: ${scoreValue}%; background: ${barColor}"></div>
      </div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

/**
 * Format number with K/M/B suffixes
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  num = Number(num);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

/**
 * Format price with appropriate decimals
 */
function formatPrice(price) {
  if (price === null || price === undefined || isNaN(price)) return 'N/A';
  price = Number(price);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toExponential(2);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize immediately
  initialize();
}

// Also try to initialize on various events to ensure it runs
window.addEventListener('load', () => {
  if (!state.isInitialized) initialize();
});

// Re-scan when user scrolls (debounced)
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (!state.isInitialized || !state.settings?.autoScan) return;
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    scanPage();
  }, 500);
}, { passive: true });
