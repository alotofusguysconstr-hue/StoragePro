// netlify/functions/scan.js

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { urls = [] } = body;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analyzed: urls.length || 2,
        duplicates: 0,
        results: [
          {
            auction_id: "FAKE-KING-001",
            title: "5x10 Climate Controlled Unit - Tools & Household",
            location: "Redmond, WA (King County)",
            starting_bid: 55,
            current_bid: 145,
            estimated_value: { mid: 950 },
            end_time: "2026-04-20T18:00:00Z",
            auction_site: "StorageTreasures",
            hunter_analysis: { current_bid: 145, estimated_value: { mid: 950 } },
            optimizer_analysis: { final_recommendation: { expected_profit: { mid: 680 } } }
          },
          {
            auction_id: "FAKE-KING-002",
            title: "10x15 Unit - Furniture & Electronics",
            location: "Bellevue, WA (King County)",
            starting_bid: 120,
            current_bid: 275,
            estimated_value: { mid: 1650 },
            end_time: "2026-04-22T14:00:00Z",
            auction_site: "HiBid",
            hunter_analysis: { current_bid: 275, estimated_value: { mid: 1650 } },
            optimizer_analysis: { final_recommendation: { expected_profit: { mid: 1120 } } }
          }
        ],
        duplicate_warnings: [],
        message: "✅ Fake scan successful for King County, WA",
        analyzed_urls: urls
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
