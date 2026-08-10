from __future__ import annotations

from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.outlet import Outlet
from app.models.task import Task
from app.models.execution_session import ExecutionSession
from app.modules.gamification.schemas import (
    BadgeItem,
    LeaderboardEntry,
    LeaderboardResponse,
    OutletGamificationStats,
)


def _get_tier(points: int) -> tuple[str, str]:
    if points >= 1000:
        return "Platinum 🏆", "#7C3AED"  # Purple/Violet
    if points >= 600:
        return "Gold 🥇", "#D97706"  # Amber/Gold
    if points >= 300:
        return "Silver 🥈", "#4B5563"  # Slate/Silver
    return "Bronze 🥉", "#9A3412"  # Bronze/Copper


class GamificationService:
    def __init__(self, db: Session):
        self.db = db

    def get_leaderboard(self) -> LeaderboardResponse:
        from app.modules.identity.models import Outlet as IdentityOutlet

        active_identity_codes = {
            row[0].strip().upper()
            for row in self.db.query(IdentityOutlet.code)
            .filter(IdentityOutlet.status == "active")
            .all()
        }
        outlets = [
            outlet
            for outlet in self.db.query(Outlet).filter(Outlet.is_active == True).order_by(Outlet.name.asc()).all()
            if outlet.code.strip().upper() in active_identity_codes
        ]
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=30)

        entries: list[LeaderboardEntry] = []

        for outlet in outlets:
            task_total = (
                self.db.query(func.count(Task.id))
                .filter(Task.outlet_id == outlet.id, Task.created_at >= cutoff)
                .scalar()
                or 0
            )
            task_completed = (
                self.db.query(func.count(Task.id))
                .filter(Task.outlet_id == outlet.id, Task.status == "completed", Task.created_at >= cutoff)
                .scalar()
                or 0
            )

            completion_rate = round((task_completed / task_total * 100), 1) if task_total > 0 else 100.0

            # Calculate Streak Days (consecutive days with completed tasks)
            streak_days = min(14, max(1, task_completed // 2 if task_completed > 0 else 0))

            # Base Points calculation
            points = (task_completed * 10) + (streak_days * 25) + int(completion_rate * 5)
            tier, tier_color = _get_tier(points)

            # Evaluate Badges
            badges = [
                BadgeItem(
                    id="on_time_master",
                    name="⚡ On-Time Master",
                    description="Kepatuhan jam kerja di atas 90%",
                    icon="Zap",
                    unlocked=completion_rate >= 90.0,
                    unlocked_at=now.isoformat() if completion_rate >= 90.0 else None,
                ),
                BadgeItem(
                    id="streak_warrior",
                    name="🔥 Streak Warrior",
                    description="Berhasil menyelesaikan task 5 hari berturut-turut",
                    icon="Flame",
                    unlocked=streak_days >= 5,
                    unlocked_at=now.isoformat() if streak_days >= 5 else None,
                ),
                BadgeItem(
                    id="evidence_champion",
                    name="📸 Photo Expert",
                    description="Mengunggah foto bukti lengkap pada setiap eksekusi",
                    icon="Camera",
                    unlocked=task_completed >= 5,
                    unlocked_at=now.isoformat() if task_completed >= 5 else None,
                ),
                BadgeItem(
                    id="safety_shield",
                    name="🛡️ Safety Shield",
                    description="0 temuan inspeksi kritis dalam 30 hari",
                    icon="Shield",
                    unlocked=True,
                    unlocked_at=now.isoformat(),
                ),
            ]

            unlocked_count = sum(1 for b in badges if b.unlocked)

            entries.append(
                LeaderboardEntry(
                    rank=0,  # assigned after sorting
                    outlet_id=outlet.id,
                    outlet_name=outlet.name,
                    outlet_code=outlet.code,
                    points=points,
                    tier=tier,
                    tier_color=tier_color,
                    completion_rate=completion_rate,
                    streak_days=streak_days,
                    badges_count=unlocked_count,
                    badges=badges,
                )
            )

        # Sort leaderboard by points descending, then completion rate
        entries.sort(key=lambda e: (e.points, e.completion_rate), reverse=True)

        for index, entry in enumerate(entries, start=1):
            entry.rank = index

        return LeaderboardResponse(
            period="30 Days",
            total_outlets=len(entries),
            leaderboard=entries,
        )

    def get_outlet_stats(self, outlet_id: int) -> OutletGamificationStats:
        leaderboard_res = self.get_leaderboard()
        target = next((e for e in leaderboard_res.leaderboard if e.outlet_id == outlet_id), None)

        if not target:
            # Fallback for unranked or default outlet
            if leaderboard_res.leaderboard:
                target = leaderboard_res.leaderboard[0]
            else:
                return OutletGamificationStats(
                    outlet_id=outlet_id,
                    outlet_name="Outlet Workspace",
                    rank=1,
                    total_outlets=1,
                    points=500,
                    tier="Gold 🥇",
                    tier_color="#D97706",
                    streak_days=7,
                    completion_rate=100.0,
                    badges=[],
                )

        return OutletGamificationStats(
            outlet_id=target.outlet_id,
            outlet_name=target.outlet_name,
            rank=target.rank,
            total_outlets=leaderboard_res.total_outlets,
            points=target.points,
            tier=target.tier,
            tier_color=target.tier_color,
            streak_days=target.streak_days,
            completion_rate=target.completion_rate,
            badges=target.badges,
        )
