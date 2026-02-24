---
name: off-market-hunter
description: Specialized real estate deal-finding for NYC and Newark. Focuses on (1) Probate/Estates via Surrogate Court, (2) Distressed/Violations (HPD/DOB/Code Enforcement), and (3) Absentee Owners. Use when searching for high-probability off-market deals or analyzing owner motivation.
---

# Off-Market Hunter

This skill provides a structured workflow for identifying and analyzing off-market real estate deals in the NYC and Newark markets.

## Core Strategy: The Triad of Motivation

We target property owners based on three primary psychological and financial signals:

1. **Inheritance Friction (Probate):** Families inheriting property without a clear plan/will.
2. **Physical/Legal Friction (Distressed):** Owners overwhelmed by violations, fines, or maintenance.
3. **Operational Friction (Absentee):** Out-of-state owners who view the property as a remote liability.

## Workflow

### 1. Source Discovery

Before searching, consult [references/sources.md](references/sources.md) for the specific URLs and portals for each data type (NYC vs. Newark).

### 2. Search & Filter

When the user asks for a "Leads List" or "Deal Hunt":

- **Priority 1 (Probate):** Search WebSurrogate (NYC) or Essex Surrogate (NJ). Focus on "Administration" petitions.
- **Priority 2 (Distressed):** Query HPD/DOB for Class C violations or Newark Open Data for structural code issues.
- **Priority 3 (Absentee):** Identify properties where the billing address is outside the Tri-State area.

### 3. Data Extraction

When data is retrieved, format it into a table with the following columns:

- **Address** (Street, Borough/City)
- **Signal Type** (Probate, Violation, Absentee, Institutional)
- **Owner Name** (or LLC)
- **Details** (e.g., "5 Open Class C Violations," "Executor: John Doe")
- **Badger Score (1-10)**:
  - 10: Multi-signal (e.g., Absentee owner AND 10 Violations).
  - 7: Single strong signal (e.g., Recent Probate petition).
  - 4: Weak/Broad signal (e.g., Simple price drop).

### 4. Strategic Logic (Honey Badger Style)

Do not just provide data; provide **insight**.

- If a property has high violations AND an absentee owner, tag it as a "High-Heat Strike."
- If it's a probate case in a high-growth Newark Opportunity Zone, highlight it as a "Strategic Hold."

## Example Commands

- "Search for recent probate filings in Newark West Ward."
- "Find absentee owners in Brooklyn with more than 3 building violations."
- "Analyze 786-794 S 20th St for institutional exit signals."
