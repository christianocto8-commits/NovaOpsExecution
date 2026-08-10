from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.gamification.schemas import LeaderboardResponse, OutletGamificationStats
from app.modules.gamification.service import GamificationService

router = APIRouter(prefix="/gamification", tags=["Gamification & Leaderboard"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_gamification_leaderboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve top outlet performance leaderboard with ranks, points, tiers, and badges."""
    return GamificationService(db).get_leaderboard()


@router.get("/outlet-stats", response_model=OutletGamificationStats)
def get_outlet_gamification_stats(
    x_outlet_id: str | None = Header(None, alias="X-Outlet-Id"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve current outlet gamification points, streak, and badges."""
    outlet_id = 1
    if x_outlet_id and x_outlet_id.isdigit():
        outlet_id = int(x_outlet_id)

    return GamificationService(db).get_outlet_stats(outlet_id)
