"""APScheduler-based orchestrator for all API-Football sync tiers.

Schedules:
  - bootstrap: weekly Monday 04:00 UTC
  - daily:     every day at 06:00 UTC
  - hourly:    every 60 minutes
  - live:      every 15 seconds (no-op when no matches are active)

Usage:
    python backend/scripts/poll_daemon.py                    # start scheduler
    python backend/scripts/poll_daemon.py --run-once daily   # one-shot
    python backend/scripts/poll_daemon.py --dry-run           # no DB writes
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

sys.path.insert(0, str(ROOT))

from backend.scripts import sync_bootstrap  # noqa: E402
from backend.scripts import sync_daily      # noqa: E402
from backend.scripts import sync_hourly     # noqa: E402
from backend.scripts import sync_live       # noqa: E402

log = logging.getLogger("poll_daemon")

TIER_MAP = {
    "bootstrap": sync_bootstrap.run,
    "daily": sync_daily.run,
    "hourly": sync_hourly.run,
    "live": sync_live.run,
}


def _wrap(tier_name: str, fn, *, dry_run: bool = False):
    """Return a wrapper that catches exceptions so the scheduler stays alive."""
    def _job():
        try:
            log.info("=== %s starting ===", tier_name)
            fn(dry_run=dry_run)
            log.info("=== %s finished ===", tier_name)
        except Exception:
            log.exception("Error in %s job", tier_name)
    return _job


def run_once(tier: str, *, dry_run: bool = False) -> None:
    fn = TIER_MAP.get(tier)
    if fn is None:
        sys.exit(f"Unknown tier: {tier!r}. Choose from {list(TIER_MAP)}")
    log.info("Running %s (one-shot) …", tier)
    fn(dry_run=dry_run)
    log.info("Done.")


def start_scheduler(*, dry_run: bool = False) -> None:
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    scheduler = BlockingScheduler(timezone="UTC")

    scheduler.add_job(
        _wrap("bootstrap", sync_bootstrap.run, dry_run=dry_run),
        CronTrigger(day_of_week="mon", hour=4),
        id="sync_bootstrap",
        max_instances=1,
    )
    scheduler.add_job(
        _wrap("daily", sync_daily.run, dry_run=dry_run),
        CronTrigger(hour=6),
        id="sync_daily",
        max_instances=1,
    )
    scheduler.add_job(
        _wrap("hourly", sync_hourly.run, dry_run=dry_run),
        IntervalTrigger(hours=1),
        id="sync_hourly",
        max_instances=1,
    )
    scheduler.add_job(
        _wrap("live", sync_live.run, dry_run=dry_run),
        IntervalTrigger(seconds=15),
        id="sync_live",
        max_instances=1,
        coalesce=True,
    )

    def _shutdown(signum, frame):
        log.info("Received signal %s — shutting down …", signum)
        scheduler.shutdown(wait=False)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    log.info("Poll daemon started (dry_run=%s). Press Ctrl-C to stop.", dry_run)
    scheduler.print_jobs()
    scheduler.start()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--run-once",
        choices=list(TIER_MAP),
        help="Run a single tier and exit",
    )
    parser.add_argument("--dry-run", action="store_true", help="Log API calls without writing to DB")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    if args.run_once:
        run_once(args.run_once, dry_run=args.dry_run)
    else:
        start_scheduler(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
