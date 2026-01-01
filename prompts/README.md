# Prompts Directory

This directory contains templates for generating project artifacts using Manus.

## Files

| File | Purpose |
|:---|:---|
| `PROJECT_KICKOFF_TEMPLATE.md` | User-facing template to fill out project details |
| `MANUS_OUTPUT_INSTRUCTIONS.md` | Instructions for Manus on how to generate artifacts |

## How to Use

### Step 1: Fill Out the Template

1. Copy `PROJECT_KICKOFF_TEMPLATE.md`
2. Fill in all required sections
3. Optionally fill in advanced details

### Step 2: Send to Manus

Send the filled template to Manus with the following prompt:

```
Please generate all project artifacts based on the following kickoff template.
Follow the instructions in MANUS_OUTPUT_INSTRUCTIONS.md.

[Paste your filled template here]
```

### Step 3: Apply Generated Artifacts

1. Copy `SPECIFICATION.md` to `docs/design/SPECIFICATION.md`
2. Copy `ARCHITECTURE.md` to `docs/design/ARCHITECTURE.md`
3. Copy `API.md` to `docs/specs/API.md`
4. Create GitHub Issues using the provided definitions
5. Copy `TASK_BREAKDOWN.md` to `docs/tasks/TASK_BREAKDOWN.md`

### Step 4: Start Development

1. Ensure `ANTHROPIC_API_KEY` is set in repository secrets
2. Add `auto-develop` label to Issue #1
3. Claude Flow will automatically start development

## Example Workflow

```
User fills template
       ↓
Manus generates artifacts
       ↓
User copies artifacts to repo
       ↓
User creates GitHub Issues
       ↓
User adds auto-develop label to first issue
       ↓
Claude Flow starts automatic development
       ↓
PR created → User reviews → Merge
       ↓
Next issue automatically triggered
```
