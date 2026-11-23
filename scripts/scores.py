"""Nightly "Most loved" scores for WallBliss designs, from Google Analytics 4.

Reads the last 30 days of design events (each carries the design code in the `code` parameter,
registered in GA as the event-scoped custom dimension `code`), weights them, and writes
assets/scores.json. Run by .github/workflows/scores.yml with the service-account key in the
GA_SA_KEY secret. Only rewrites the file when a score changed.
"""
import json, os, sys, datetime
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

PROPERTY = os.environ.get("GA_PROPERTY", "558921156")
DAYS = 30
WEIGHTS = {                      # what each customer action is worth
    "design_open": 1,
    "view_in_room": 1,
    "shortlist_add": 3,
    "mywall_try": 3,
    "whatsapp_tap": 5,
    "mywall_send_text": 5,
    "mywall_send_picture": 8,
}
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "scores.json")


def main():
    key = os.environ.get("GA_SA_KEY")
    if not key:
        sys.exit("GA_SA_KEY is not set")
    creds = service_account.Credentials.from_service_account_info(
        json.loads(key), scopes=["https://www.googleapis.com/auth/analytics.readonly"])
    body = {
        "dateRanges": [{"startDate": f"{DAYS}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "eventName"}, {"name": "customEvent:code"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {"filter": {"fieldName": "eventName", "inListFilter": {"values": list(WEIGHTS)}}},
        "limit": 10000,
    }
    r = AuthorizedSession(creds).post(
        f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY}:runReport", json=body, timeout=60)
    if r.status_code != 200:
        sys.exit(f"GA said {r.status_code}: {r.text[:500]}")
    scores = {}
    for row in r.json().get("rows", []):
        name, code = row["dimensionValues"][0]["value"], row["dimensionValues"][1]["value"].upper()
        if not code.startswith("WB-"):
            continue
        scores[code] = scores.get(code, 0) + WEIGHTS.get(name, 0) * int(row["metricValues"][0]["value"])
    scores = dict(sorted(scores.items(), key=lambda kv: -kv[1]))
    try:
        old = json.load(open(OUT)).get("scores", {})
    except Exception:
        old = None
    if old == scores:
        print("No change")
        return
    json.dump({"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "days": DAYS,
               "weights": WEIGHTS, "scores": scores}, open(OUT, "w"), indent=1)
    print(f"Wrote {len(scores)} design scores")


if __name__ == "__main__":
    main()
