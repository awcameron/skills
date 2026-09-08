# Mermaid diagram examples, by TDD use case

One minimal, valid snippet per diagram type from the Diagram Selection Matrix (`SKILL.md` step 6).
Use these as syntax scaffolding, not literal content -- swap in the design's actual
components/actors/states/entities.

## System Architecture / Component Breakdown -- `flowchart`

```mermaid
flowchart LR
    Client[Client] --> Gateway[API Gateway]
    Gateway --> Service[Application Service]
    Service --> DB[(Relational Database)]
    Service --> Cache[(In-Memory Cache)]
    Service --> Queue[[Message Bus]]
```

## Data Flow / Request Lifecycles -- `sequenceDiagram`

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant S as Application Service
    participant D as Database

    C->>G: POST /orders
    G->>S: forward request
    S->>D: INSERT order
    D-->>S: order id
    S-->>G: 201 Created
    G-->>C: order id
```

## State Transitions / Job Lifecycles -- `stateDiagram-v2`

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing: worker picks up job
    Processing --> Completed: success
    Processing --> Failed: error
    Failed --> Pending: retry
    Completed --> [*]
```

## Data Models / Entity Relationships -- `erDiagram`

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
        string id
        string email
    }
    ORDER {
        string id
        string user_id
        string status
    }
```

**Node/label conventions**: use descriptive identifiers (`Gateway`, not `A`), keep edge labels
short (a verb phrase, e.g. `validates`, `publishes to`), and prefer one diagram per concern over a
single mega-diagram that tries to show architecture, data flow, and state all at once.
