# 🛡️ Safe CA - Token Safety Scanner

A lightweight, cross-browser extension for real-time token safety scanning of meme coins and crypto launches. Automatically detects contract addresses on X/Twitter and provides instant risk assessment with color-coded badges.

![Safe CA Banner](./icons/icon128.png)

## ✨ Features

### 🔍 Automatic CA Detection
- Scans X/Twitter timelines and custom websites in real-time
- Add any website to the allowed list in settings
- Detects both EVM (Ethereum, BSC, Polygon, etc.) and Solana addresses
- Uses efficient regex matching with debounced processing

### 🎯 Safety Scoring
- 0-100 safety score based on multiple factors:
  - Liquidity lock status (25%)
  - Ownership renounced (15%)
  - Honeypot detection (20%)
  - Holder distribution (15%)
  - Tax rates (10%)
  - Contract verification (10%)
  - Trading activity (5%)

### 🏷️ Visual Badges
- **Green (80-100)**: Safe - Low risk indicators
- **Yellow (50-79)**: Caution - Some concerns
- **Red (0-49)**: Danger - High risk

### 👁️ Watchlist & Alerts
- Add tokens to watchlist for monitoring
- Automatic polling every 5 minutes
- Desktop notifications for significant changes:
  - Liquidity drops
  - Score decreases
  - Honeypot detection

### 🖱️ Manual Scanning
- Right-click context menu for quick scans
- Popup interface for manual address input
- Support for multiple chains

## 🚀 Installation

### Chrome / Brave
1. Download the latest release or build from source
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

### Firefox
1. Download the Firefox-specific package
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `.zip` file or `manifest.json`

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/safeca/safe-ca-extension.git
cd safe-ca-extension

# Install dependencies
npm install

# Generate icons
npm run build:icons

# Build for development
npm run build

# Run tests
npm test
```

### Project Structure
```
safe-ca/
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background/        # Service worker
│   │   └── service-worker.js
│   ├── content/           # Content scripts
│   │   └── content.js
│   ├── utils/             # Shared utilities
│   │   ├── api.js         # API integrations
│   │   ├── constants.js   # Configuration
│   │   ├── helpers.js     # Helper functions
│   │   ├── scoring.js     # Safety scoring
│   │   └── storage.js     # Chrome storage wrapper
│   └── styles/
│       └── content.css    # Injected styles
├── popup/                 # Extension popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/                 # Extension icons
├── tests/                 # Test suites
│   ├── unit/
│   └── integration/
└── scripts/               # Build scripts
```

### API Sources
- **GoPlus Labs**: Token security audits
- **RugCheck.xyz**: Solana token analysis
- **Honeypot.is**: Honeypot detection
- **DexScreener**: Market data and liquidity

## 📊 Scoring Algorithm

The safety score is calculated using weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Liquidity | 25% | LP locked/burned, lock duration |
| Ownership | 15% | Contract ownership renounced |
| Honeypot | 20% | Can sell, no transfer blocks |
| Holders | 15% | Distribution, top holder % |
| Taxes | 10% | Buy/sell tax rates |
| Verified | 10% | Contract source verified |
| Activity | 5% | Trading volume, tx count |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual Testing Scenarios
1. **Timeline Scan**: Open X/Twitter, scroll through timeline with CA tweets
2. **Badge Display**: Verify badges appear next to detected addresses
3. **Popup Details**: Click badge to view detailed analysis
4. **Watchlist**: Add token, verify polling and notifications
5. **Context Menu**: Right-click selected text to scan

## 📦 Building for Production

```bash
# Build optimized bundle
npm run build

# Create distribution packages
npm run package
```

Output:
- `build/safe-ca-chrome-v1.0.0.zip` - Chrome Web Store
- `build/safe-ca-firefox-v1.0.0.zip` - Firefox Add-ons

## 🔒 Privacy & Security

- **Read-only**: No wallet connections or transactions
- **No data collection**: All data stays in your browser
- **Open source**: Full transparency of code
- **Minimal permissions**: Only what's needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## ⚠️ Disclaimer

Safe CA is a tool to help identify potential risks in tokens. It is NOT financial advice. Always do your own research (DYOR) before investing. The safety score is based on publicly available data and may not catch all risks.

## 🙏 Acknowledgments

- [GoPlus Labs](https://gopluslabs.io/) for security API
- [RugCheck](https://rugcheck.xyz/) for Solana analysis
- [DexScreener](https://dexscreener.com/) for market data
- The crypto community for feedback and support

---

Made with 💙 by the Safe CA Team
