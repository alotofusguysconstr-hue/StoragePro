// netlify/functions/scan.js
// Returns fake storage auction data so you can test the full UI

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { urls = [], state_filter = 'WA', county_filter = 'King' } = body;

    if (!urls || urls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No URLs provided' })
      };
    }

    // Fake analyzed units (King County style)
    const fakeResults = [
      {
        auction_id: "ST-78492",
        title: "5x10 Climate Controlled Unit",
        location: "Redmond, WA",
        starting_bid: 45,
        current_bid: 125,
        estimated_value: { mid: 850 },
        end_time: "2026-04-15T18:00:00Z",
        auction_site: "StorageTreasures",
        url: urls[0] || "https://www.storagetreasures.com/auctions/detail/78492",
        hunter_analysis: {
          current_bid: 125,
          estimated_value: { mid: 850 }
        },
        optimizer_analysis: {
          final_recommendation: {
            expected_profit: { mid: 620 }
          }
        }
      },
      {
        auction_id: "HB-23914",
        title: "10x15 Unit - Tools & Furniture",
        location: "Bellevue, WA",
        starting_bid: 85,
        current_bid: 210,
        estimated_value: { mid: 1450 },
        end_time: "2026-04-16T14:30:00Z",
        auction_site: "HiBid",
        url: urls[1] || "https://www.hibid.com/lot/23914",
        hunter_analysis: {
          current_bid: 210,
          estimated_value: { mid: 1450 }
        },
        optimizer_analysis: {
          final_recommendation: {
            expected_profit: { mid: 980 }
          }
        }
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analyzed: urls.length,
        duplicates: Math.floor(urls.length * 0.3), // simulate some duplicates
        results: fakeResults,
        duplicate_warnings: urls.length > 2 ? [
          { message: "Duplicate auction detected from same seller" }
        ] : [],
        message: `✅ Successfully analyzed ${urls.length} URLs (using fake data for testing)`,
        analyzed_urls: urls,
        state_filter,
        county_filter,
        note: "This is placeholder data. Real scraping + AI will be added next."
      })
    };
  } catch (error) {
    console.error('Scan handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
