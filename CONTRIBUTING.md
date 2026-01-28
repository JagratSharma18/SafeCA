# Contributing to Safe CA

Thank you for your interest in contributing to Safe CA! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/JagratSharma18/SafeCA/issues)
2. If not, create a new issue using the bug report template
3. Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and extension version
   - Screenshots if applicable

### Suggesting Features

1. Check existing feature requests
2. Create a new issue using the feature request template
3. Describe the feature and its use case
4. Explain why it would be valuable

### Submitting Code Changes

1. **Fork the repository**
   ```bash
   git clone https://github.com/JagratSharma18/SafeCA.git
   cd SafeCA
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Follow the existing code style
   - Write or update tests
   - Update documentation if needed
   - Ensure all tests pass: `npm test`

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `test:` for tests
   - `refactor:` for code refactoring
   - `style:` for formatting
   - `chore:` for maintenance

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a PR on GitHub with:
   - Clear title and description
   - Reference related issues
   - Screenshots for UI changes

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Build
```bash
# Build extension to dist/ folder
npm run build

# Create distribution packages (ZIP files)
npm run package
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch
```

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` to compile changes
3. Load `dist/` folder in browser as unpacked extension
4. Test your changes
5. Run `npm test` to ensure tests pass
6. Commit and push your changes

### Code Style

- Use ES6+ JavaScript
- Follow existing code formatting
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Project Structure

```
SafeCA/
├── src/                   # Source code
│   ├── background/        # Background service worker
│   ├── content/           # Content scripts (injected into web pages)
│   ├── utils/             # Shared utilities (API, scoring, storage, helpers)
│   ├── styles/            # CSS styles for injected content
│   └── assets/            # Static assets
├── popup/                 # Extension popup UI (HTML, CSS, JS)
├── icons/                 # Extension icons (SVG and PNG)
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── manual/            # Manual test scenarios
├── scripts/               # Build and utility scripts
│   ├── build.js           # Main build script
│   ├── package.js         # Package creation script
│   └── generate-icons.js  # Icon generation
├── manifest.json          # Extension manifest (Manifest V3)
└── package.json           # NPM configuration
```

Key files to understand:
- `src/background/service-worker.js` - Background script handling API calls and watchlist
- `src/content/content.js` - Content script for CA detection and badge injection
- `src/utils/scoring.js` - Safety score calculation logic
- `src/utils/api.js` - API integrations (GoPlus, RugCheck, Honeypot, DexScreener)
- `popup/popup.js` - Popup UI logic

## Pull Request Process

1. Ensure your code follows the project style
2. All tests must pass
3. Update documentation if needed
4. Request review from maintainers
5. Address review feedback
6. Once approved, maintainers will merge

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing!
