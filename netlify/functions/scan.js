// netlify/functions/scan.js
exports.handler = async (event) => {
  // Allow CORS for preview environments
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
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
    const { urls = [], state_filter = '', county_filter = '' } = body;

    if (!urls || urls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No URLs provided' })
      };
    }

    // Placeholder response - this proves the function is working
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analyzed: urls.length,
        duplicates: 0,
        results: [],
        duplicate_warnings: [],
        message: "✅ Scan function is now working (placeholder)",
        analyzed_urls: urls,
        state_filter,
        county_filter
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
