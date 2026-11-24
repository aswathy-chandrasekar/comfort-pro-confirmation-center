"""
End-to-end UI check for the Confirmation Center against the LIVE backend.

Prerequisites (see README "Run the demo"):
  1. backend running on :4000 and `npm run demo` completed (10 appointments processed)
  2. frontend served on :3000  (npm run frontend:start, or serve frontend/build)

Run:  python3 frontend/e2e/check_ui.py            (needs: pip install playwright && playwright install chromium)
      BASE_URL=http://localhost:3000 python3 frontend/e2e/check_ui.py
"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS  " if ok else "FAIL  ") + name + (f"   [{detail}]" if detail and not ok else ""))


def rows(pg):
    return pg.locator("[data-testid^=needs-attention-row-]").count()


def names(pg):
    return sorted(
        t.replace("needs-attention-row-", "")
        for t in pg.eval_on_selector_all("[data-testid^=needs-attention-row-]", "els=>els.map(e=>e.dataset.testid)")
    )


def metric(pg, tid):
    return pg.inner_text(f"[data-testid={tid}]").split()


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    page_errors = []
    pg.on("pageerror", lambda e: page_errors.append(str(e)))

    pg.goto(BASE)
    pg.click("[type=submit]")
    pg.wait_for_selector("[data-testid=summary-metrics]")
    pg.wait_for_timeout(1500)

    # ---- KPIs come from backend rows ----
    check("KPI total = 10", "10" in metric(pg, "metric-total-appointments"))
    check("KPI confirmed = 6", "6" in metric(pg, "metric-handled-auto"))
    check("KPI needs review = 4", "4" in metric(pg, "metric-needs-attention"))
    check("Default queue shows exactly the 4 exceptions",
          names(pg) == ["angela-brooks", "bill-sanders", "kevin-marsh", "patricia-lyons"], str(names(pg)))

    # ---- filters ----
    for chip, expect in [
        ("confirmed", 6), ("schedule-changes", 1), ("questions", 1),
        ("no-response", 2), ("all", 10), ("needs-attention", 4),
    ]:
        pg.click(f"[data-testid=filter-chip-{chip}]")
        pg.wait_for_timeout(250)
        check(f"Filter '{chip}' shows {expect}", rows(pg) == expect, f"got {rows(pg)}")
    pg.click("[data-testid=filter-chip-schedule-changes]"); pg.wait_for_timeout(200)
    check("Schedule changes = Angela", names(pg) == ["angela-brooks"])
    pg.click("[data-testid=filter-chip-questions]"); pg.wait_for_timeout(200)
    check("Questions = Patricia", names(pg) == ["patricia-lyons"])
    pg.click("[data-testid=filter-chip-no-response]"); pg.wait_for_timeout(200)
    check("No response = Kevin + Bill", names(pg) == ["bill-sanders", "kevin-marsh"])

    # ---- search ----
    pg.click("[data-testid=filter-chip-all]")
    pg.fill("[data-testid=search-input]", "carlos"); pg.wait_for_timeout(300)
    check("Search 'carlos' -> Carlos's jobs only (3)", rows(pg) == 3, f"got {rows(pg)}")
    pg.fill("[data-testid=search-input]", "4474"); pg.wait_for_timeout(300)
    check("Search by job id 4474 -> Robert", names(pg) == ["robert-chen"])
    pg.fill("[data-testid=search-input]", "zzzz"); pg.wait_for_timeout(300)
    check("Search with no match -> 0 rows", rows(pg) == 0)
    pg.fill("[data-testid=search-input]", "")

    # ---- KPI card navigation ----
    pg.click("[data-testid=metric-handled-auto]"); pg.wait_for_timeout(300)
    check("KPI 'Confirmed' card filters to 6", rows(pg) == 6, f"got {rows(pg)}")
    pg.click("[data-testid=metric-total-appointments]"); pg.wait_for_timeout(300)
    check("KPI 'Appointments' card filters to 10", rows(pg) == 10, f"got {rows(pg)}")
    pg.click("[data-testid=metric-needs-attention]"); pg.wait_for_timeout(300)
    check("KPI 'Needs review' card filters to 4", rows(pg) == 4, f"got {rows(pg)}")

    # ---- drawers: Angela (AI + human review), Denise (rule), Robert (AI confirm) ----
    def open_drawer(chip, slug):
        pg.click(f"[data-testid=filter-chip-{chip}]"); pg.wait_for_timeout(250)
        pg.click(f"[data-testid=needs-attention-row-{slug}]"); pg.wait_for_selector("[data-testid=detail-drawer]")
        pg.wait_for_timeout(300)

    open_drawer("schedule-changes", "angela-brooks")
    d = pg.inner_text("[data-testid=detail-drawer]")
    check("Angela: shows the real outbound message", "Comfort Pro. Carlos is scheduled for your Plumbing Repair" in d)
    check("Angela: customer reply shown", "Can we move this to tomorrow afternoon?" in d)
    check("Angela: 'No schedule change was made automatically'", "No schedule change was made automatically" in d)
    check("Angela: timeline is populated", "Confirmation sent" in d and "Schedule change detected" in d and "Added to dispatcher review" in d)
    pg.click("[data-testid=automation-details-expandable]"); pg.wait_for_timeout(200)
    d = pg.inner_text("[data-testid=detail-drawer]")
    check("Angela: AI classification, RESCHEDULE, 98%, Human review",
          "AI classification" in d and "RESCHEDULE" in d and "98%" in d and "Human review" in d)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    open_drawer("confirmed", "denise-harper")
    pg.click("[data-testid=automation-details-expandable]"); pg.wait_for_timeout(200)
    d = pg.inner_text("[data-testid=detail-drawer]")
    check("Denise: Deterministic rule, AI not required, no confidence",
          "Deterministic rule" in d and "AI was not required" in d and "Confidence" not in d)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    open_drawer("confirmed", "robert-chen")
    pg.click("[data-testid=automation-details-expandable]"); pg.wait_for_timeout(200)
    d = pg.inner_text("[data-testid=detail-drawer]")
    check("Robert: AI classification, CONFIRMED, 95%",
          "AI classification" in d and "CONFIRMED" in d and "95%" in d and "My wife will be there" in d)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    open_drawer("no-response", "kevin-marsh")
    d = pg.inner_text("[data-testid=detail-drawer]")
    check("Kevin: no response, call customer, no late-reply simulation", "Customer has not responded" in d and "Call Customer" in d)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # ---- mark reviewed (local state only) ----
    open_drawer("needs-attention", "patricia-lyons")
    pg.click("[data-testid=drawer-action-mark-reviewed]"); pg.wait_for_timeout(500)
    pg.click("[data-testid=filter-chip-needs-attention]"); pg.wait_for_timeout(300)
    check("Mark reviewed removes Patricia from the queue (3 left)", rows(pg) == 3, f"got {rows(pg)}")

    # ---- date navigation: other dates have no live batch ----
    pg.click("[data-testid=date-next]"); pg.wait_for_timeout(400)
    check("Next day shows no live appointments", rows(pg) == 0)
    pg.click("[data-testid=date-prev]"); pg.wait_for_timeout(400)
    pg.click("[data-testid=filter-chip-all]"); pg.wait_for_timeout(300)
    check("Back to tomorrow shows all 10 again", rows(pg) == 10, f"got {rows(pg)}")

    # ---- other pages ----
    pg.click("[data-testid=nav-activity]"); pg.wait_for_timeout(600)
    act = pg.inner_text("main")
    check("Activity page lists events from live data", "Angela Brooks" in act and "Kevin Marsh" in act and "Denise Harper" in act)
    pg.click("[data-testid=nav-calendar]"); pg.wait_for_timeout(600)
    check("Calendar page renders", len(pg.inner_text("main")) > 50)
    pg.click("[data-testid=nav-overview]"); pg.wait_for_timeout(600)

    # ---- no fake late-reply button anywhere ----
    body = pg.inner_text("body")
    check("No 'Simulate late reply' control in the UI", "simulate" not in body.lower())

    # ---- mobile ----
    m = b.new_page(viewport={"width": 390, "height": 844})
    m.goto(BASE); m.click("[type=submit]"); m.wait_for_selector("[data-testid=summary-metrics]"); m.wait_for_timeout(1200)
    check("Mobile: no horizontal page scroll", m.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))

    check("No uncaught page errors", not page_errors, "; ".join(page_errors[:2]))
    b.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} UI checks passed")
sys.exit(1 if failed else 0)
