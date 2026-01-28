# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities by emailing: svtcontactus@gmail.com

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please email us and include the following information:

- Type of issue (e.g., XSS, CSRF, data leak)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

We will acknowledge receipt of your report within 48 hours and provide a more detailed response within 7 days indicating the next steps in handling your report.

## Security Best Practices

Safe CA follows security best practices:

- All API communications use HTTPS
- No sensitive data is stored or transmitted
- Content Security Policy (CSP) is enforced
- Minimal permissions requested
- Regular dependency updates
- Code reviews for all changes

Thank you for helping keep Safe CA and our users safe!
