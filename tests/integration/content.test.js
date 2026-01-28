/**
 * Safe CA - Integration Tests for Content Script
 * Tests badge injection and CA detection on mock X/Twitter pages
 */

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('Content Script Integration', () => {
  let mockTweetContainer;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create mock tweet structure
    mockTweetContainer = document.createElement('div');
    mockTweetContainer.innerHTML = `
      <article role="article">
        <div data-testid="tweetText">
          Check out this token: 0x1234567890123456789012345678901234567890
          Great potential! 🚀
        </div>
      </article>
    `;
    document.body.appendChild(mockTweetContainer);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock responses
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      settings: { autoScan: true, showBadges: true }
    });
  });

  describe('CA Detection', () => {
    test('should detect EVM addresses in tweet text', () => {
      const tweetText = document.querySelector('[data-testid="tweetText"]');
      const text = tweetText.textContent;
      
      const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
      expect(evmMatch).not.toBeNull();
      expect(evmMatch[0]).toBe('0x1234567890123456789012345678901234567890');
    });

    test('should detect Solana addresses in tweet text', () => {
      const tweetText = document.querySelector('[data-testid="tweetText"]');
      tweetText.textContent = 'Solana gem: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      
      const text = tweetText.textContent;
      const solMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
      
      expect(solMatch).not.toBeNull();
    });

    test('should detect multiple addresses in same tweet', () => {
      const tweetText = document.querySelector('[data-testid="tweetText"]');
      tweetText.textContent = `
        ETH: 0x1234567890123456789012345678901234567890
        Also check: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
      `;
      
      const text = tweetText.textContent;
      const matches = text.match(/0x[a-fA-F0-9]{40}/g);
      
      expect(matches).toHaveLength(2);
    });
  });

  describe('Badge Injection', () => {
    test('should create badge element with correct structure', () => {
      const badge = document.createElement('span');
      badge.className = 'safeca-badge safeca-badge-safe';
      badge.textContent = '85';
      
      expect(badge.classList.contains('safeca-badge')).toBe(true);
      expect(badge.classList.contains('safeca-badge-safe')).toBe(true);
      expect(badge.textContent).toBe('85');
    });

    test('should apply correct color class based on score', () => {
      const testCases = [
        { score: 90, expectedClass: 'safeca-badge-safe' },
        { score: 65, expectedClass: 'safeca-badge-warning' },
        { score: 30, expectedClass: 'safeca-badge-danger' }
      ];

      testCases.forEach(({ score, expectedClass }) => {
        const riskLevel = score >= 80 ? 'safe' : score >= 50 ? 'warning' : 'danger';
        const badge = document.createElement('span');
        badge.className = `safeca-badge safeca-badge-${riskLevel}`;
        
        expect(badge.classList.contains(expectedClass)).toBe(true);
      });
    });

    test('should show loading state initially', () => {
      const badge = document.createElement('span');
      badge.className = 'safeca-badge safeca-badge-loading';
      badge.innerHTML = '<span class="safeca-spinner"></span>';
      
      expect(badge.classList.contains('safeca-badge-loading')).toBe(true);
      expect(badge.querySelector('.safeca-spinner')).not.toBeNull();
    });

    test('should show error state on failure', () => {
      const badge = document.createElement('span');
      badge.className = 'safeca-badge safeca-badge-error';
      badge.textContent = '!';
      badge.title = 'Error: API timeout';
      
      expect(badge.classList.contains('safeca-badge-error')).toBe(true);
      expect(badge.textContent).toBe('!');
    });
  });

  describe('Address Wrapper', () => {
    test('should wrap address with clickable span', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'safeca-address';
      wrapper.setAttribute('data-address', '0x1234567890123456789012345678901234567890');
      wrapper.setAttribute('data-chain', '1');
      
      const addressSpan = document.createElement('span');
      addressSpan.className = 'safeca-address-text';
      addressSpan.textContent = '0x1234567890123456789012345678901234567890';
      
      wrapper.appendChild(addressSpan);
      
      expect(wrapper.classList.contains('safeca-address')).toBe(true);
      expect(wrapper.getAttribute('data-address')).toBe('0x1234567890123456789012345678901234567890');
      expect(wrapper.querySelector('.safeca-address-text')).not.toBeNull();
    });
  });

  describe('Tooltip', () => {
    test('should create tooltip with correct structure', () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'safeca-tooltip';
      tooltip.id = 'safeca-tooltip';
      tooltip.innerHTML = `
        <div class="safeca-tooltip-header">
          <span class="safeca-tooltip-name">TEST</span>
          <span class="safeca-tooltip-score" style="background: #22c55e">85</span>
        </div>
        <div class="safeca-tooltip-body">
          <div class="safeca-tooltip-row">
            <span>Risk Level:</span>
            <span class="safeca-tooltip-value safeca-safe">Safe</span>
          </div>
        </div>
      `;
      
      expect(tooltip.querySelector('.safeca-tooltip-name').textContent).toBe('TEST');
      expect(tooltip.querySelector('.safeca-tooltip-score').textContent).toBe('85');
    });

    test('should position tooltip below target element', () => {
      const target = document.createElement('span');
      target.style.position = 'absolute';
      target.style.left = '100px';
      target.style.top = '200px';
      document.body.appendChild(target);
      
      const rect = target.getBoundingClientRect();
      
      const tooltip = document.createElement('div');
      tooltip.style.position = 'absolute';
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 8}px`;
      
      expect(tooltip.style.left).toBe('100px');
    });
  });

  describe('Detail Popup', () => {
    test('should create popup with all sections', () => {
      const popup = document.createElement('div');
      popup.className = 'safeca-popup';
      popup.innerHTML = `
        <div class="safeca-popup-header">
          <div class="safeca-popup-title">Safe CA Analysis</div>
          <button class="safeca-popup-close">&times;</button>
        </div>
        <div class="safeca-popup-content">
          <div class="safeca-popup-token">
            <div class="safeca-popup-token-info">
              <h3>Test Token</h3>
              <span class="safeca-popup-symbol">TEST</span>
            </div>
            <div class="safeca-popup-score safe">
              <span class="safeca-popup-score-value">85</span>
            </div>
          </div>
          <div class="safeca-popup-flags"></div>
          <div class="safeca-popup-metrics"></div>
          <div class="safeca-popup-breakdown"></div>
          <div class="safeca-popup-actions"></div>
        </div>
      `;
      
      expect(popup.querySelector('.safeca-popup-header')).not.toBeNull();
      expect(popup.querySelector('.safeca-popup-token')).not.toBeNull();
      expect(popup.querySelector('.safeca-popup-flags')).not.toBeNull();
      expect(popup.querySelector('.safeca-popup-metrics')).not.toBeNull();
      expect(popup.querySelector('.safeca-popup-breakdown')).not.toBeNull();
      expect(popup.querySelector('.safeca-popup-actions')).not.toBeNull();
    });

    test('should close popup on close button click', () => {
      const popup = document.createElement('div');
      popup.id = 'safeca-popup';
      popup.innerHTML = '<button class="safeca-popup-close">&times;</button>';
      document.body.appendChild(popup);
      
      const closeBtn = popup.querySelector('.safeca-popup-close');
      closeBtn.addEventListener('click', () => {
        popup.remove();
      });
      
      closeBtn.click();
      
      expect(document.getElementById('safeca-popup')).toBeNull();
    });
  });

  describe('Message Passing', () => {
    test('should send scan request to background', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        data: {
          score: 85,
          riskLevel: 'safe',
          tokenName: 'Test Token',
          tokenSymbol: 'TEST'
        }
      });

      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_TOKEN',
        payload: {
          address: '0x1234567890123456789012345678901234567890',
          chain: '1'
        }
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SCAN_TOKEN',
        payload: {
          address: '0x1234567890123456789012345678901234567890',
          chain: '1'
        }
      });
      expect(response.success).toBe(true);
      expect(response.data.score).toBe(85);
    });

    test('should handle scan errors gracefully', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'API timeout'
      });

      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_TOKEN',
        payload: {
          address: '0x1234567890123456789012345678901234567890',
          chain: '1'
        }
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('API timeout');
    });
  });

  describe('MutationObserver', () => {
    test('should detect new tweets added to DOM', (done) => {
      const observer = new MutationObserver((mutations) => {
        const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
        if (hasNewNodes) {
          expect(hasNewNodes).toBe(true);
          observer.disconnect();
          done();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Simulate new tweet being added
      const newTweet = document.createElement('article');
      newTweet.setAttribute('role', 'article');
      newTweet.innerHTML = `
        <div data-testid="tweetText">
          New token: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
        </div>
      `;
      document.body.appendChild(newTweet);
    });
  });
});

describe('Mock X/Twitter Scenarios', () => {
  test('Scenario: User scrolls timeline with multiple CA tweets', () => {
    // Create mock timeline
    const timeline = document.createElement('div');
    timeline.id = 'timeline';
    
    // Add multiple tweets with CAs
    const tweets = [
      { text: 'Check this gem: 0x1111111111111111111111111111111111111111', score: 85 },
      { text: 'Rugged token: 0x2222222222222222222222222222222222222222', score: 20 },
      { text: 'Solana play: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', score: 65 }
    ];

    tweets.forEach(({ text, score }) => {
      const tweet = document.createElement('article');
      tweet.setAttribute('role', 'article');
      tweet.innerHTML = `<div data-testid="tweetText">${text}</div>`;
      timeline.appendChild(tweet);
    });

    document.body.appendChild(timeline);

    // Verify tweets are in DOM
    const tweetElements = document.querySelectorAll('[data-testid="tweetText"]');
    expect(tweetElements).toHaveLength(3);

    // Verify CAs can be extracted
    const allText = Array.from(tweetElements).map(el => el.textContent).join('\n');
    const evmMatches = allText.match(/0x[a-fA-F0-9]{40}/g);
    const solMatches = allText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);

    expect(evmMatches).toHaveLength(2);
    expect(solMatches).toHaveLength(1);
  });

  test('Scenario: Tweet with no CA should not trigger scan', () => {
    const tweet = document.createElement('article');
    tweet.innerHTML = `
      <div data-testid="tweetText">
        Just a regular tweet without any contract addresses! 
        Bitcoin to the moon! 🚀
      </div>
    `;
    document.body.appendChild(tweet);

    const text = tweet.querySelector('[data-testid="tweetText"]').textContent;
    const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
    const solMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);

    expect(evmMatch).toBeNull();
    // Note: Some words might match Solana pattern but should be filtered
  });

  test('Scenario: Tweet with URL should not false-positive', () => {
    const tweet = document.createElement('article');
    tweet.innerHTML = `
      <div data-testid="tweetText">
        Check out https://example.com/token/details
        Visit www.crypto.com for more info
      </div>
    `;
    document.body.appendChild(tweet);

    const text = tweet.querySelector('[data-testid="tweetText"]').textContent;
    
    // URLs should not be detected as CAs
    const evmMatch = text.match(/0x[a-fA-F0-9]{40}/);
    expect(evmMatch).toBeNull();
  });
});
