from __future__ import annotations

from pydantic import BaseModel, Field


class BadgeItem(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: str | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    outlet_id: int
    outlet_name: str
    outlet_code: str
    points: int
    tier: str  # "Platinum 🏆", "Gold 🥇", "Silver 🥈", "Bronze 🥉"
    tier_color: str
    completion_rate: float
    streak_days: int
    badges_count: int
    badges: list[BadgeItem]


class LeaderboardResponse(BaseModel):
    period: str
    total_outlets: int
    leaderboard: list[LeaderboardEntry]


class OutletGamificationStats(BaseModel):
    outlet_id: int
    outlet_name: str
    rank: int
    total_outlets: int
    points: int
    tier: str
    tier_color: str
    streak_days: int
    completion_rate: float
    badges: list[BadgeItem]
