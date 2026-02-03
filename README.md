# Safe CA - Token Safety Scanner

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black.svg)](https://github.com/JagratSharma18/SafeCA)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org)



A lightweight, cross-browser browser extension for real-time token safety scanning of meme coins and crypto launches. Automatically detects contract addresses on X/Twitter and custom websites, providing instant risk assessment with color-coded safety badges.

![Safe CA Extension](./icons/icon128.png)

## Overview

Safe CA is a Manifest V3 browser extension that helps users identify potentially risky tokens before investing. It automatically scans web pages for contract addresses and provides real-time safety analysis based on multiple security factors including liquidity locks, ownership status, honeypot detection, holder distribution, tax rates, and contract verification.

## Features

### Automatic Contract Address Detection

- Real-time scanning of X/Twitter timelines and custom websites
- Detects both EVM addresses (Ethereum, BSC, Polygon, Arbitrum, Base, Avalanche) and Solana addresses
- Supports custom website configuration - add any domain to the allowed list
- Efficient regex pattern matching with debounced processing
- Handles various address formats including "CA:address" patterns

### Multi-Chain Support

- Ethereum (Mainnet)
- BNB Chain (BSC)
- Polygon
- Arbitrum
- Base
- Avalanche
- Solana
- Automatic chain detection from address format

### Safety Scoring System

The extension calculates a 0-100 safety score using a weighted algorithm:

| Factor | Weight | Description |
|--------|--------|-------------|
| Liquidity Lock | 25% | LP locked/burned status, lock duration, liquidity amount |
| Ownership Renounced | 15% | Contract ownership status, mint/pause/blacklist controls |
| Honeypot Detection | 20% | Sellability checks, transfer restrictions |
| Holder Distribution | 15% | Top holder percentage, top 10 holders, total holder count |
| Tax Rates | 10% | Buy/sell tax rates, tax modification capability |
| Contract Verification | 10% | Source code verification, audit status, proxy detection |
| Trading Activity | 5% | 24h volume, transaction count, suspicious activity |

### Visual Risk Indicators

- **Green Badge (80-100)**: Safe - Low risk indicators
- **Yellow Badge (50-79)**: Caution - Some concerns detected
- **Red Badge (0-49)**: Danger - High risk detected
- **Gray Badge**: Error or loading state

Badges appear inline next to detected contract addresses with smooth fade-in animations. Click any badge to view detailed analysis.

### Watchlist & Monitoring

- Add tokens to watchlist for ongoing monitoring
- Automatic background polling every 5 minutes
- Desktop notifications for significant changes:
  - Liquidity drops greater than 10%
  - Safety score decreases by 15+ points
  - Honeypot detection
  - Top holder concentration increases
- Maximum 50 tokens per watchlist
- Baseline comparison for accurate change detection

### Manual Scanning Options

- **Popup Interface**: Enter contract addresses manually with chain selection
- **Right-Click Context Menu**: Quick scan selected text or links
- **Batch Scanning**: Support for multiple comma-separated addresses
- **Chain Selection**: Auto-detect or manually specify chain

### Detailed Analysis Popup

Click any badge to view comprehensive token analysis including:
- Safety score breakdown by factor
- Risk flags (critical, warning, info)
- Liquidity information (locked, burned, amount)
- Ownership status and controls
- Holder distribution metrics
- Tax information
- Contract verification status
- Trading metrics (volume, transactions)
- Quick actions: copy address, add to watchlist, view on explorer

## Installation

### From Source (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/JagratSharma18/SafeCA.git
   cd SafeCA
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in browser:
   - **Chrome/Brave**: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", select the `dist` folder
   - **Firefox**: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `dist/manifest.json`

### From Releases (Pre-built)

1. Download the latest release from [GitHub Releases](https://github.com/JagratSharma18/SafeCA/releases)
2. Extract the ZIP file
3. Load in browser:
   - **Chrome/Brave**: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", select the extracted folder
   - **Firefox**: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select the `manifest.json` from extracted folder

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Development Setup

```bash
# Clone the repository
git clone https://github.com/JagratSharma18/SafeCA.git
cd SafeCA

# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test
```

### Available Scripts

- `npm test` - Run all tests using Jest
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Generate test coverage report
- `npm run build` - Build extension to `dist/` folder using esbuild
- `npm run build:icons` - Generate icon files from SVG (optional, icons already included)
- `npm run package` - Create distribution ZIP files in `build/` folder
- `npm run lint` - Run ESLint on source files
- `npm run clean` - Remove `dist/` and `build/` folders

### Project Structure

```
SafeCA/
├── manifest.json          # Extension manifest (Manifest V3)
├── package.json           # Project dependencies and npm scripts
├── jest.config.js         # Jest test configuration
├── LICENSE                # MIT License
├── README.md              # This file
├── CONTRIBUTING.md        # Contribution guidelines
├── CODE_OF_CONDUCT.md     # Code of conduct
├── SECURITY.md            # Security policy
├── privacy-policy.html    # Privacy policy document
│
├── src/                   # Source code
│   ├── background/        # Background service worker
│   │   └── service-worker.js
│   ├── content/           # Content scripts (injected into web pages)
│   │   └── content.js
│   ├── utils/             # Shared utilities
│   │   ├── api.js         # API integrations (GoPlus, RugCheck, Honeypot, DexScreener)
│   │   ├── constants.js   # Configuration constants (chains, APIs, thresholds)
│   │   ├── helpers.js     # Helper functions (address validation, formatting)
│   │   ├── scoring.js      # Safety scoring algorithm
│   │   └── storage.js      # Chrome storage wrapper with caching
│   ├── styles/            # CSS styles
│   │   └── content.css    # Injected content styles (badges, popups)
│   └── assets/            # Static assets (currently empty)
│
├── popup/                 # Extension popup UI
│   ├── popup.html         # Popup HTML structure
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic (manual scan, watchlist, settings)
│
├── icons/                 # Extension icons
│   ├── icon.svg           # Source SVG icon
│   ├── icon16.png         # 16x16 icon
│   ├── icon32.png         # 32x32 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
│
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   │   ├── helpers.test.js
│   │   └── scoring.test.js
│   ├── integration/       # Integration tests
│   │   └── content.test.js
│   ├── manual/            # Manual test scenarios
│   │   └── test-scenarios.md
│   └── setup.js           # Test setup configuration
│
├── scripts/               # Build and utility scripts
│   ├── build.js           # Main build script (esbuild bundling)
│   ├── package.js         # Package creation script (ZIP generation)
│   ├── generate-icons.js   # Icon generation from SVG
│   └── create-icons.js    # Icon creation utility
│
├── dist/                  # Build output (generated, gitignored)
├── build/                 # Package output (generated, gitignored)
└── node_modules/          # Dependencies (gitignored)
```

### API Integrations

The extension integrates with the following APIs for token analysis:

- **GoPlus Labs** (`api.gopluslabs.io`) - Token security audits for EVM chains
- **RugCheck.xyz** (`api.rugcheck.xyz`) - Solana token analysis
- **Honeypot.is** (`api.honeypot.is`) - Honeypot detection
- **DexScreener** (`api.dexscreener.com`) - Market data and liquidity information
- **Public RPC Endpoints** - On-chain data queries for all supported chains

### Key Files

- `src/background/service-worker.js` - Background script handling API calls, caching, watchlist polling, and notifications
- `src/content/content.js` - Content script for CA detection and badge injection on web pages
- `src/utils/scoring.js` - Safety score calculation logic with weighted factors
- `src/utils/api.js` - API integration layer with error handling and retry logic
- `src/utils/storage.js` - Chrome storage wrapper with caching and error handling
- `popup/popup.js` - Popup UI logic for manual scanning, watchlist management, and settings

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Manual Testing Scenarios

1. **Timeline Scan**: Open X/Twitter, scroll through timeline with contract address tweets, verify badges appear
2. **Badge Display**: Verify badges appear next to detected addresses with correct colors
3. **Popup Details**: Click badge to view detailed analysis popup
4. **Watchlist**: Add token to watchlist, verify polling and notifications work
5. **Context Menu**: Right-click selected text containing contract address to scan
6. **Custom Websites**: Add custom website in settings, verify CA detection works
7. **Manual Scan**: Use popup to manually enter and scan contract addresses

## Building for Production

```bash
# Build optimized bundle
npm run build

# Create distribution packages
npm run package
```

Output:
- `build/safe-ca-chrome-v1.0.0.zip` - Chrome Web Store package
- `build/safe-ca-firefox-v1.0.0.zip` - Firefox Add-ons package

These packages are ready for submission to browser stores or can be distributed via GitHub Releases.

## Privacy & Security

- **Read-only Operation**: No wallet connections or transaction capabilities
- **No Data Collection**: All data stays locally in your browser
- **Open Source**: Full transparency of code and functionality
- **Minimal Permissions**: Only requests necessary permissions
- **Local Storage**: Watchlist and settings stored locally using Chrome Storage API
- **HTTPS Only**: All API communications use HTTPS
- **No Tracking**: No analytics, tracking pixels, or third-party tracking services

For detailed privacy information, see [privacy-policy.html](privacy-policy.html).

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting contributions.

### Quick Start for Contributors

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SafeCA.git
   cd SafeCA
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/JagratSharma18/SafeCA.git
   ```
4. Create your feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. Make your changes and test them:
   ```bash
   npm run build
   npm test
   ```
6. Commit your changes:
   ```bash
   git commit -m 'feat: add your feature description'
   ```
7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Open a Pull Request on GitHub

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines, code style, and development workflow.

## Support

- **Repository**: [GitHub](https://github.com/JagratSharma18/SafeCA)
- **Issues**: [Report a bug or request a feature](https://github.com/JagratSharma18/SafeCA/issues)
- **Security Issues**: Email svtcontactus@gmail.com (see [SECURITY.md](SECURITY.md))
- **Releases**: [View all releases](https://github.com/JagratSharma18/SafeCA/releases)
- **General Questions**: Open a discussion or issue on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

Safe CA is a tool designed to help identify potential risks in tokens. It is NOT financial advice. Always do your own research (DYOR) before investing. The safety score is based on publicly available data and may not catch all risks. The extension and its developers are not responsible for any financial losses resulting from the use of this tool.

## Acknowledgments

- [GoPlus Labs](https://gopluslabs.io/) for providing token security audit API
- [RugCheck](https://rugcheck.xyz/) for Solana token analysis API
- [DexScreener](https://dexscreener.com/) for market data and liquidity API
- The crypto community for feedback and support

---

Made by the Safe CA Team
