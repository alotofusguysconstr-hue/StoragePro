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
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
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
            auction_id: "FAKE-001",
            title: "5x10 Climate Controlled Unit",
            location: "Redmond, WA",
            current_bid: 145,
            estimated_value: { mid: 950 }
          },
          {
            auction_id: "FAKE-002",
            title: "10x15 Storage Unit",
            location: "Bellevue, WA",
            current_bid: 275,
            estimated_value: { mid: 1650 }
          }
        ],
        message: "Scan function is working with fake data"
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
