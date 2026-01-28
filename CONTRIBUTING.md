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
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Style

- Use ES6+ JavaScript
- Follow existing code formatting
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Project Structure

- `src/` - Source code
  - `background/` - Service worker
  - `content/` - Content scripts
  - `utils/` - Shared utilities
  - `styles/` - CSS files
- `popup/` - Extension popup UI
- `tests/` - Test files
- `scripts/` - Build scripts
- `icons/` - Extension icons

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
