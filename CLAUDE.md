# CLAUDE.md - Project Configuration for Claude Code

## Project Overview

This project uses **Claude Flow** for AI-driven development with the **SPARC Methodology**.

## Development Workflow

### 1. Understanding the Project

Before making changes, read these documents:

1. **[Specification](docs/design/SPECIFICATION.md)** - Project requirements and goals
2. **[Architecture](docs/design/ARCHITECTURE.md)** - Technical design and patterns
3. **[API Specification](docs/specs/API.md)** - API endpoints and contracts

### 2. Development Process

This project follows **Test-Driven Development (TDD)**:

1. **Write tests first** - Create test cases before implementation
2. **Implement** - Write code to pass the tests
3. **Refactor** - Improve code quality while keeping tests green

### 3. Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches (created from `develop`)
- `fix/*` - Bug fix branches

### 4. Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write JSDoc comments for public APIs
- Maintain >80% test coverage

## Claude Flow Integration

### Auto-Development

Issues labeled with `auto-develop` will be automatically implemented by Claude Flow.

### Commands

```bash
# Run development workflow
npx claude-flow@alpha swarm "task description" --agents "planner,coder,tester"

# Run code review
npx claude-flow@alpha swarm "review code" --agents "security-auditor,code-reviewer"

# Initialize with verification
npx claude-flow@alpha init --verify
```

### Configuration

See `.claude-flow/config.json` for project-specific settings.

## Directory Structure

```
.
├── .claude-flow/          # Claude Flow configuration
│   ├── config.json        # Main configuration
│   └── workflows/         # Custom workflows
├── .github/
│   ├── workflows/         # GitHub Actions
│   └── ISSUE_TEMPLATE/    # Issue templates
├── docs/
│   ├── design/            # Design documents (SPARC)
│   ├── specs/             # Technical specifications
│   └── tasks/             # Task tracking
├── src/                   # Source code
└── tests/                 # Test files
```

## Key Files

| File | Purpose |
|:---|:---|
| `docs/design/SPECIFICATION.md` | Project requirements |
| `docs/design/ARCHITECTURE.md` | Technical architecture |
| `docs/specs/API.md` | API specification |
| `.claude-flow/config.json` | Claude Flow settings |

## Important Notes

1. **Always read design docs** before implementing features
2. **Follow TDD** - Tests first, then implementation
3. **Use meaningful commit messages** following conventional commits
4. **Create PRs against `develop`**, not `main`
5. **Run tests locally** before pushing

## Getting Help

- Check existing documentation in `docs/`
- Review similar implementations in the codebase
- Ask for clarification if requirements are unclear
