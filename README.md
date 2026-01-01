# Claude Flow Project Template

> AI-Driven Development with SPARC Methodology

[![CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci-cd.yml)
[![Auto Develop](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/auto-develop.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/auto-develop.yml)

## Overview

This template provides a complete setup for AI-driven development using [Claude Flow](https://github.com/ruvnet/claude-flow) and the SPARC Methodology.

### Features

- 🤖 **Auto-Development**: Issues labeled `auto-develop` are automatically implemented
- 🔍 **AI Code Review**: Automatic code review on every PR
- 🔒 **Security Scanning**: Daily automated security scans
- 📋 **SPARC Methodology**: Structured design documents
- 🚀 **CI/CD Pipeline**: Automated testing, building, and deployment

## Quick Start

### 1. Use This Template

Click "Use this template" to create a new repository.

### 2. Configure Secrets

Add the following secrets to your repository:

| Secret | Description |
|:---|:---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude Flow |

### 3. Update Configuration

1. Edit `.claude-flow/config.json` with your project details
2. Update `docs/design/SPECIFICATION.md` with your requirements
3. Update `docs/design/ARCHITECTURE.md` with your design

### 4. Start Development

Create an issue with the `auto-develop` label, and Claude Flow will automatically:

1. Create a feature branch
2. Implement the feature
3. Create a Pull Request
4. Request review

## Project Structure

```
.
├── .claude-flow/              # Claude Flow configuration
│   ├── config.json            # Main configuration
│   └── workflows/             # Custom workflows
├── .github/
│   ├── workflows/             # GitHub Actions
│   │   ├── auto-develop.yml   # Auto-development workflow
│   │   ├── code-review.yml    # AI code review
│   │   ├── ci-cd.yml          # CI/CD pipeline
│   │   └── daily-security-scan.yml
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   └── PULL_REQUEST_TEMPLATE/ # PR templates
├── docs/
│   ├── design/                # Design documents
│   │   ├── SPECIFICATION.md   # Project requirements
│   │   └── ARCHITECTURE.md    # Technical architecture
│   ├── specs/                 # Technical specifications
│   │   └── API.md             # API specification
│   └── tasks/                 # Task tracking
├── src/                       # Source code
├── tests/                     # Test files
├── CLAUDE.md                  # Claude Code configuration
└── README.md                  # This file
```

## Workflows

### Auto-Development (`auto-develop.yml`)

Triggered when an issue is labeled with `auto-develop`:

1. Creates a feature branch from `develop`
2. Runs Claude Flow swarm with planner, architect, coder, tester, and reviewer agents
3. Commits changes and creates a PR
4. Comments on the original issue

### Code Review (`code-review.yml`)

Triggered on every PR to `develop` or `main`:

1. Analyzes changed files
2. Runs security, performance, and code quality checks
3. Posts review comments on the PR

### CI/CD (`ci-cd.yml`)

Triggered on push and PR:

1. Runs linting and tests
2. Builds the project
3. Deploys to staging (on `develop` push)
4. Deploys to production (on `main` push)

### Security Scan (`daily-security-scan.yml`)

Runs daily at 8:00 UTC:

1. Analyzes codebase for vulnerabilities
2. Checks dependencies for CVEs
3. Creates an issue if problems are found

## SPARC Methodology

This template follows the **SPARC** methodology:

| Phase | Document | Description |
|:---|:---|:---|
| **S**pecification | `SPECIFICATION.md` | Define requirements and goals |
| **P**seudocode | `ARCHITECTURE.md` | Design technical architecture |
| **A**rchitecture | `ARCHITECTURE.md` | Document design decisions |
| **R**efinement | Code Review | Iterate and improve |
| **C**ompletion | Deployment | Ship to production |

## Development Guide

### Creating a Feature

1. Create an issue using the "Feature Request" template
2. Add the `auto-develop` label
3. Wait for Claude Flow to create a PR
4. Review and merge

### Manual Development

1. Create a branch from `develop`: `git checkout -b feature/my-feature`
2. Make changes following TDD
3. Push and create a PR
4. Wait for AI code review
5. Address feedback and merge

### Running Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Build
npm run build
```

## Configuration

### Claude Flow (`config.json`)

```json
{
  "swarm": {
    "defaultStrategy": "parallel",
    "maxAgents": 10
  },
  "verification": {
    "enabled": true,
    "threshold": 0.95
  }
}
```

See `.claude-flow/config.json` for full configuration options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT License - See [LICENSE](LICENSE) for details.

---

*Powered by [Claude Flow](https://github.com/ruvnet/claude-flow)*
