# NYC & Newark Off-Market Data Sources

This reference documents the primary digital hubs for finding probate, distressed, and absentee property data in the target regions.

## 1. Probate & Estates (Surrogate's Court)

Identify inherited properties where the family may be looking for a quick cash exit.

- **NYC Surrogate's Court (WebSurrogate):** [https://websurrogate.nycourts.gov/](https://websurrogate.nycourts.gov/)
  - _Data:_ Petitions for Letters of Administration, Probate proceedings.
  - _Search Strategy:_ Filter by recent dates and "Administration" (typically indicates no will, higher urgency).
- **New Jersey Probate (Essex County):** [https://www.essexsurrogate.com/](https://www.essexsurrogate.com/)
  - _Data:_ Search by "Decedent Name" or "Date of Death".

## 2. Distressed & Violations (Public Records)

Identify properties that are physically or legally "bleeding" and costing the owner money.

- **NYC HPD (Housing Preservation & Development):** [https://www1.nyc.gov/site/hpd/about/hpd-online.page](https://www1.nyc.gov/site/hpd/about/hpd-online.page)
  - _Signal:_ Class C (Immediate Emergency) violations, multiple open violations, or "Heat/Hot Water" complaints.
- **NYC DOB (Department of Buildings):** [https://www1.nyc.gov/site/buildings/index.page](https://www1.nyc.gov/site/buildings/index.page)
  - _Signal:_ "Stop Work Orders," "Unsafe Building" notices, or multiple "Work Without a Permit" violations.
- **Newark Open Data / Property Violations:** [https://data.ci.newark.nj.us/](https://data.ci.newark.nj.us/)
  - _Signal:_ Code enforcement violations and structural complaints.

## 3. Absentee & Ownership (Property Tax/Deed)

Identify owners who do not live at the property (friction) or have significant tax arrears.

- **NYC ACRIS (Automated City Register Information System):** [https://a836-acris.nyc.gov/CP/](https://a836-acris.nyc.gov/CP/)
  - _Data:_ Deeds, Mortgages, Lis Pendens (Pre-foreclosure notices).
- **NYC DOF (Department of Finance) Tax Portal:** [https://www1.nyc.gov/site/finance/taxes/property.page](https://www1.nyc.gov/site/finance/taxes/property.page)
  - _Data:_ Tax lien sale lists (The "Gold Mine" for distress).
- **NJ Property Tax Search (New Jersey County Tax Boards):** [https://www.njactb.gov/](https://www.njactb.gov/)
  - _Signal:_ Check for "Owner Address" vs. "Property Address" (Absentee).

## 4. Institutional Exits & Large Scale

- **PropStream / Reonomy (Paid/Proprietary):** If API access is available, use to filter for "Cash Buyers" or "Long-term LLC Holds."
- **Zillow/Redfin "Price Drops":** Secondary signal for institutional "dumping" or failed listings.
