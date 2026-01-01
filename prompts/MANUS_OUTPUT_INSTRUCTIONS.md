# Manus Output Instructions

> **For Manus**: When a user provides a filled-out PROJECT_KICKOFF_TEMPLATE, generate the following artifacts.

---

## Required Outputs

### 1. SPECIFICATION.md

Generate a complete specification document following this structure:

```markdown
# Specification Document

## 1. Project Overview

### 1.1. Project Name
[From user input]

### 1.2. Description
[Expanded from user's summary]

### 1.3. Goals
[Derived from features and summary]

### 1.4. Non-Goals
[Explicitly state what is out of scope]

## 2. Requirements

### 2.1. Functional Requirements
| ID | Requirement | Priority | Status |
|:---|:---|:---:|:---:|
| FR-001 | [Derived from features] | High/Medium/Low | Pending |
...

### 2.2. Non-Functional Requirements
| ID | Requirement | Target | Status |
|:---|:---|:---|:---:|
| NFR-001 | [From user input or defaults] | [Specific target] | Pending |
...

## 3. Constraints
[From user input or reasonable defaults]

## 4. Success Criteria
[Derived from requirements]

## 5. Stakeholders
[Default: Product Owner, Tech Lead, Developers]
```

---

### 2. ARCHITECTURE.md

Generate a technical architecture document:

```markdown
# Architecture Document

## 1. System Overview

### 1.1. High-Level Architecture
[ASCII diagram showing main components]

### 1.2. Component Diagram
[Describe each component and its responsibility]

## 2. Technology Stack

### 2.1. Frontend
| Technology | Version | Purpose |
|:---|:---|:---|
| [From user input or auto-selected] | [Latest stable] | [Purpose] |

### 2.2. Backend
[Same format]

### 2.3. Infrastructure
[Same format]

## 3. Design Patterns
[Recommend appropriate patterns based on the project]

## 4. Data Architecture

### 4.1. Data Model
[Entity relationship diagram or description]

### 4.2. Database Schema
[Key tables and relationships]

## 5. API Design

### 5.1. API Overview
[RESTful/GraphQL, versioning strategy]

### 5.2. Key Endpoints
[List main endpoints]

## 6. Security Architecture
[Authentication, authorization, data protection]

## 7. Deployment Architecture
[Environments, CI/CD pipeline]

## 8. Architectural Decision Records (ADRs)
[Key decisions with rationale]
```

---

### 3. API.md (If applicable)

Generate API specification:

```markdown
# API Specification

## 1. Overview
- Base URL
- Authentication method
- Response format
- Error format

## 2. Endpoints

### [Resource Name]

#### GET /api/v1/[resource]
- Description
- Query Parameters
- Response

#### POST /api/v1/[resource]
- Description
- Request Body
- Response

[Continue for all CRUD operations and custom endpoints]

## 3. Error Codes
[Standard error codes and descriptions]

## 4. Rate Limiting
[If applicable]
```

---

### 4. GitHub Issues

Generate a set of GitHub Issues for the initial development phase. Each issue should follow this format:

```markdown
---
title: "[Type]: [Short description]"
labels: ["auto-develop", "enhancement|bug|task", "priority:high|medium|low"]
---

## Description

[Clear description of what needs to be done]

## Acceptance Criteria

- [ ] [Specific, testable criterion]
- [ ] [Another criterion]
- [ ] Tests pass with adequate coverage
- [ ] Code reviewed and approved

## Technical Notes

[Any technical guidance or constraints]

## Dependencies

- Depends on: #[issue number] (if any)

## Estimated Complexity

[Small | Medium | Large | XL]
```

**Issue Generation Rules**:

1. **Start with foundational issues**:
   - Project setup / scaffolding
   - Database schema creation
   - Authentication system

2. **Then core features**:
   - One issue per major feature
   - Break large features into sub-issues

3. **Finally, supporting features**:
   - UI polish
   - Error handling
   - Documentation

4. **Dependency ordering**:
   - Clearly mark dependencies between issues
   - Ensure no circular dependencies

5. **Labeling**:
   - All issues get `auto-develop` label
   - Add appropriate type label (enhancement, bug, task)
   - Add priority label

---

### 5. TASK_BREAKDOWN.md

Generate a task breakdown document that maps issues to a development timeline:

```markdown
# Task Breakdown

## Phase 1: Foundation (Week 1)

| Issue | Title | Dependencies | Assignee |
|:---|:---|:---|:---|
| #1 | Project Setup | None | CC |
| #2 | Database Schema | #1 | CC |
| #3 | Authentication | #1, #2 | CC |

## Phase 2: Core Features (Week 2-3)

| Issue | Title | Dependencies | Assignee |
|:---|:---|:---|:---|
| #4 | [Feature 1] | #3 | CC |
| #5 | [Feature 2] | #3 | CC |
...

## Phase 3: Polish & Testing (Week 4)

| Issue | Title | Dependencies | Assignee |
|:---|:---|:---|:---|
| #N | Integration Testing | All core features | CC |
| #N+1 | Documentation | All features | CC |
...

## Dependency Graph

```
#1 (Setup)
  ├── #2 (Database)
  │     └── #3 (Auth)
  │           ├── #4 (Feature 1)
  │           └── #5 (Feature 2)
  ...
```
```

---

## Output Checklist

Before delivering, ensure:

- [ ] SPECIFICATION.md is complete with all sections
- [ ] ARCHITECTURE.md includes diagrams and technology decisions
- [ ] API.md covers all necessary endpoints (if applicable)
- [ ] GitHub Issues are properly formatted with labels
- [ ] TASK_BREAKDOWN.md shows clear dependency order
- [ ] All issues have `auto-develop` label
- [ ] No circular dependencies in task breakdown
- [ ] MVP features are clearly identified
- [ ] Technical stack is explicitly defined

---

## Delivery Format

Provide the output in the following structure:

```
## Generated Artifacts

### 1. SPECIFICATION.md
[Full content]

### 2. ARCHITECTURE.md
[Full content]

### 3. API.md
[Full content]

### 4. GitHub Issues

#### Issue #1: [Title]
[Content]

#### Issue #2: [Title]
[Content]

...

### 5. TASK_BREAKDOWN.md
[Full content]

---

## Next Steps

1. Copy each artifact to the appropriate location in your repository
2. Create GitHub Issues using the provided definitions
3. Set up required secrets (ANTHROPIC_API_KEY)
4. Start development by adding `auto-develop` label to Issue #1
```
