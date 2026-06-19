# Meeting Coordinator — Domain Glossary

## Meeting
A single calendar event with a room, time, participants, chairman, and coordinator.

## Meeting Series
A recurring set of Meetings sharing the same recurrence config (frequency, days-of-week, end rule). Represented in DB as `meeting_series`. Individual instances are `meetings` rows with a `series_id`.

## Recurrence Config
Parameters that define a series schedule:
- **Frequency**: `daily` | `weekly` | `bi-weekly` | `monthly`
- **Days of Week**: subset of `['Su','M','T','W','Th','F','Sa']` — required for weekly/bi-weekly
- **Start Date**: first possible occurrence date
- **End Rule**: `never` | `count` (N occurrences) | `date` (until YYYY-MM-DD)

## Occurrence
A single date generated from a Recurrence Config. Not the same as a Meeting instance until a series is actually created.

## Room Booking
Reservation of a physical room for a specific Meeting instance. For a series, each instance gets its own room booking — instances with conflicts get **no** room booking (omitted, not blocked).

## Availability Slot
A contiguous free block in a room's calendar for a given date and duration. Returned by `find_available_slots`.

## AI Booking Assistant
The Gemini-powered chat interface at `/assistant`. Helps users find available rooms and generates pre-filled deep-links to the Schedule form. Does **not** create meetings directly.

## Booking Link
A deep-link to `/schedule` with URL params that pre-fill the Schedule form. For one-off meetings: `room`, `date`, `time`, `endTime`. For recurring series: additionally `recurring=true`, `frequency`, `days`, `endRule`, `endDate`/`endCount`.

## Conflict (Recurring)
An occurrence date where the requested room is already booked at the requested time. The series is still created but that instance has no room booking.
