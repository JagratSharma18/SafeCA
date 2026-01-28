/**
 * Safe CA - Background Service Worker
 * Handles API calls, caching, watchlist polling, and notifications
 */

import { storage, cache, watchlist, settings } from '../utils/storage.js';
import { fetchAllTokenData } from '../utils/api.js';
import { calculateSafetyScore, detectChanges } from '../utils/scoring.js';
import { 
  CHAIN_IDS, 
  CHAIN_NAMES, 
  WATCHLIST_CONFIG,
  STORAGE_KEYS 
} from '../utils/constants.js';
import { 
  detectChainFromAddress, 
  normalizeAddress,
  truncateAddress 
} from '../utils/helpers.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SafeCA] Extension installed/updated:', details.reason);
  
  // Initialize storage
  await storage.initialize();
  
  // Create context menu
  createContextMenu();
  
  // Set up watchlist alarm
  setupWatchlistAlarm();
  
  // Show welcome notification on fresh install
  if (details.reason === 'install') {
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Safe CA Installed',
      message: 'Token safety scanner is now active. Visit X/Twitter to see it in action.',
      priority: 2
    });
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[SafeCA] Extension started');
  await storage.initialize();
  createContextMenu();
  setupWatchlistAlarm();
});

/**
 * Create context menu for right-click scanning
 */
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'safeca-scan',
      title: 'Scan with Safe CA',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'safeca-scan-link',
      title: 'Scan CA from Link',
      contexts: ['link']
    });
  });
}

/**
 * Set up watchlist polling alarm
 */
function setupWatchlistAlarm() {
  chrome.alarms.clear('watchlist-poll', () => {
    const periodMinutes = WATCHLIST_CONFIG.POLL_INTERVAL / 60000;
    chrome.alarms.create('watchlist-poll', {
      periodInMinutes: periodMinutes,
      when: Date.now() + 60000 // Start polling after 1 minute
    });
    console.log('[SafeCA] Watchlist polling alarm set up:', periodMinutes, 'minutes');
    
    // Verify alarm was created
    chrome.alarms.get('watchlist-poll', (alarm) => {
      if (alarm) {
        console.log('[SafeCA] Alarm verified:', alarm);
      } else {
        console.error('[SafeCA] Failed to create alarm!');
      }
    });
  });
}

/**
 * Test notification (for debugging)
 */
async function testNotification() {
  return new Promise((resolve) => {
    try {
      // Check permission first
      chrome.notifications.getPermissionLevel((level) => {
        console.log('[SafeCA] Notification permission level:', level);
        
        if (level !== 'granted') {
          console.warn('[SafeCA] Notification permission not granted. Level:', level);
          resolve({ success: false, error: 'Notification permission not granted', level });
          return;
        }
        
        const iconUrl = chrome.runtime.getURL('icons/icon128.png');
        console.log('[SafeCA] Test notification icon URL:', iconUrl);
        
        chrome.notifications.create('test-' + Date.now(), {
          type: 'basic',
          iconUrl: iconUrl,
          title: 'Safe CA Test',
          message: 'If you see this, notifications are working!',
          priority: 2
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('[SafeCA] Test notification failed:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log('[SafeCA] ✅ Test notification sent with ID:', notificationId);
            resolve({ success: true, notificationId });
          }
        });
      });
    } catch (error) {
      console.error('[SafeCA] Test notification failed:', error);
      resolve({ success: false, error: error.message });
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let text = '';
  
  if (info.menuItemId === 'safeca-scan' && info.selectionText) {
    text = info.selectionText.trim();
  } else if (info.menuItemId === 'safeca-scan-link' && info.linkUrl) {
    // Extract potential CA from URL
    const urlMatch = info.linkUrl.match(/0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (urlMatch) {
      text = urlMatch[0];
    }
  }
  
  if (text) {
    const chain = detectChainFromAddress(text);
    if (chain) {
      // Open popup with pre-filled address
      chrome.storage.local.set({ 
        pendingScan: { address: text, chain } 
      });
      chrome.action.openPopup();
    } else {
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Invalid Address',
        message: 'The selected text is not a valid contract address.',
        priority: 1
      });
    }
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('[SafeCA] Notification clicked:', notificationId);
  // Extract address from notification ID if it's a watchlist notification
  if (notificationId.startsWith('watchlist-')) {
    const address = notificationId.split('-')[1];
    // Open popup or focus extension
    chrome.action.openPopup();
  }
  // Clear the notification
  chrome.notifications.clear(notificationId);
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('[SafeCA] Notification button clicked:', notificationId, buttonIndex);
  if (buttonIndex === 0) {
    // "View Details" button
    chrome.action.openPopup();
  }
  chrome.notifications.clear(notificationId);
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[SafeCA] Alarm triggered:', alarm.name);
  if (alarm.name === 'watchlist-poll') {
    console.log('[SafeCA] Starting watchlist poll...');
    await pollWatchlist();
    console.log('[SafeCA] Watchlist poll completed');
  }
});

// Inject content script on allowed domains when tabs are updated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject when page is fully loaded
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  // Skip non-http(s) URLs
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
    return;
  }
  
  try {
    const url = new URL(tab.url);
    const hostname = url.hostname;
    
    // Skip if it's already in manifest content_scripts (Twitter/X)
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return;
    }
    
    // Check if domain is in allowed websites
    const userSettings = await settings.getAll();
    const allowedWebsites = userSettings.allowedWebsites || [];
    
    // Normalize hostname (remove www prefix for comparison)
    const normalizedHostname = hostname.replace(/^www\./, '');
    
    const isAllowed = allowedWebsites.some(domain => {
      // Normalize domain (remove www prefix)
      const normalizedDomain = domain.replace(/^www\./, '');
      
      // Support exact match, subdomain match, and www prefix
      return normalizedHostname === normalizedDomain || 
             normalizedHostname.endsWith('.' + normalizedDomain) ||
             hostname === 'www.' + normalizedDomain;
    });
    
    if (isAllowed) {
      // Inject content script and CSS with a small delay to ensure DOM is ready
      setTimeout(async () => {
        try {
          // Check if already injected by checking for our marker
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              return window.__safeca_initialized || false;
            }
          });
          
          if (results && results[0] && results[0].result) {
            // Already initialized, just trigger a re-scan
            chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                if (window.__safeca_scanPage) {
                  window.__safeca_scanPage();
                }
              }
            });
            return;
          }
          
          // Inject content script and CSS
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['src/content/content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId },
            files: ['src/styles/content.css']
          });
          
          // Mark as initialized
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              window.__safeca_initialized = true;
            }
          });
          
          console.log('[SafeCA] Injected content script on', hostname);
        } catch (error) {
          // Ignore errors (e.g., chrome:// pages, extension pages, invalid tab)
          if (!error.message.includes('Cannot access') && 
              !error.message.includes('No tab with id')) {
            console.warn('[SafeCA] Failed to inject on', hostname, error);
          }
        }
      }, 500); // Small delay to ensure DOM is ready
    }
  } catch (error) {
    // Ignore invalid URLs
    console.warn('[SafeCA] Tab update error:', error);
  }
});

/**
 * Poll watchlist items for changes
 */
async function pollWatchlist() {
  try {
    const userSettings = await settings.getAll();
    console.log('[SafeCA] Watchlist polling enabled:', userSettings.watchlistPolling);
    console.log('[SafeCA] Notifications enabled:', userSettings.notifications);
    
    if (!userSettings.watchlistPolling) {
      console.log('[SafeCA] Watchlist polling is disabled');
      return;
    }
    
    const items = await watchlist.getAll();
    console.log('[SafeCA] Watchlist items count:', items.length);
    
    if (items.length === 0) {
      console.log('[SafeCA] No items in watchlist');
      return;
    }
    
    console.log('[SafeCA] Polling watchlist:', items.length, 'items');
    
    for (const item of items) {
      try {
        console.log('[SafeCA] Scanning token:', item.address, 'on', item.chain);
        const result = await scanToken(item.address, item.chain, false); // Don't use cache for polling
        
        if (result.success) {
          console.log('[SafeCA] Scan successful, comparing with baseline...');
          
          // Ensure baseline exists
          if (!item.baseline) {
            console.log('[SafeCA] No baseline found, setting current data as baseline');
            await watchlist.update(item.address, item.chain, {
              ...result.data,
              baseline: result.data
            });
            continue;
          }
          
          // Compare with baseline
          const changes = detectChanges(item.baseline, result.data);
          console.log('[SafeCA] Changes detected:', changes.length);
          
          if (changes.length > 0) {
            console.log('[SafeCA] Changes:', JSON.stringify(changes, null, 2));
            
            // Update watchlist item
            await watchlist.update(item.address, item.chain, {
              ...result.data,
              lastChanges: changes
            });
            
            // Send notifications for important changes
            if (userSettings.notifications) {
              console.log('[SafeCA] Sending notifications for changes...');
              for (const change of changes) {
                // Send notifications for critical and warning changes
                if (change.type === 'critical' || change.type === 'warning') {
                  try {
                    // Check notification permission first
                    const hasPermission = await new Promise((resolve) => {
                      chrome.notifications.getPermissionLevel((level) => {
                        resolve(level === 'granted');
                      });
                    });
                    
                    if (!hasPermission) {
                      console.warn('[SafeCA] Notification permission not granted. Level:', await new Promise((resolve) => {
                        chrome.notifications.getPermissionLevel(resolve);
                      }));
                      // Try to request permission (this might not work in all browsers)
                      try {
                        await chrome.notifications.create({
                          type: 'basic',
                          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                          title: 'Safe CA',
                          message: 'Please enable notifications in browser settings'
                        });
                      } catch (e) {
                        console.error('[SafeCA] Cannot request notification permission:', e);
                      }
                      continue;
                    }
                    
                    const notificationId = `watchlist-${item.address}-${Date.now()}`;
                    
                    // Verify icon exists
                    const iconUrl = chrome.runtime.getURL('icons/icon128.png');
                    console.log('[SafeCA] Icon URL:', iconUrl);
                    
                    const notificationOptions = {
                      type: 'basic',
                      iconUrl: iconUrl,
                      title: `${change.type === 'critical' ? 'Alert' : 'Warning'}: ${item.tokenSymbol || truncateAddress(item.address)}`,
                      message: change.message,
                      priority: change.type === 'critical' ? 2 : 1
                    };
                    
                    console.log('[SafeCA] Creating notification:', JSON.stringify(notificationOptions, null, 2));
                    
                    // Use callback-based API for better compatibility
                    chrome.notifications.create(notificationId, notificationOptions, (createdId) => {
                      if (chrome.runtime.lastError) {
                        console.error('[SafeCA] Failed to create notification:', chrome.runtime.lastError.message);
                        console.error('[SafeCA] Error details:', JSON.stringify(chrome.runtime.lastError, null, 2));
                      } else {
                        console.log('[SafeCA] ✅ Notification created successfully with ID:', createdId);
                        console.log('[SafeCA] Notification sent for', item.address, change.message);
                        
                        // Verify notification was actually created
                        chrome.notifications.getAll((notifications) => {
                          if (notifications && notifications[createdId]) {
                            console.log('[SafeCA] ✅ Notification verified in system:', createdId);
                          } else {
                            console.warn('[SafeCA] ⚠️ Notification not found in system after creation');
                          }
                        });
                      }
                    });
                  } catch (error) {
                    console.error('[SafeCA] Failed to create notification:', error);
                    console.error('[SafeCA] Error details:', error.message, error.stack);
                    // Check if permission is needed
                    if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                      console.warn('[SafeCA] Notification permission may not be granted');
                    }
                  }
                } else {
                  console.log('[SafeCA] Skipping notification for change type:', change.type);
                }
              }
            } else {
              console.log('[SafeCA] Notifications are disabled');
            }
          } else {
            console.log('[SafeCA] No significant changes detected');
            // Just update the data
            await watchlist.update(item.address, item.chain, result.data);
          }
        } else {
          console.error('[SafeCA] Scan failed:', result.error);
        }
      } catch (error) {
        console.error('[SafeCA] Watchlist poll error for', item.address, error);
      }
      
      // Small delay between items to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[SafeCA] Watchlist polling completed');
  } catch (error) {
    console.error('[SafeCA] Error in pollWatchlist:', error);
  }
}

/**
 * Scan a token and return safety analysis
 * @param {string} address - Contract address
 * @param {string} chain - Chain ID
 * @param {boolean} useCache - Whether to use cached data
 * @returns {Promise<object>}
 */
async function scanToken(address, chain, useCache = true) {
  try {
    // Normalize address
    const normalizedAddress = normalizeAddress(address, chain);
    
    // Check cache first
    if (useCache) {
      const cached = await cache.getToken(normalizedAddress, chain);
      if (cached) {
        console.log('[SafeCA] Using cached data for', normalizedAddress);
        return {
          success: true,
          data: cached,
          cached: true
        };
      }
    }
    
    // Fetch fresh data
    console.log('[SafeCA] Fetching data for', normalizedAddress, 'on', CHAIN_NAMES[chain] || chain);
    const tokenData = await fetchAllTokenData(normalizedAddress, chain);
    
    if (tokenData.error || !tokenData.merged) {
      return {
        success: false,
        error: tokenData.error || 'Failed to fetch token data'
      };
    }
    
    // Calculate safety score
    const scoreResult = calculateSafetyScore(tokenData.merged);
    
    // Combine all data
    const result = {
      address: normalizedAddress,
      chain,
      chainName: CHAIN_NAMES[chain] || chain,
      ...tokenData.merged,
      ...scoreResult,
      timestamp: Date.now()
    };
    
    // Cache the result
    await cache.setToken(normalizedAddress, chain, result);
    
    return {
      success: true,
      data: result,
      cached: false
    };
  } catch (error) {
    console.error('[SafeCA] Scan error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async responses
  (async () => {
    // Ensure storage is initialized
    await storage.initialize();
    
    try {
      switch (message.type) {
        case 'SCAN_TOKEN': {
          const { address, chain, useCache } = message.payload;
          const result = await scanToken(address, chain, useCache !== false);
          sendResponse(result);
          break;
        }
        
        case 'SCAN_MULTIPLE': {
          const { tokens } = message.payload;
          const results = [];
          
          for (const token of tokens) {
            const result = await scanToken(token.address, token.chain);
            results.push({
              ...token,
              result
            });
          }
          
          sendResponse({ success: true, results });
          break;
        }
        
        case 'GET_CACHED': {
          const { address, chain } = message.payload;
          const cached = await cache.getToken(address, chain);
          sendResponse({ success: true, data: cached });
          break;
        }
        
        case 'WATCHLIST_ADD': {
          const { token } = message.payload;
          const added = await watchlist.add(token);
          sendResponse({ success: added });
          break;
        }
        
        case 'WATCHLIST_REMOVE': {
          const { address, chain } = message.payload;
          const removed = await watchlist.remove(address, chain);
          sendResponse({ success: removed });
          break;
        }
        
        case 'WATCHLIST_GET': {
          const items = await watchlist.getAll();
          sendResponse({ success: true, items });
          break;
        }
        
        case 'WATCHLIST_CHECK': {
          const { address, chain } = message.payload;
          const exists = await watchlist.has(address, chain);
          sendResponse({ success: true, exists });
          break;
        }
        
        case 'SETTINGS_GET': {
          const allSettings = await settings.getAll();
          sendResponse({ success: true, settings: allSettings });
          break;
        }
        
        case 'SETTINGS_UPDATE': {
          const { updates } = message.payload;
          const updated = await settings.update(updates);
          sendResponse({ success: updated });
          break;
        }
        
        case 'CLEAR_CACHE': {
          await cache.clearAll();
          sendResponse({ success: true });
          break;
        }
        
        case 'GET_PENDING_SCAN': {
          const data = await chrome.storage.local.get('pendingScan');
          if (data.pendingScan) {
            await chrome.storage.local.remove('pendingScan');
          }
          sendResponse({ success: true, pendingScan: data.pendingScan });
          break;
        }
        
        case 'TEST_NOTIFICATION': {
          const result = await testNotification();
          sendResponse(result);
          break;
        }
        
        case 'TEST_WATCHLIST_POLL': {
          console.log('[SafeCA] Manual watchlist poll triggered');
          // Run poll in background, don't wait for it
          pollWatchlist().catch(err => {
            console.error('[SafeCA] Poll error:', err);
          });
          sendResponse({ success: true, message: 'Poll started' });
          break;
        }
        
        case 'GET_ALARM_STATUS': {
          chrome.alarms.get('watchlist-poll', (alarm) => {
            sendResponse({ success: true, alarm: alarm || null });
          });
          return true; // Async response
        }
        
        case 'INJECT_CONTENT_SCRIPT': {
          const { domain } = message.payload;
          try {
            // Find all tabs with this domain (with and without www)
            const patterns = [
              `*://${domain}/*`,
              `*://www.${domain}/*`,
              `*://*.${domain}/*`
            ];
            
            const allTabs = [];
            for (const pattern of patterns) {
              try {
                const tabs = await chrome.tabs.query({ url: pattern });
                allTabs.push(...tabs);
              } catch (err) {
                // Ignore invalid patterns
              }
            }
            
            // Remove duplicates
            const uniqueTabs = Array.from(new Map(allTabs.map(tab => [tab.id, tab])).values());
            
            for (const tab of uniqueTabs) {
              try {
                // Check if already injected
                const results = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => window.__safeca_initialized || false
                });
                
                if (results && results[0] && results[0].result) {
                  // Already initialized, trigger re-scan
                  chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                      if (window.__safeca_scanPage) {
                        window.__safeca_scanPage();
                      }
                    }
                  });
                  continue;
                }
                
                // Inject content script and CSS
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['src/content/content.js']
                });
                await chrome.scripting.insertCSS({
                  target: { tabId: tab.id },
                  files: ['src/styles/content.css']
                });
                
                // Mark as initialized
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => {
                    window.__safeca_initialized = true;
                  }
                });
                
                console.log('[SafeCA] Injected on tab', tab.id, 'for domain', domain);
              } catch (err) {
                console.warn('[SafeCA] Failed to inject on tab', tab.id, err);
              }
            }
            sendResponse({ success: true, tabsInjected: uniqueTabs.length });
          } catch (error) {
            console.error('[SafeCA] Failed to inject content script:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        }
        
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[SafeCA] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

// Keep service worker alive
const keepAlive = () => {
  chrome.runtime.getPlatformInfo(() => {});
};
setInterval(keepAlive, 20000);

console.log('[SafeCA] Service worker initialized');
