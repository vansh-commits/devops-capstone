import os

# Tests use a throwaway SQLite file, never the real PostgreSQL database.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def ticket(client):
    payload = {
        "title": "Cannot log in to portal",
        "requester_email": "asha@example.com",
        "category": "ACCESS",
        "priority": "URGENT",
    }
    return client.post("/api/tickets", json=payload).json()
