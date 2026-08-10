// DEMO-ONLY mock of the Supabase client. Activated only when VITE_DEMO is set
// (see supabase.js). Feeds the real dashboard a clean, curated dataset so the
// UI can be screen-recorded for a sales demo without touching real client data
// or exposing any real prospect's name/number. Safe to delete; not used in prod.

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function isoDate(d) {
  return d.toISOString().split('T')[0]
}
function isoAt(d, hh, mm) {
  const x = new Date(d)
  x.setHours(hh, mm, 0, 0)
  return x.toISOString()
}

const CLIENT_ID = 'demo-mchugh'

// ---- The featured call (the one we voice + show the transcript of) ----
const FEATURED_TRANSCRIPT = `Agent: Thanks for calling McHugh Jiu Jitsu, this is Alex. How can I help you today?
User: Hi, yeah — I'm looking to get my son into jiu jitsu. He's seven. Do you have classes for that age?
Agent: We do! For a seven-year-old that's our Little Sharks program — it's all about focus, confidence, and having fun on the mats. Would you like to come in for a free trial class?
User: Yeah, that would be great.
Agent: Awesome. We run Little Sharks on Mondays and Wednesdays at five PM. Does this Wednesday work?
User: Wednesday works.
Agent: Perfect. Can I grab your name and the best number to reach you?
User: Sure, it's Jordan Riley, and this number is fine.
Agent: Got it, Jordan. I've got your son booked for the Little Sharks trial this Wednesday at five PM. Just arrive about ten minutes early in comfortable clothes, and we'll take care of the rest. Anything else I can help with?
User: Nope, that's it. Thank you!
Agent: You're all set — we'll see you Wednesday. Thanks for calling McHugh Jiu Jitsu!`

function call(o) {
  const d = o.day != null ? daysAgo(o.day) : daysAgo(0)
  return {
    id: o.id,
    client_id: CLIENT_ID,
    created_at: isoAt(d, o.hh ?? 12, o.mm ?? 0),
    call_date: isoDate(d),
    call_time: `${String(o.hh ?? 12).padStart(2, '0')}:${String(o.mm ?? 0).padStart(2, '0')}:00`,
    caller_name: o.name || null,
    display_name: o.name || null,
    caller_phone: o.phone || null,
    program: o.program || null,
    final_outcome: o.outcome || null,
    call_type: o.type || null,
    summary: o.summary || null,
    transcript: o.transcript || null,
    trial_day: o.trialDay || null,
    trial_time: o.trialTime || null,
    duration_seconds: o.dur || null,
    needs_follow_up: !!o.followUp,
    follow_up_reason: o.followUpReason || null,
    handled: !!o.handled,
    pinned: !!o.pinned,
    read_at: o.unread ? null : isoAt(d, (o.hh ?? 12) + 1, 0),
    deleted_at: null,
    is_spam: !!o.spam,
    is_lead: !!o.lead,
    is_member: !!o.member,
    is_former_member: !!o.former,
    is_prospect: !!o.prospect,
    member_account_name: o.account || null,
    member_contact_name: o.name || null,
    name_source: o.nameSource || null,
    staff_note: o.note || null,
    category: o.category || null,
  }
}

const CALLS = [
  // --- Featured booked trial (top of feed, unread, pinned) ---
  call({
    id: 'c-featured', day: 0, hh: 16, mm: 12, name: 'Jordan Riley', phone: '(856) 555-0148',
    program: 'Little Sharks', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true,
    pinned: true, unread: true, followUp: true, dur: 78,
    trialDay: isoDate(daysAgo(-2)), trialTime: '5:00 PM',
    summary: 'Parent calling about jiu jitsu for their 7-year-old son. Agent identified Little Sharks as the right program and booked a free trial class for Wednesday at 5:00 PM. Captured name and phone for staff follow-up.',
    transcript: FEATURED_TRANSCRIPT,
  }),
  // --- Other booked trials ---
  call({ id: 'c2', day: 0, hh: 11, mm: 5, name: 'Marcus Delgado', phone: '(609) 555-0192', program: 'Adult Jiu Jitsu', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, unread: true, followUp: true, dur: 64, trialDay: isoDate(daysAgo(-1)), trialTime: '6:30 PM', summary: 'Adult beginner interested in fundamentals. Booked a free trial for Tuesday at 6:30 PM.' }),
  call({ id: 'c3', day: 1, hh: 18, mm: 40, name: 'Priya Nair', phone: '(856) 555-0173', program: 'Tiny Sharks', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, followUp: true, dur: 71, trialDay: isoDate(daysAgo(-1)), trialTime: '4:30 PM', summary: 'Mom of a 4-year-old. Booked a Tiny Sharks trial for Tuesday at 4:30 PM.' }),
  call({ id: 'c4', day: 2, hh: 9, mm: 22, name: 'Devin Park', phone: '(215) 555-0155', program: 'Junior Sharks', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, followUp: true, dur: 59, trialDay: isoDate(daysAgo(0)), trialTime: '5:00 PM', summary: 'Booked Junior Sharks trial for a 10-year-old.' }),
  call({ id: 'c5', day: 3, hh: 19, mm: 15, name: 'Sara Whitman', phone: '(856) 555-0117', program: 'Adult Jiu Jitsu', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, handled: true, dur: 82, trialDay: isoDate(daysAgo(-3)), trialTime: '7:00 PM', summary: 'Adult trial booked for Thursday evening.' }),
  call({ id: 'c6', day: 5, hh: 10, mm: 48, name: 'Tyler Brooks', phone: '(609) 555-0134', program: 'Little Sharks', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, followUp: true, dur: 67, trialDay: isoDate(daysAgo(-1)), trialTime: '5:00 PM', summary: 'Little Sharks trial booked for a 6-year-old.' }),
  call({ id: 'c7', day: 6, hh: 13, mm: 5, name: 'Angela Foster', phone: '(856) 555-0166', program: 'Adult Jiu Jitsu', outcome: 'booked', type: 'Trial booking', lead: true, prospect: true, handled: true, dur: 74, trialDay: isoDate(daysAgo(0)), trialTime: '6:30 PM', summary: 'Adult fundamentals trial booked.' }),

  // --- Messages (wants a callback) ---
  call({ id: 'm1', day: 0, hh: 14, mm: 2, name: 'Robert Kim', phone: '(856) 555-0188', outcome: 'message', type: 'Message', unread: true, followUp: true, followUpReason: 'Wants pricing details for two kids — asked owner to call back.', dur: 41, summary: 'Caller asked about family pricing for two children and requested a callback from the owner.' }),
  call({ id: 'm2', day: 2, hh: 20, mm: 18, name: 'Christina Vance', phone: '(215) 555-0143', outcome: 'message', type: 'Message', handled: true, followUpReason: 'Asked about private lessons.', dur: 38, summary: 'Caller asked whether private lessons are available and left a message.' }),

  // --- Questions / info only ---
  call({ id: 'q1', day: 1, hh: 12, mm: 30, name: 'Unknown Caller', phone: '(856) 555-0129', outcome: 'info_only', type: 'Question', dur: 52, summary: 'Caller asked about class schedule and gym location. Provided hours and address.' }),
  call({ id: 'q2', day: 3, hh: 17, mm: 44, name: 'Hannah Lewis', phone: '(609) 555-0151', outcome: 'info_only', type: 'Question', handled: true, dur: 47, summary: 'Asked whether beginners need a gi to start. Explained loaner gear for trials.' }),
  call({ id: 'q3', day: 4, hh: 15, mm: 9, name: 'Unknown Caller', phone: '(856) 555-0102', outcome: 'info_only', type: 'Question', handled: true, dur: 33, summary: 'Asked about parking and spectator seating.' }),

  // --- Member-related cancellation / pause ---
  call({ id: 'cx1', day: 2, hh: 8, mm: 55, name: 'Greg Mason', phone: '(856) 555-0190', outcome: 'cancelled', type: 'Cancellation', member: true, account: 'Mason Family', handled: true, dur: 56, summary: 'Member called to cancel membership due to a schedule conflict. Captured for staff review.' }),
  call({ id: 'cx2', day: 5, hh: 9, mm: 30, name: 'Dana Cole', phone: '(609) 555-0177', outcome: null, type: 'Pause request', member: true, account: 'Cole Family', followUp: true, followUpReason: 'Wants to pause membership for one month (travel).', dur: 49, summary: 'Member requested a one-month pause/hold while traveling. Flagged for staff.' }),

  // --- Spam ---
  call({ id: 's1', day: 0, hh: 10, mm: 1, name: 'Unknown Caller', phone: '(800) 555-0011', outcome: 'spam', type: 'Spam', spam: true, handled: true, dur: 12, summary: 'Automated marketing call. Flagged as spam.' }),
  call({ id: 's2', day: 1, hh: 16, mm: 38, name: 'Unknown Caller', phone: '(888) 555-0022', outcome: 'spam', type: 'Spam', spam: true, handled: true, dur: 8 }),
  call({ id: 's3', day: 4, hh: 11, mm: 12, name: 'Unknown Caller', phone: '(877) 555-0033', outcome: 'spam', type: 'Spam', spam: true, handled: true, dur: 15 }),
]

// ---- client row returned for AuthContext ----
const CLIENT_ROW = {
  id: CLIENT_ID,
  email: 'demo@mchughbjj.com',
  business_name: 'McHugh Jiu Jitsu',
  name: 'McHugh Jiu Jitsu',
}

const DEMO_USER = { id: 'demo-user', email: 'demo@mchughbjj.com' }
const DEMO_SESSION = { user: DEMO_USER, access_token: 'demo' }

function tableData(table) {
  if (table === 'clients') return [CLIENT_ROW]
  if (table === 'calls' || table === 'calls_with_member') return CALLS
  return []
}

// Chainable, thenable query builder. Filters are mostly no-ops (the dataset is
// already scoped to the demo client and recent dates); .single() returns one row.
function makeQuery(table) {
  let rows = tableData(table)
  let single = false
  const q = {
    select() { return q },
    order() { return q },
    limit() { return q },
    gte() { return q },
    lte() { return q },
    ilike() { return q },
    eq(col, val) {
      if (col === 'email') rows = rows.filter(r => r.email === val)
      if (col === 'client_id') rows = rows.filter(r => r.client_id === val)
      if (col === 'id') rows = rows.filter(r => r.id === val)
      return q
    },
    single() { single = true; return q },
    update() {
      // Writes are accepted as no-ops in demo mode.
      return { eq: () => Promise.resolve({ data: null, error: null }) }
    },
    then(resolve) {
      const data = single ? (rows[0] ?? null) : rows
      return Promise.resolve({ data, error: null }).then(resolve)
    },
  }
  return q
}

export const demoClient = {
  auth: {
    getSession() {
      return Promise.resolve({ data: { session: DEMO_SESSION } })
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } }
    },
    signInWithPassword() {
      return Promise.resolve({ error: null })
    },
    signOut() { return Promise.resolve({ error: null }) },
    updateUser() { return Promise.resolve({ error: null }) },
  },
  from(table) { return makeQuery(table) },
}
