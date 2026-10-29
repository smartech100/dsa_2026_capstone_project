# Build 2: Event search, sorting, backlog, first tests

*Week 5 of the course. Starts from the finished state of Build 1.*

**You deliver:** search and filter events by text, city, date range and price; sort by date, price or availability using a merge sort you write yourself; the backlog written as user stories; your first automated tests.

**You practise:** sorting algorithms, stability, Big O, Agile and Scrum, writing user stories with acceptance criteria.

**Done when**
- Search, filter and sort work and never change the original list.
- Every user story you are building has acceptance criteria.
- `npm test` runs and passes.

## User stories in this build

### S02: As an organizer, I want to create an event with title, city, venue and date, so that people can find it

- **Given** an organizer
  **When** they create an event with a title, city, venue and a valid date
  **Then** the event is saved as a draft with a new id, and it is not on the public list.
- **Given** a missing title or city, or a date that is not a real date
  **When** the organizer creates the event
  **Then** the request is rejected with `VALIDATION` and nothing is saved.

### S03: As an organizer, I want to add ticket tiers with a price and capacity, so that I can sell different kinds of ticket

- **Given** a draft event
  **When** the organizer adds a tier "General" at 500000 bututs (GMD) with capacity 100
  **Then** the tier is saved with 0 sold and 100 seats left.
- **Given** any event
  **When** the price is not a whole number, or the capacity is less than 1
  **Then** the request is rejected with `VALIDATION`.
- **Given** an event id that does not exist
  **When** the organizer adds a tier
  **Then** the request is rejected with `NOT_FOUND`.

### S04: As an organizer, I want to publish and unpublish an event, so that I control when it goes public

# Publish an Event
**Given** the organizer has created an event with all required information.
**When** the organizer clicks the publish button.
**Then** the event status changes to published and the event becomes publicly visible.
# Unpublish an Event
**Given** the event is currently published.
**When** the organizer clicks the unpublish button.
**Then** the event status changes to unpublished and the event is no longer publicly visible.
# Control event visibility
**Given** the event is unpublished.
**When** a public user attempts to view the event.
**Then** the event is not accessible through public event listings or its public event page.

### S05: As an attendee, I want to search, filter and sort published events, so that I can find one I like

- **Given** events titled "Banjul Tech Meetup" and "Serekunda Jazz Night"
  **When** the attendee searches for "JAZZ"
  **Then** only Serekunda Jazz Night is returned.
- **Given** events in Banjul and Serekunda
  **When** the attendee filters by city "banjul"
  **Then** only the Banjul events are returned, whatever the capital letters.
- **Given** events with different prices
  **When** the attendee sets a maximum price and sorts by price
  **Then** only events whose cheapest tier is within the maximum are returned, cheapest first, and events with no tiers are left out.
- **Given** two events on the same day
  **When** the attendee sorts by date
  **Then** the earlier one comes first, and the two events on the same day stay in title order.
- **Given** an event at 5 PM on 5 December
  **When** the attendee filters up to the date 2026-12-05
  **Then** that event is included.
- **Given** a bad date, a price that is not a whole number, or an unknown sort option
  **When** the attendee searches
  **Then** the request is rejected with `VALIDATION`.
- **Given** any list of events
  **When** it is searched, filtered or sorted
  **Then** the original list is unchanged.

### S06: As an attendee, I want to book a number of tickets from a tier, so that I get a place

- **Given** a published event with 3 seats left in General
  **When** an attendee books 2
  **Then** a pending booking is created for 2 seats, priced in whole bututs (cents field), and 1 seat is left.
- **Given** 1 seat left
  **When** an attendee books 2
  **Then** the booking is rejected with `SOLD_OUT` and nothing changes.
- **Given** any tier
  **When** the quantity is 0, negative, fractional or more than 10
  **Then** the request is rejected with `VALIDATION`.

### S16: As a team, I want to run automated tests on every push, so that we notice breakage early

- **Given** the project
  **When** someone runs `npm test`
  **Then** every test runs and the command fails if any test fails. (Build 2)
- **Given** a push to GitHub
  **When** the workflow runs
  **Then** `npm test` runs automatically, and a failing test shows as a failed check. (Build 9)

## Localisation note

This build uses two Gambian cities (Banjul and Serekunda) and Gambian dalasi stored as whole bututs in the `priceCents` / `*Cents` fields (1 GMD = 100 bututs), matching the course rule that money is whole numbers of the smallest unit.
