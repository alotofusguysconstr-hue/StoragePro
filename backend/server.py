from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import hashlib
import httpx
import asyncio
import json

# New Gemini SDK
from google import genai
from google.genai import types

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import local modules
from scraper import scrape_auction_url
from notifications import (
    get_vapid_public_key, 
    send_hot_deal_notification, 
    send_scan_complete_notification,
)
from subscriptions import (
    SubscriptionTier, 
    paypal_service, 
    get_tier_config, 
    get_all_tiers,
    check_scan_limit,
    can_use_vision,
    can_use_notifications,
)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Gemini API Key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env file")

# Initialize Gemini client
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Create FastAPI app
app = FastAPI(title="StorageHunter Pro API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ AGENT SYSTEM PROMPTS ============
# (Keep your original prompts here unchanged)
STORAGE_BID_HUNTER_PROMPT = """You are StorageBid Hunter..."""  # ← Paste your full original prompt

STORAGE_BID_HUNTER_VISION_PROMPT = """You are StorageBid Hunter with Vision..."""  # ← Paste full

STORAGE_PROFIT_OPTIMIZER_PROMPT = """You are StorageProfit Optimizer..."""  # ← Paste full

# ============ PYDANTIC MODELS ============
class ScanRequest(BaseModel):
    urls: List[str]
    state_filter: Optional[str] = None
    county_filter: Optional[str] = None
    use_vision: Optional[bool] = True

class UnitApproval(BaseModel):
    unit_id: str
    action: str
    notes: Optional[str] = None

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

class SubscriptionRequest(BaseModel):
    tier: str
    return_url: str
    cancel_url: str

class UserCreate(BaseModel):
    email: str
    name: Optional[str] = None

# ============ HELPERS ============
def generate_auction_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]

async def check_duplicate(auction_id: str):
    return await db.analyzed_units.find_one({"auction_id": auction_id}, {"_id": 0})

async def get_user_tier(user_id: str) -> SubscriptionTier:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "tier": 1})
    return SubscriptionTier(user["tier"]) if user and user.get("tier") else SubscriptionTier.FREE

async def get_user_scans_today(user_id: str) -> int:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return await db.scan_logs.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": today_start.isoformat()}
    })

async def log_scan(user_id: str, urls_count: int):
    await db.scan_logs.insert_one({
        "user_id": user_id,
        "urls_count": urls_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

async def fetch_image_bytes(url: str):
    """Fetch image as bytes for Gemini"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and 'image' in resp.headers.get('content-type', ''):
                return resp.content
        return None
    except Exception as e:
        logger.error(f"Image fetch error: {e}")
        return None

# ============ SYNC LLM FUNCTIONS (run in thread) ============
def run_storage_bid_hunter_sync(url: str, scraped_data: Dict, use_vision: bool = False) -> dict:
    try:
        system_prompt = STORAGE_BID_HUNTER_VISION_PROMPT if use_vision else STORAGE_BID_HUNTER_PROMPT

        model = gemini_client.models.get("gemini-2.0-flash-exp")   # or "gemini-1.5-flash" if you prefer

        context = f"""Analyze this storage auction listing:

Auction URL: {url}
Facility: {scraped_data.get('facility_name', 'Unknown')}
Location: {scraped_data.get('address', 'Unknown')}
State: {scraped_data.get('state', 'Unknown')}
County: {scraped_data.get('county', 'Unknown')}
Unit Size: {scraped_data.get('unit_size', 'Unknown')}
Current Bid: ${scraped_data.get('current_bid', 0)}
Auction End: {scraped_data.get('auction_end_date', 'Unknown')}
"""

        contents = [system_prompt, context + "\n\nProvide your analysis in valid JSON format only."]

        if use_vision and scraped_data.get('images'):
            image_parts = []
            for img_url in scraped_data['images'][:3]:   # limit to 3 images
                image_bytes = asyncio.run(fetch_image_bytes(img_url))   # small sync call inside thread
                if image_bytes:
                    image_parts.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
            
            if image_parts:
                contents = [system_prompt, context + "\n\nAnalyze these storage unit photos and provide JSON."] + image_parts

        response = model.generate_content(contents=contents)
        text = response.text.strip()

        # Clean JSON
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        result = json.loads(text)
        result["auction_url"] = url
        result["auction_id"] = generate_auction_id(url)
        result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        result["agent"] = "StorageBid Hunter"
        result["vision_used"] = use_vision and bool(scraped_data.get('images'))

        # Merge scraped data
        result["facility_name"] = result.get("facility_name") or scraped_data.get("facility_name", "Storage Unit")
        result["state"] = result.get("state") or scraped_data.get("state", "Unknown")
        result["county"] = result.get("county") or scraped_data.get("county", "Unknown")
        result["current_bid"] = scraped_data.get("current_bid") or result.get("current_bid", 0)
        result["images"] = scraped_data.get("images", [])

        return result

    except Exception as e:
        logger.error(f"StorageBid Hunter error for {url}: {e}")
        return {
            "auction_id": generate_auction_id(url),
            "auction_url": url,
            "error": str(e),
            "initial_recommendation": "ERROR",
            "facility_name": scraped_data.get("facility_name", "Storage Unit"),
        }


def run_storage_profit_optimizer_sync(hunter_result: dict) -> dict:
    try:
        model = gemini_client.models.get("gemini-2.0-flash-exp")

        prompt = f"""Analyze this unit that StorageBid Hunter has flagged as promising. 
Provide your deep profitability analysis in the exact JSON format specified.

StorageBid Hunter Analysis:
{json.dumps(hunter_result, indent=2)}

Respond ONLY with valid JSON, no markdown."""

        response = model.generate_content(contents=[STORAGE_PROFIT_OPTIMIZER_PROMPT, prompt])
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        result = json.loads(text)
        result["unit_id"] = hunter_result.get("auction_id")
        result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        result["agent"] = "StorageProfit Optimizer"
        return result

    except Exception as e:
        logger.error(f"StorageProfit Optimizer error: {e}")
        return {
            "unit_id": hunter_result.get("auction_id"),
            "error": str(e),
            "final_recommendation": {"verdict": "ERROR"}
        }

# ============ SCAN ENDPOINT (Main Fix) ============
@api_router.post("/scan")
async def scan_auctions(request: ScanRequest, background_tasks: BackgroundTasks, user_id: str = "default"):
    tier = await get_user_tier(user_id)
    scans_today = await get_user_scans_today(user_id)
    
    if not check_scan_limit(tier, scans_today):
        tier_config = get_tier_config(tier)
        raise HTTPException(
            status_code=429,
            detail=f"Daily scan limit reached ({tier_config.get('scans_per_day')} scans). Upgrade to Pro."
        )
    
    use_vision = request.use_vision and can_use_vision(tier)
    
    results = []
    duplicates = []
    hot_deals = 0

    for url in request.urls:
        url = url.strip()
        if not url:
            continue
            
        auction_id = generate_auction_id(url)
        
        if await check_duplicate(auction_id):
            duplicates.append({"url": url, "auction_id": auction_id, "message": "Duplicate — already analyzed"})
            continue

        try:
            scraped_data = await scrape_auction_url(url)
            
            # Run heavy LLM work in background thread
            hunter_result = await asyncio.to_thread(
                run_storage_bid_hunter_sync, url, scraped_data, use_vision
            )
            
            optimizer_result = None
            if hunter_result.get("initial_recommendation") in ["PROMISING", "MAYBE"]:
                optimizer_result = await asyncio.to_thread(
                    run_storage_profit_optimizer_sync, hunter_result
                )
                if optimizer_result.get("final_recommendation", {}).get("verdict") == "GO":
                    hot_deals += 1

            combined = {
                "auction_id": auction_id,
                "auction_url": url,
                "hunter_analysis": hunter_result,
                "optimizer_analysis": optimizer_result,
                "status": "pending_review",
                "state": hunter_result.get("state", request.state_filter or "Unknown"),
                "county": hunter_result.get("county", request.county_filter or "Unknown"),
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "vision_used": use_vision
            }
            
            await db.analyzed_units.insert_one({**combined, "_id": auction_id})
            results.append(combined)
            
        except Exception as e:
            logger.error(f"Failed processing {url}: {e}")
            continue

    await log_scan(user_id, len(results))

    if can_use_notifications(tier) and results:
        sub = await db.push_subscriptions.find_one({"user_id": user_id})
        if sub:
            background_tasks.add_task(
                send_scan_complete_notification,
                sub.get("subscription"),
                len(results),
                hot_deals
            )

    return {
        "success": True,
        "analyzed": len(results),
        "duplicates": len(duplicates),
        "hot_deals": hot_deals,
        "vision_used": use_vision,
        "results": results,
        "duplicate_warnings": duplicates
    }

# ============ Keep all your other routes unchanged below ============
# @api_router.get("/") , /config, /users, /subscription, notifications, review-queue, etc.

# Include router + middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
