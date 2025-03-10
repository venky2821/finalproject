from models import User, Order, Product, OrderItem, StockMovement
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_current_user
from sqlalchemy.orm import Session
from typing import List

router = APIRouter()

@router.post("/reserve")
def reserve_items(purchases: List[dict], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_price = 0
    order = Order(customer_name=current_user.username, total_price=0, status="reserved")  # Status = "reserved"
    db.add(order)
    db.commit()
    db.refresh(order)

    for purchase in purchases:
        product_id = purchase.get('product_id')
        quantity = purchase.get('quantity')

        product = db.query(Product).filter(Product.name == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with id {product_id} not found")

        if product.stock_level < quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for product {product.name}")

        price = product.price * quantity
        total_price += price

        # Create OrderItem entry
        order_item = OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, price=price)
        db.add(order_item)

        # Instead of reducing stock, mark it as "reserved"
        stock_movement = StockMovement(product_id=product.id, movement_type="reserve", quantity=-quantity)
        db.add(stock_movement)

        product.reserved_stock = product.reserved_stock + quantity  # Store reserved quantity
        product.stock_level -= quantity  # Reduce available stock but don't finalize the purchase

    order.total_price = total_price
    db.add(order)
    db.commit()

    return {"message": "Items reserved successfully. Waiting for admin approval."}

@router.post("/approve-purchase/{order_id}")
def approve_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if the user is an admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")

    order = db.query(Order).filter(Order.id == order_id, Order.status == "reserved").first()
    if not order:
        raise HTTPException(status_code=404, detail="Reserved order not found")

    # Finalize the purchase
    for item in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue  # Product may have been removed

        # Confirm stock movement from "reserved" to "sale"
        stock_movement = StockMovement(product_id=product.id, movement_type="sale", quantity=-item.quantity)
        db.add(stock_movement)

        product.reserved_stock -= item.quantity  # Remove reserved stock

    order.status = "completed"  # Mark order as completed
    db.add(order)
    db.commit()

    return {"message": "Purchase approved successfully"}

@router.get("/orders/reserved")
def get_reserved_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role_id != 1:
        return {"error": "Access denied"}
    
    orders = db.query(Order).filter(Order.status == "reserved").all()

    # Fetch order details with items
    order_list = []
    for order in orders:
        # items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        items = db.query(OrderItem, Product.name).join(Product, OrderItem.product_id == Product.id).filter(OrderItem.order_id == order.id).all()
        order_list.append({
            "id": order.id,
            "customer_name": order.customer_name,
            "total_price": order.total_price,
            "status": order.status,
            "items": [{
                "product_id": item.OrderItem.product_id,
                "product_name": item.name,
                "quantity": item.OrderItem.quantity,
                "price": item.OrderItem.price
            } for item in items]
        })

    return order_list

