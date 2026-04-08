// netlify/functions/scan.js
exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { urls, state_filter, county_filter, use_vision } = body;

    // TODO: Add your actual scanning logic here later
    // For now, return a dummy successful response so the frontend stops erroring

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analyzed: urls ? urls.length : 0,
        duplicates: 0,
        results: [],
        message: "Scan function is working (placeholder)",
        analyzed_urls: urls || []
      })
    };
  } catch (error) {
    console.error('Scan function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
