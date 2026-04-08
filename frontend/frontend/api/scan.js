// frontend/api/scan.js
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls = [], state_filter = '', county_filter = 'King' } = req.body;

    const fakeResults = [
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
    ];

    return res.status(200).json({
      analyzed: urls.length || 2,
      duplicates: 0,
      results: fakeResults,
      duplicate_warnings: [],
      message: "✅ Scan completed successfully (Vercel)",
      analyzed_urls: urls,
      state_filter,
      county_filter
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
