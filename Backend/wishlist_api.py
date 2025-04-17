from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime

from database import get_db
from models import Wishlist, Product, User
from auth import get_current_user
from schemas import WishlistItem, WishlistItemCreate

router = APIRouter(
    prefix="/wishlist",
    tags=["wishlist"]
)

@router.post("/{product_id}", response_model=WishlistItem)
async def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if item is already in wishlist
    existing_item = db.query(Wishlist).filter(
        and_(
            Wishlist.user_id == current_user.id,
            Wishlist.product_id == product_id
        )
    ).first()

    if existing_item:
        raise HTTPException(status_code=400, detail="Product already in wishlist")

    # Create new wishlist item
    wishlist_item = Wishlist(
        user_id=current_user.id,
        product_id=product_id,
        created_at=datetime.utcnow()
    )
    db.add(wishlist_item)
    db.commit()
    db.refresh(wishlist_item)
    return wishlist_item

@router.delete("/{product_id}")
async def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    wishlist_item = db.query(Wishlist).filter(
        and_(
            Wishlist.user_id == current_user.id,
            Wishlist.product_id == product_id
        )
    ).first()

    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")

    db.delete(wishlist_item)
    db.commit()
    return {"message": "Item removed from wishlist"}

@router.get("/", response_model=List[WishlistItem])
async def get_wishlist(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    wishlist_items = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id
    ).all()
    return wishlist_items 