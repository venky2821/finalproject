from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class User(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_active: bool = True
    role_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ResetPassword(BaseModel):
    email: EmailStr

class ChangePassword(BaseModel):
    token: str
    new_password: str

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock_level: int
    supplier_id: int
    cost_price: float
    reorder_threshold: int
    reserved_stock: int

class ProductStockUpdate(BaseModel):
    name: str
    stock_level: int
    supplier_id: int

class WishlistItemBase(BaseModel):
    product_id: int

class WishlistItemCreate(WishlistItemBase):
    pass

class WishlistItem(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Product(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    category: str
    stock_level: int
    supplier_id: int
    cost_price: float
    reorder_threshold: int
    reserved_stock: int

    model_config = ConfigDict(from_attributes=True)
