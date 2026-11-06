# Build 4 API examples

Start the server with `npm start`. The examples use `localhost:3000`; replace
the example `x-user-id` values with your own identifiers.

## Create an event

```bash
curl -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{"title":"Banjul Tech Meetup","city":"Banjul","venue":"Arch 22 Hall","startsAt":"2026-12-05T17:00:00.000Z"}'
```

Save the returned `event.id` as `EVENT_ID`.

## Add a ticket tier

```bash
curl -X POST "http://localhost:3000/api/events/$EVENT_ID/tiers" \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{"name":"General","priceCents":2500,"capacity":100}'
```

Save the returned `tier.id` as `TIER_ID`.

## Publish the event

```bash
curl -X POST "http://localhost:3000/api/events/$EVENT_ID/publish" \
  -H 'x-user-id: organizer-1'
```

## Unpublish the event

```bash
curl -X POST "http://localhost:3000/api/events/$EVENT_ID/unpublish" \
  -H 'x-user-id: organizer-1'
```

Publish it again before continuing with the search and booking examples.

## Search, filter and sort published events

```bash
curl 'http://localhost:3000/api/events?q=tech&city=banjul&from=2026-12-01&to=2026-12-05&maxPriceCents=3000&onlyAvailable=true&sortBy=price'
```

Run the publish example again before booking if you just ran the unpublish call.

## Book tickets

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d "{\"tierId\":\"$TIER_ID\",\"quantity\":2}"
```

Save the returned `booking.reference` as `BOOKING_REFERENCE`.

## Pay for a booking

Mock success:

```bash
curl -X POST "http://localhost:3000/api/bookings/$BOOKING_REFERENCE/pay" \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d '{"decline":false}'
```

To simulate a decline and leave the booking pending, send `{"decline":true}`.
The gateway receives only the amount and decline flag, never card details.

## Cancel an unpaid booking

Create another booking first, then cancel its reference before paying:

```bash
curl -X POST "http://localhost:3000/api/bookings/$UNPAID_BOOKING_REFERENCE/cancel" \
  -H 'x-user-id: attendee-1'
```
