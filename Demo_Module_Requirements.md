# Demo Module Requirements

## Objective
Create a top-level `Demo` module accessible to all users to showcase ongoing initiatives and support presentation-ready walkthroughs.

## Access and Navigation
- Add `Demo` as a top-level sidebar item.
- All users can view, create, edit, and soft-delete initiatives.

## Core Entities

### Initiative
Each initiative contains:
- Title
- Stage (`Concept`, `POC`, `POV`, `Production`, `Paused`, `Cancelled`)
- Narrative (combined problem statement + solution hypothesis, markdown)
- Target user groups (multi-select tags, free text)
- Demo setup instructions (markdown)
- Slides (up to 15)

### Slide
Each slide contains:
- Title
- Description (markdown)
- Media
  - Image/GIF: upload to storage only
  - Video: uploaded MP4 or external URL

## Functional Requirements

### Gallery/List Page
- Route: `/demo`
- Default sort: newest updated first.
- Search across:
  - Initiative title
  - Initiative narrative
  - Initiative description/setup content
  - Slide title
  - Slide description
- Dedicated card/list experience (no dashboard requirement).

### Initiative Detail Page
- Route: `/demo/[id]`
- Show initiative metadata, markdown sections, and slideshow.
- Includes actions for edit, delete (soft delete), and present mode.

### Present Mode
- Entered only from initiative detail page.
- Dedicated present experience route is allowed, but entry point must remain the detail page action.

### Create/Edit Experience
- Provide page(s) to input and manage all initiative and slide details.
- Data is immediately visible after save (no draft/publish state).

### Deletion
- Use soft delete behavior for initiatives.

## Upload Constraints
- Maximum slides per initiative: 15
- Maximum image/GIF size: 10 MB
- Maximum video (MP4) size: 100 MB

## Delivery Priorities

### Must-have (V1)
1. Browse list + open detail
2. Create/edit form
3. Slide media support (storage uploads + video URL for videos)

### Nice-to-have (V1.1)
1. Extended search/filter enhancements
2. Present mode polish

## Notes
- Target user groups are not tied to existing org/group entities.
- Stage history/timeline is out of scope; only current stage is required.
