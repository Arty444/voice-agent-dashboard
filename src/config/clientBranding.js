// Client branding configuration
// Swap this file to rebrand the dashboard for a different client

const clientBranding = {
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
    leads: 'Prospects',
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

export default clientBranding
