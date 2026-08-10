// Client branding — resolved PER LOGGED-IN CLIENT (by Supabase clients.id).
// The dashboard is multi-tenant: McHugh and Team Bundy share one deployment,
// so branding must be selected at runtime from the logged-in client.
// Add a new entry per client. Use getBranding(clientData) (or the useBranding
// hook) to read the right one. Default falls back to McHugh.

const mchugh = {
  // Identity
  name: 'McHugh Jiu Jitsu',
  shortName: 'McHugh',
  logo: '/mchugh-logo-white.png',
  poweredBy: 'Beacon',

  // Terminology — maps generic labels to client-specific language
  terminology: {
    dashboard: 'Command Center',
    subtitle: 'Today at McHugh',
    inbox: 'Front Desk',
    calls: 'Calls',
    analytics: 'Analytics',
    settings: 'Settings',
    totalCalls: 'Inquiries Captured',
    trialsBooked: 'Trials Scheduled',
  },

  // Tab labels for the activity feed
  tabs: {
    all: 'All Activity',
    trial: 'Trial Classes',
    message: 'Messages',
    question: 'Questions',
    misc: 'Other Activity',
    cancellation: 'Cancellations',
    spam: 'Spam',
  },

  // Status badges
  statuses: {
    confirmed: 'Confirmed',
    newInquiry: 'New Inquiry',
  },

  // Programs offered by this client
  programs: [
    'Tiny Sharks',
    'Little Sharks',
    'Junior Sharks',
    'Adult Jiu Jitsu',
  ],

  // Color palette — sourced from mchughbjj.com
  colors: {
    primary: '#1867C0',       // McHugh blue — active states, tabs, links
    primaryDark: '#0D47A1',   // Darker blue variant
    accent: '#48A9A6',        // Teal — success, confirmed states
    alert: '#D5242C',         // Crimson — attention, urgent items
    sidebar: '#1a1a2e',       // Charcoal — sidebar background
    sidebarText: '#e2e8f0',   // Light gray — sidebar text
    sidebarActive: '#1867C0', // Blue — active nav item
    surface: '#F5F5F5',       // Light gray — page background
    card: '#FFFFFF',          // White — card backgrounds
    text: '#1e293b',          // Near-black — primary text
    textSecondary: '#64748b', // Slate — secondary text
    border: '#e2e8f0',        // Light border
  },
}

const teamBundy = {
  // Identity
  name: 'Team Bundy Jiu-Jitsu',
  shortName: 'Team Bundy',
  logo: '/team-bundy-logo-white.png',
  poweredBy: 'Beacon',

  terminology: {
    dashboard: 'Command Center',
    subtitle: 'Today at Team Bundy',
    inbox: 'Front Desk',
    calls: 'Calls',
    analytics: 'Analytics',
    settings: 'Settings',
    totalCalls: 'Inquiries Captured',
    trialsBooked: 'Trials Scheduled',
  },

  tabs: {
    all: 'All Activity',
    trial: 'Trial Classes',
    message: 'Messages',
    question: 'Questions',
    misc: 'Other Activity',
    cancellation: 'Cancellations',
    spam: 'Spam',
  },

  statuses: {
    confirmed: 'Confirmed',
    newInquiry: 'New Inquiry',
  },

  programs: [
    'Kids Jiu-Jitsu',
    'Teen Jiu-Jitsu',
    'Fighting Fundamentals',
  ],

  // Color palette — sourced from teambundymma.com (navy + white)
  colors: {
    primary: '#13518C',       // Team Bundy navy-blue — active states, tabs, links
    primaryDark: '#0B355C',   // Deeper navy
    accent: '#2E8B9E',        // Muted teal — success, confirmed states
    alert: '#D5242C',         // Crimson — attention, urgent items
    sidebar: '#0B2A47',       // Deep navy — sidebar background
    sidebarText: '#dbe4ee',   // Light blue-gray — sidebar text
    sidebarActive: '#13518C', // Navy — active nav item
    surface: '#F5F6F8',       // Light gray — page background
    card: '#FFFFFF',          // White — card backgrounds
    text: '#1e293b',          // Near-black — primary text
    textSecondary: '#64748b', // Slate — secondary text
    border: '#e2e8f0',        // Light border
  },
}

const roneyEdler = {
  // Identity
  name: 'Roney Edler Brazilian Jiu-Jitsu',
  shortName: 'Roney Edler BJJ',
  logo: '/roney-edler-logo-white.png',
  poweredBy: 'Beacon',

  terminology: {
    dashboard: 'Command Center',
    subtitle: 'Today at Roney Edler BJJ',
    inbox: 'Front Desk',
    calls: 'Calls',
    analytics: 'Analytics',
    settings: 'Settings',
    totalCalls: 'Inquiries Captured',
    trialsBooked: 'Trials Scheduled',
  },

  tabs: {
    all: 'All Activity',
    trial: 'Trial Classes',
    message: 'Messages',
    question: 'Questions',
    misc: 'Other Activity',
    cancellation: 'Cancellations',
    spam: 'Spam',
  },

  statuses: {
    confirmed: 'Confirmed',
    newInquiry: 'New Inquiry',
  },

  programs: [
    'Little Samurais',
    'Warriors',
    'Fundamentals',
    'Advanced',
    'No-Gi',
    'Competition',
  ],

  // Color palette — Sertão crest is a bold black-and-white desert stamp.
  // Near-black sidebar carries the white crest; a crisp blue primary drives
  // active states, kept distinct from the other tenants (McHugh #1867C0 /
  // Bundy #13518C).
  colors: {
    primary: '#2563EB',       // Blue — active states, tabs, links
    primaryDark: '#1D4ED8',   // Deeper blue
    accent: '#3F7D5A',        // Cactus green — success, confirmed states
    alert: '#D5242C',         // Crimson — attention, urgent items
    sidebar: '#141414',       // Near-black — sidebar background (matches the stamp crest)
    sidebarText: '#e5e5e5',   // Light gray — sidebar text
    sidebarActive: '#2563EB', // Blue — active nav item
    surface: '#F5F5F4',       // Warm light gray — page background
    card: '#FFFFFF',          // White — card backgrounds
    text: '#1e293b',          // Near-black — primary text
    textSecondary: '#64748b', // Slate — secondary text
    border: '#e7e5e4',        // Light warm border
  },
}

const gbArcadia = {
  // Identity
  name: 'Gracie Barra Phoenix',
  shortName: 'GB Arcadia',
  logo: '/gb-arcadia-logo-white.png',
  poweredBy: 'Beacon',

  // Demo simplification: hide the Messages page from the nav (message-type
  // calls still appear in the Command Center feed and Call History).
  hiddenNav: ['/messages'],

  terminology: {
    dashboard: 'Command Center',
    subtitle: 'Today at GB Arcadia',
    inbox: 'Front Desk',
    calls: 'Calls',
    analytics: 'Analytics',
    settings: 'Settings',
    totalCalls: 'Inquiries Captured',
    trialsBooked: 'Trials Scheduled',
  },

  tabs: {
    all: 'All Activity',
    trial: 'Trial Classes',
    message: 'Messages',
    question: 'Questions',
    misc: 'Other Activity',
    cancellation: 'Cancellations',
    spam: 'Spam',
  },

  statuses: {
    confirmed: 'Confirmed',
    newInquiry: 'New Inquiry',
  },

  programs: [
    'Tiny Champions',
    'Little Champions 1',
    'Little Champions 2',
    'Juniors',
    'Parents & Kids',
    'GB1 All Levels',
    'GB2 Advanced',
    "Women's Program",
  ],

  // Color palette — blue-primary per John (2026-07-29 swap request): blue
  // drives active states/tabs/attention, Gracie Barra red (#E3201B wordmark)
  // is reserved for the sidebar active accent against the near-black.
  colors: {
    primary: '#1D4ED8',       // Royal blue — active states, tabs, links
    primaryDark: '#153EA8',   // Deeper blue
    accent: '#2E8B57',        // Mat green — success, confirmed states
    alert: '#2563EB',         // Bright blue — attention, urgent items
    sidebar: '#161616',       // Near-black — sidebar background (carries the white wordmark)
    sidebarText: '#e5e5e5',   // Light gray — sidebar text
    sidebarActive: '#E3201B', // GB red — active nav item
    sidebarActiveBg: 'rgba(227, 32, 27, 0.18)', // GB red tint — active nav background
    sidebarActiveText: '#F87171', // Light red — active nav label on dark sidebar
    surface: '#F5F5F4',       // Warm light gray — page background
    card: '#FFFFFF',          // White — card backgrounds
    text: '#1e293b',          // Near-black — primary text
    textSecondary: '#64748b', // Slate — secondary text
    border: '#e7e5e4',        // Light warm border
  },
}

const matakas = {
  // Identity
  name: 'Matakas Jiu Jitsu',
  shortName: 'Matakas',
  logo: '/matakas-logo-white.png',
  poweredBy: 'Beacon',

  // Demo simplification: hide Messages and the SMS-agent Member Replies queue
  // (no SMS agent on this demo; message-type calls still appear in the feed).
  hiddenNav: ['/messages', '/replies'],

  // Demo polish: cleaned transcript only — no "Show raw transcript" link.
  hideRawTranscriptToggle: true,

  // Sidebar line under "Powered by Beacon" (defaults to the account name).
  locationLabel: 'Florence',

  terminology: {
    dashboard: 'Command Center',
    subtitle: 'Today at Matakas Jiu Jitsu',
    inbox: 'Front Desk',
    calls: 'Calls',
    analytics: 'Analytics',
    settings: 'Settings',
    totalCalls: 'Inquiries Captured',
    trialsBooked: 'Trials Scheduled',
  },

  tabs: {
    all: 'All Activity',
    trial: 'Trial Classes',
    message: 'Messages',
    question: 'Questions',
    misc: 'Other Activity',
    cancellation: 'Cancellations',
    spam: 'Spam',
  },

  statuses: {
    confirmed: 'Confirmed',
    newInquiry: 'New Inquiry',
  },

  // Matches the Retell post-call `program` enum. Florence Academy only —
  // Hamilton callers are handled as take-a-message, never booked.
  programs: [
    'Tiny Tykes',
    'Youth 1',
    'Youth 2',
    'Adult Fundamentals',
    'Adult All Levels',
    'Adult Advanced',
  ],

  // Color palette — Matakas brand is deep forest green on white (schedule
  // sheets sample #002d18). Green drives active states; near-black-green
  // sidebar carries the white wordmark.
  colors: {
    primary: '#15803D',       // Forest green — active states, tabs, links
    primaryDark: '#116232',   // Deeper green
    accent: '#2E8B57',        // Mat green — success, confirmed states
    alert: '#D97706',         // Amber — attention, urgent items
    sidebar: '#0d2116',       // Near-black green — sidebar background (carries the white wordmark)
    sidebarText: '#e5e5e5',   // Light gray — sidebar text
    sidebarActive: '#22C55E', // Bright green — active nav item
    sidebarActiveBg: 'rgba(34, 197, 94, 0.15)', // Green tint — active nav background
    sidebarActiveText: '#4ADE80', // Light green — active nav label on dark sidebar
    surface: '#F5F5F4',       // Warm light gray — page background
    card: '#FFFFFF',          // White — card backgrounds
    text: '#1e293b',          // Near-black — primary text
    textSecondary: '#64748b', // Slate — secondary text
    border: '#e7e5e4',        // Light warm border
  },
}

// Keyed by Supabase clients.id
export const BRANDINGS = {
  '6d047c8a-bedf-4feb-9223-803c57a8ce1a': mchugh,    // McHugh Jiu Jitsu HQ
  'd094ef3f-0b1d-4054-b47e-16596855a51b': teamBundy, // Team Bundy Jiu-Jitsu
  '5503c49f-bd9c-438a-a4cd-4e2d583b0319': roneyEdler, // Roney Edler Brazilian Jiu-Jitsu
  '2a94f278-af97-4400-9737-3080752c4ae9': gbArcadia,  // Gracie Barra Arcadia
  'b807d455-368f-4c34-b666-6ce98a084722': matakas,    // Matakas Jiu Jitsu
}

// Resolve branding for the logged-in client; default to McHugh for
// unknown/admin sessions so existing behavior is preserved.
export function getBranding(clientData) {
  return (clientData && BRANDINGS[clientData.id]) || mchugh
}

export default mchugh
