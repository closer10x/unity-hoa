import type {
  ArcApp, Booking, CalEvent, Community, Delinquent, Director, Doc, LegalCase,
  Meeting, Owner, Payment, Portfolio, Staff, Vendor, Violation, WorkOrder,
} from "./types";

/**
 * Representative sample data, not seed data. Replace with API calls.
 * The signed-in account; in production this comes from the session.
 */
export const CURRENT_USER = "Elena Cruz · community manager";

export const NAV = [
  { id: "dashboard", label: "Dashboard", group: "Today" },
  { id: "owners", label: "Owners", group: "People" },
  { id: "calendar", label: "Calendar", group: "Today" },
  { id: "accounting", label: "Accounting", badge: "12", group: "Money" },
  { id: "legal", label: "Legal & liens", badge: "4", group: "Money" },
  { id: "work", label: "Work orders", badge: "7", group: "Property" },
  { id: "arc", label: "Architectural", badge: "3", group: "Property" },
  { id: "violations", label: "Violations", badge: "5", group: "Property" },
  { id: "bookings", label: "Bookings", badge: "2", group: "Property" },
  { id: "vendors", label: "Vendors", group: "Property" },
  { id: "comms", label: "Communications", group: "People" },
  { id: "board", label: "Board & meetings", badge: "2", group: "People" },
  { id: "docs", label: "Documents", group: "Office" },
  { id: "portfolio", label: "Communities", group: "Office" },
  { id: "team", label: "Team", group: "Office" },
] as const;

export const NAV_GROUPS = ["Today", "Money", "Property", "People", "Office"] as const;

export const COMMUNITIES: Community[] = [
  { id: "sofi", name: "Sofi Lakes", location: "7880 Morrison Rd, Katy, Texas 77493", doors: "412 homes", dues: "$285.00", cadence: "Quarterly", stage: "Active", portfolio: "west" },
  { id: "cypress", name: "Cypress Reserve", location: "2104 Reserve Pkwy, Cypress, Texas 77433", doors: "188 homes", dues: "$310.00", cadence: "Quarterly", stage: "Active", portfolio: "west" },
  { id: "brookfield", name: "Brookfield Commons", location: "615 Brookfield Ln, Richmond, Texas 77406", doors: "76 townhomes", dues: "$140.00", cadence: "Monthly", stage: "Records transfer", portfolio: "south" },
];

export const PORTFOLIOS: Portfolio[] = [
  { id: "west", name: "West Houston", members: ["sofi", "cypress"] },
  { id: "south", name: "South Corridor", members: ["brookfield"] },
];

export const OWNERS: Owner[] = [
  { id: "o1", name: "Rafael Alvarez", address: "812 Lakeside Dr · Lot 118, Katy, Texas 77493", contact: "r.alvarez@example.com", balance: "$855.00", status: "Balance due", scope: "sofi", flag: "delinquent", account: "50118" },
  { id: "o2", name: "Karen Boyle", address: "1109 Willow Bend Ln · Lot 204, Katy, Texas 77493", contact: "(713) 555-0142", balance: "$0.00", status: "Current", scope: "sofi", flag: "current", account: "50204" },
  { id: "o3", name: "Samuel Okonkwo", address: "340 Cypress Reserve Way · Lot 12, Cypress, Texas 77433", contact: "s.okonkwo@example.com", balance: "$0.00", status: "Current", scope: "cypress", flag: "current", account: "60012" },
  { id: "o4", name: "Dana Whitfield", address: "77 Brookfield Ln · Unit 4B, Richmond, Texas 77406", contact: "d.whitfield@example.com", balance: "$280.00", status: "Tenant on file", scope: "brookfield", flag: "tenant", account: "70004" },
  { id: "o5", name: "Marcus Delgado", address: "1420 Lakeshore Trace · Lot 66, Katy, Texas 77493", contact: "(281) 555-0198", balance: "$2,140.00", status: "In collections", scope: "sofi", flag: "delinquent", account: "50066" },
  { id: "o6", name: "Priya Raman", address: "1802 Cypress Bend Ln · Lot 77, Cypress, Texas 77433", contact: "p.raman@example.com", balance: "$0.00", status: "Current", scope: "cypress", flag: "current", account: "60077" },
];

export const PAYMENTS: Payment[] = [
  { id: "p1", date: "Apr 06", label: "K. Boyle · bank transfer", amount: "$285.00" },
  { id: "p2", date: "Apr 05", label: "S. Okonkwo · card ····4242", amount: "$310.00" },
  { id: "p3", date: "Apr 03", label: "P. Raman · autopay", amount: "$310.00" },
  { id: "p4", date: "Apr 01", label: "D. Whitfield · check · ref 2841", amount: "$140.00" },
];

export const DELINQUENTS: Delinquent[] = [
  { id: "d1", owner: "M. Delgado", address: "1420 Lakeshore Trace", balance: "$2,140.00", stage: "90+ days" },
  { id: "d2", owner: "R. Alvarez", address: "812 Lakeside Dr", balance: "$855.00", stage: "61–90 days" },
  { id: "d3", owner: "D. Whitfield", address: "77 Brookfield Ln", balance: "$280.00", stage: "31–60 days" },
];

export const AGING = [
  { label: "Current", amount: "$184,220" },
  { label: "1–30 days", amount: "$12,940" },
  { label: "31–60 days", amount: "$6,180" },
  { label: "61–90 days", amount: "$3,405" },
  { label: "90+ days", amount: "$9,860" },
];

export const BUDGET = [
  { label: "HOA fee income", budget: "$196,000", actual: "$184,220", note: "94% collected" },
  { label: "Landscaping", budget: "$48,000", actual: "$46,410", note: "on plan" },
  { label: "Pool & amenities", budget: "$31,000", actual: "$34,880", note: "over by $3,880" },
  { label: "Utilities", budget: "$27,500", actual: "$25,120", note: "under" },
  { label: "Reserve contribution", budget: "$40,000", actual: "$40,000", note: "funded" },
];

export const WORK: WorkOrder[] = [
  { id: "w1", ref: "UG-418302", title: "Gate arm not lifting", detail: "Sofi Lakes · north entry · urgent · resident report", assignee: "Tessa Long", status: "In progress" },
  { id: "w2", ref: "UG-418288", title: "Pool pump cycling", detail: "Cypress Reserve · pump house · soon", assignee: "Blue Ridge Pool & Spa", status: "Scheduled" },
  { id: "w3", ref: "UG-418275", title: "Playground mulch low", detail: "Sofi Lakes · east park · routine", assignee: "Unassigned", status: "New" },
  { id: "w4", ref: "UG-418260", title: "Street light out", detail: "Brookfield Commons · Brookfield Ln · soon", assignee: "Harris Electric", status: "Scheduled" },
  { id: "w5", ref: "UG-418241", title: "Irrigation head broken", detail: "Sofi Lakes · median · routine", assignee: "Tessa Long", status: "Closed" },
];

export const VIOLATIONS: Violation[] = [
  {
    id: "v1", date: "Apr 03", title: "Parking or inoperable vehicle",
    detail: "1420 Lakeshore Trace · Sofi Lakes · inspection finding by Owen Park · cure in 14 days",
    status: "Notice sent",
    photos: ["street-view · Apr 03, 9:12 AM", "tag close-up · Apr 03, 9:13 AM"],
    mailings: [
      { kind: "Courtesy notice", method: "First-class mail", sent: "Apr 04", tracking: "", status: "Delivered" },
      { kind: "Second notice", method: "Certified mail", sent: "Apr 18", tracking: "9407 1000 0000 0000 0000 00", status: "In transit" },
    ],
    notes: [{ author: "Owen Park · inspector", time: "Apr 03, 9:12 AM", text: "Flat tires, expired tag. Photographed from the street — no entry onto the lot." }],
    activity: [
      { id: "a1", text: "Logged from inspection route", who: "Owen Park · inspector", time: "Apr 03, 9:12 AM" },
      { id: "a2", text: "Recorded mailing — Courtesy notice by First-class mail", who: CURRENT_USER, time: "Apr 04, 8:40 AM" },
      { id: "a3", text: "Send courtesy notice", who: CURRENT_USER, time: "Apr 04, 8:41 AM" },
      { id: "a4", text: "Recorded mailing — Second notice by Certified mail", who: CURRENT_USER, time: "Apr 18, 10:05 AM" },
    ],
  },
  { id: "v2", date: "Apr 01", title: "Lawn or landscaping upkeep", detail: "340 Cypress Reserve Way · Cypress Reserve · resident report · cure in 10 days", status: "Courtesy sent", photos: [], mailings: [], notes: [], activity: [] },
  { id: "v3", date: "Mar 28", title: "Trash bins or debris", detail: "1109 Willow Bend Ln · Sofi Lakes · inspection finding by Owen Park · cure in 7 days", status: "Resolved", photos: [], mailings: [], notes: [], activity: [] },
  { id: "v4", date: "Mar 24", title: "Unapproved exterior work", detail: "77 Brookfield Ln · Brookfield Commons · board referral · cure in 30 days", status: "Hearing set", photos: [], mailings: [], notes: [], activity: [] },
  { id: "v5", date: "Mar 20", title: "Fence or structure disrepair", detail: "812 Lakeside Dr · Sofi Lakes · inspection finding by Owen Park · cure in 21 days", status: "Reported", photos: [], mailings: [], notes: [], activity: [] },
];

export const ARC_APPS: ArcApp[] = [
  {
    id: "a1", ref: "ARC-2274", title: "Roof-mounted solar array", owner: "R. Alvarez · 812 Lakeside Dr",
    submitted: "Mar 18", due: "Decision due Apr 17 · 30-day clock", status: "Awaiting decision",
    thread: [
      { from: "R. Alvarez · owner", mine: false, time: "Mar 18, 7:12 PM", body: "Submitting the solar application. Installer is Lone Star Solar, panels are flush-mount with black frames.", attachment: "solar-layout.pdf · 2.1 MB" },
      { from: "Elena Cruz · manager", mine: true, time: "Mar 19, 9:04 AM", body: "Received and logged as ARC-2274. Sending to the committee for the April 2 docket. Texas law limits what we can restrict on solar, so review is scoped to placement and conduit routing." },
      { from: "A. Okafor · committee", mine: true, time: "Mar 28, 6:40 PM", body: "Need the conduit run marked on the elevation before we vote — it can't be visible from the street side." },
    ],
  },
  {
    id: "a2", ref: "ARC-2281", title: "6-foot cedar fence replacement", owner: "K. Boyle · 1109 Willow Bend Ln",
    submitted: "Mar 21", due: "Decision due Apr 20 · variance vote needed", status: "Awaiting decision",
    thread: [
      { from: "K. Boyle · owner", mine: false, time: "Mar 21, 8:30 AM", body: "The old fence is falling apart. Neighbor signed off on the 6-foot height — letter attached.", attachment: "neighbor-consent.pdf · 240 KB" },
      { from: "Elena Cruz · manager", mine: true, time: "Mar 21, 11:15 AM", body: "Thanks — logged. Height is over the 5-foot standard, so this needs a variance vote rather than staff approval." },
    ],
  },
  {
    id: "a3", ref: "ARC-2290", title: "Exterior repaint — Morning Fog", owner: "S. Okonkwo · 340 Cypress Reserve Way",
    submitted: "Mar 30", due: "Decision due Apr 29 · on approved palette", status: "Awaiting decision",
    thread: [
      { from: "S. Okonkwo · owner", mine: false, time: "Mar 30, 5:02 PM", body: "Repainting in Morning Fog with Slate trim. Both are on the approved palette." },
      { from: "Elena Cruz · manager", mine: true, time: "Mar 31, 8:20 AM", body: "Confirmed against the palette. Routing for a quick committee sign-off." },
    ],
  },
];

export const BOOKINGS: Booking[] = [
  { id: "b1", date: "Apr 20", amenity: "Great Hall", detail: "K. Boyle · birthday · 4–9PM · 40 guests", deposit: "$200 held", status: "Approved" },
  { id: "b2", date: "Apr 27", amenity: "Pool cabana 1", detail: "S. Okonkwo · private party · 1–5PM · 12 guests", deposit: "$40 paid", status: "Requested" },
  { id: "b3", date: "May 04", amenity: "Clubhouse Annex", detail: "Garden club · community meeting · 6–8PM", deposit: "No fee", status: "Approved" },
  { id: "b4", date: "Mar 29", amenity: "Great Hall", detail: "M. Delgado · wedding or reception · 2–10PM · 80 guests", deposit: "$200 held", status: "Completed" },
];

export const MEETINGS: Meeting[] = [
  { id: "m1", date: "Apr 14", title: "Regular board meeting", detail: "Sofi Lakes · Clubhouse Annex, 6:30 PM · 7880 Morrison Rd, Katy", status: "Agenda published", notice: "Notice sent", noticeOk: true, minutes: null },
  { id: "m2", date: "Mar 10", title: "Regular board meeting", detail: "Sofi Lakes · Clubhouse Annex, 6:30 PM · 7880 Morrison Rd, Katy", status: "Minutes approved", notice: "Notice sent", noticeOk: true,
    minutes: { attendance: "4 of 5 directors present · quorum met · 12 owners attending", body: "Called to order 6:32 PM. Prior minutes approved. Treasurer reported $184,220 collected year to date, 94% of budget. Landscaping contract renewal discussed. Pool resurfacing bid deferred pending a third quote.", motions: "Motion to approve the Q1 financials — passed 4-0. Motion to renew the landscaping contract through Dec 2027 — passed 3-1.", published: true } },
  { id: "m3", date: "May 17", title: "Annual meeting", detail: "Sofi Lakes · Great Hall, 7:00 PM · 7880 Morrison Rd, Katy", status: "Scheduled", notice: "Notice due Apr 27", noticeOk: false, minutes: null },
];

export const DIRECTORS: Director[] = [
  { id: "dir1", name: "Amara Okafor", role: "President", address: "915 Lakeside Dr, Katy, Texas 77493", term: "Term 2024–2027" },
  { id: "dir2", name: "Nathan Reyes", role: "Treasurer", address: "1204 Willow Bend Ln, Katy, Texas 77493", term: "Term 2025–2028" },
  { id: "dir3", name: "Joyce Tan", role: "Secretary", address: "560 Lakeshore Trace, Katy, Texas 77493", term: "Term 2023–2026" },
];

export const LEGAL_CASES: LegalCase[] = [
  { id: "lc1", owner: "M. Delgado", address: "1420 Lakeshore Trace", balance: "$2,140.00", stage: "Lien filed", counsel: "Hollis & Vance" },
  { id: "lc2", owner: "R. Alvarez", address: "812 Lakeside Dr", balance: "$855.00", stage: "Referred to counsel", counsel: "Hollis & Vance" },
  { id: "lc3", owner: "T. Iverson", address: "233 Cypress Reserve Way", balance: "$4,780.00", stage: "Suit filed", counsel: "Barrett Law Group" },
  { id: "lc4", owner: "G. Pham", address: "88 Brookfield Ln", balance: "$1,260.00", stage: "Payment plan", counsel: "Hollis & Vance" },
];

export const COUNSEL = [
  { firm: "Hollis & Vance", contact: "J. Hollis · (713) 555-0110", scope: "Collections, liens, foreclosure" },
  { firm: "Barrett Law Group", contact: "M. Barrett · (281) 555-0164", scope: "Litigation, construction defect" },
];

export const LEGAL_CALENDAR: CalEvent[] = [
  { id: "lg1", date: "Apr 21", title: "Answer deadline — Iverson", detail: "Barrett Law Group · Harris County", kind: "Legal", community: "" },
  { id: "lg2", date: "May 08", title: "Foreclosure sale — Delgado", detail: "First Tuesday · courthouse steps", kind: "Legal", community: "" },
];

export const VENDORS: Vendor[] = [
  { id: "vn1", name: "Greenline Grounds", trade: "Landscaping & irrigation · C. Mata (713) 555-0177 · 2140 Commerce Park Dr, Houston, Texas 77040", contract: "Thru Dec 2027", spend: "$46,410 YTD", insurance: "Renews Mar 1", ok: true },
  { id: "vn2", name: "Blue Ridge Pool & Spa", trade: "Pool & spa · D. Ruiz (281) 555-0121", contract: "Thru Aug 2026", spend: "$34,880 YTD", insurance: "Renews Jul 15", ok: true },
  { id: "vn3", name: "Harris Electric", trade: "Lighting & electrical · S. Harris (713) 555-0155", contract: "Per job", spend: "$11,240 YTD", insurance: "Expired Feb 28", ok: false },
  { id: "vn4", name: "Katy Gate Systems", trade: "Gates & entry · L. Nguyen (281) 555-0188", contract: "Thru Jun 2026", spend: "$8,900 YTD", insurance: "Renews Sep 1", ok: true },
];

export const DOCS: Doc[] = [
  { id: "dc1", title: "Sofi Lakes CC&Rs", meta: "Recorded 2016 · 48 pages", published: true },
  { id: "dc2", title: "Sofi Lakes bylaws", meta: "Amended 2021 · 22 pages", published: true },
  { id: "dc3", title: "Architectural guidelines & palette", meta: "Revised 2024 · 14 pages", published: true },
  { id: "dc4", title: "2026 approved budget", meta: "Board approved Nov 2025", published: true },
  { id: "dc5", title: "Q1 2026 financials", meta: "Draft · pending treasurer review", published: false },
  { id: "dc6", title: "Reserve study", meta: "2025 update · 36 pages", published: false },
];

export const STAFF: Staff[] = [
  { id: "s1", name: "Elena Cruz", email: "ecruz@unitygrid.com", role: "Community manager", communities: ["sofi", "brookfield"], active: true, load: 6 },
  { id: "s2", name: "Ray Mbeki", email: "rmbeki@unitygrid.com", role: "Community manager", communities: ["cypress"], active: true, load: 4 },
  { id: "s3", name: "Tessa Long", email: "tlong@unitygrid.com", role: "Maintenance tech", communities: ["sofi", "cypress", "brookfield"], active: true, load: 9 },
  { id: "s4", name: "Owen Park", email: "opark@unitygrid.com", role: "Inspector", communities: ["sofi", "cypress"], active: true, load: 3 },
  { id: "s5", name: "Nadia Farr", email: "nfarr@unitygrid.com", role: "Accounting", communities: ["sofi", "cypress", "brookfield"], active: true, load: 2 },
  { id: "s6", name: "Bo Trimble", email: "btrimble@unitygrid.com", role: "Front desk", communities: ["sofi"], active: false, load: 0 },
];

export const ADMIN_CALENDAR: CalEvent[] = [
  { id: "ce1", date: "Apr 14", title: "Sofi Lakes board meeting", detail: "6:30 PM · agenda packet due Apr 9", kind: "Meeting", community: "Sofi Lakes" },
  { id: "ce2", date: "Apr 17", title: "Cypress Reserve inspection route", detail: "Full property walk · photos to file", kind: "Inspection", community: "Cypress Reserve" },
  { id: "ce3", date: "Apr 19", title: "Spring shred day", detail: "Vendor confirmed · north lot", kind: "Community", community: "Sofi Lakes" },
  { id: "ce4", date: "Apr 22", title: "Brookfield inspection route", detail: "Townhome exteriors · O. Park", kind: "Inspection", community: "Brookfield Commons" },
  { id: "ce5", date: "Apr 26", title: "Pool opening weekend", detail: "Amenity tags checked at the gate", kind: "Community", community: "Sofi Lakes" },
  { id: "ce6", date: "May 01", title: "Q2 HOA fees post", detail: "676 statements · autopay drafts Apr 28", kind: "Meeting", community: "Sofi Lakes" },
  { id: "ce7", date: "May 17", title: "Sofi Lakes annual meeting", detail: "Election, budget presentation, quorum 30%", kind: "Meeting", community: "Sofi Lakes" },
];

export const SENT_HISTORY = [
  { date: "Apr 05", subject: "Pool opens Apr 26", meta: "All communities · email + portal · 676 recipients" },
  { date: "Mar 28", subject: "Landscaping schedule change", meta: "Sofi Lakes · email + SMS · 412 recipients" },
  { date: "Mar 15", subject: "Q1 statements are available", meta: "All communities · email + portal · 676 recipients" },
];

export const QUEUE = [
  { id: "q1", label: "12 accounts past due", detail: "$32,385 outstanding across three communities", target: "accounting" },
  { id: "q2", label: "3 architectural applications awaiting decision", detail: "Earliest clock expires Apr 17", target: "arc" },
  { id: "q3", label: "7 open work orders", detail: "One urgent — gate arm at Sofi Lakes north entry", target: "work" },
  { id: "q4", label: "Annual meeting notice due Apr 27", detail: "10-day statutory window for Sofi Lakes", target: "board" },
];

export const METRICS = [
  { label: "Receivables", value: "$216,605", note: "94% collected YTD" },
  { label: "Open work orders", value: "7", note: "1 urgent" },
  { label: "Pending reviews", value: "3", note: "Earliest due Apr 17" },
  { label: "Delinquency rate", value: "1.8%", note: "12 of 676 doors" },
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The prototype's "today" so fixture dates line up. Use new Date() in production. */
export const TODAY = { year: 2026, month: 3, day: 8 };
