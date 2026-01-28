# Branch Protection Configuration Guide

This document explains the branch protection settings configured for this repository.

## Main Branch Protection

The main branch is protected with the following rules:

1. **Require pull request reviews before merging**
   - Required number of approvals: 1
   - Dismiss stale pull request approvals when new commits are pushed: Enabled
   - Require review from Code Owners: Enabled (if CODEOWNERS file exists)

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: Enabled
   - Status checks required: (configure based on your CI/CD setup)

3. **Require conversation resolution before merging**: Enabled

4. **Require signed commits**: Optional (recommended for security)

5. **Require linear history**: Optional

6. **Include administrators**: Enabled (applies rules to admins too)

7. **Restrict who can push to matching branches**: Only repository administrators

8. **Allow force pushes**: Disabled

9. **Allow deletions**: Disabled

## How to Configure

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Click on "Branches" in the left sidebar
4. Under "Branch protection rules", click "Add rule"
5. In "Branch name pattern", enter: `main`
6. Configure the settings as described above
7. Click "Create" to save the rule

## Result

With these settings:
- No one can push directly to main branch
- All changes must go through Pull Requests
- Pull Requests require your approval before merging
- Force pushes and branch deletion are prevented
- Even administrators must follow these rules
