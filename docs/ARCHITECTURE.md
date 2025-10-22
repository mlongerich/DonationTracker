# Architecture & Workflow Diagrams

*Visual representations of project structure, workflows, and development processes*

---

## Project Structure

### Directory Structure

```mermaid
flowchart TB
    A[DonationTracker/] --> B[docker-compose.yml<br/>Service orchestration]
    A --> C[donation_tracker_api/<br/>Rails API backend]
    A --> D[donation_tracker_frontend/<br/>React frontend]
    A --> E[scripts/<br/>Testing & validation]
    A --> F[DonationTracking.md<br/>Project specifications]
    A --> G[CLAUDE.md<br/>Development conventions]
    A --> H[tickets/<br/>Active work items]
    A --> I[BACKLOG.md<br/>Future features]

    C --> C1[app/models/<br/>Business logic models]
    C --> C2[spec/<br/>RSpec test suite]

    D --> D1[src/<br/>TypeScript source]
    D --> D2[src/api/client.ts<br/>Axios HTTP client]

    E --> E1[test-runner.sh<br/>Bash unit testing framework]
    E --> E2[check-documentation.sh<br/>Documentation reminder]
    E --> E3[pre-commit-backend.sh<br/>Backend quality gates]
    E --> E4[pre-commit-frontend.sh<br/>Frontend quality gates]
    E --> E5[test-*.sh<br/>Comprehensive test suite]

    H --> H1[README.md<br/>Ticket index]
    H --> H2[TICKET-XXX-*.md<br/>Individual tickets]
```

---

## Ticket & Task Management Workflow

```mermaid
flowchart LR
    A[New Feature Idea] --> B{Currently Working<br/>on Something Else?}
    B -->|Yes| C[Add to BACKLOG.md]
    B -->|No| D[Create ticket in<br/>tickets/ folder]
    C --> E[Run /compact]
    D --> F[Implement with TDD]
    F --> G[Update ticket<br/>mark complete]
    G --> H[Commit changes]
    H --> I[Auto /compact]
```

**Key Points:**
- **Context Persistence:** Tickets survive `/compact` (external files)
- **Clean Context:** Compact after logging backlog items to remove distractions
- **Async Feature Capture:** Don't lose ideas while focused on current work
- **Historical Record:** Track what was built and why
- **Claude Code Integration:** Use `/memory` to access ticket context

---

## TDD Workflow

```mermaid
flowchart LR
    A[🔴 RED<br/>Write ONE failing test] --> B[🟢 GREEN<br/>Minimal code to pass]
    B --> C[🔵 REFACTOR<br/>Improve code/tests]
    C --> D[All tests pass?]
    D -->|Yes| A
    D -->|No| E[🔧 Fix issues]
    E --> C

    style A fill:#ffcccc
    style B fill:#ccffcc
    style C fill:#ccccff
    style E fill:#fff2cc
```

**Strict TDD Rules:**
1. Write ONLY ONE test at a time
2. Test must fail for the right reason
3. Write minimal code to pass the test
4. Refactor only when all tests are passing
5. Repeat cycle for next test

---

## Vertical Slice Development

```mermaid
flowchart TD
    A[🎯 Choose Next Feature Slice] --> B[🔴 TDD: Model Tests]
    B --> C[🟢 Implement Model]
    C --> D[🔴 TDD: API Tests]
    D --> E[🟢 Implement API Endpoint]
    E --> F[🔴 TDD: Frontend Tests]
    F --> G[🟢 Implement React Component]
    G --> H[🔵 Integration Testing]
    H --> I[📋 Update Documentation]
    I --> J[✅ Feature Complete]
    J --> K[Deploy/Demo Feature]
    K --> A

    style A fill:#e1f5fe
    style B fill:#ffebee
    style C fill:#e8f5e8
    style D fill:#ffebee
    style E fill:#e8f5e8
    style F fill:#ffebee
    style G fill:#e8f5e8
    style H fill:#e3f2fd
    style I fill:#fff3e0
    style J fill:#e8f5e8
    style K fill:#f3e5f5
```

**Core Principle:** Build complete features one at a time through all layers rather than building all models, then all APIs, then all frontend components.

**Each Slice Includes:**
1. Model with validations and relationships
2. API endpoint with request/response handling
3. React component with forms/displays
4. Unit and integration tests at each layer
5. Documentation updates

**Benefits:**
- Faster feedback
- Risk reduction
- Immediate user value
- Easier debugging
- Clear completion criteria

---

## Pre-commit Hooks Flow

```mermaid
flowchart TD
    A[Developer commits code] --> B[Pre-commit hooks triggered]

    B --> C[Documentation Check]
    C --> C1{DonationTracking.md<br/>& CLAUDE.md updated?}
    C1 -->|No| C2[⚠️ Warning: Update docs]
    C1 -->|Yes| D[Backend Validation]

    D --> D1[RuboCop Linting]
    D1 --> D2[Brakeman Security]
    D2 --> D3[RSpec Tests]
    D3 --> D4{All backend<br/>checks pass?}

    D4 -->|No| F1[❌ Commit blocked]
    D4 -->|Yes| E[Frontend Validation]

    E --> E1[ESLint + Accessibility]
    E1 --> E2[Prettier Formatting]
    E2 --> E3[TypeScript Checks]
    E3 --> E4{All frontend<br/>checks pass?}

    E4 -->|No| F1
    E4 -->|Yes| F2[✅ Commit allowed]

    C2 --> D

    style C2 fill:#fff2cc
    style F1 fill:#ffcccc
    style F2 fill:#ccffcc
```

**Quality Gates:**
- Documentation updates (warning)
- RuboCop linting (blocking)
- Brakeman security scan (blocking)
- RSpec tests (blocking)
- ESLint + accessibility (blocking)
- Prettier formatting (blocking)
- TypeScript type checks (blocking)

---

## Service Architecture

### Containerized Development Environment

```mermaid
flowchart TB
    A[Docker Compose] --> B[PostgreSQL:5432<br/>Database]
    A --> C[Redis:6379<br/>Cache]
    A --> D[Rails API:3001<br/>Backend]
    A --> E[React:3000<br/>Frontend]

    D --> B
    D --> C
    E --> D

    style A fill:#e3f2fd
    style B fill:#c8e6c9
    style C fill:#fff9c4
    style D fill:#ffccbc
    style E fill:#b3e5fc
```

**Service Ports:**
- PostgreSQL: 5432
- Redis: 6379
- Rails API: 3001
- React Frontend: 3000

**Container Requirements:**
- Rails: Include build tools for native gems
- React: Use Node.js LTS with npm install
- Database: PostgreSQL 15-alpine
- Networking: All services communicate via service names

---

## Testing Strategy

### Testing Pyramid

```mermaid
flowchart TB
    A[E2E Tests<br/>Cypress<br/>Slow, Comprehensive]
    B[Integration Tests<br/>Request Specs, Component Tests<br/>Medium Speed]
    C[Unit Tests<br/>Model, Service, Component Tests<br/>Fast, Isolated]

    C --> B
    B --> A

    style A fill:#ffcccc
    style B fill:#fff9c4
    style C fill:#c8e6c9
```

**Coverage Targets:**
- **Unit Tests**: 90%+ (backend), 80%+ (frontend)
- **Integration Tests**: All API endpoints, component interactions
- **E2E Tests**: 100% of critical user flows

**Testing Philosophy:**
- Most tests at unit level (fast feedback)
- Integration tests for API contracts
- E2E tests for critical user journeys
- Run unit tests continuously
- Run E2E tests before commits

---

## Frontend Architecture

### Multi-Page Router Structure

```mermaid
flowchart TB
    A[BrowserRouter] --> B[Layout]
    B --> C[Navigation]
    B --> D[Outlet]

    D --> E[DonationsPage<br/>/donations]
    D --> F[DonorsPage<br/>/donors]
    D --> G[ProjectsPage<br/>/projects]
    D --> H[ChildrenPage<br/>/children]

    E --> E1[DonationList]
    E --> E2[DonationForm]

    F --> F1[DonorList]
    F --> F2[DonorForm]
    F --> F3[DonorMergeModal]

    G --> G1[ProjectList]
    G --> G2[ProjectForm]

    H --> H1[ChildList]
    H --> H2[ChildForm]
    H --> H3[SponsorshipModal]

    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#fff9c4
    style D fill:#c8e6c9
    style E fill:#ffccbc
    style F fill:#ffccbc
    style G fill:#ffccbc
    style H fill:#ffccbc
```

**Architecture Principles:**
- Each page manages its own state (useState, useEffect)
- No Context API until state sharing needed
- Clean URL-based routing
- Browser back/forward navigation support
- Lazy loading capability for future performance

---

## Data Flow

### API Request Flow

```mermaid
sequenceDiagram
    participant F as Frontend<br/>(React)
    participant A as Axios Client
    participant API as Rails API
    participant DB as PostgreSQL

    F->>A: Component calls API
    A->>API: HTTP Request
    API->>API: Controller processes
    API->>DB: ActiveRecord query
    DB-->>API: Data
    API->>API: Presenter formats JSON
    API-->>A: JSON Response
    A-->>F: Parsed data
    F->>F: Update state
    F->>F: Re-render
```

**Key Components:**
- **Axios Client**: Centralized HTTP client with interceptors
- **Controllers**: Thin layer, delegate to services
- **Presenters**: Format JSON responses
- **ActiveRecord**: ORM for database access
- **React State**: Component-level state management

---

## Deployment Architecture (Future)

```mermaid
flowchart TB
    A[Load Balancer] --> B[Frontend Instances]
    A --> C[API Instances]

    C --> D[PostgreSQL<br/>Primary]
    C --> E[Redis Cache]

    D --> F[PostgreSQL<br/>Replicas]

    G[CDN] --> B

    style A fill:#e3f2fd
    style B fill:#b3e5fc
    style C fill:#ffccbc
    style D fill:#c8e6c9
    style E fill:#fff9c4
    style F fill:#c8e6c9
    style G fill:#f3e5f5
```

**Production Considerations:**
- Horizontal scaling for API and frontend
- Database replication for read scalability
- Redis for caching and session storage
- CDN for static assets
- SSL/TLS encryption
- Automated backups

---

*Last updated: 2025-10-21*
