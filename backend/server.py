from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import base64
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import local modules
from scraper import scrape_auction_url
from notifications import (
    get_vapid_public_key, 
    send_hot_deal_notification, 
    send_scan_complete_notification,
    broadcast_notification
)
from subscriptions import (
    SubscriptionTier, 
    paypal_service, 
    get_tier_config, 
    get_all_tiers,
    check_scan_limit,
    can_use_vision,
    can_use_notifications,
    TIER_CONFIG
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI(title="StorageHunter Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ AGENT SYSTEM PROMPTS ============

STORAGE_BID_HUNTER_PROMPT = """You are StorageBid Hunter, an expert AI agent specialized in finding and evaluating self-storage auction units with high profit potential.

Your job is to analyze auction listings from sites like StorageTreasures, HiBid, Bid4Assets, and others. When given listing data (URL, photos descriptions, current price, time remaining, location), you must:

1. **Analyze Visible Contents**
   - Identify all visible items in the unit photos
   - Categorize items (electronics, furniture, tools, boxes, appliances, etc.)
   - Note any high-value items that stand out
   - Flag any red flags (junk, water damage, pest signs, etc.)

2. **Predictability Assessment**
   - Give a "Predictability Score" from 1-10 based on how clearly you can see and identify contents
   - Higher score = more visible, identifiable items
   - Lower score = lots of mystery boxes or obscured contents

3. **Initial Value Estimate**
   - Provide a rough low/mid/high resale value range
   - Be conservative — storage auction items typically sell for 40-60% of retail

4. **Location Tag**
   - Extract or note the State and County from the listing
   - If not provided, mark as "Unknown"

5. **Initial Recommendation**
   - "PROMISING" — Worth deeper analysis by StorageProfit Optimizer
   - "MAYBE" — Borderline, needs more scrutiny
   - "PASS" — Not worth pursuing

**Output Format (JSON):**
```json
{
  "auction_id": "extracted or generated ID",
  "auction_url": "the listing URL",
  "facility_name": "storage facility name",
  "unit_size": "5x10, 10x10, etc.",
  "current_bid": 100,
  "auction_end_date": "2026-01-20",
  "state": "WA",
  "county": "King",
  "visible_items": ["item1", "item2", "item3"],
  "item_categories": {
    "electronics": ["TV", "speakers"],
    "furniture": ["couch", "dresser"],
    "tools": [],
    "boxes": "~15 cardboard boxes",
    "other": ["exercise bike"]
  },
  "red_flags": ["some water stains visible"],
  "predictability_score": 7,
  "estimated_value": {
    "low": 300,
    "mid": 600,
    "high": 1000
  },
  "initial_recommendation": "PROMISING",
  "summary": "Brief 1-2 sentence summary"
}
```

Be realistic and conservative. Your job is to filter out bad units before they waste time with deeper analysis."""

STORAGE_BID_HUNTER_VISION_PROMPT = """You are StorageBid Hunter with Vision capabilities. You can see and analyze actual photos of storage units.

Analyze the provided storage unit images carefully. Look for:
- All visible items (furniture, electronics, boxes, tools, appliances)
- Signs of value (brand names, quality materials, organized contents)
- Red flags (water damage, mold, pests, garbage, broken items)
- Overall unit organization and accessibility

Based on what you SEE in the images, provide your analysis in JSON format:
```json
{
  "visible_items": ["list of specific items you can identify"],
  "item_categories": {
    "electronics": ["specific items"],
    "furniture": ["specific items"],
    "tools": ["specific items"],
    "boxes": "count and condition",
    "appliances": ["specific items"],
    "other": ["specific items"]
  },
  "quality_assessment": "poor/fair/good/excellent based on visible condition",
  "red_flags": ["any concerns you see"],
  "predictability_score": 1-10,
  "estimated_value": {
    "low": dollar_amount,
    "mid": dollar_amount,
    "high": dollar_amount
  },
  "initial_recommendation": "PROMISING/MAYBE/PASS",
  "vision_notes": "What you observed from the actual photos"
}
```

Be specific about what you actually see. Don't guess - if something is unclear, note it as uncertain."""

STORAGE_PROFIT_OPTIMIZER_PROMPT = """You are StorageProfit Optimizer, an expert complementary AI agent that works in tandem with StorageBid Hunter.

Your role is to receive units that StorageBid Hunter has already flagged as promising, then perform a deep profitability analysis and give a final "Go / No-Go" recommendation with precise bidding strategy.

When you receive unit data from StorageBid Hunter, you MUST analyze each unit using this exact structure:

1. **Unit Summary Recap**  
   - Auction link & key details (price, time left, location, size)  
   - Brief summary of visible items from photos

2. **Deep Value Breakdown**  
   Break down the visible + highly probable hidden contents into categories with estimated resale values:
   - Electronics & Fitness Gear  
   - Tools & Equipment  
   - Furniture & Home Goods  
   - Collectibles / Specialty Items  
   - Clothing / Designer Goods  
   - Other (misc boxes, totes, etc.)  
   Give a realistic low / best / high resale estimate for each category and for the total unit.

3. **Resale Strategy**  
   Recommend the smartest way to liquidate the unit for maximum profit:
   - Best platforms (eBay, Facebook Marketplace, OfferUp, Craigslist, Mercari, local auctions, bulk flip, etc.)
   - Which visible items should be sold individually vs. in lots
   - Estimated time to sell and effort level (low / medium / high)
   - Potential profit after fees, cleaning, and transportation costs

4. **Risk & Hidden Cost Analysis**  
   - Transportation & cleanup costs (based on unit size and location)
   - Dumpster / disposal fees estimate
   - Legal risks (liens, abandoned hazardous items, etc.)
   - Overall Risk Score: Low / Medium / High with explanation

5. **Final Bid Recommendation**  
   - Absolute maximum bid you recommend (with exact dollar amount)
   - Suggested current bid strategy (snipe at the end, bid aggressively now, or walk away)
   - Expected Net Profit Range (after all costs)
   - Go / No-Go Decision + clear one-sentence reasoning

**Output Format (JSON):**
```json
{
  "unit_id": "from StorageBid Hunter",
  "value_breakdown": {
    "electronics_fitness": {"low": 100, "mid": 200, "high": 350},
    "tools_equipment": {"low": 50, "mid": 100, "high": 150},
    "furniture_home": {"low": 100, "mid": 250, "high": 400},
    "collectibles": {"low": 0, "mid": 50, "high": 150},
    "clothing": {"low": 20, "mid": 50, "high": 100},
    "other_boxes": {"low": 50, "mid": 150, "high": 300},
    "total": {"low": 320, "mid": 800, "high": 1450}
  },
  "resale_strategy": {
    "platforms": ["Facebook Marketplace", "OfferUp", "eBay for electronics"],
    "individual_items": ["TV", "exercise bike", "power tools"],
    "lot_items": ["clothing", "misc boxes", "kitchen items"],
    "estimated_time_to_sell": "2-4 weeks",
    "effort_level": "medium"
  },
  "costs": {
    "transportation": 75,
    "cleanup_time_value": 50,
    "disposal_fees": 40,
    "platform_fees": 60,
    "total_costs": 225
  },
  "risk_analysis": {
    "risk_score": "Medium",
    "concerns": ["Some boxes obscured", "Possible junk mixed in"],
    "upside_potential": "Electronics look high-end"
  },
  "final_recommendation": {
    "max_bid": 175,
    "bid_strategy": "Snipe in final 30 seconds",
    "expected_profit": {"low": 95, "mid": 400, "high": 750},
    "verdict": "GO",
    "reasoning": "Strong electronics presence with identifiable brands, good ROI potential even at conservative estimates."
  }
}
```

**Core Rules:**
- You are conservative and realistic. Never overhype a unit.
- Always assume you will only recover 40-60% of retail value on average (storage auction reality).
- Factor in the user's likely location (currently Redmond, Washington area) for transportation and local market values.
- Be brutally honest — if a unit looks good in photos but has low profit margin after costs, say "Pass" clearly.

You are the profit gatekeeper. Your goal is to protect the user from bad buys and maximize ROI on good ones."""


# ============ PYDANTIC MODELS ============

class ScanRequest(BaseModel):
    urls: List[str]
    state_filter: Optional[str] = None
    county_filter: Optional[str] = None
    use_vision: Optional[bool] = True

class UnitApproval(BaseModel):
    unit_id: str
    action: str  # "approve", "reject", "edit"
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


# ============ HELPER FUNCTIONS ============

def generate_auction_id(url: str) -> str:
    """Generate a unique ID from auction URL"""
    return hashlib.md5(url.encode()).hexdigest()[:12]

async def check_duplicate(auction_id: str) -> Optional[dict]:
    """Check if auction has been analyzed before"""
    existing = await db.analyzed_units.find_one(
        {"auction_id": auction_id},
        {"_id": 0}
    )
    return existing

async def get_user_tier(user_id: str) -> SubscriptionTier:
    """Get user's subscription tier"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "tier": 1})
    if user and user.get("tier"):
        return SubscriptionTier(user["tier"])
    return SubscriptionTier.FREE

async def get_user_scans_today(user_id: str) -> int:
    """Get number of scans user has done today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.scan_logs.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": today_start.isoformat()}
    })
    return count

async def log_scan(user_id: str, urls_count: int):
    """Log a scan for rate limiting"""
    await db.scan_logs.insert_one({
        "user_id": user_id,
        "urls_count": urls_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

async def fetch_image_as_base64(url: str) -> Optional[str]:
    """Fetch an image from URL and convert to base64"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', 'image/jpeg')
                if 'image' in content_type:
                    return base64.b64encode(response.content).decode('utf-8')
        return None
    except Exception as e:
        logger.error(f"Error fetching image: {e}")
        return None

async def run_storage_bid_hunter(url: str, scraped_data: Dict, use_vision: bool = False) -> dict:
    """Run StorageBid Hunter agent on a single URL"""
    try:
        # Choose prompt based on vision capability
        system_prompt = STORAGE_BID_HUNTER_VISION_PROMPT if use_vision else STORAGE_BID_HUNTER_PROMPT
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hunter-{uuid.uuid4()}",
            system_message=system_prompt
        ).with_model("gemini", "gemini-3-flash-preview")
        
        # Build context from scraped data
        context = f"""Analyze this storage auction listing:

Auction URL: {url}
Source: {scraped_data.get('source', 'Unknown')}
Facility: {scraped_data.get('facility_name', 'Unknown')}
Location: {scraped_data.get('address', 'Unknown')}
State: {scraped_data.get('state', 'Unknown')}
County: {scraped_data.get('county', 'Unknown')}
Unit Size: {scraped_data.get('unit_size', 'Unknown')}
Current Bid: ${scraped_data.get('current_bid', 0)}
Auction End: {scraped_data.get('auction_end_date', 'Unknown')}
"""
        
        # If vision enabled and images available, analyze them
        if use_vision and scraped_data.get('images'):
            images_analyzed = []
            for img_url in scraped_data['images'][:3]:  # Limit to 3 images
                img_base64 = await fetch_image_as_base64(img_url)
                if img_base64:
                    images_analyzed.append(img_base64)
            
            if images_analyzed:
                # Use vision model with images
                image_contents = [ImageContent(image_base64=img) for img in images_analyzed]
                user_message = UserMessage(
                    text=context + "\n\nAnalyze these storage unit photos and provide your assessment in JSON format.",
                    file_contents=image_contents
                )
            else:
                user_message = UserMessage(
                    text=context + "\n\nNo images available. Analyze based on listing data and provide realistic estimates in JSON format."
                )
        else:
            user_message = UserMessage(
                text=context + "\n\nProvide your analysis in JSON format based on the listing data."
            )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        result = json.loads(clean_response)
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
        logger.error(f"StorageBid Hunter error: {e}")
        return {
            "auction_id": generate_auction_id(url),
            "auction_url": url,
            "error": str(e),
            "initial_recommendation": "ERROR",
            "facility_name": scraped_data.get("facility_name", "Storage Unit"),
            "state": scraped_data.get("state", "Unknown"),
            "county": scraped_data.get("county", "Unknown"),
        }

async def run_storage_profit_optimizer(hunter_result: dict) -> dict:
    """Run StorageProfit Optimizer agent on a promising unit"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"optimizer-{uuid.uuid4()}",
            system_message=STORAGE_PROFIT_OPTIMIZER_PROMPT
        ).with_model("gemini", "gemini-3-flash-preview")
        
        import json
        user_message = UserMessage(
            text=f"""Analyze this unit that StorageBid Hunter has flagged as promising. Provide your deep profitability analysis in the JSON format specified.

StorageBid Hunter Analysis:
{json.dumps(hunter_result, indent=2)}

Respond ONLY with valid JSON, no markdown formatting."""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        result = json.loads(clean_response)
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


# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "StorageHunter Pro API", "version": "2.0"}

@api_router.get("/config")
async def get_config():
    """Get public configuration"""
    return {
        "vapid_public_key": get_vapid_public_key(),
        "tiers": get_all_tiers()
    }


# ============ USER & SUBSCRIPTION ROUTES ============

@api_router.post("/users/create")
async def create_user(user: UserCreate):
    """Create a new user with free tier"""
    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "tier": SubscriptionTier.FREE.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "subscription": None
    }
    await db.users.insert_one({**user_doc, "_id": user_id})
    return {"user_id": user_id, "tier": SubscriptionTier.FREE.value}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user details"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add usage stats
    scans_today = await get_user_scans_today(user_id)
    tier = SubscriptionTier(user.get("tier", "free"))
    tier_config = get_tier_config(tier)
    
    return {
        **user,
        "scans_today": scans_today,
        "scans_limit": tier_config["scans_per_day"],
        "can_scan": check_scan_limit(tier, scans_today)
    }

@api_router.get("/subscription/tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers"""
    return {"tiers": get_all_tiers()}

@api_router.post("/subscription/create-order")
async def create_subscription_order(request: SubscriptionRequest, user_id: str = "default"):
    """Create a PayPal order for subscription upgrade"""
    try:
        tier = SubscriptionTier(request.tier)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    if tier == SubscriptionTier.FREE:
        return {"status": "success", "message": "Free tier activated", "tier": "free"}
    
    result = await paypal_service.create_subscription_order(
        tier=tier,
        user_id=user_id,
        return_url=request.return_url,
        cancel_url=request.cancel_url
    )
    
    return result

@api_router.post("/subscription/capture/{order_id}")
async def capture_subscription(order_id: str, user_id: str = "default"):
    """Capture PayPal order after approval"""
    result = await paypal_service.capture_order(order_id)
    
    if result.get("status") == "COMPLETED":
        # Extract tier from reference_id
        purchase_unit = result.get("purchase_units", [{}])[0]
        ref_id = purchase_unit.get("reference_id", "")
        tier_value = ref_id.split("_")[-1] if "_" in ref_id else "pro"
        
        # Update user subscription
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "tier": tier_value,
                    "subscription": {
                        "order_id": order_id,
                        "status": "active",
                        "activated_at": datetime.now(timezone.utc).isoformat(),
                        "amount": purchase_unit.get("payments", {}).get("captures", [{}])[0].get("amount", {}).get("value")
                    }
                }
            },
            upsert=True
        )
        
        return {"status": "success", "tier": tier_value}
    
    return {"status": "failed", "details": result}


# ============ PUSH NOTIFICATION ROUTES ============

@api_router.post("/notifications/subscribe")
async def subscribe_to_notifications(subscription: PushSubscription, user_id: str = "default"):
    """Subscribe to push notifications"""
    sub_doc = {
        "user_id": user_id,
        "subscription": {
            "endpoint": subscription.endpoint,
            "keys": subscription.keys
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert subscription
    await db.push_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": sub_doc},
        upsert=True
    )
    
    return {"status": "subscribed"}

@api_router.delete("/notifications/unsubscribe")
async def unsubscribe_from_notifications(user_id: str = "default"):
    """Unsubscribe from push notifications"""
    await db.push_subscriptions.delete_one({"user_id": user_id})
    return {"status": "unsubscribed"}


# ============ SCAN & ANALYSIS ROUTES ============

@api_router.post("/scan")
async def scan_auctions(request: ScanRequest, background_tasks: BackgroundTasks, user_id: str = "default"):
    """Scan auction URLs with both AI agents"""
    # Check user tier and limits
    tier = await get_user_tier(user_id)
    scans_today = await get_user_scans_today(user_id)
    
    if not check_scan_limit(tier, scans_today):
        tier_config = get_tier_config(tier)
        raise HTTPException(
            status_code=429, 
            detail=f"Daily scan limit reached ({tier_config['scans_per_day']} scans). Upgrade to Pro for unlimited scans."
        )
    
    # Check vision capability
    use_vision = request.use_vision and can_use_vision(tier)
    
    results = []
    duplicates = []
    hot_deals = 0
    
    for url in request.urls:
        url = url.strip()
        if not url:
            continue
            
        auction_id = generate_auction_id(url)
        
        # Check for duplicate
        existing = await check_duplicate(auction_id)
        if existing:
            duplicates.append({
                "url": url,
                "auction_id": auction_id,
                "analyzed_at": existing.get("analyzed_at"),
                "message": f"Duplicate found — already analyzed on {existing.get('analyzed_at', 'unknown date')}"
            })
            continue
        
        # Scrape real auction data
        scraped_data = await scrape_auction_url(url)
        
        # Run StorageBid Hunter (with vision if available)
        hunter_result = await run_storage_bid_hunter(url, scraped_data, use_vision)
        
        # If promising, run StorageProfit Optimizer
        optimizer_result = None
        if hunter_result.get("initial_recommendation") in ["PROMISING", "MAYBE"]:
            optimizer_result = await run_storage_profit_optimizer(hunter_result)
            
            # Check if it's a hot deal
            if optimizer_result.get("final_recommendation", {}).get("verdict") == "GO":
                hot_deals += 1
        
        # Combine results
        combined_result = {
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
        
        # Save to database
        await db.analyzed_units.insert_one({**combined_result, "_id": auction_id})
        
        results.append(combined_result)
    
    # Log the scan
    await log_scan(user_id, len(results))
    
    # Send push notification if user has notifications enabled
    if can_use_notifications(tier) and results:
        sub = await db.push_subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        if sub:
            background_tasks.add_task(
                send_scan_complete_notification,
                sub["subscription"],
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


@api_router.get("/review-queue")
async def get_review_queue(state: Optional[str] = None, county: Optional[str] = None):
    """Get units pending review (Admin only)"""
    query = {"status": "pending_review"}
    if state:
        query["state"] = state
    if county:
        query["county"] = county
    
    units = await db.analyzed_units.find(query, {"_id": 0}).sort("analyzed_at", -1).to_list(100)
    return {"units": units, "count": len(units)}


@api_router.post("/review-queue/action")
async def review_queue_action(approval: UnitApproval, background_tasks: BackgroundTasks):
    """Approve, reject, or edit a unit in the review queue"""
    unit = await db.analyzed_units.find_one({"auction_id": approval.unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    if approval.action == "approve":
        new_status = "published"
        
        # Check if it's a hot deal and notify subscribers
        optimizer = unit.get("optimizer_analysis", {})
        if optimizer.get("final_recommendation", {}).get("verdict") == "GO":
            # Get all pro/enterprise subscribers
            subscriptions = await db.push_subscriptions.find({}, {"_id": 0}).to_list(100)
            hunter = unit.get("hunter_analysis", {})
            
            for sub in subscriptions:
                user = await db.users.find_one({"user_id": sub["user_id"]}, {"_id": 0, "tier": 1})
                if user and user.get("tier") in ["pro", "enterprise"]:
                    background_tasks.add_task(
                        send_hot_deal_notification,
                        sub["subscription"],
                        hunter.get("facility_name", "Storage Unit"),
                        int(optimizer.get("final_recommendation", {}).get("expected_profit", {}).get("mid", 0) / 
                            max(hunter.get("current_bid", 1), 1) * 100),
                        optimizer.get("final_recommendation", {}).get("max_bid", 0)
                    )
        
    elif approval.action == "reject":
        new_status = "rejected"
    else:
        new_status = unit.get("status", "pending_review")
    
    update_data = {
        "status": new_status,
        "admin_notes": approval.notes,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.analyzed_units.update_one(
        {"auction_id": approval.unit_id},
        {"$set": update_data}
    )
    
    return {"success": True, "unit_id": approval.unit_id, "new_status": new_status}


@api_router.get("/published-units")
async def get_published_units(state: Optional[str] = None, county: Optional[str] = None):
    """Get all published units (visible to regular users)"""
    query = {"status": "published"}
    if state:
        query["state"] = state
    if county:
        query["county"] = county
    
    units = await db.analyzed_units.find(query, {"_id": 0}).sort("reviewed_at", -1).to_list(100)
    return {"units": units, "count": len(units)}


@api_router.get("/my-bids")
async def get_my_bids(user_id: str = "default"):
    """Get user's saved bids"""
    bids = await db.my_bids.find({"user_id": user_id}, {"_id": 0}).sort("added_at", -1).to_list(100)
    return {"bids": bids, "count": len(bids)}


@api_router.post("/my-bids/add")
async def add_to_my_bids(unit_id: str, user_id: str = "default"):
    """Add a published unit to My Bids"""
    unit = await db.analyzed_units.find_one({"auction_id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Check if already in my bids
    existing = await db.my_bids.find_one({"auction_id": unit_id, "user_id": user_id})
    if existing:
        return {"success": False, "message": "Already in My Bids"}
    
    bid_entry = {
        **unit,
        "user_id": user_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.my_bids.insert_one({**bid_entry, "_id": f"{user_id}_{unit_id}"})
    
    return {"success": True, "message": "Added to My Bids"}


@api_router.delete("/my-bids/{unit_id}")
async def remove_from_my_bids(unit_id: str, user_id: str = "default"):
    """Remove a unit from My Bids"""
    result = await db.my_bids.delete_one({"auction_id": unit_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found in My Bids")
    return {"success": True, "message": "Removed from My Bids"}


@api_router.get("/stats")
async def get_stats(user_id: str = "default"):
    """Get dashboard stats"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_units = await db.analyzed_units.count_documents({})
    pending_review = await db.analyzed_units.count_documents({"status": "pending_review"})
    published = await db.analyzed_units.count_documents({"status": "published"})
    my_bids_count = await db.my_bids.count_documents({"user_id": user_id})
    
    # Units scanned today
    scanned_today = await db.analyzed_units.count_documents({
        "analyzed_at": {"$gte": today_start.isoformat()}
    })
    
    # Calculate potential profit from my bids (only fetch required fields for performance)
    my_bids = await db.my_bids.find(
        {"user_id": user_id}, 
        {"_id": 0, "optimizer_analysis.final_recommendation.expected_profit": 1}
    ).to_list(100)
    potential_profit = 0
    for bid in my_bids:
        optimizer = bid.get("optimizer_analysis", {})
        if optimizer and "final_recommendation" in optimizer:
            profit_range = optimizer["final_recommendation"].get("expected_profit", {})
            potential_profit += profit_range.get("mid", 0)
    
    # Get user tier info
    tier = await get_user_tier(user_id)
    tier_config = get_tier_config(tier)
    user_scans_today = await get_user_scans_today(user_id)
    
    return {
        "total_units": total_units,
        "pending_review": pending_review,
        "published": published,
        "my_bids": my_bids_count,
        "scanned_today": scanned_today,
        "potential_profit": potential_profit,
        "user_tier": tier.value,
        "user_scans_today": user_scans_today,
        "scans_remaining": "Unlimited" if tier_config["scans_per_day"] == -1 else max(0, tier_config["scans_per_day"] - user_scans_today)
    }


# Include the router in the main app
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
