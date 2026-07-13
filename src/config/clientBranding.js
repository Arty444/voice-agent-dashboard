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
  // Near-black sidebar carries the white crest; desert-amber primary +
  // cactus-green accent evoke the Sertão theme and stay distinct from the
  // other tenants (McHugh blue / Bundy navy).
  colors: {
    primary: '#B26A1F',       // Desert amber/bronze — active states, tabs, links
    primaryDark: '#8A4F17',   // Deeper bronze
    accent: '#3F7D5A',        // Cactus green — success, confirmed states
    alert: '#D5242C',         // Crimson — attention, urgent items
    sidebar: '#141414',       // Near-black — sidebar background (matches the stamp crest)
    sidebarText: '#e5e5e5',   // Light gray — sidebar text
    sidebarActive: '#B26A1F', // Amber — active nav item
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
}

// Resolve branding for the logged-in client; default to McHugh for
// unknown/admin sessions so existing behavior is preserved.
export function getBranding(clientData) {
  return (clientData && BRANDINGS[clientData.id]) || mchugh
}

export default mchugh
