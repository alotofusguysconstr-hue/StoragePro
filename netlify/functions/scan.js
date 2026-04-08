// netlify/functions/scan.js
// This handles POST requests to /api/scan

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body || "{}");
    const { urls, state_filter, county_filter, use_vision = true } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No valid URLs provided" }),
      };
    }

    // Placeholder response for now (we'll add real scraping + AI later)
    const analyzed = urls.length;
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analyzed: analyzed,
        duplicates: 0,
        results: [],                    // We'll fill this later
        duplicate_warnings: [],
        message: "Scan completed successfully (placeholder)",
        analyzed_urls: urls,
        state_filter: state_filter || null,
        county_filter: county_filter || null,
      }),
    };
  } catch (error) {
    console.error("Scan function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
