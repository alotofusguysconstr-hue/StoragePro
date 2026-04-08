// US States list
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Common counties by state (expandable)
export const COMMON_COUNTIES = {
  WA: [
    'King', 'Pierce', 'Snohomish', 'Spokane', 'Clark',
    'Thurston', 'Kitsap', 'Yakima', 'Whatcom', 'Benton'
  ],
  CA: [
    'Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino',
    'Santa Clara', 'Alameda', 'Sacramento', 'Contra Costa', 'Fresno'
  ],
  TX: [
    'Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis',
    'Collin', 'Hidalgo', 'El Paso', 'Denton', 'Fort Bend'
  ],
  FL: [
    'Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange',
    'Pinellas', 'Duval', 'Lee', 'Polk', 'Brevard'
  ],
  NY: [
    'Kings', 'Queens', 'New York', 'Suffolk', 'Bronx',
    'Nassau', 'Westchester', 'Erie', 'Monroe', 'Richmond'
  ],
};

// Get counties for a state
export const getCountiesForState = (stateCode) => {
  return COMMON_COUNTIES[stateCode] || [];
};

// Sample mock units for testing
export const SAMPLE_UNITS = [
  {
    id: '1',
    facilityName: 'Public Storage - Seattle',
    address: '1234 Main St, Seattle, WA 98101',
    state: 'WA',
    county: 'King',
    unitSize: '10x10',
    startingBid: 150,
    estimatedValue: 800,
    auctionDate: '2026-01-20',
    status: 'pending',
    notes: 'Electronics visible, furniture',
  },
  {
    id: '2',
    facilityName: 'Extra Space Storage - Tacoma',
    address: '5678 Pacific Ave, Tacoma, WA 98402',
    state: 'WA',
    county: 'Pierce',
    unitSize: '5x10',
    startingBid: 75,
    estimatedValue: 400,
    auctionDate: '2026-01-22',
    status: 'pending',
    notes: 'Boxes, household items',
  },
  {
    id: '3',
    facilityName: 'CubeSmart - Bellevue',
    address: '9012 Bellevue Way, Bellevue, WA 98004',
    state: 'WA',
    county: 'King',
    unitSize: '10x20',
    startingBid: 100,
    estimatedValue: 1500,
    auctionDate: '2026-01-25',
    status: 'pending',
    notes: 'High-end furniture, possible antiques - HOT DEAL',
  },
];
