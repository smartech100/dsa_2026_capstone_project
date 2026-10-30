# Build 3 architecture

## Architecture flow

```mermaid
flowchart TB
  users[Attendee, organizer, or staff]

  subgraph presentation["Presentation layer"]
    direction TB
    http[HTTP server] --> routes[Routes]
  end

  subgraph application["Application layer"]
    services[Services]
  end

  subgraph business["Domain layer"]
    direction LR
    inventory[Event and ticket inventory]
    lifecycle[Booking state machine]
  end

  subgraph persistence["Persistence layer"]
    repositories[Repositories] --> data[(SQLite database)]
  end

  users --> http
  routes --> services
  services --> inventory
  services --> lifecycle
  services --> repositories

  classDef actor fill:#e8f1ff,stroke:#2563eb,color:#172554
  classDef app fill:#ecfdf5,stroke:#059669,color:#064e3b
  classDef domain fill:#fff7ed,stroke:#ea580c,color:#7c2d12
  classDef storage fill:#f3e8ff,stroke:#9333ea,color:#581c87
  class users actor
  class http,routes,services app
  class inventory,lifecycle domain
  class repositories,data storage
```

The diagram shows the target layered design. The current Build 3 server has HTTP routing and domain rules; services, repositories, and SQLite are introduced in later builds.

- **Routes** translate HTTP requests and responses; they do not contain business rules or access data directly.
- **Services** coordinate domain rules and repositories; they do not depend on HTTP details or call routes.
- **Domain rules** validate and apply business rules; they do not perform I/O or depend on services, repositories, or routes.
- **Repositories** read and write data; they do not make business decisions or call services, rules, or routes.
- **Database** stores persisted data; it does not call application layers.

## Data model

```mermaid
erDiagram
  USERS ||--o{ EVENTS : organizes
  USERS ||--o{ BOOKINGS : makes
  EVENTS ||--o{ TICKET_TIERS : offers
  TICKET_TIERS ||--o{ BOOKINGS : booked_for

  USERS {
    string id PK
    string name
    string email UK
    string role "organizer, attendee, or staff"
  }
  EVENTS {
    string id PK
    string organizer_id FK
    string title
    string city
    string venue
    date date
    integer capacity "optional event-wide limit"
    integer seats_allocated
    string status
  }
  TICKET_TIERS {
    string id PK
    string event_id FK
    string name
    integer price_cents "whole smallest currency units"
    integer capacity
    integer seats_booked
  }
  BOOKINGS {
    string id PK
    string user_id FK
    string event_id FK
    string tier_id FK
    string reference UK
    integer quantity
    integer unit_price_cents
    integer total_price_cents
    string status
    datetime created_at
  }
```

An event has ticket tiers; a booking reserves seats from one tier. Prices and totals are stored as whole smallest currency units, not decimals. `seats_booked` and `seats_allocated` track inventory usage; booking status follows the lifecycle below.

## Booking lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending : booking created
  pending --> paid : payment succeeds
  pending --> cancelled : attendee cancels
  paid --> checked_in : ticket scanned
  paid --> refunded : refund issued
  paid --> cancelled : attendee cancels
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]
```

Only the transitions shown are valid. `cancelled`, `refunded`, and `checked_in` are terminal states.
