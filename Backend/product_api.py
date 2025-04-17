from fastapi import File, UploadFile
import os
from models import Product, Photo, StockMovement, ProductImage
from fastapi import APIRouter, Depends
from database import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ProductCreate(BaseModel):
    name: str
    category: str
    stock_level: int
    reserved_stock: int = 0
    reorder_threshold: int
    cost_price: float
    price: float
    supplier_id: int
    image_url: str | None = None

@router.post("/products/{product_id}/upload-images")
async def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    os.makedirs('photos', exist_ok=True)
    for file in files:
        safe_filename = file.filename.replace(" ", "_")
        file_location = f"photos/{safe_filename}"
        with open(file_location, "wb") as f:
            f.write(file.file.read())

        file_url = f"http://localhost:8000/static/{safe_filename}"
        new_image = ProductImage(product_id=product_id, image_url=file_url)
        db.add(new_image)

    db.commit()
    return {"message": "Images uploaded successfully"}

@router.post("/products/upload-image")
async def upload_image(uploaded_file: UploadFile = File(...), db: Session = Depends(get_db)):
    os.makedirs('photos', exist_ok=True)

    safe_filename = uploaded_file.filename.replace(" ", "_")
    file_location = f"photos/{safe_filename}"
    with open(file_location, "wb") as file:
        file.write(uploaded_file.file.read())

    # Store the full URL in the database
    file_url = f"http://localhost:8000/static/{safe_filename}"

    # Create a new photo record
    new_photo = Photo(
        url=file_url,
        approved=1,
        # uploaded_by=current_user.id,
        # category=category
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return {"image_url": file_url}

@router.post("/products/add")
def add_product(product: ProductCreate, db: Session = Depends(get_db)):
    if product.image_url is None:
        product.image_url = ""  # Default empty string if no image is uploaded
        
    new_product = Product(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    stock_movement = StockMovement(
        product_id=new_product.id,
        movement_type="initial_stock",
        quantity=product.stock_level
    )
    db.add(stock_movement)
    db.commit()
    db.refresh(new_product)
    return {"message": "Product added successfully", "product": new_product}

    
