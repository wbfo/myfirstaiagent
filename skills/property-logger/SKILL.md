---
description: log a property seen during field work
---

# Property Logger Skill

Use this skill to log properties identified during field work (e.g., driving around). It allows for recording the address, a description of the state (abandoned, land, etc.), and analyzing attached photos.

## Steps

1. **Identify the Property**: Note the address or GPS coordinates.
2. **Capture Visuals**: Take or review attached photos of the property.
3. **Analyze & Log**:
   - Use `read_browser_page` or search tools if ownership info is needed.
   - Log the entry in the property database (e.g., `PROPERTIES.md` or a dedicated tracking system).
4. **Initiate Workflow**: Based on the type (Acquisition vs. Management), trigger the appropriate next steps.

## Examples

- "I just saw an abandoned home at 123 Maple St. Here is a picture. Log it and check for tax liens."
- "Vacant land spotted at corner of Oak and 5th. No signage. Can you find the owner?"
