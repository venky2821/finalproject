import models
import asyncio
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import secrets
import smtplib
import sqlite3
import os
import pyclamd
import utils
import uuid
from typing import Optional
from fastapi import Depends, FastAPI, File, Form, HTTPException, status, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from reporting_api import router as reporting_router
from user_account_service import router as user_account_router
from order_api import router as ordering_router
from batch_api import router as batch_router
from review_api import router as review_router
from product_api import router as product_router
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, ConfigDict
from sqlalchemy.orm import Session
from utils import get_password_hash, validate_image

from data_loader import add_batches, add_products, add_suppliers, add_default_roles, add_admin_role
from database import get_db, engine, get_session
from models import Base, Product, Supplier, User, LoginActivity, Photo, StockMovement, ProductImage
from auth_controller import router as auth_router

from schemas import ProductCreate, ProductStockUpdate

from fastapi.staticfiles import StaticFiles

from prometheus_fastapi_instrumentator import Instrumentator

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from wishlist_api import router as wishlist_router

# Database and Email Configuration
DB_PATH = "app.db"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "velvetvalpo@gmail.com"
EMAIL_PASSWORD = "srasrfvhbaevwmfe"
EMAIL_RECEIVER = "ravulapally.saicharan261@gmail.com"

models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
# app = FastAPI()
app = FastAPI(debug=False)

# Create the limiter
limiter = Limiter(key_func=get_remote_address)

# Attach to FastAPI app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(reporting_router)
app.include_router(user_account_router)
app.include_router(ordering_router)
app.include_router(batch_router)
app.include_router(review_router)
app.include_router(product_router)
app.include_router(wishlist_router)

# Attach the Prometheus instrumentator
Instrumentator().instrument(app).expose(app)

# Create photos directory if it doesn't exist and mount it for static files
PHOTOS_DIR = "photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=PHOTOS_DIR), name="static")

REVIEW_PHOTOS_DIR = "review_photos"
os.makedirs(REVIEW_PHOTOS_DIR, exist_ok=True)
app.mount("/review/static", StaticFiles(directory=REVIEW_PHOTOS_DIR), name="review_static")



# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Security configurations
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models

class User(BaseModel):
    email: EmailStr
    username: str
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ResetPassword(BaseModel):
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)

class SupplierCreate(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: EmailStr
    address: str
    
    model_config = ConfigDict(from_attributes=True)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please wait before retrying."}
    )

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == username).first()
    if user is None:
        raise credentials_exception
    return user

async def check_low_stock():
    """Checks for low stock products and sends email notifications every 3 Hours."""
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            query = """SELECT name, stock_level, reorder_threshold FROM Products WHERE stock_level < reorder_threshold"""
            cursor.execute(query)
            low_stock_items = cursor.fetchall()

            restocked_items = []  # To store for email notification

            for name, stock_level, reorder_threshold in low_stock_items:
                new_stock_level = stock_level + reorder_threshold
                
                # Update stock level in the database
                cursor.execute("""
                    UPDATE Products SET stock_level = ? WHERE name = ?
                """, (new_stock_level, name))
                
                restocked_items.append((name, stock_level, new_stock_level))  # Store for email notification

            conn.commit()  # Commit changes
            conn.close()

            db: Session = get_session()
            for name, stock_level, new_stock_level in restocked_items:
                product = db.query(Product).filter(Product.name == name).first()
                if product:
                    stock_movement = StockMovement(
                        product_id=product.id,
                        movement_type="restock",
                        quantity=product.reorder_threshold
                    )
                    db.add(stock_movement)
            
            db.commit()
            db.close()

            if low_stock_items:
                await send_email_notification(low_stock_items)
                print("Low stock alert email sent successfully.")

        except Exception as e:
            print(f"Error checking low stock: {e}")

        await asyncio.sleep(3600 * 3)  # Wait for 3 hours before checking again

async def send_email_notification(products):
    """Sends an email notification for low stock products."""
    try:
        subject = "Low Stock Alert 🚨"
        body = "The following products are low in stock:\n\n"

        for name, stock, threshold in products:
            body += f"- {name}: {stock} (Threshold: {threshold})\n"

        msg = MIMEMultipart()
        msg["From"] = EMAIL_SENDER
        msg["To"] = EMAIL_RECEIVER
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Sending email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        server.quit()

        print("Low stock alert email sent successfully.")

    except Exception as e:
        print(f"Error sending email: {e}")

# API endpoints
@app.on_event("startup")
async def start_background_task():
    """Starts the background task when FastAPI app starts."""
    asyncio.create_task(check_low_stock())

@app.post("/token", response_model=Token)
# @limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "Unknown Device")

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    last_login = db.query(models.LoginActivity).filter(models.LoginActivity.user_id == user.id).order_by(models.LoginActivity.timestamp.desc()).first()
    is_new_device = last_login and (last_login.ip_address != ip_address or last_login.user_agent != user_agent)

    # Log the login activity
    login_activity = models.LoginActivity(user_id=user.id, ip_address=ip_address, user_agent=user_agent)
    db.add(login_activity)
    db.commit()

    if is_new_device: 
        login_time = datetime.now().strftime("%d %b, %I:%M %p %Z")

        #send an email
        email_message = f"""
        Hi {user.username},

        We noticed a login to your account {user.email}

        Time: {login_time}

        If this was you

        You can ignore this message. There's no need to take any action.

        Best,

        Team Merchandise Inventory
        """
        utils.send_email_notification(user.email, "Login Alert for your Merchandise Inventory account", email_message)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/suppliers", response_model=list[dict])
def get_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).all()
    return [{"id": s.id, "name": s.name} for s in suppliers]

@app.post("/suppliers/add", response_model=dict)
def add_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    new_supplier = Supplier(**supplier.model_dump())
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)
    return {"message": "Supplier added successfully"}

@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    # products = db.query(Product).all()
    # return products
    products = db.query(Product).all()
    product_images = db.query(ProductImage).all()

    image_map = {}
    for image in product_images:
        image_map.setdefault(image.product_id, []).append(image.image_url)

    product_list = []
    for product in products:
        product_dict = product.__dict__.copy()
        # product_dict["image_urls"] = image_map.get(product.id, [])
        image_urls = [product.image_url] if product.image_url else []
        additional_images = image_map.get(product.id, [])
        product_dict["image_urls"] = image_urls + additional_images
        product_list.append(product_dict)

    return product_list

@app.get("/products/{product_name}")
def get_product(product_name: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.name == product_name).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/products/update-quantity")
def add_or_update_product(product: ProductStockUpdate, db: Session = Depends(get_db)):
    # Check if the product already exists in the database
    existing_product = db.query(Product).filter(models.Product.name == product.name).first()

    if existing_product:
        stock_movement = StockMovement(
            product_id=existing_product.id,
            movement_type="supply",
            quantity=product.stock_level
        )
        db.add(stock_movement)

        # Update quantity if the product exists
        existing_product.stock_level += product.stock_level
        db.commit()
        db.refresh(existing_product)
        return {"message": "Product quantity updated successfully", "product": existing_product}
    else:
        # Create a new product if it does not exist
        new_product = Product(
            name=product.name,
            stock_level=product.stock_level,
            supplier_id=product.supplier_id
        )

        stock_movement = StockMovement(
            product_id=new_product.id,
            movement_type="initial_stock",
            quantity=product.stock_level
        )
        db.add(stock_movement)
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
    return {"message": "Product added successfully", "product": new_product}

@app.get("/login-activity", response_model=list[dict])
def get_login_activity(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    login_activity = db.query(LoginActivity).filter(LoginActivity.user_id == current_user.id).all()
    return [{"id": activity.id, "user_id": activity.user_id, "timestamp": activity.timestamp} for activity in login_activity]

@app.post("/photos/upload")
def upload_photo(uploaded_file: UploadFile = File(...), category: str = Form(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    validate_image(uploaded_file)
    # Ensure the photos directory exists
    os.makedirs('photos', exist_ok=True)

    # Secure the filename
    ext = os.path.splitext(uploaded_file.filename)[1].lower()
    safe_filename = f"{uuid.uuid4().hex}{ext}"

    # Save the file to the server or cloud storage
    # file_location = f"photos/{uploaded_file.filename}"
    # Save the file to the server
    file_location = f"photos/{safe_filename}"
    with open(file_location, "wb") as file:
        file.write(uploaded_file.file.read())

    # Store the full URL in the database
    file_url = f"http://localhost:8000/static/{safe_filename}"

    # cd = pyclamd.ClamdUnixSocket()
    # Scan the file
    # scan_result = cd.scan_file(file_location)

    # if scan_result and list(scan_result.values())[0] != "OK":
        # raise HTTPException(status_code=400, detail="Malware detected!")

    # Create a new photo record
    new_photo = Photo(
        url=file_url,
        uploaded_by=current_user.id,
        category=category
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return {"message": "Photo uploaded successfully", "photo_id": new_photo.id}

@app.get("/photos")
def get_photos(category: str = None, db: Session = Depends(get_db)):
    query = db.query(Photo).filter(Photo.approved == 1, Photo.uploaded_by.isnot(None))  # Only show approved photos
    if category:
        query = query.filter(Photo.category == category)  # Filter by category
    return query.all()

@app.get("/photos/all")
def get_all_photos(db: Session = Depends(get_db)):
    photos = db.query(Photo).all()  # Fetch all photos
    return [{"id": photo.id, "url": photo.url, "category": photo.category, "approved": photo.approved} for photo in photos]

@app.put("/photos/{photo_id}/approve")
def approve_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return {"error": "Photo not found"}

    photo.approved = 1
    db.commit()
    return {"message": "Photo approved"}

@app.put("/photos/{photo_id}/reject")
def reject_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return {"error": "Photo not found"}

    photo.approved = -1
    db.commit()
    return {"message": "Photo rejected"}

@app.get("/photos/categories")
def get_photo_categories(db: Session = Depends(get_db)):
    categories = db.query(Photo.category).distinct().all()
    return [category[0] for category in categories]  # Return a list of categories

def initialize_db():
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['batches']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['orders']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['order_items']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['users']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['products']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['suppliers']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['reviews']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['login_activity']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['photos']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['stock_movements']])
    # Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['wishlist']])

    Base.metadata.create_all(engine)  # Recreate tables

if __name__ == "__main__":
    initialize_db()
    add_suppliers()
    add_products()
    add_batches()
    add_default_roles()
    add_admin_role()

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
