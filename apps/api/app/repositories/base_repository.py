from sqlalchemy.orm import Session


class BaseRepository:
    def __init__(self, db: Session, model):
        self.db = db
        self.model = model

    def get_all(self):
        return self.db.query(self.model).order_by(self.model.id.desc()).all()

    def get_by_id(self, item_id: int):
        return self.db.query(self.model).filter(self.model.id == item_id).first()

    def create(self, data: dict):
        item = self.model(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update(self, item, data: dict):
        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, item):
        self.db.delete(item)
        self.db.commit()
        return item