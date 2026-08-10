from sqlalchemy.orm import Session
from app.modules.gamification.service import GamificationService


def test_gamification_leaderboard(db: Session):
    service = GamificationService(db)
    response = service.get_leaderboard()

    assert response.period == "30 Days"
    assert response.total_outlets >= 0
    assert isinstance(response.leaderboard, list)

    if response.leaderboard:
        top = response.leaderboard[0]
        assert top.rank == 1
        assert top.points >= 0
        assert top.tier is not None
        assert isinstance(top.badges, list)


def test_gamification_outlet_stats(db: Session):
    service = GamificationService(db)
    stats = service.get_outlet_stats(1)

    assert stats.outlet_id == 1
    assert stats.points >= 0
    assert stats.tier is not None
    assert isinstance(stats.badges, list)
