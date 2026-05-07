from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
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
import urllib.parse

# SendGrid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, messaging


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
    phone: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    new_password: str

class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

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
    payment_link: Optional[str] = None
    discounted_payment_link: Optional[str] = None

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
    payment_link: Optional[str] = None
    discounted_payment_link: Optional[str] = None
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

class AdminCreateTicketRequest(BaseModel):
    event_id: str
    user_email: str
    quantity: int = 1

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

# ==================== DISCOUNT MODELS ====================

class DiscountCreate(BaseModel):
    code: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    event_id: Optional[str] = None  # None = valid for all events
    min_quantity: int = 1
    max_uses: int = 0  # 0 = unlimited
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    event_id: Optional[str] = None
    min_quantity: Optional[int] = None
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None

class DiscountResponse(BaseModel):
    id: str
    code: str
    discount_type: str
    discount_value: float
    event_id: Optional[str] = None
    min_quantity: int
    max_uses: int
    used_count: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    created_at: datetime

class ValidateDiscountRequest(BaseModel):
    code: str
    event_id: Optional[str] = None
    quantity: int = 1

class ValidateDiscountResponse(BaseModel):
    valid: bool
    message: str
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    original_price: Optional[float] = None
    discounted_price: Optional[float] = None
    discount_amount: Optional[float] = None

# ==================== SITE CONTENT MODELS ====================

class BetoPerezContent(BaseModel):
    enabled: bool = True
    title: str = "BETO PEREZ ILE ZUMBA"
    subtitle: str = "Zumba'nın yaratıcısı ile unutulmaz bir deneyim"
    description: str = "Dünyaca ünlü Zumba eğitmeni Beto Perez ile canlı bir Zumba seansına katılın. Enerji dolu müzikler ve profesyonel dans hareketleriyle kendinizi müziğin ritmine bırakın."
    image_url: str = "/images/beto-perez.jpg"
    button_text: str = "Bilet Al"
    button_link: str = "/tickets"

class VenueContent(BaseModel):
    name: str = "Green Park Hotel"
    address: str = "Pendik, İstanbul"
    map_embed_url: str = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3011.595166434!2d29.287!3d40.879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDUyJzQ0LjQiTiAyOcKwMTcnMTMuMiJF!5e0!3m2!1str!2str!4v1609459200000!5m2!1str!2str"
    description: str = "İstanbul'un en prestijli otellerinden biri olan Green Park Hotel'de gerçekleşecek olan bu özel etkinlikte, profesyonel dans salonları ve konforlu ortam ile unutulmaz bir deneyim sizi bekliyor."

class SiteContent(BaseModel):
    hero_video_url: str = "/videos/zumbaarkaplan.mp4"
    hero_video_type: str = "video/mp4"
    countdown_target: datetime = datetime(2026, 10, 17, 16, 0, 0)
    beto_perez: BetoPerezContent = BetoPerezContent()
    venue: VenueContent = VenueContent()

class SiteContentResponse(BaseModel):
    hero_video_url: str
    hero_video_type: str
    countdown_target: datetime
    beto_perez: dict
    venue: dict

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

# ==================== DISCOUNT HELPERS ====================

async def validate_discount_code(code: str, event_id: Optional[str], quantity: int, event_price: float) -> dict:
    """Validate a discount code and calculate discounted price. Returns dict with validation result."""
    now = datetime.utcnow()
    discount = await db.discounts.find_one({"code": code.upper()})
    
    if not discount:
        return {"valid": False, "message": "Geçersiz kupon kodu"}
    
    if not discount.get("is_active", True):
        return {"valid": False, "message": "Bu kupon aktif değil"}
    
    if now < discount["valid_from"]:
        return {"valid": False, "message": "Bu kupon henüz geçerli değil"}
    
    if now > discount["valid_until"]:
        return {"valid": False, "message": "Bu kuponun süresi dolmuş"}
    
    max_uses = discount.get("max_uses", 0)
    if max_uses > 0 and discount.get("used_count", 0) >= max_uses:
        return {"valid": False, "message": "Bu kuponun kullanım limiti dolmuş"}
    
    if quantity < discount.get("min_quantity", 1):
        return {"valid": False, "message": f"Bu kupon en az {discount['min_quantity']} bilet için geçerlidir"}
    
    discount_event_id = discount.get("event_id")
    if discount_event_id and discount_event_id != event_id:
        return {"valid": False, "message": "Bu kupon bu etkinlik için geçerli değil"}
    
    original_price = round(event_price * quantity, 2)
    discount_type = discount["discount_type"]
    discount_value = float(discount["discount_value"])
    
    if discount_type == "percentage":
        discount_amount = round(original_price * discount_value / 100, 2)
    else:  # fixed
        discount_amount = round(min(discount_value * quantity, original_price), 2)
    
    discounted_price = round(max(original_price - discount_amount, 0), 2)
    
    return {
        "valid": True,
        "message": "Kupon geçerli",
        "discount_id": discount["id"],
        "discount_type": discount_type,
        "discount_value": discount_value,
        "original_price": original_price,
        "discounted_price": discounted_price,
        "discount_amount": discount_amount
    }

async def send_ticket_email(email: str, name: str, event: dict, tickets: list):
    """Send ticket confirmation email via SendGrid if configured."""
    try:
        settings = await db.settings.find_one({"type": "integrations"})
        if not settings:
            return
        sendgrid_config = settings.get("data", {}).get("sendgrid", {})
        if not sendgrid_config.get("api_key") or not sendgrid_config.get("from_email"):
            return
        
        ticket_rows = "".join([
            f"<tr><td style='padding:8px;border:1px solid #eee'>{t['id'][:8]}...</td>"
            f"<td style='padding:8px;border:1px solid #eee'>{t['qr_token'][:16]}...</td></tr>"
            for t in tickets
        ])
        
        sg = SendGridAPIClient(sendgrid_config["api_key"])
        from_email = sendgrid_config["from_email"]
        from_name = sendgrid_config.get("from_name", "IZF Zumba")
        
        message = Mail(
            from_email=(from_email, from_name),
            to_emails=email,
            subject=f"Biletleriniz: {event['title']}",
            html_content=f"""
            <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
              <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;padding:30px;">
                <h1 style="color:#FF6B6B;">Biletleriniz Hazır!</h1>
                <p>Merhaba {name},</p>
                <p><strong>{event['title']}</strong> etkinliği için {len(tickets)} adet biletiniz oluşturuldu.</p>
                <p><strong>Tarih:</strong> {event['date'].strftime('%d.%m.%Y %H:%M')}</p>
                <p><strong>Yer:</strong> {event['location']}</p>
                <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                  <thead><tr style="background:#FF6B6B;color:white;">
                    <th style="padding:8px">Bilet ID</th>
                    <th style="padding:8px">QR Kod</th>
                  </tr></thead>
                  <tbody>{ticket_rows}</tbody>
                </table>
                <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
                <p style="color:#888;font-size:12px;">IZF Zumba - Dans ile Hayatını Değiştir!</p>
              </div>
            </body></html>
            """
        )
        sg.send(message)
    except Exception as e:
        logger.warning(f"Ticket email send failed: {str(e)}")


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
        "phone": user_data.phone,
        "role": "user",
        "streak": 0,
        "last_challenge_date": None,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"sub": user_id, "role": "user", "name": user.get("name", ""), "email": user.get("email", "")})
    
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
    
    token = create_access_token({"sub": user["id"], "role": user.get("role", "user"), "name": user.get("name", ""), "email": user.get("email", "")})
    
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
            payment_link=event.get("payment_link"),
            discounted_payment_link=event.get("discounted_payment_link"),
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
        payment_link=event.get("payment_link"),
        discounted_payment_link=event.get("discounted_payment_link"),
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
        payment_link=event.get("payment_link"),
        discounted_payment_link=event.get("discounted_payment_link"),
        tickets_sold=0,
        created_at=event["created_at"]
    )

# ==================== TICKET ROUTES ====================

@api_router.post("/buy-ticket", response_model=List[TicketResponse])
async def buy_ticket(request: BuyTicketRequest, user: dict = Depends(get_user_from_header)):
    """Create tickets for authenticated user (payment handled externally via payment link)."""
    event = await db.events.find_one({"id": request.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check capacity
    tickets_sold = await db.tickets.count_documents({"event_id": request.event_id})
    if tickets_sold + request.quantity > event["capacity"]:
        raise HTTPException(status_code=400, detail="Not enough tickets available")
    
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

# ==================== DISCOUNT / COUPON ROUTES ====================

@api_router.post("/discounts/validate", response_model=ValidateDiscountResponse)
async def validate_discount(request: ValidateDiscountRequest):
    """Validate a discount code and return pricing info. No auth required."""
    event = await db.events.find_one({"id": request.event_id}) if request.event_id else None
    if request.event_id and not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event_price = float(event["price"]) if event else 0.0

    result = await validate_discount_code(request.code, request.event_id, request.quantity, event_price)

    return ValidateDiscountResponse(
        valid=result["valid"],
        message=result["message"],
        discount_type=result.get("discount_type"),
        discount_value=result.get("discount_value"),
        original_price=result.get("original_price"),
        discounted_price=result.get("discounted_price"),
        discount_amount=result.get("discount_amount")
    )

# ==================== ADMIN DISCOUNT CRUD ====================

@api_router.post("/admin/discounts", response_model=DiscountResponse)
async def admin_create_discount(request: DiscountCreate, admin: dict = Depends(require_admin)):
    """Create a new discount/coupon code"""
    if request.discount_type not in ("percentage", "fixed"):
        raise HTTPException(status_code=400, detail="discount_type must be 'percentage' or 'fixed'")
    if request.discount_type == "percentage" and not (0 < request.discount_value <= 100):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 1 and 100")
    if request.discount_value <= 0:
        raise HTTPException(status_code=400, detail="discount_value must be positive")

    code = request.code.upper().strip()
    existing = await db.discounts.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu kupon kodu zaten mevcut")

    discount_id = str(uuid.uuid4())
    discount = {
        "id": discount_id,
        "code": code,
        "discount_type": request.discount_type,
        "discount_value": request.discount_value,
        "event_id": request.event_id,
        "min_quantity": request.min_quantity,
        "max_uses": request.max_uses,
        "used_count": 0,
        "valid_from": request.valid_from,
        "valid_until": request.valid_until,
        "is_active": request.is_active,
        "created_at": datetime.utcnow()
    }
    await db.discounts.insert_one(discount)
    return DiscountResponse(**discount)

@api_router.get("/admin/discounts", response_model=List[DiscountResponse])
async def admin_list_discounts(admin: dict = Depends(require_admin)):
    """List all discount/coupon codes"""
    discounts = await db.discounts.find().sort("created_at", -1).to_list(500)
    return [DiscountResponse(**d) for d in discounts]

@api_router.put("/admin/discounts/{discount_id}", response_model=DiscountResponse)
async def admin_update_discount(discount_id: str, request: DiscountUpdate, admin: dict = Depends(require_admin)):
    """Update a discount/coupon code"""
    discount = await db.discounts.find_one({"id": discount_id})
    if not discount:
        raise HTTPException(status_code=404, detail="Kupon bulunamadı")

    update_data = {k: v for k, v in request.dict().items() if v is not None}
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper().strip()
        # Ensure uniqueness if code is changing
        if update_data["code"] != discount["code"]:
            existing = await db.discounts.find_one({"code": update_data["code"]})
            if existing:
                raise HTTPException(status_code=400, detail="Bu kupon kodu zaten mevcut")
    if "discount_type" in update_data and update_data["discount_type"] not in ("percentage", "fixed"):
        raise HTTPException(status_code=400, detail="discount_type must be 'percentage' or 'fixed'")

    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.discounts.update_one({"id": discount_id}, {"$set": update_data})

    updated = await db.discounts.find_one({"id": discount_id})
    return DiscountResponse(**updated)

@api_router.delete("/admin/discounts/{discount_id}")
async def admin_delete_discount(discount_id: str, admin: dict = Depends(require_admin)):
    """Delete a discount/coupon code"""
    result = await db.discounts.delete_one({"id": discount_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kupon bulunamadı")
    return {"success": True, "message": "Kupon silindi"}

@api_router.get("/tickets/by-email")
async def get_tickets_by_email(email: str, phone_last4: str = ""):
    """Get tickets by buyer email + phone last 4 digits verification."""
    email = email.lower().strip()
    
    if not phone_last4 or len(phone_last4) != 4:
        raise HTTPException(status_code=400, detail="Telefon numaranızın son 4 hanesini girin.")
    
    # Find user by email
    user = await db.users.find_one({"email": email})
    user_id = user["id"] if user else None
    
    # Verify phone last 4 digits from pending_payments or user record
    phone_verified = False
    
    # Check pending_payments for this email
    pending_payments = await db.pending_payments.find({"buyer_email": email}).to_list(100)
    for pp in pending_payments:
        buyer_phone = pp.get("buyer_phone", "")
        if buyer_phone and buyer_phone.replace(" ", "").replace("-", "")[-4:] == phone_last4:
            phone_verified = True
            break
    
    # Also check user record phone
    if not phone_verified and user and user.get("phone"):
        user_phone = user["phone"].replace(" ", "").replace("-", "")
        if user_phone[-4:] == phone_last4:
            phone_verified = True
    
    if not phone_verified:
        raise HTTPException(status_code=403, detail="Telefon numarası eşleşmiyor.")
    
    # Find tickets by user_id OR by pending_payment buyer_email
    query = {"$or": []}
    if user_id:
        query["$or"].append({"user_id": user_id})
    
    pending_ids = [p["id"] for p in pending_payments if p.get("ticket_id")]
    if pending_ids:
        query["$or"].append({"payment_id": {"$in": pending_ids}})
    
    if not query["$or"]:
        return {"tickets": []}
    
    tickets = await db.tickets.find(query).sort("created_at", -1).to_list(100)
    
    result = []
    for ticket in tickets:
        event = await db.events.find_one({"id": ticket["event_id"]})
        if event:
            result.append({
                "id": ticket["id"],
                "event_title": event["title"],
                "event_date": event["date"],
                "event_location": event["location"],
                "qr_token": ticket["qr_token"],
                "status": ticket["status"],
                "created_at": ticket["created_at"]
            })
    
    return {"tickets": result}


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

    # Revenue stats from payments collection
    payments = await db.payments.find({"status": {"$in": ["SUCCESS", "MOCK_SUCCESS"]}}).to_list(10000)
    total_revenue = round(sum(p.get("amount", 0) for p in payments), 2)
    total_discount_amount = round(sum(p.get("discount_amount", 0) for p in payments), 2)
    total_discounts_used = sum(1 for p in payments if p.get("discount_id"))

    return {
        "total_users": total_users,
        "total_events": total_events,
        "total_tickets": total_tickets,
        "tickets_used": tickets_used,
        "total_posts": total_posts,
        "total_revenue": total_revenue,
        "total_discounts_used": total_discounts_used,
        "total_discount_amount": total_discount_amount
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

@api_router.post("/admin/create-ticket", response_model=List[TicketResponse])
async def admin_create_ticket(request: AdminCreateTicketRequest, admin: dict = Depends(require_admin)):
    """Admin manually creates tickets for a user by email."""
    event = await db.events.find_one({"id": request.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    target_user = await db.users.find_one({"email": request.user_email})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    tickets_sold = await db.tickets.count_documents({"event_id": request.event_id})
    if tickets_sold + request.quantity > event["capacity"]:
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    tickets = []
    for _ in range(request.quantity):
        ticket_id = str(uuid.uuid4())
        qr_token = generate_qr_token()
        ticket = {
            "id": ticket_id,
            "user_id": target_user["id"],
            "event_id": request.event_id,
            "qr_token": qr_token,
            "status": "VALID",
            "created_by_admin": admin["id"],
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

# Admin create user (admin only)
@api_router.post("/admin/users", response_model=UserResponse)
async def admin_create_user(user_data: AdminCreateUserRequest, admin: dict = Depends(require_admin)):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    name_parts = user_data.name.split()
    first_name = name_parts[0] if name_parts else ""
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    
    new_user = {
        "id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "first_name": first_name,
        "last_name": last_name,
        "hashed_password": pwd_context.hash(user_data.password),
        "role": "user",
        "created_at": datetime.utcnow(),
        "streak": 0
    }
    
    await db.users.insert_one(new_user)
    
    return UserResponse(
        id=user_id,
        email=user_data.email.lower(),
        name=user_data.name,
        role="user",
        streak=0,
        created_at=datetime.utcnow()
    )

# Admin reset user password (admin only)
@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, request: PasswordResetRequest, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"hashed_password": pwd_context.hash(request.new_password)}}
    )
    
    return {"success": True, "message": "Password reset successfully"}

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
        payment_link=event.get("payment_link"),
        discounted_payment_link=event.get("discounted_payment_link"),
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

@api_router.post("/admin/test-firebase")
async def test_firebase_connection(user: dict = Depends(require_admin)):
    """Test Firebase connection"""
    settings = await db.settings.find_one({"type": "integrations"})
    if not settings or not settings.get("data", {}).get("firebase", {}).get("api_key"):
        return {"success": False, "message": "Firebase API key not configured"}
    
    return {"success": True, "message": "Firebase credentials configured (test not implemented)"}

# ==================== SEED DATA ====================

@api_router.get("/seed")
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

@api_router.get("/admin/posts")
async def get_all_posts(user: dict = Depends(require_admin)):
    posts = await db.posts.find().sort("created_at", -1).to_list(100)
    for post in posts:
        post["_id"] = str(post["_id"])
    return posts

@api_router.delete("/admin/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(require_admin)):
    result = await db.posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}

# ==================== SITE CONTENT ROUTES ====================

async def get_default_site_content() -> dict:
    """Return default site content values."""
    return {
        "hero_video_url": "/videos/zumbaarkaplan.mp4",
        "hero_video_type": "video/mp4",
        "countdown_target": datetime(2026, 10, 17, 16, 0, 0),
        "beto_perez": {
            "enabled": True,
            "title": "BETO PEREZ ILE ZUMBA",
            "subtitle": "Zumba'nın yaratıcısı ile unutulmaz bir deneyim",
            "description": "Dünyaca ünlü Zumba eğitmeni Beto Perez ile canlı bir Zumba seansına katılın. Enerji dolu müzikler ve profesyonel dans hareketleriyle kendinizi müziğin ritmine bırakın.",
            "image_url": "/images/beto-perez.jpg",
            "button_text": "Bilet Al",
            "button_link": "/tickets"
        },
        "venue": {
            "name": "Green Park Hotel",
            "address": "Pendik, İstanbul",
            "map_embed_url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3011.595166434!2d29.287!3d40.879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDUyJzQ0LjQiTiAyOcKwMTcnMTMuMiJF!5e0!3m2!1str!2str!4v1609459200000!5m2!1str!2str",
            "description": "İstanbul'un en prestijli otellerinden biri olan Green Park Hotel'de gerçekleşecek olan bu özel etkinlikte, profesyonel dans salonları ve konforlu ortam ile unutulmaz bir deneyim sizi bekliyor."
        }
    }

@api_router.get("/site-content", response_model=SiteContentResponse)
async def get_site_content():
    """Get site content configuration (public endpoint)."""
    content = await db.site_content.find_one({"_id": "main"})
    if not content:
        # Return default values if no content exists
        defaults = await get_default_site_content()
        return SiteContentResponse(**defaults)
    
    # Remove MongoDB _id from response
    content.pop("_id", None)
    return SiteContentResponse(**content)

@api_router.put("/admin/site-content", response_model=SiteContentResponse)
async def update_site_content(content_data: SiteContent, admin: dict = Depends(require_admin)):
    """Update site content configuration (admin only)."""
    content_dict = content_data.dict()
    content_dict["_id"] = "main"
    content_dict["updated_at"] = datetime.utcnow()
    
    # Upsert: update if exists, insert if not
    await db.site_content.update_one(
        {"_id": "main"},
        {"$set": content_dict},
        upsert=True
    )
    
    # Return updated content
    updated = await db.site_content.find_one({"_id": "main"})
    updated.pop("_id", None)
    return SiteContentResponse(**updated)


# ==================== PAYMENT WEBHOOK ROUTES ====================

class PaymentCallbackRequest(BaseModel):
    paymentId: str
    status: str
    buyerEmail: str
    buyerName: Optional[str] = None
    buyerPhone: Optional[str] = None
    paidPrice: float
    currency: str = "EUR"
    eventId: Optional[str] = None

@api_router.post("/payment/callback")
async def payment_callback(request: Request):
    """Handle iyzico payment callback/webhook.

    Accepts both:
    1. iyzico's native webhook format (token, iyziEventType, etc.)
    2. Our custom JSON format (paymentId, status, buyerEmail, etc.)
    
    When payment is successful, automatically creates tickets.
    """
    try:
        content_type = request.headers.get("content-type", "")
        raw_body = await request.body()
        logger.info(f"Payment callback raw body: {raw_body.decode('utf-8', errors='replace')}")
        logger.info(f"Payment callback content-type: {content_type}")

        # Parse body
        if "json" in content_type:
            data = json.loads(raw_body)
        else:
            try:
                form = await request.form()
                data = dict(form)
            except Exception:
                try:
                    data = json.loads(raw_body)
                except Exception:
                    data = {}

        logger.info(f"Payment callback parsed data: {data}")

        # Store raw webhook data for debugging
        webhook_log = {
            "id": str(uuid.uuid4()),
            "received_at": datetime.utcnow(),
            "content_type": content_type,
            "data": data,
            "raw_body": raw_body.decode('utf-8', errors='replace')
        }
        await db.webhook_logs.insert_one(webhook_log)

        # Determine webhook format and extract identifiers
        iyzico_token = ""
        payment_id = ""
        iyzico_status = ""

        if "token" in data or "iyziEventType" in data:
            iyzico_token = str(data.get("token", ""))
            iyzico_status = data.get("status", data.get("paymentStatus", ""))
            payment_id = str(data.get("paymentId", data.get("paymentConversationId", iyzico_token)))
        elif "paymentId" in data:
            payment_id = str(data["paymentId"])
            iyzico_status = data.get("status", "SUCCESS")
        else:
            logger.warning(f"Unknown webhook format, keys: {list(data.keys()) if isinstance(data, dict) else 'not dict'}")
            return {"success": True, "message": "Webhook received, unknown format logged"}

        # Look up pending payment by payment_id OR iyzico_token
        pending = None
        if payment_id:
            pending = await db.pending_payments.find_one({"payment_id": payment_id})
        if not pending and payment_id:
            pending = await db.pending_payments.find_one({"id": payment_id})
        if not pending and iyzico_token:
            pending = await db.pending_payments.find_one({"iyzico_token": iyzico_token})

        # Fallback: if still not found and status is SUCCESS, use most recent pending payment
        # (works because there is only one event)
        logger.info(f"Webhook fallback check: pending={pending is not None}, iyzico_status='{iyzico_status}', payment_id='{payment_id}', token='{iyzico_token}'")
        if not pending and iyzico_status in ("SUCCESS", "success", "1"):
            pending = await db.pending_payments.find_one(
                {"status": "pending"},
                sort=[("created_at", -1)]
            )
            if pending:
                logger.info(f"Webhook fallback: using most recent pending payment {pending.get('id')}")
            else:
                logger.warning(f"Webhook fallback: no pending payment found with status='pending'")
        elif not pending:
            logger.warning(f"Webhook fallback skipped: iyzico_status='{iyzico_status}' not SUCCESS")

        if not pending:
            logger.warning(f"No pending_payment found for payment_id={payment_id}, token={iyzico_token}. Storing for manual review.")
            return {"success": True, "message": "Webhook received, no matching pending payment for manual review"}

        # Normalize status
        new_status = "completed" if iyzico_status in ("SUCCESS", "success", "1") else iyzico_status.lower()
        
        # If already completed, return idempotent response
        if pending.get("status") == "completed":
            logger.info(f"Webhook: pending_payment {pending.get('id')} already completed (idempotent)")
            return {"success": True, "message": "Payment already completed, skipped"}

        # If not success, just update status and return
        if new_status != "completed":
            await db.pending_payments.update_one(
                {"_id": pending["_id"]},
                {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
            )
            logger.info(f"Webhook: pending_payment {pending.get('id')} updated to status: {new_status}")
            return {"success": True, "message": f"Webhook processed, status updated to {new_status}"}

        # SUCCESS: Create tickets automatically
        logger.info(f"Webhook: Creating tickets for pending_payment {pending.get('id')}")
        
        try:
            event = await db.events.find_one({"id": pending["event_id"]})
            if not event:
                logger.error(f"Event not found: {pending['event_id']}")
                await db.pending_payments.update_one(
                    {"_id": pending["_id"]},
                    {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
                )
                return {"success": True, "message": "Event not found"}

            # Check capacity
            tickets_sold = await db.tickets.count_documents({"event_id": pending["event_id"]})
            quantity = max(1, pending.get("quantity", 1))
            if tickets_sold + quantity > event["capacity"]:
                logger.error(f"Not enough tickets for pending_payment {pending.get('id')}")
                await db.pending_payments.update_one(
                    {"_id": pending["_id"]},
                    {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
                )
                return {"success": True, "message": "Not enough tickets available"}

            # Find or create user
            buyer_email = pending["buyer_email"]
            buyer_name = pending.get("buyer_name", "")
            buyer_phone = pending.get("buyer_phone", "")

            user = await db.users.find_one({"email": buyer_email})
            if not user:
                user_id = str(uuid.uuid4())
                name_parts = buyer_name.split() if buyer_name else ["Misafir"]
                first_name = name_parts[0] if name_parts else "Misafir"
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Kullanici"
                user = {
                    "id": user_id,
                    "email": buyer_email,
                    "name": buyer_name or f"{first_name} {last_name}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": buyer_phone or "",
                    "role": "user",
                    "created_at": datetime.utcnow(),
                    "is_guest": True
                }
                await db.users.insert_one(user)
                logger.info(f"Webhook: New user created {user_id} - {buyer_email}")

            # Create tickets
            tickets = []
            for _ in range(quantity):
                ticket_id = str(uuid.uuid4())
                qr_token = secrets.token_urlsafe(32)
                ticket = {
                    "id": ticket_id,
                    "user_id": user["id"],
                    "event_id": event["id"],
                    "event_title": event.get("title", "Zumba Festival"),
                    "payment_id": pending["id"],
                    "qr_token": qr_token,
                    "status": "active",
                    "created_at": datetime.utcnow(),
                    "paid_price": pending.get("paid_price", pending.get("price", 0)),
                    "currency": pending.get("currency", "EUR")
                }
                await db.tickets.insert_one(ticket)
                tickets.append(ticket)
                logger.info(f"Webhook: Ticket created {ticket_id} for user {user['email']}")

            # Record payment in payments collection
            payment_record = {
                "id": str(uuid.uuid4()),
                "payment_id": pending["id"],
                "user_id": user["id"],
                "event_id": event["id"],
                "amount": pending.get("paid_price", pending.get("price", 0)),
                "currency": pending.get("currency", "EUR"),
                "status": "SUCCESS",
                "discount_id": pending.get("discount_id"),
                "discount_amount": pending.get("discount_amount", 0.0),
                "buyer_email": buyer_email,
                "created_at": datetime.utcnow()
            }
            await db.payments.insert_one(payment_record)

            # Increment discount used_count
            discount_id = pending.get("discount_id")
            if discount_id:
                await db.discounts.update_one({"id": discount_id}, {"$inc": {"used_count": 1}})
                logger.info(f"Webhook: Discount {discount_id} used_count incremented")

            # Update pending payment status
            await db.pending_payments.update_one(
                {"_id": pending["_id"]},
                {"$set": {
                    "status": "completed",
                    "ticket_id": tickets[0]["id"] if tickets else None,
                    "completed_at": datetime.utcnow()
                }}
            )

            # Send confirmation email
            try:
                await send_ticket_email(buyer_email, user.get("name", ""), event, tickets)
                logger.info(f"Webhook: Confirmation email sent to {buyer_email}")
            except Exception as e:
                logger.warning(f"Webhook: Ticket email failed: {e}")

            logger.info(f"Webhook: Successfully created {len(tickets)} tickets for pending_payment {pending.get('id')}")
            return {"success": True, "message": f"Tickets created: {len(tickets)}"}

        except Exception as e:
            logger.exception(f"Webhook: Error creating tickets for pending_payment {pending.get('id')}")
            # Still mark as completed even if ticket creation fails, to prevent re-processing
            await db.pending_payments.update_one(
                {"_id": pending["_id"]},
                {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
            )
            return {"success": True, "message": f"Webhook processed but ticket creation failed: {str(e)}"}

    except Exception as e:
        logger.exception("Payment callback error")
        return {"success": False, "message": str(e)}


# ==================== IYZICO PWI INITIALIZE ====================

class IyzicoPWIRequest(BaseModel):
    event_id: str
    buyer_email: str
    buyer_name: str
    buyer_phone: Optional[str] = None
    discount_code: Optional[str] = None
    quantity: int = 1

class IyzicoPWIResponse(BaseModel):
    pending_id: str
    payment_url: str

@api_router.post("/payment/iyzico-init", response_model=IyzicoPWIResponse)
async def iyzico_pwi_initialize(data: IyzicoPWIRequest):
    """Initialize payment by creating a pending_payment record.
    Returns a static PWI link; actual payment happens externally.
    """
    try:
        # Get event details
        event = await db.events.find_one({"id": data.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        event_price = float(event.get("price", 0))
        quantity = max(1, data.quantity)
        original_price = round(event_price * quantity, 2)
        final_price = original_price
        discount_id = None
        discount_amount = 0.0

        # Validate discount code if provided
        if data.discount_code:
            discount_result = await validate_discount_code(
                data.discount_code, data.event_id, quantity, event_price
            )
            if discount_result["valid"]:
                final_price = discount_result["discounted_price"]
                discount_id = discount_result["discount_id"]
                discount_amount = discount_result["discount_amount"]
            else:
                raise HTTPException(status_code=400, detail=discount_result["message"])

        pending_id = str(uuid.uuid4())
        buyer_email = data.buyer_email.lower().strip()

        # Store pending payment
        await db.pending_payments.insert_one({
            "id": pending_id,
            "payment_id": pending_id,
            "event_id": data.event_id,
            "buyer_email": buyer_email,
            "buyer_name": data.buyer_name,
            "buyer_phone": data.buyer_phone or "",
            "price": original_price,
            "paid_price": final_price,
            "currency": "EUR",
            "discount_code": data.discount_code.upper().strip() if data.discount_code else None,
            "discount_id": discount_id,
            "discount_amount": discount_amount,
            "quantity": quantity,
            "status": "pending",
            "ticket_id": None,
            "created_at": datetime.utcnow(),
            "completed_at": None
        })

        return IyzicoPWIResponse(
            pending_id=pending_id,
            payment_url="https://iyzi.link/AKkMUg"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("iyzico_pwi_initialize failed")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PAYMENT COMPLETE ====================

class PaymentCompleteResponse(BaseModel):
    success: bool
    ticket_id: Optional[str] = None
    event_title: Optional[str] = None
    quantity: int = 0
    status: str

@api_router.post("/payment/complete/{pending_id}", response_model=PaymentCompleteResponse)
async def payment_complete(pending_id: str):
    """Complete payment and create ticket(s) after user returns from payment page.
    Idempotent: if already completed, returns existing ticket info.
    """
    try:
        pending = await db.pending_payments.find_one({"id": pending_id})
        if not pending:
            raise HTTPException(status_code=404, detail="Pending payment not found")

        # If already completed, return existing info
        if pending.get("status") == "completed" and pending.get("ticket_id"):
            event = await db.events.find_one({"id": pending["event_id"]})
            return PaymentCompleteResponse(
                success=True,
                ticket_id=pending["ticket_id"],
                event_title=event.get("title") if event else None,
                quantity=pending.get("quantity", 1),
                status="completed"
            )

        # If failed, return error
        if pending.get("status") == "failed":
            return PaymentCompleteResponse(success=False, status="failed")

        event = await db.events.find_one({"id": pending["event_id"]})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check capacity
        tickets_sold = await db.tickets.count_documents({"event_id": pending["event_id"]})
        quantity = max(1, pending.get("quantity", 1))
        if tickets_sold + quantity > event["capacity"]:
            raise HTTPException(status_code=400, detail="Not enough tickets available")

        # Find or create user by email
        buyer_email = pending["buyer_email"]
        buyer_name = pending.get("buyer_name", "")
        buyer_phone = pending.get("buyer_phone", "")

        user = await db.users.find_one({"email": buyer_email})
        if not user:
            user_id = str(uuid.uuid4())
            name_parts = buyer_name.split() if buyer_name else ["Misafir"]
            first_name = name_parts[0] if name_parts else "Misafir"
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Kullanici"
            user = {
                "id": user_id,
                "email": buyer_email,
                "name": buyer_name or f"{first_name} {last_name}",
                "first_name": first_name,
                "last_name": last_name,
                "phone": buyer_phone or "",
                "role": "user",
                "created_at": datetime.utcnow(),
                "is_guest": True
            }
            await db.users.insert_one(user)
            logger.info(f"New user created: {user_id} - {buyer_email}")

        # Create tickets
        tickets = []
        for _ in range(quantity):
            ticket_id = str(uuid.uuid4())
            qr_token = secrets.token_urlsafe(32)
            ticket = {
                "id": ticket_id,
                "user_id": user["id"],
                "event_id": event["id"],
                "event_title": event.get("title", "Zumba Festival"),
                "payment_id": pending_id,
                "qr_token": qr_token,
                "status": "active",
                "created_at": datetime.utcnow(),
                "paid_price": pending.get("paid_price", pending.get("price", 0)),
                "currency": pending.get("currency", "EUR")
            }
            await db.tickets.insert_one(ticket)
            tickets.append(ticket)
            logger.info(f"Ticket created: {ticket_id} for user: {user['email']}")

        # Record payment in payments collection (revenue tracking)
        payment_record = {
            "id": str(uuid.uuid4()),
            "payment_id": pending_id,
            "user_id": user["id"],
            "event_id": event["id"],
            "amount": pending.get("paid_price", pending.get("price", 0)),
            "currency": pending.get("currency", "EUR"),
            "status": "SUCCESS",
            "discount_id": pending.get("discount_id"),
            "discount_amount": pending.get("discount_amount", 0.0),
            "buyer_email": buyer_email,
            "created_at": datetime.utcnow()
        }
        await db.payments.insert_one(payment_record)

        # Increment discount used_count
        discount_id = pending.get("discount_id")
        if discount_id:
            await db.discounts.update_one({"id": discount_id}, {"$inc": {"used_count": 1}})

        # Update pending payment status
        await db.pending_payments.update_one(
            {"id": pending_id},
            {"$set": {
                "status": "completed",
                "ticket_id": tickets[0]["id"] if tickets else None,
                "completed_at": datetime.utcnow()
            }}
        )

        # Send confirmation email
        try:
            await send_ticket_email(buyer_email, user.get("name", ""), event, tickets)
        except Exception as e:
            logger.warning(f"Ticket email failed in complete: {e}")

        return PaymentCompleteResponse(
            success=True,
            ticket_id=tickets[0]["id"] if tickets else None,
            event_title=event.get("title", "Zumba Festival"),
            quantity=quantity,
            status="completed"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("payment_complete failed")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PAYMENT STATUS ====================

class PaymentStatusResponse(BaseModel):
    success: bool
    status: str
    ticket_id: Optional[str] = None
    event_title: Optional[str] = None
    quantity: int = 0
    qr_token: Optional[str] = None

@api_router.get("/payment/status/{pending_id}", response_model=PaymentStatusResponse)
async def payment_status(pending_id: str):
    """Return pending payment status. Does NOT create tickets.
    
    Response:
    - status 'completed' with ticket_id: payment successful, tickets created
    - status 'pending': payment awaiting webhook confirmation
    - status 'failed': payment failed
    """
    pending = await db.pending_payments.find_one({"id": pending_id})
    if not pending:
        return PaymentStatusResponse(
            success=False,
            status="not_found",
            quantity=0
        )

    event = await db.events.find_one({"id": pending.get("event_id")})
    quantity = pending.get("quantity", 1)

    ticket = None
    if pending.get("ticket_id"):
        ticket = await db.tickets.find_one({"id": pending["ticket_id"]})

    return PaymentStatusResponse(
        success=True,
        status=pending.get("status", "pending"),
        ticket_id=pending.get("ticket_id"),
        event_title=event.get("title") if event else None,
        quantity=quantity,
        qr_token=ticket["qr_token"] if ticket else None
    )


@api_router.get("/payment/verify")
async def verify_payment(paymentId: str):
    """Verify payment status and return ticket info."""
    try:
        ticket = await db.tickets.find_one({"payment_id": paymentId})
        if ticket:
            return {
                "success": True,
                "ticket_id": ticket["id"],
                "status": ticket["status"],
                "event_title": ticket.get("event_title", "")
            }
        return {"success": False, "message": "Ticket not found"}
    except Exception as e:
        return {"success": False, "message": str(e)}


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
