/**
 * Guard for the multi-tenant branding config.
 *
 * WHY: branding used to be purely additive — one new object in BRANDINGS, so
 * "the other clients are unchanged" was trivially true. It isn't any more.
 * `lexicon` and `fonts` are read by shared page code (Dashboard, Analytics,
 * Calls, Leads, Layout), so a careless default edit silently re-words or
 * re-types EVERY tenant's dashboard. This asserts the defaults still produce
 * the original gym wording and typography for every client that doesn't
 * explicitly override them.
 *
 * Run after any edit to clientBranding.js or the pages that read it:
 *   node scripts/check-branding.mjs
 * Exits non-zero on regression, so it can gate a commit.
 */
import { getBranding, BRANDINGS } from '../src/config/clientBranding.js'

// The wording every martial-arts tenant must keep seeing.
const GYM_LEXICON = {
  bookingTab: 'Trial Classes',
  bookingBadge: 'Trial',
  bookingsPlural: 'Trials',
  bookingsLower: 'trials',
  bookingsScheduled: 'Trials Scheduled',
  bookingsBooked: 'Trials Booked',
  bookingVerb: 'Scheduled',
  bookingNoun: 'trial',
  programFallback: 'Class',
  bookingDayLabel: 'Trial Day',
  bookingTimeLabel: 'Trial Time',
  bookingFallbackSummary: 'Trial class inquiry',
  questionFallbackSummary: 'Had questions about classes',
  demandTitle: 'Trial Demand',
  demandVerb: 'booked',
  demandEmpty: 'No trials booked in this period yet.',
  volumeChartTitle: 'Call Volume and Trial Bookings',
  bestDaysTitle: 'Best Days for Trial Interest',
  bookingRateDetail: 'Trials divided by non-spam calls',
  programChartTitle: 'Program Demand',
  programLabel: 'Program',
  programsChartSubtitle: 'Which programs are generating trials',
  analyticsSubtitle: 'How the phone agent is affecting trials, staff follow-up, and member experience.',
  prospectsSubtitle: 'scheduled trials',
}

const GYM_FONTS = { heading: "'Khand', sans-serif", body: "'Poppins', sans-serif" }

// Clients that intentionally speak a non-gym vocabulary. Add a client here
// ONLY when its entry really does carry its own `lexicon` or `fonts`.
const OVERRIDDEN = new Set(['367a7a4c-f058-4c96-a2d9-89964ad42866']) // Cassara Chiropractic

let failures = 0
const fail = msg => { console.log(`  FAIL  ${msg}`); failures++ }

for (const [id, b] of Object.entries(BRANDINGS)) {
  if (OVERRIDDEN.has(id)) continue
  for (const [k, v] of Object.entries(GYM_LEXICON)) {
    if (b.lexicon[k] !== v) fail(`${b.name} lexicon.${k}: ${JSON.stringify(b.lexicon[k])} != ${JSON.stringify(v)}`)
  }
  if (b.fonts.heading !== GYM_FONTS.heading) fail(`${b.name} fonts.heading: ${b.fonts.heading}`)
  if (b.fonts.body !== GYM_FONTS.body) fail(`${b.name} fonts.body: ${b.fonts.body}`)
  if (b.logoWordmark) fail(`${b.name} unexpectedly sets logoWordmark`)
}

// Every entry must resolve a complete lexicon/fonts set — a typo'd key would
// otherwise render `undefined` in the UI.
for (const [, b] of Object.entries(BRANDINGS)) {
  for (const k of Object.keys(GYM_LEXICON)) {
    if (typeof b.lexicon[k] !== 'string' || !b.lexicon[k].length) {
      if (!(k === 'bookingNoun' && b.lexicon[k] === '')) fail(`${b.name} lexicon.${k} is empty/missing`)
    }
  }
  for (const k of ['heading', 'body']) {
    if (!b.fonts?.[k]) fail(`${b.name} fonts.${k} is missing`)
  }
  for (const k of ['primary', 'sidebar', 'sidebarText', 'surface', 'card', 'text', 'textSecondary', 'border', 'accent', 'alert']) {
    if (!b.colors?.[k]) fail(`${b.name} colors.${k} is missing`)
  }
}

// Pages read branding.lexicon on every render; a fresh object each call would
// churn memo/effect dependencies.
const id0 = Object.keys(BRANDINGS)[0]
if (getBranding({ id: id0 }) !== getBranding({ id: id0 })) fail('getBranding returns a new object per call')

// Unknown/admin sessions must still land on a complete default.
const fallback = getBranding(null)
if (!fallback?.lexicon?.bookingTab || !fallback?.fonts?.heading) fail('fallback branding is incomplete')

console.log(`\nchecked ${Object.keys(BRANDINGS).length} tenants`)
for (const [id, b] of Object.entries(BRANDINGS)) {
  const tag = OVERRIDDEN.has(id) ? 'custom vocabulary/type' : 'gym defaults'
  console.log(`  ${b.name.padEnd(30)} ${tag}`)
}

if (failures) {
  console.log(`\n${failures} regression(s) — do not commit`)
  process.exit(1)
}
console.log('\nPASS — defaults intact for every non-overridden tenant')
