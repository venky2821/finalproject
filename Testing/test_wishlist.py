import sys
import os

# Add the Backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base, get_db
from main import app
from models import User, Product, Wishlist
from auth import get_current_user
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers():
    client.post("/register", json={
        "email": "testuser@example.com",
        "username": "testuser",
        "password": "testpass"
    })
    response = client.post(
        "/token",
        data={"username": "testuser@example.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def db_session() -> Session:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def override_get_current_user():
    return User(id=1, username="testuser", email="testuser@example.com", role_id=1)

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture
def create_test_product(db_session):
    product = Product(name="Wish Item", category="Gift", stock_level=5, reorder_threshold=10, price=50.00, cost_price=30.00, supplier_id=1, image_url="/images/gift.png")
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

def test_add_to_wishlist(auth_headers, db_session, create_test_product):
    response = client.post(f"/wishlist/{create_test_product.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["product_id"] == create_test_product.id

def test_get_wishlist(auth_headers, db_session):
    wishlist = Wishlist(user_id=1, product_id=1, created_at=datetime.utcnow())
    db_session.add(wishlist)
    db_session.commit()
    response = client.get("/wishlist/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_remove_from_wishlist(auth_headers, db_session):
    wishlist = Wishlist(user_id=1, product_id=1, created_at=datetime.utcnow())
    db_session.add(wishlist)
    db_session.commit()
    response = client.delete("/wishlist/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Item removed from wishlist"

def test_add_duplicate_to_wishlist(auth_headers, db_session, create_test_product):
    # First add
    client.post(f"/wishlist/{create_test_product.id}", headers=auth_headers)
    # Try adding again
    response = client.post(f"/wishlist/{create_test_product.id}", headers=auth_headers)
    assert response.status_code in (400, 409)

def test_remove_nonexistent_from_wishlist(auth_headers):
    response = client.delete("/wishlist/999", headers=auth_headers)
    assert response.status_code in (404, 400)

def test_get_empty_wishlist(auth_headers):
    response = client.get("/wishlist/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []