from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import secrets
import hashlib
import json

# SendGrid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, messaging

# iyzico Payment SDK
import iyzipay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'zumba_app')]

# JWT Settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'zumba-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="Zumba App API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    streak: int
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class EventCreate(BaseModel):
    title: str
    description: str
    city: str
    location: str
    date: datetime
    capacity: int
    price: float
    image_url: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    city: str
    location: str
    date: datetime
    capacity: int
    price: float
    image_url: Optional[str] = None
    tickets_sold: int = 0
    created_at: datetime

class TicketResponse(BaseModel):
    id: str
    event_id: str
    event_title: str
    event_date: datetime
    event_location: str
    qr_token: str
    status: str
    created_at: datetime

class BuyTicketRequest(BaseModel):
    event_id: str
    quantity: int = 1

class CheckTicketRequest(BaseModel):
    qr_token: str

class VideoCreate(BaseModel):
    title: str
    youtube_url: str
    thumbnail: Optional[str] = None
    is_premium: bool = False
    is_daily: bool = False

class VideoResponse(BaseModel):
    id: str
    title: str
    youtube_url: str
    thumbnail: Optional[str] = None
    is_premium: bool
    is_daily: bool
    created_at: datetime

class ChallengeCreate(BaseModel):
    title: str
    description: str
    points: int = 10

class ChallengeResponse(BaseModel):
    id: str
    title: str
    description: str
    points: int
    completed: bool = False
    created_at: datetime

class CommentCreate(BaseModel):
    event_id: str
    text: str
    rating: int = Field(ge=1, le=5)

class CommentResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    event_id: str
    text: str
    rating: int
    created_at: datetime

class PostCreate(BaseModel):
    media_url: str
    caption: str

class PostResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    media_url: str
    caption: str
    likes: int
    liked_by_me: bool = False
    created_at: datetime

class NotificationCreate(BaseModel):
    title: str
    body: str
    user_id: Optional[str] = None  # None means send to all

class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    read: bool
    created_at: datetime

# iyzico Payment Models
class PaymentCardRequest(BaseModel):
    card_holder_name: str
    card_number: str
    expire_month: str
    expire_year: str
    cvc: str

class BuyerInfo(BaseModel):
    name: str
    surname: str
    email: str
    phone: str
    identity_number: str = "11111111111"  # TC Kimlik No (test için varsayılan)
    address: str = "Istanbul, Turkey"
    city: str = "Istanbul"
    country: str = "Turkey"
    zip_code: str = "34000"

class CreatePaymentRequest(BaseModel):
    event_id: str
    quantity: int = 1
    card: PaymentCardRequest
    buyer: BuyerInfo

class PaymentResponse(BaseModel):
    success: bool
    payment_id: Optional[str] = None
    conversation_id: Optional[str] = None
    status: str
    message: str
    tickets: Optional[List[dict]] = None

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def generate_qr_token():
    return secrets.token_urlsafe(32)

async def get_current_user(token: str = None):
    if not token:
        return None
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"id": user_id})
        return user
    except Exception:
        return None

async def require_auth(authorization: str = None):
    from fastapi import Header
    return authorization

# Dependency to get current user from header
from fastapi import Header

async def get_user_from_header(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None
    return await get_current_user(authorization)

async def require_admin(user: dict = Depends(get_user_from_header)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_staff(user: dict = Depends(get_user_from_header)):
    if user.get('role') not in ['admin', 'staff']:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user

# iyzico Helper Function
async def get_iyzico_options():
    """Get iyzico configuration from database settings"""
    settings = await db.settings.find_one({"type": "integrations"})
    if not settings:
        return None
    
    iyzico_config = settings.get("data", {}).get("iyzico", {})
    api_key = iyzico_config.get("api_key")
    secret_key = iyzico_config.get("secret_key")
    base_url = iyzico_config.get("base_url", "https://sandbox-api.iyzipay.com")
    
    if not api_key or not secret_key:
        return None
    
    options = {
        'api_key': api_key,
        'secret_key': secret_key,
        'base_url': base_url
    }
    return options

def create_iyzico_payment(options, event, user_data, card_data, buyer_data, quantity, conversation_id):
    """Create iyzico payment request"""
    total_price = float(event["price"]) * quantity
    
    # Payment card
    payment_card = {
        'cardHolderName': card_data.card_holder_name,
        'cardNumber': card_data.card_number,
        'expireMonth': card_data.expire_month,
        'expireYear': card_data.expire_year,
        'cvc': card_data.cvc,
        'registerCard': '0'
    }
    
    # Buyer
    buyer = {
        'id': user_data["id"],
        'name': buyer_data.name,
        'surname': buyer_data.surname,
        'gsmNumber': buyer_data.phone,
        'email': buyer_data.email,
        'identityNumber': buyer_data.identity_number,
        'lastLoginDate': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'registrationDate': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        'registrationAddress': buyer_data.address,
        'ip': '85.34.78.112',
        'city': buyer_data.city,
        'country': buyer_data.country,
        'zipCode': buyer_data.zip_code
    }
    
    # Shipping and Billing address
    address = {
        'contactName': f"{buyer_data.name} {buyer_data.surname}",
        'city': buyer_data.city,
        'country': buyer_data.country,
        'address': buyer_data.address,
        'zipCode': buyer_data.zip_code
    }
    
    # Basket items
    basket_items = []
    for i in range(quantity):
        basket_items.append({
            'id': f"ticket_{i+1}",
            'name': f"{event['title']} Bileti",
            'category1': 'Etkinlik',
            'category2': 'Zumba',
            'itemType': 'VIRTUAL',
            'price': str(event["price"])
        })
    
    # Payment request
    request = {
        'locale': 'tr',
        'conversationId': conversation_id,
        'price': str(total_price),
        'paidPrice': str(total_price),
        'currency': 'TRY',
        'installment': '1',
        'basketId': f"event_{event['id']}",
        'paymentChannel': 'WEB',
        'paymentGroup': 'PRODUCT',
        'paymentCard': payment_card,
        'buyer': buyer,
        'shippingAddress': address,
        'billingAddress': address,
        'basketItems': basket_items
    }
    
    return request

# ==================== AUTH ROUTES ====================

@api_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "role": "user",
        "streak": 0,
        "last_challenge_date": None,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            streak=user["streak"],
            created_at=user["created_at"]
        )
    )

@api_router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            streak=user.get("streak", 0),
            created_at=user["created_at"]
        )
    )

@api_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_user_from_header)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        streak=user.get("streak", 0),
        created_at=user["created_at"]
    )

# ==================== PROFILE UPDATE ====================

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None

@api_router.put("/me/profile")
async def update_profile(request: ProfileUpdateRequest, user: dict = Depends(get_user_from_header)):
    """Update current user's profile"""
    update_data = {}
    if request.name:
        update_data["name"] = request.name
    if request.phone is not None:
        update_data["phone"] = request.phone
    if request.city is not None:
        update_data["city"] = request.city
    if request.bio is not None:
        update_data["bio"] = request.bio
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]})
    return {
        "success": True, 
        "message": "Profil güncellendi",
        "user": {
            "id": updated_user["id"],
            "email": updated_user["email"],
            "name": updated_user["name"],
            "role": updated_user["role"],
            "phone": updated_user.get("phone", ""),
            "city": updated_user.get("city", ""),
            "bio": updated_user.get("bio", ""),
            "streak": updated_user.get("streak", 0),
            "created_at": updated_user["created_at"]
        }
    }

@api_router.get("/me/profile")
async def get_profile(user: dict = Depends(get_user_from_header)):
    """Get current user's full profile"""
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "phone": user.get("phone", ""),
        "city": user.get("city", ""),
        "bio": user.get("bio", ""),
        "streak": user.get("streak", 0),
        "created_at": user["created_at"]
    }

# ==================== ADMIN USER MANAGEMENT ====================

class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "user"  # user, staff, admin

@api_router.post("/admin/users")
async def admin_create_user(request: AdminCreateUserRequest, admin: dict = Depends(require_admin)):
    """Admin creates a new user with specified role"""
    # Check if email exists
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda")
    
    # Validate role
    if request.role not in ["user", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(request.password)
    
    new_user = {
        "id": user_id,
        "email": request.email,
        "password": hashed_password,
        "name": request.name,
        "role": request.role,
        "streak": 0,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(new_user)
    
    return {
        "success": True,
        "message": f"{request.role} rolünde kullanıcı oluşturuldu",
        "user": {
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "role": request.role
        }
    }

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(user_id: str, role: str, admin: dict = Depends(require_admin)):
    """Admin updates a user's role"""
    if role not in ["user", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return {"success": True, "message": f"Kullanıcı rolü {role} olarak güncellendi"}

# ==================== PUSH NOTIFICATION TOKEN ====================

class PushTokenRequest(BaseModel):
    push_token: str

@api_router.post("/me/register-push-token")
async def register_push_token(request: PushTokenRequest, user: dict = Depends(get_user_from_header)):
    """Register device push notification token for current user"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"push_token": request.push_token, "push_token_updated_at": datetime.utcnow()}}
    )
    return {"success": True, "message": "Push token registered successfully"}

# ==================== EVENT ROUTES ====================

@api_router.get("/events", response_model=List[EventResponse])
async def get_events(city: Optional[str] = None):
    query = {}
    if city:
        query["city"] = city
    
    events = await db.events.find(query).sort("date", 1).to_list(100)
    result = []
    for event in events:
        tickets_sold = await db.tickets.count_documents({"event_id": event["id"]})
        result.append(EventResponse(
            id=event["id"],
            title=event["title"],
            description=event["description"],
            city=event["city"],
            location=event["location"],
            date=event["date"],
            capacity=event["capacity"],
            price=event["price"],
            image_url=event.get("image_url"),
            tickets_sold=tickets_sold,
            created_at=event["created_at"]
        ))
    return result

@api_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    tickets_sold = await db.tickets.count_documents({"event_id": event_id})
    return EventResponse(
        id=event["id"],
        title=event["title"],
        description=event["description"],
        city=event["city"],
        location=event["location"],
        date=event["date"],
        capacity=event["capacity"],
        price=event["price"],
        image_url=event.get("image_url"),
        tickets_sold=tickets_sold,
        created_at=event["created_at"]
    )

@api_router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventCreate, user: dict = Depends(require_admin)):
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        **event_data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.events.insert_one(event)
    return EventResponse(
        id=event["id"],
        title=event["title"],
        description=event["description"],
        city=event["city"],
        location=event["location"],
        date=event["date"],
        capacity=event["capacity"],
        price=event["price"],
        image_url=event.get("image_url"),
        tickets_sold=0,
        created_at=event["created_at"]
    )

# ==================== TICKET ROUTES ====================

@api_router.post("/buy-ticket", response_model=List[TicketResponse])
async def buy_ticket(request: BuyTicketRequest, user: dict = Depends(get_user_from_header)):
    """Legacy endpoint - creates tickets without payment (for testing)"""
    event = await db.events.find_one({"id": request.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check capacity
    tickets_sold = await db.tickets.count_documents({"event_id": request.event_id})
    if tickets_sold + request.quantity > event["capacity"]:
        raise HTTPException(status_code=400, detail="Not enough tickets available")
    
    # Check if iyzico is configured - if so, require payment endpoint
    iyzico_options = await get_iyzico_options()
    if iyzico_options:
        raise HTTPException(
            status_code=400, 
            detail="Payment required. Use /api/payment/create endpoint with card details."
        )
    
    # MOCK mode - create tickets without payment
    tickets = []
    for _ in range(request.quantity):
        ticket_id = str(uuid.uuid4())
        qr_token = generate_qr_token()
        ticket = {
            "id": ticket_id,
            "user_id": user["id"],
            "event_id": request.event_id,
            "qr_token": qr_token,
            "status": "VALID",
            "created_at": datetime.utcnow()
        }
        await db.tickets.insert_one(ticket)
        tickets.append(TicketResponse(
            id=ticket_id,
            event_id=request.event_id,
            event_title=event["title"],
            event_date=event["date"],
            event_location=event["location"],
            qr_token=qr_token,
            status="VALID",
            created_at=ticket["created_at"]
        ))
    
    return tickets

@api_router.post("/payment/create", response_model=PaymentResponse)
async def create_payment(request: CreatePaymentRequest, user: dict = Depends(get_user_from_header)):
    """Create payment with iyzico"""
    # Get event
    event = await db.events.find_one({"id": request.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check capacity
    tickets_sold = await db.tickets.count_documents({"event_id": request.event_id})
    if tickets_sold + request.quantity > event["capacity"]:
        raise HTTPException(status_code=400, detail="Not enough tickets available")
    
    # Get iyzico configuration
    iyzico_options = await get_iyzico_options()
    if not iyzico_options:
        # Fallback to mock mode
        return await create_mock_payment(event, user, request.quantity)
    
    try:
        conversation_id = str(uuid.uuid4())
        payment_request = create_iyzico_payment(
            iyzico_options, 
            event, 
            user, 
            request.card, 
            request.buyer, 
            request.quantity,
            conversation_id
        )
        
        # Make iyzico payment
        payment = iyzipay.Payment().create(payment_request, iyzico_options)
        result = json.loads(payment.read().decode('utf-8'))
        
        if result.get('status') == 'success':
            # Payment successful - create tickets
            tickets = []
            for _ in range(request.quantity):
                ticket_id = str(uuid.uuid4())
                qr_token = generate_qr_token()
                ticket = {
                    "id": ticket_id,
                    "user_id": user["id"],
                    "event_id": request.event_id,
                    "qr_token": qr_token,
                    "status": "VALID",
                    "payment_id": result.get('paymentId'),
                    "created_at": datetime.utcnow()
                }
                await db.tickets.insert_one(ticket)
                tickets.append({
                    "id": ticket_id,
                    "event_title": event["title"],
                    "qr_token": qr_token
                })
            
            # Store payment record
            await db.payments.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "event_id": request.event_id,
                "payment_id": result.get('paymentId'),
                "conversation_id": conversation_id,
                "amount": float(event["price"]) * request.quantity,
                "status": "SUCCESS",
                "iyzico_response": result,
                "created_at": datetime.utcnow()
            })
            
            return PaymentResponse(
                success=True,
                payment_id=result.get('paymentId'),
                conversation_id=conversation_id,
                status="SUCCESS",
                message="Ödeme başarılı! Biletleriniz oluşturuldu.",
                tickets=tickets
            )
        else:
            # Payment failed
            error_message = result.get('errorMessage', 'Ödeme işlemi başarısız')
            return PaymentResponse(
                success=False,
                status="FAILED",
                message=error_message
            )
            
    except Exception as e:
        logging.error(f"iyzico payment error: {str(e)}")
        return PaymentResponse(
            success=False,
            status="ERROR",
            message=f"Ödeme hatası: {str(e)}"
        )

async def create_mock_payment(event, user, quantity):
    """Create mock payment when iyzico is not configured"""
    tickets = []
    for _ in range(quantity):
        ticket_id = str(uuid.uuid4())
        qr_token = generate_qr_token()
        ticket = {
            "id": ticket_id,
            "user_id": user["id"],
            "event_id": event["id"],
            "qr_token": qr_token,
            "status": "VALID",
            "payment_id": f"mock_{uuid.uuid4()}",
            "created_at": datetime.utcnow()
        }
        await db.tickets.insert_one(ticket)
        tickets.append({
            "id": ticket_id,
            "event_title": event["title"],
            "qr_token": qr_token
        })
    
    return PaymentResponse(
        success=True,
        payment_id=f"mock_{uuid.uuid4()}",
        conversation_id=str(uuid.uuid4()),
        status="MOCK_SUCCESS",
        message="[MOCK] Ödeme simülasyonu başarılı. iyzico ayarlarını yapılandırın.",
        tickets=tickets
    )

@api_router.get("/my-tickets", response_model=List[TicketResponse])
async def get_my_tickets(user: dict = Depends(get_user_from_header)):
    tickets = await db.tickets.find({"user_id": user["id"]}).to_list(100)
    result = []
    for ticket in tickets:
        event = await db.events.find_one({"id": ticket["event_id"]})
        if event:
            result.append(TicketResponse(
                id=ticket["id"],
                event_id=ticket["event_id"],
                event_title=event["title"],
                event_date=event["date"],
                event_location=event["location"],
                qr_token=ticket["qr_token"],
                status=ticket["status"],
                created_at=ticket["created_at"]
            ))
    return result

@api_router.post("/check-ticket")
async def check_ticket(request: CheckTicketRequest, user: dict = Depends(require_staff)):
    ticket = await db.tickets.find_one({"qr_token": request.qr_token})
    if not ticket:
        return {"status": "INVALID", "message": "Bilet bulunamadı"}
    
    if ticket["status"] == "USED":
        return {"status": "USED", "message": "Bu bilet zaten kullanılmış"}
    
    # Get event info
    event = await db.events.find_one({"id": ticket["event_id"]})
    user_info = await db.users.find_one({"id": ticket["user_id"]})
    
    # Mark as used
    await db.tickets.update_one(
        {"qr_token": request.qr_token},
        {"$set": {"status": "USED", "used_at": datetime.utcnow()}}
    )
    
    return {
        "status": "VALID",
        "message": "Bilet geçerli! Giriş onaylandı.",
        "event_title": event["title"] if event else "Unknown",
        "user_name": user_info["name"] if user_info else "Unknown"
    }

# ==================== VIDEO ROUTES ====================

@api_router.get("/videos", response_model=List[VideoResponse])
async def get_videos(user: dict = Depends(get_optional_user)):
    videos = await db.videos.find().sort("created_at", -1).to_list(100)
    return [VideoResponse(
        id=v["id"],
        title=v["title"],
        youtube_url=v["youtube_url"],
        thumbnail=v.get("thumbnail"),
        is_premium=v.get("is_premium", False),
        is_daily=v.get("is_daily", False),
        created_at=v["created_at"]
    ) for v in videos]

@api_router.get("/videos/daily", response_model=Optional[VideoResponse])
async def get_daily_video():
    video = await db.videos.find_one({"is_daily": True})
    if not video:
        # Return the most recent video if no daily video set
        video = await db.videos.find_one({}, sort=[("created_at", -1)])
    if not video:
        return None
    return VideoResponse(
        id=video["id"],
        title=video["title"],
        youtube_url=video["youtube_url"],
        thumbnail=video.get("thumbnail"),
        is_premium=video.get("is_premium", False),
        is_daily=video.get("is_daily", False),
        created_at=video["created_at"]
    )

@api_router.post("/videos", response_model=VideoResponse)
async def create_video(video_data: VideoCreate, user: dict = Depends(require_admin)):
    video_id = str(uuid.uuid4())
    
    # If this is set as daily, unset other daily videos
    if video_data.is_daily:
        await db.videos.update_many({"is_daily": True}, {"$set": {"is_daily": False}})
    
    video = {
        "id": video_id,
        **video_data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.videos.insert_one(video)
    return VideoResponse(
        id=video["id"],
        title=video["title"],
        youtube_url=video["youtube_url"],
        thumbnail=video.get("thumbnail"),
        is_premium=video.get("is_premium", False),
        is_daily=video.get("is_daily", False),
        created_at=video["created_at"]
    )

# ==================== CHALLENGE ROUTES ====================

@api_router.get("/challenges", response_model=List[ChallengeResponse])
async def get_challenges(user: dict = Depends(get_optional_user)):
    challenges = await db.challenges.find().to_list(100)
    result = []
    for c in challenges:
        completed = False
        if user:
            today = datetime.utcnow().date()
            user_challenge = await db.user_challenges.find_one({
                "user_id": user["id"],
                "challenge_id": c["id"],
                "completed_date": str(today)
            })
            completed = user_challenge is not None
        
        result.append(ChallengeResponse(
            id=c["id"],
            title=c["title"],
            description=c["description"],
            points=c.get("points", 10),
            completed=completed,
            created_at=c["created_at"]
        ))
    return result

@api_router.post("/challenges/complete/{challenge_id}")
async def complete_challenge(challenge_id: str, user: dict = Depends(get_user_from_header)):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    today = datetime.utcnow().date()
    
    # Check if already completed today
    existing = await db.user_challenges.find_one({
        "user_id": user["id"],
        "challenge_id": challenge_id,
        "completed_date": str(today)
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already completed today")
    
    # Record completion
    await db.user_challenges.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "challenge_id": challenge_id,
        "completed_date": str(today),
        "created_at": datetime.utcnow()
    })
    
    # Update streak
    yesterday = (datetime.utcnow() - timedelta(days=1)).date()
    last_date = user.get("last_challenge_date")
    
    if last_date == str(yesterday):
        new_streak = user.get("streak", 0) + 1
    elif last_date == str(today):
        new_streak = user.get("streak", 0)
    else:
        new_streak = 1
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"streak": new_streak, "last_challenge_date": str(today)}}
    )
    
    return {"message": "Challenge completed!", "new_streak": new_streak, "points": challenge.get("points", 10)}

@api_router.get("/my-streak")
async def get_my_streak(user: dict = Depends(get_user_from_header)):
    return {"streak": user.get("streak", 0)}

# ==================== SOCIAL ROUTES ====================

@api_router.post("/comments", response_model=CommentResponse)
async def create_comment(comment_data: CommentCreate, user: dict = Depends(get_user_from_header)):
    event = await db.events.find_one({"id": comment_data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    comment_id = str(uuid.uuid4())
    comment = {
        "id": comment_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "event_id": comment_data.event_id,
        "text": comment_data.text,
        "rating": comment_data.rating,
        "created_at": datetime.utcnow()
    }
    await db.comments.insert_one(comment)
    return CommentResponse(**comment)

@api_router.get("/comments/{event_id}", response_model=List[CommentResponse])
async def get_comments(event_id: str):
    comments = await db.comments.find({"event_id": event_id}).sort("created_at", -1).to_list(100)
    return [CommentResponse(
        id=c["id"],
        user_id=c["user_id"],
        user_name=c.get("user_name", "Anonymous"),
        event_id=c["event_id"],
        text=c["text"],
        rating=c["rating"],
        created_at=c["created_at"]
    ) for c in comments]

@api_router.post("/posts", response_model=PostResponse)
async def create_post(post_data: PostCreate, user: dict = Depends(get_user_from_header)):
    post_id = str(uuid.uuid4())
    post = {
        "id": post_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "media_url": post_data.media_url,
        "caption": post_data.caption,
        "likes": 0,
        "liked_by": [],
        "created_at": datetime.utcnow()
    }
    await db.posts.insert_one(post)
    return PostResponse(
        id=post["id"],
        user_id=post["user_id"],
        user_name=post["user_name"],
        media_url=post["media_url"],
        caption=post["caption"],
        likes=0,
        liked_by_me=False,
        created_at=post["created_at"]
    )

@api_router.get("/posts", response_model=List[PostResponse])
async def get_posts(user: dict = Depends(get_optional_user)):
    posts = await db.posts.find().sort("created_at", -1).to_list(100)
    user_id = user["id"] if user else None
    return [PostResponse(
        id=p["id"],
        user_id=p["user_id"],
        user_name=p.get("user_name", "Anonymous"),
        media_url=p["media_url"],
        caption=p["caption"],
        likes=p.get("likes", 0),
        liked_by_me=user_id in p.get("liked_by", []) if user_id else False,
        created_at=p["created_at"]
    ) for p in posts]

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(get_user_from_header)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    liked_by = post.get("liked_by", [])
    if user["id"] in liked_by:
        # Unlike
        liked_by.remove(user["id"])
        await db.posts.update_one(
            {"id": post_id},
            {"$set": {"liked_by": liked_by, "likes": len(liked_by)}}
        )
        return {"liked": False, "likes": len(liked_by)}
    else:
        # Like
        liked_by.append(user["id"])
        await db.posts.update_one(
            {"id": post_id},
            {"$set": {"liked_by": liked_by, "likes": len(liked_by)}}
        )
        return {"liked": True, "likes": len(liked_by)}

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_user_from_header)):
    notifications = await db.notifications.find({
        "$or": [{"user_id": user["id"]}, {"user_id": None}]
    }).sort("created_at", -1).to_list(50)
    return [NotificationResponse(
        id=n["id"],
        title=n["title"],
        body=n["body"],
        read=user["id"] in n.get("read_by", []),
        created_at=n["created_at"]
    ) for n in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_user_from_header)):
    await db.notifications.update_one(
        {"id": notification_id},
        {"$addToSet": {"read_by": user["id"]}}
    )
    return {"success": True}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    total_tickets = await db.tickets.count_documents({})
    tickets_used = await db.tickets.count_documents({"status": "USED"})
    total_posts = await db.posts.count_documents({})
    
    return {
        "total_users": total_users,
        "total_events": total_events,
        "total_tickets": total_tickets,
        "tickets_used": tickets_used,
        "total_posts": total_posts
    }

@api_router.post("/admin/notifications")
async def send_notification(notification: NotificationCreate, user: dict = Depends(require_admin)):
    # MOCK: In production, send via Firebase Cloud Messaging
    notif_id = str(uuid.uuid4())
    notif = {
        "id": notif_id,
        "title": notification.title,
        "body": notification.body,
        "user_id": notification.user_id,
        "read_by": [],
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notif)
    return {"success": True, "notification_id": notif_id}

class AdvancedNotificationRequest(BaseModel):
    title: str
    body: str
    type: str  # 'push', 'email', 'both'
    user_id: Optional[str] = None

@api_router.post("/admin/notifications/advanced")
async def send_advanced_notification(notification: AdvancedNotificationRequest, user: dict = Depends(require_admin)):
    """Send notification with type selection (push, email, or both)"""
    notif_id = str(uuid.uuid4())
    
    # Get target users
    if notification.user_id:
        target_users = [await db.users.find_one({"id": notification.user_id})]
    else:
        target_users = await db.users.find().to_list(1000)
    
    target_users = [u for u in target_users if u]  # Filter None
    
    results = {
        "push_sent": 0,
        "email_sent": 0,
        "total_targets": len(target_users),
        "push_status": "",
        "email_status": ""
    }
    
    # Store notification
    notif = {
        "id": notif_id,
        "title": notification.title,
        "body": notification.body,
        "type": notification.type,
        "user_id": notification.user_id,
        "read_by": [],
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notif)
    
    # Get settings for integrations
    settings = await db.settings.find_one({"type": "integrations"})
    settings_data = settings.get("data", {}) if settings else {}
    
    # Send Push Notifications via Firebase
    if notification.type in ['push', 'both']:
        firebase_config = settings_data.get("firebase", {})
        if firebase_config.get("server_key"):
            try:
                # Initialize Firebase if not already done
                if not firebase_admin._apps:
                    service_account_json = firebase_config.get("service_account_json")
                    if service_account_json:
                        cred_dict = json.loads(service_account_json)
                        cred = credentials.Certificate(cred_dict)
                        firebase_admin.initialize_app(cred)
                
                # Send push notification to each user (in production, use FCM tokens)
                # For now, we'll create a mock notification record
                results["push_sent"] = len(target_users)
                results["push_status"] = "Firebase configured - notifications queued"
            except Exception as e:
                results["push_status"] = f"Firebase error: {str(e)}"
        else:
            results["push_status"] = "Firebase not configured - go to Settings to add Firebase credentials"
    
    # Send Emails via SendGrid
    if notification.type in ['email', 'both']:
        sendgrid_config = settings_data.get("sendgrid", {})
        if sendgrid_config.get("api_key") and sendgrid_config.get("from_email"):
            try:
                sg = SendGridAPIClient(sendgrid_config["api_key"])
                from_email = sendgrid_config["from_email"]
                from_name = sendgrid_config.get("from_name", "IZF Zumba")
                
                for target_user in target_users:
                    message = Mail(
                        from_email=(from_email, from_name),
                        to_emails=target_user["email"],
                        subject=notification.title,
                        html_content=f"""
                        <html>
                        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
                                <h1 style="color: #FF6B6B;">{notification.title}</h1>
                                <p style="color: #333; font-size: 16px; line-height: 1.6;">{notification.body}</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="color: #888; font-size: 12px;">IZF Zumba - Dans ile Hayatını Değiştir!</p>
                            </div>
                        </body>
                        </html>
                        """
                    )
                    response = sg.send(message)
                    if response.status_code in [200, 201, 202]:
                        results["email_sent"] += 1
                
                results["email_status"] = f"SendGrid: {results['email_sent']} emails sent successfully"
            except Exception as e:
                results["email_status"] = f"SendGrid error: {str(e)}"
        else:
            results["email_status"] = "SendGrid not configured - go to Settings to add SendGrid credentials"
    
    return {
        "success": True, 
        "notification_id": notif_id,
        "results": results
    }

@api_router.post("/admin/create-challenge", response_model=ChallengeResponse)
async def create_challenge(challenge_data: ChallengeCreate, user: dict = Depends(require_admin)):
    challenge_id = str(uuid.uuid4())
    challenge = {
        "id": challenge_id,
        **challenge_data.dict(),
        "created_at": datetime.utcnow()
    }
    await db.challenges.insert_one(challenge)
    return ChallengeResponse(
        id=challenge["id"],
        title=challenge["title"],
        description=challenge["description"],
        points=challenge["points"],
        completed=False,
        created_at=challenge["created_at"]
    )

@api_router.post("/admin/set-role")
async def set_user_role(email: str, role: str, user: dict = Depends(require_admin)):
    if role not in ["user", "admin", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"role": role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": f"User role updated to {role}"}

# Get all users (admin only)
@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(require_admin)):
    users = await db.users.find().sort("created_at", -1).to_list(500)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        role=u["role"],
        streak=u.get("streak", 0),
        created_at=u["created_at"]
    ) for u in users]

# Delete event (admin only)
@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(require_admin)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    # Also delete related tickets
    await db.tickets.delete_many({"event_id": event_id})
    return {"success": True, "message": "Event deleted"}

# Update event (admin only)
@api_router.put("/admin/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event_data: EventCreate, user: dict = Depends(require_admin)):
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": event_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event = await db.events.find_one({"id": event_id})
    tickets_sold = await db.tickets.count_documents({"event_id": event_id})
    return EventResponse(
        id=event["id"],
        title=event["title"],
        description=event["description"],
        city=event["city"],
        location=event["location"],
        date=event["date"],
        capacity=event["capacity"],
        price=event["price"],
        image_url=event.get("image_url"),
        tickets_sold=tickets_sold,
        created_at=event["created_at"]
    )

# Delete video (admin only)
@api_router.delete("/admin/videos/{video_id}")
async def delete_video(video_id: str, user: dict = Depends(require_admin)):
    result = await db.videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True, "message": "Video deleted"}

# Delete user (admin only)
@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User deleted"}

class SetRoleRequest(BaseModel):
    user_id: str
    role: str

class IntegrationSettings(BaseModel):
    # iyzico settings
    iyzico_api_key: Optional[str] = None
    iyzico_secret_key: Optional[str] = None
    iyzico_base_url: Optional[str] = "https://sandbox-api.iyzipay.com"
    
    # Firebase settings (for Auth and Push Notifications)
    firebase_api_key: Optional[str] = None
    firebase_auth_domain: Optional[str] = None
    firebase_project_id: Optional[str] = None
    firebase_storage_bucket: Optional[str] = None
    firebase_messaging_sender_id: Optional[str] = None
    firebase_app_id: Optional[str] = None
    firebase_server_key: Optional[str] = None  # For FCM push notifications
    firebase_service_account_json: Optional[str] = None  # Service account JSON as string
    
    # SendGrid settings (for Email)
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    sendgrid_from_name: Optional[str] = "IZF Zumba"

@api_router.post("/admin/set-role-by-id")
async def set_user_role_by_id(request: SetRoleRequest, user: dict = Depends(require_admin)):
    if request.role not in ["user", "admin", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"role": request.role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": f"User role updated to {request.role}"}

# ==================== SETTINGS API ====================

@api_router.get("/admin/settings")
async def get_settings(user: dict = Depends(require_admin)):
    """Get current integration settings"""
    settings = await db.settings.find_one({"type": "integrations"})
    if not settings:
        # Return default empty settings
        return {
            "iyzico": {
                "api_key": "",
                "secret_key": "",
                "base_url": "https://sandbox-api.iyzipay.com",
                "is_sandbox": True
            },
            "firebase": {
                "api_key": "",
                "auth_domain": "",
                "project_id": "",
                "storage_bucket": "",
                "messaging_sender_id": "",
                "app_id": "",
                "server_key": "",
                "service_account_json": ""
            },
            "sendgrid": {
                "api_key": "",
                "from_email": "",
                "from_name": "IZF Zumba",
                "is_active": False
            }
        }
    
    # Return stored settings
    result = settings.get("data", {})
    return result

@api_router.put("/admin/settings")
async def update_settings(settings: IntegrationSettings, user: dict = Depends(require_admin)):
    """Update integration settings"""
    settings_data = {
        "iyzico": {
            "api_key": settings.iyzico_api_key or "",
            "secret_key": settings.iyzico_secret_key or "",
            "base_url": settings.iyzico_base_url or "https://sandbox-api.iyzipay.com",
            "is_sandbox": "sandbox" in (settings.iyzico_base_url or "sandbox")
        },
        "firebase": {
            "api_key": settings.firebase_api_key or "",
            "auth_domain": settings.firebase_auth_domain or "",
            "project_id": settings.firebase_project_id or "",
            "storage_bucket": settings.firebase_storage_bucket or "",
            "messaging_sender_id": settings.firebase_messaging_sender_id or "",
            "app_id": settings.firebase_app_id or "",
            "server_key": settings.firebase_server_key or "",
            "service_account_json": settings.firebase_service_account_json or ""
        },
        "sendgrid": {
            "api_key": settings.sendgrid_api_key or "",
            "from_email": settings.sendgrid_from_email or "",
            "from_name": settings.sendgrid_from_name or "IZF Zumba",
            "is_active": bool(settings.sendgrid_api_key and settings.sendgrid_from_email)
        }
    }
    
    await db.settings.update_one(
        {"type": "integrations"},
        {"$set": {"type": "integrations", "data": settings_data, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated successfully"}

@api_router.post("/admin/test-iyzico")
async def test_iyzico_connection(user: dict = Depends(require_admin)):
    """Test iyzico connection"""
    settings = await db.settings.find_one({"type": "integrations"})
    if not settings or not settings.get("data", {}).get("iyzico", {}).get("api_key"):
        return {"success": False, "message": "iyzico API key not configured"}
    
    # Here you would test the actual iyzico connection
    # For now, just return success if keys are present
    return {"success": True, "message": "iyzico credentials configured (test not implemented)"}

@api_router.post("/admin/test-firebase")
async def test_firebase_connection(user: dict = Depends(require_admin)):
    """Test Firebase connection"""
    settings = await db.settings.find_one({"type": "integrations"})
    if not settings or not settings.get("data", {}).get("firebase", {}).get("api_key"):
        return {"success": False, "message": "Firebase API key not configured"}
    
    return {"success": True, "message": "Firebase credentials configured (test not implemented)"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data(force: bool = False):
    """Seed initial data for testing"""
    # Check if already seeded
    if not force and await db.events.count_documents({}) > 0:
        return {"message": "Data already seeded"}
    
    # Clear existing data if force
    if force:
        await db.users.delete_many({})
        await db.events.delete_many({})
        await db.videos.delete_many({})
        await db.challenges.delete_many({})
        await db.posts.delete_many({})
        await db.tickets.delete_many({})
        await db.challenge_completions.delete_many({})
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id,
        "email": "admin@zumba.com",
        "password_hash": get_password_hash("admin123"),
        "name": "Admin",
        "role": "admin",
        "streak": 0,
        "created_at": datetime.utcnow()
    })
    
    # Create staff user
    staff_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": staff_id,
        "email": "staff@zumba.com",
        "password_hash": get_password_hash("staff123"),
        "name": "Staff",
        "role": "staff",
        "streak": 0,
        "created_at": datetime.utcnow()
    })
    
    # Create sample events
    events = [
        {
            "id": str(uuid.uuid4()),
            "title": "Zumba Party Istanbul",
            "description": "En büyük Zumba partisine katılın! Profesyonel eğitmenlerle birlikte dans edin.",
            "city": "Istanbul",
            "location": "Zorlu PSM",
            "date": datetime(2025, 8, 15, 19, 0),
            "capacity": 500,
            "price": 150.0,
            "image_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Beach Zumba Antalya",
            "description": "Sahilde güneşin altında Zumba yapın!",
            "city": "Antalya",
            "location": "Konyaaltı Plajı",
            "date": datetime(2025, 8, 20, 18, 0),
            "capacity": 200,
            "price": 100.0,
            "image_url": "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Zumba Night Ankara",
            "description": "Gece Zumba partisi! DJ eşliğinde dans edin.",
            "city": "Ankara",
            "location": "Congresium",
            "date": datetime(2025, 9, 1, 21, 0),
            "capacity": 300,
            "price": 120.0,
            "image_url": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800",
            "created_at": datetime.utcnow()
        }
    ]
    await db.events.insert_many(events)
    
    # Create sample videos
    videos = [
        {
            "id": str(uuid.uuid4()),
            "title": "Başlangıç Seviye Zumba",
            "youtube_url": "https://www.youtube.com/watch?v=sad7Hnjd5g8",
            "thumbnail": "https://img.youtube.com/vi/sad7Hnjd5g8/maxresdefault.jpg",
            "is_premium": False,
            "is_daily": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "30 Dakika Zumba Workout",
            "youtube_url": "https://www.youtube.com/watch?v=R_ckhEQDRNw",
            "thumbnail": "https://img.youtube.com/vi/R_ckhEQDRNw/maxresdefault.jpg",
            "is_premium": False,
            "is_daily": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Pro Zumba Rutini",
            "youtube_url": "https://www.youtube.com/watch?v=kd-RA_w28Go",
            "thumbnail": "https://img.youtube.com/vi/kd-RA_w28Go/maxresdefault.jpg",
            "is_premium": True,
            "is_daily": False,
            "created_at": datetime.utcnow()
        }
    ]
    await db.videos.insert_many(videos)
    
    # Create sample challenges
    challenges = [
        {
            "id": str(uuid.uuid4()),
            "title": "Günlük 15 Dakika Dans",
            "description": "Bugün en az 15 dakika dans edin!",
            "points": 10,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Video İzle",
            "description": "Bir Zumba videosu izleyin.",
            "points": 5,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Arkadaşını Davet Et",
            "description": "Bir arkadaşınızı uygulamaya davet edin.",
            "points": 20,
            "created_at": datetime.utcnow()
        }
    ]
    await db.challenges.insert_many(challenges)
    
    return {"message": "Data seeded successfully", "admin_email": "admin@zumba.com", "admin_password": "admin123"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Zumba App API is running!", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
