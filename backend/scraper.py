"""
Auction Scraper Module for StorageHunter Pro
Scrapes real auction data from StorageTreasures, HiBid, and Bid4Assets
"""
import httpx
from bs4 import BeautifulSoup
import re
import logging
from typing import Dict, List, Optional
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class AuctionScraper:
    """Base scraper class with common functionality"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        self.timeout = 30.0
    
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a page and return HTML content"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.text
                logger.warning(f"Failed to fetch {url}: Status {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def extract_price(self, text: str) -> float:
        """Extract price from text"""
        if not text:
            return 0.0
        match = re.search(r'\$?([\d,]+(?:\.\d{2})?)', text.replace(',', ''))
        if match:
            return float(match.group(1).replace(',', ''))
        return 0.0
    
    def extract_state_county(self, address: str) -> tuple:
        """Extract state and county from address"""
        state_pattern = r'\b([A-Z]{2})\s*\d{5}'
        state_match = re.search(state_pattern, address)
        state = state_match.group(1) if state_match else 'Unknown'
        
        # Common county patterns
        county_pattern = r'(?:County|Co\.?)\s*[:\-]?\s*([A-Za-z\s]+)'
        county_match = re.search(county_pattern, address, re.IGNORECASE)
        county = county_match.group(1).strip() if county_match else 'Unknown'
        
        return state, county


class StorageTreasuresScraper(AuctionScraper):
    """Scraper for StorageTreasures.com"""
    
    async def scrape_listing(self, url: str) -> Optional[Dict]:
        """Scrape a single StorageTreasures listing"""
        html = await self.fetch_page(url)
        if not html:
            return None
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract facility name
            facility_elem = soup.select_one('h1.facility-name, .auction-facility-name, h1')
            facility_name = facility_elem.get_text(strip=True) if facility_elem else 'StorageTreasures Unit'
            
            # Extract address
            address_elem = soup.select_one('.facility-address, .auction-address, address')
            address = address_elem.get_text(strip=True) if address_elem else ''
            state, county = self.extract_state_county(address)
            
            # Extract unit size
            size_elem = soup.select_one('.unit-size, .auction-size, [data-unit-size]')
            unit_size = size_elem.get_text(strip=True) if size_elem else '10x10'
            
            # Extract current bid
            bid_elem = soup.select_one('.current-bid, .auction-price, .bid-amount')
            current_bid = self.extract_price(bid_elem.get_text() if bid_elem else '0')
            
            # Extract end date
            date_elem = soup.select_one('.auction-end-date, .end-time, [data-end-time]')
            auction_end = date_elem.get('data-end-time') or date_elem.get_text(strip=True) if date_elem else None
            
            # Extract images
            images = []
            for img in soup.select('.auction-images img, .gallery img, .unit-photos img'):
                src = img.get('src') or img.get('data-src')
                if src and src.startswith('http'):
                    images.append(src)
            
            return {
                'source': 'StorageTreasures',
                'url': url,
                'facility_name': facility_name,
                'address': address,
                'state': state,
                'county': county,
                'unit_size': unit_size,
                'current_bid': current_bid,
                'auction_end_date': auction_end,
                'images': images[:5],  # Limit to 5 images
                'scraped_at': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing StorageTreasures listing: {e}")
            return None


class HiBidScraper(AuctionScraper):
    """Scraper for HiBid.com"""
    
    async def scrape_listing(self, url: str) -> Optional[Dict]:
        """Scrape a single HiBid listing"""
        html = await self.fetch_page(url)
        if not html:
            return None
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract title/facility
            title_elem = soup.select_one('h1.lot-title, .item-title, h1')
            facility_name = title_elem.get_text(strip=True) if title_elem else 'HiBid Storage Unit'
            
            # Extract location
            location_elem = soup.select_one('.auction-location, .location, .address')
            address = location_elem.get_text(strip=True) if location_elem else ''
            state, county = self.extract_state_county(address)
            
            # Extract current bid
            bid_elem = soup.select_one('.current-bid, .high-bid, .winning-bid')
            current_bid = self.extract_price(bid_elem.get_text() if bid_elem else '0')
            
            # Extract images
            images = []
            for img in soup.select('.lot-images img, .gallery-image img, .item-image img'):
                src = img.get('src') or img.get('data-src')
                if src and src.startswith('http'):
                    images.append(src)
            
            return {
                'source': 'HiBid',
                'url': url,
                'facility_name': facility_name,
                'address': address,
                'state': state,
                'county': county,
                'unit_size': '10x10',  # HiBid often doesn't show size
                'current_bid': current_bid,
                'auction_end_date': None,
                'images': images[:5],
                'scraped_at': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing HiBid listing: {e}")
            return None


class Bid4AssetsScraper(AuctionScraper):
    """Scraper for Bid4Assets.com"""
    
    async def scrape_listing(self, url: str) -> Optional[Dict]:
        """Scrape a single Bid4Assets listing"""
        html = await self.fetch_page(url)
        if not html:
            return None
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract title
            title_elem = soup.select_one('h1.property-title, .auction-title, h1')
            facility_name = title_elem.get_text(strip=True) if title_elem else 'Bid4Assets Storage Unit'
            
            # Extract address
            address_elem = soup.select_one('.property-address, .auction-location, address')
            address = address_elem.get_text(strip=True) if address_elem else ''
            state, county = self.extract_state_county(address)
            
            # Extract current bid
            bid_elem = soup.select_one('.current-bid, .high-bid, .starting-bid')
            current_bid = self.extract_price(bid_elem.get_text() if bid_elem else '0')
            
            # Extract images
            images = []
            for img in soup.select('.property-images img, .gallery img, .auction-photos img'):
                src = img.get('src') or img.get('data-src')
                if src and src.startswith('http'):
                    images.append(src)
            
            return {
                'source': 'Bid4Assets',
                'url': url,
                'facility_name': facility_name,
                'address': address,
                'state': state,
                'county': county,
                'unit_size': '10x10',
                'current_bid': current_bid,
                'auction_end_date': None,
                'images': images[:5],
                'scraped_at': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing Bid4Assets listing: {e}")
            return None


def get_scraper_for_url(url: str) -> Optional[AuctionScraper]:
    """Get the appropriate scraper based on URL"""
    url_lower = url.lower()
    if 'storagetreasures' in url_lower:
        return StorageTreasuresScraper()
    elif 'hibid' in url_lower:
        return HiBidScraper()
    elif 'bid4assets' in url_lower:
        return Bid4AssetsScraper()
    return None


async def scrape_auction_url(url: str) -> Optional[Dict]:
    """
    Main function to scrape any supported auction URL
    Returns scraped data or None if scraping fails
    """
    scraper = get_scraper_for_url(url)
    if scraper:
        return await scraper.scrape_listing(url)
    
    # If no specific scraper, return basic info
    return {
        'source': 'Unknown',
        'url': url,
        'facility_name': 'Storage Unit Auction',
        'address': '',
        'state': 'Unknown',
        'county': 'Unknown',
        'unit_size': '10x10',
        'current_bid': 0,
        'auction_end_date': None,
        'images': [],
        'scraped_at': datetime.utcnow().isoformat()
    }
