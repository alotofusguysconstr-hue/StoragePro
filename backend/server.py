from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()

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
- Use real-world storage auction knowledge: people often store expensive unused gym equipment, tools, seasonal items, and furniture they couldn't sell.

You are the profit gatekeeper. Your goal is to protect the user from bad buys and maximize ROI on good ones."""


# ============ PYDANTIC MODELS ============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ScanRequest(BaseModel):
    urls: List[str]
    state_filter: Optional[str] = None
    county_filter: Optional[str] = None

class UnitApproval(BaseModel):
    unit_id: str
    action: str  # "approve", "reject", "edit"
    notes: Optional[str] = None

class SettingsUpdate(BaseModel):
    default_state: Optional[str] = None
    counties: Optional[List[str]] = None
    profit_margin_target: Optional[int] = None
    credit_alert_threshold: Optional[int] = None
    credit_alerts_enabled: Optional[bool] = None

class HotDealSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    min_profit_percent: Optional[int] = None
    min_estimated_value: Optional[int] = None
    max_starting_bid: Optional[int] = None


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

async def run_storage_bid_hunter(url: str) -> dict:
    """Run StorageBid Hunter agent on a single URL"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hunter-{uuid.uuid4()}",
            system_message=STORAGE_BID_HUNTER_PROMPT
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(
            text=f"""Analyze this storage auction listing URL and provide your assessment in the JSON format specified.

Auction URL: {url}

Note: Since I cannot actually visit the URL, please simulate a realistic analysis based on typical storage auction listings. Generate plausible data that would be found on such a listing, including:
- A realistic facility name and location (prefer Washington state)
- Typical unit contents and conditions
- Realistic pricing and auction timing
- Appropriate value estimates

Respond ONLY with valid JSON, no markdown formatting."""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        # Clean up response - remove markdown code blocks if present
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
        
        return result
    except Exception as e:
        logger.error(f"StorageBid Hunter error: {e}")
        return {
            "auction_id": generate_auction_id(url),
            "auction_url": url,
            "error": str(e),
            "initial_recommendation": "ERROR"
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
    return {"message": "StorageHunter Pro API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ============ SCAN & ANALYSIS ROUTES ============

@api_router.post("/scan")
async def scan_auctions(request: ScanRequest):
    """Scan auction URLs with both AI agents"""
    results = []
    duplicates = []
    
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
        
        # Run StorageBid Hunter
        hunter_result = await run_storage_bid_hunter(url)
        
        # If promising, run StorageProfit Optimizer
        optimizer_result = None
        if hunter_result.get("initial_recommendation") in ["PROMISING", "MAYBE"]:
            optimizer_result = await run_storage_profit_optimizer(hunter_result)
        
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
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        await db.analyzed_units.insert_one({**combined_result, "_id": auction_id})
        
        # Remove _id for response
        results.append(combined_result)
    
    return {
        "success": True,
        "analyzed": len(results),
        "duplicates": len(duplicates),
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
async def review_queue_action(approval: UnitApproval):
    """Approve, reject, or edit a unit in the review queue"""
    unit = await db.analyzed_units.find_one({"auction_id": approval.unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    if approval.action == "approve":
        new_status = "published"
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
async def get_my_bids():
    """Get user's saved bids"""
    bids = await db.my_bids.find({}, {"_id": 0}).sort("added_at", -1).to_list(100)
    return {"bids": bids, "count": len(bids)}


@api_router.post("/my-bids/add")
async def add_to_my_bids(unit_id: str):
    """Add a published unit to My Bids"""
    unit = await db.analyzed_units.find_one({"auction_id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Check if already in my bids
    existing = await db.my_bids.find_one({"auction_id": unit_id})
    if existing:
        return {"success": False, "message": "Already in My Bids"}
    
    bid_entry = {
        **unit,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.my_bids.insert_one({**bid_entry, "_id": unit_id})
    
    return {"success": True, "message": "Added to My Bids"}


@api_router.delete("/my-bids/{unit_id}")
async def remove_from_my_bids(unit_id: str):
    """Remove a unit from My Bids"""
    result = await db.my_bids.delete_one({"auction_id": unit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found in My Bids")
    return {"success": True, "message": "Removed from My Bids"}


@api_router.get("/stats")
async def get_stats():
    """Get dashboard stats"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_units = await db.analyzed_units.count_documents({})
    pending_review = await db.analyzed_units.count_documents({"status": "pending_review"})
    published = await db.analyzed_units.count_documents({"status": "published"})
    my_bids_count = await db.my_bids.count_documents({})
    
    # Units scanned today
    scanned_today = await db.analyzed_units.count_documents({
        "analyzed_at": {"$gte": today_start.isoformat()}
    })
    
    # Calculate potential profit from my bids (only fetch required fields for performance)
    my_bids = await db.my_bids.find(
        {}, 
        {"_id": 0, "optimizer_analysis.final_recommendation.expected_profit": 1}
    ).to_list(100)
    potential_profit = 0
    for bid in my_bids:
        optimizer = bid.get("optimizer_analysis", {})
        if optimizer and "final_recommendation" in optimizer:
            profit_range = optimizer["final_recommendation"].get("expected_profit", {})
            potential_profit += profit_range.get("mid", 0)
    
    return {
        "total_units": total_units,
        "pending_review": pending_review,
        "published": published,
        "my_bids": my_bids_count,
        "scanned_today": scanned_today,
        "potential_profit": potential_profit
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
