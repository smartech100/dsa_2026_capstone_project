AI prompt:  build1
 #I tooked the Instructor's build 1 ai prompt which includes
 creating files and 'module' in package.json
 
 #The following result came out:
 1.src/domain/errors.js
 2.src/domain/ids.js
 3.src/domain/waitlistQueue.js
 4.src/domain/inventory.js
 5.scripts/demo.js
 6.scripts/benchmark-lookup.js
 
 #Demo Evaluation of the expected output:
1. Event management
Pass — demonstrated
The demo displays the event name and its capacity of 3 seats.

2. Ticket tiers
Partial evidence
General Admission and its price of 2,500 cents are displayed. Multiple tiers and tier-specific capacity handling are not demonstrated.

3. Booking capacity rule
Pass — demonstrated
Ada books 2 tickets out of 3. Bayo's attempted booking is refused because only 1 ticket remains. This is strong evidence that overbooking is prevented.

4. FIFO waitlist
Partial evidence
Bayo joins before Fatou, and Bayo is identified as next in line after Ada cancels. This supports FIFO ordering, but we still need to verify whether Bayo is actually offered or allocated the newly available tickets.

5. Booking-reference lookup
Pass — basic demonstration
The reference 49UF-P6KM is used to find Ada's booking. The output confirms the lookup works for this example, but it doesn't prove the lookup is fast or uses an efficient data structure

6. Terminal-only execution
Pass — demonstrated
npm run demo executes a Node.js script from the terminal. No server or database is shown as necessary for this demo.

Benchmark-lookups explaination
Looking up 500 references among 100,000 bookings
Array.find(): Took 504.619 ms to find 500 bookings.

Map.get(): Took 0.358 ms to find the same 500 bookings.

Both methods successfully found all 500 bookings, but Map.get() was much faster because it can look up a booking directly using its reference code instead of searching through the array one booking at a time.
