/**
 * Core Deterministic Planning Engine for Indian Celebrations
 * Provides exact budget arithmetic, milestone timelines with compression,
 * vendor checklists, context-aware warnings, and rule-based personalised ideas.
 */

import {
  EVENT_TYPES,
  VENUE_TYPES,
  DIET_TYPES,
  IDEAL_LEAD_DAYS,
  MIN_BUDGET_PER_GUEST_INR,
  BUDGET_ALLOCATIONS,
  MILESTONE_TEMPLATES,
  VENDOR_TEMPLATES
} from './constants.js';

/**
 * Calculates budget breakdown by category ensuring exact rupee sum.
 *
 * @param {string} eventType - wedding | birthday | community
 * @param {string} venueType - indoor | outdoor
 * @param {number} totalBudget - Total event budget in INR
 * @returns {{ categories: Array<{ id: string, name: string, percent: number, amount: number }>, totalBudget: number, checkSum: number }}
 */
export function calculateBudgetBreakdown(eventType, venueType, totalBudget) {
  const allocationRules = BUDGET_ALLOCATIONS[eventType]?.[venueType] ||
    BUDGET_ALLOCATIONS[EVENT_TYPES.WEDDING][VENUE_TYPES.INDOOR];

  // Step 1: Compute initial amounts with floor
  const categories = allocationRules.map((cat) => {
    const rawAmount = (totalBudget * cat.percent) / 100;
    return {
      id: cat.id,
      name: cat.name,
      percent: cat.percent,
      amount: Math.floor(rawAmount),
      remainderFraction: rawAmount - Math.floor(rawAmount)
    };
  });

  // Step 2: Calculate difference due to integer rounding
  const currentSum = categories.reduce((acc, cat) => acc + cat.amount, 0);
  let discrepancy = totalBudget - currentSum;

  // Step 3: Distribute remaining rupees to categories with highest fractional remainders
  const sortedByRemainder = [...categories].sort(
    (a, b) => b.remainderFraction - a.remainderFraction
  );

  for (let i = 0; i < discrepancy; i++) {
    const target = sortedByRemainder[i % sortedByRemainder.length];
    target.amount += 1;
  }

  // Final check to guarantee exact equality
  const finalCategories = categories.map(({ id, name, percent, amount }) => ({
    id,
    name,
    percent,
    amount
  }));

  const finalSum = finalCategories.reduce((acc, cat) => acc + cat.amount, 0);

  return {
    categories: finalCategories,
    totalBudget,
    checkSum: finalSum
  };
}

/**
 * Calculates days between two date objects (ignoring time-of-day).
 * @param {Date} startDate - Reference start date
 * @param {Date} endDate - Event target date
 * @returns {number} Days difference (positive or zero)
 */
export function calculateDaysBetween(startDate, endDate) {
  const startUTC = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endUTC = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const diffMs = endUTC - startUTC;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Formats a Date object as YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates an ordered milestone timeline, automatically compressing if lead time is short.
 *
 * @param {string} eventType - Event type
 * @param {string} eventDateStr - Target event date YYYY-MM-DD
 * @param {Date} [referenceDate] - Current reference date (defaults to today)
 * @returns {{ milestones: Array<Object>, isCompressed: boolean, availableDays: number, idealLeadDays: number }}
 */
export function generateTimeline(eventType, eventDateStr, referenceDate = new Date()) {
  const [year, month, day] = eventDateStr.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);
  const availableDays = calculateDaysBetween(referenceDate, eventDate);
  const idealLead = IDEAL_LEAD_DAYS[eventType] || 60;
  const isCompressed = availableDays < idealLead;

  const templates = MILESTONE_TEMPLATES[eventType] || MILESTONE_TEMPLATES[EVENT_TYPES.WEDDING];

  // Compression factor: scale milestone offset within available window
  const effectiveWindow = isCompressed ? availableDays : idealLead;

  const milestones = templates.map((tmpl) => {
    // Days before event date
    const offsetDays = Math.round(tmpl.relOffsetPercent * effectiveWindow);

    // Calculate milestone target date
    const milestoneDate = new Date(eventDate);
    milestoneDate.setDate(milestoneDate.getDate() - offsetDays);

    // If compressed or today, ensure milestone date does not fall before referenceDate
    if (milestoneDate.getTime() < referenceDate.setHours(0, 0, 0, 0)) {
      milestoneDate.setTime(referenceDate.getTime());
    }

    return {
      id: tmpl.id,
      title: tmpl.title,
      phase: tmpl.phase,
      daysBeforeEvent: offsetDays,
      targetDate: formatDate(milestoneDate),
      description: tmpl.description
    };
  });

  // Sort chronologically: earliest date first, ending with Event Day
  milestones.sort((a, b) => {
    if (a.targetDate !== b.targetDate) {
      return a.targetDate.localeCompare(b.targetDate);
    }
    return b.daysBeforeEvent - a.daysBeforeEvent;
  });

  return {
    milestones,
    isCompressed,
    availableDays,
    idealLeadDays: idealLead
  };
}

/**
 * Builds vendor checklist with suggested budget distributions.
 *
 * @param {string} eventType - wedding | birthday | community
 * @param {string} venueType - indoor | outdoor
 * @param {Array<Object>} budgetCategories - Calculated budget breakdown categories
 * @returns {Array<Object>}
 */
export function generateVendorChecklist(eventType, venueType, budgetCategories) {
  const baseVendors = VENDOR_TEMPLATES[eventType] || VENDOR_TEMPLATES[EVENT_TYPES.WEDDING];
  const categoryMap = new Map(budgetCategories.map((c) => [c.id, c.amount]));

  const checklist = baseVendors.map((vendor) => {
    let suggestedBudget = 0;

    // Approximate vendor suggested budget from matching categories
    if (vendor.category.toLowerCase().includes('cater') || vendor.category.toLowerCase().includes('food') || vendor.category.toLowerCase().includes('bakery')) {
      const catBudget = categoryMap.get('catering') || categoryMap.get('cake') || 0;
      suggestedBudget = Math.round(catBudget * 0.7);
    } else if (vendor.category.toLowerCase().includes('venue')) {
      const catBudget = categoryMap.get('venue') || categoryMap.get('venue_shamiana') || 0;
      suggestedBudget = Math.round(catBudget * 0.85);
    } else if (vendor.category.toLowerCase().includes('decor') || vendor.category.toLowerCase().includes('infrastructure')) {
      const catBudget = categoryMap.get('decor') || categoryMap.get('decor_tentage') || categoryMap.get('venue_shamiana') || 0;
      suggestedBudget = Math.round(catBudget * 0.65);
    } else if (vendor.category.toLowerCase().includes('photo')) {
      const catBudget = categoryMap.get('photography') || 0;
      suggestedBudget = Math.round(catBudget * 0.9);
    } else if (vendor.category.toLowerCase().includes('entertain') || vendor.category.toLowerCase().includes('sound')) {
      const catBudget = categoryMap.get('entertainment') || categoryMap.get('av_sound') || categoryMap.get('av_power') || 0;
      suggestedBudget = Math.round(catBudget * 0.7);
    } else {
      // General proportional allocation
      const catBudget = categoryMap.get('contingency') || categoryMap.get('attire_styling') || categoryMap.get('favours') || 10000;
      suggestedBudget = Math.round(catBudget * 0.5);
    }

    return {
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      priority: vendor.priority,
      suggestedBudget: Math.max(500, suggestedBudget),
      notes: vendor.notes,
      checked: false
    };
  });

  // Outdoor specific vendor additions
  if (venueType === VENUE_TYPES.OUTDOOR) {
    checklist.push({
      id: 'v-outdoor-genset',
      name: 'Silent Diesel Generator (62.5+ kVA) & Operator',
      category: 'Power & Safety',
      priority: 'high',
      suggestedBudget: Math.max(12000, Math.round((categoryMap.get('genset_backup') || categoryMap.get('av_power') || 15000) * 0.6)),
      notes: 'Essential for uninterrupted AC, music sound system, and lighting during voltage fluctuations.',
      checked: false
    });
  }

  return checklist;
}

/**
 * Identifies contextual warnings based on budget, timeline, crowd, and venue risks.
 *
 * @param {Object} input - Sanitized planning parameters
 * @param {number} availableDays - Days remaining until event
 * @returns {Array<{ id: string, type: 'warning' | 'caution' | 'alert', message: string }>}
 */
export function generateWarnings(input, availableDays) {
  const warnings = [];
  const { eventType, guestCount, totalBudget, venueType, diet } = input;

  // 1. Per-guest budget tightness check
  const perGuest = Math.round(totalBudget / guestCount);
  const minRecommended = MIN_BUDGET_PER_GUEST_INR[eventType] || 500;

  if (perGuest < minRecommended) {
    warnings.push({
      id: 'warn-tight-budget',
      type: 'warning',
      message: `Tight Budget Alert: At ₹${perGuest.toLocaleString('en-IN')}/guest, your budget is below the recommended benchmark of ₹${minRecommended.toLocaleString('en-IN')}/guest for Indian ${eventType}s. Consider streamlining menu courses or trimming non-essential floral decor to protect food quality.`
    });
  }

  // 2. Short notice compression warning
  const idealLead = IDEAL_LEAD_DAYS[eventType];
  if (availableDays < 7) {
    warnings.push({
      id: 'warn-urgent-notice',
      type: 'alert',
      message: `Immediate Action Required: Your event is in just ${availableDays} day${availableDays === 1 ? '' : 's'}. Lock venue and catering immediately today with cash/UPI advance; prime vendors may have limited availability.`
    });
  } else if (availableDays < idealLead) {
    warnings.push({
      id: 'warn-compressed-timeline',
      type: 'caution',
      message: `Short Notice Schedule: Recommended planning lead time is ${idealLead} days, but your event is in ${availableDays} days. The milestone timeline has been compressed into an accelerated schedule.`
    });
  }

  // 3. Outdoor venue weather & power risk
  if (venueType === VENUE_TYPES.OUTDOOR) {
    warnings.push({
      id: 'warn-outdoor-weather',
      type: 'caution',
      message: 'Outdoor Venue Notice: Weather and temperature fluctuations can impact outdoor gatherings. Ensure your tentage vendor provides waterproof German hanger shamianas and secure a backup covered hall with venue management.'
    });
  }

  // 4. Large crowd management warning
  if (guestCount > 300) {
    warnings.push({
      id: 'warn-large-crowd',
      type: 'warning',
      message: `High Attendance Notice (${guestCount} guests): Set up at least 3 distinct buffet stations to avoid mealtime queues, designate parking attendants, and ensure emergency medical kits are on site.`
    });
  }

  // 5. Mixed diet segregation warning
  if (diet === DIET_TYPES.MIXED) {
    warnings.push({
      id: 'warn-mixed-diet',
      type: 'caution',
      message: 'Dietary Segregation Advisory: With a mixed guest list, clearly separate vegetarian and non-vegetarian buffet tables with distinct signage, separate serving ladles, and dedicated service staff.'
    });
  }

  return warnings;
}

/**
 * Deterministic personalized ideas engine combining cultural traditions,
 * city flavor, dietary choices, and user preferences.
 *
 * @param {Object} input - Sanitized planning parameters
 * @returns {Array<string>} List of personalized ideas
 */
export function generateDeterministicIdeas(input) {
  const { eventType, guestCount, city, diet, preferences } = input;
  const ideas = [];
  const lowerCity = city.toLowerCase();
  const lowerPrefs = preferences.toLowerCase();

  // 1. Regional Indian City Flavor
  if (lowerCity.includes('delhi') || lowerCity.includes('ncr') || lowerCity.includes('gurgaon') || lowerCity.includes('noida')) {
    ideas.push('Delhi Street Chaat Gali: Set up authentic live stalls for Chandni Chowk dahi bhalla, stuffed golgappas with 5 flavored waters, and tandoori kulhad chai.');
    ideas.push('Grand Punjabi Dhol Tasha Entrance: Coordinate a high-energy live dhol procession with color smoke flares for a memorable arrival.');
  } else if (lowerCity.includes('mumbai') || lowerCity.includes('thane') || lowerCity.includes('navi mumbai')) {
    ideas.push('Mumbai Marine & Bollywood Vibe: Create a photo-op red carpet backdrop with custom cinema ticket invitations and a late-night live Pav Bhaji counter.');
    ideas.push('Coastal Kokum & Tender Coconut Welcome Bar: Offer refreshing local coastal welcome coolers in eco-friendly brass tumblers.');
  } else if (lowerCity.includes('bengaluru') || lowerCity.includes('bangalore')) {
    ideas.push('Bengaluru Garden & Craft Coffee Experience: Incorporate lush South-Indian botanical elements with an artisanal South Indian filter coffee live bar.');
    ideas.push('Eco-Conscious Zero-Plastic Ethos: Partner with local Karnataka terracotta artisans for reusable kulhads and plantable seed paper gift tags.');
  } else if (lowerCity.includes('chennai') || lowerCity.includes('coimbatore') || lowerCity.includes('madurai')) {
    ideas.push('Traditional Carnatic Welcome: Hire live Nadaswaram and Thavil artists for an auspicious ceremonial entrance.');
    ideas.push('Authentic Elai Sappadu Feast: Organize traditional plantain leaf seating serving hot sambar, rasam, payasam, and appalam.');
  } else if (lowerCity.includes('kolkata')) {
    ideas.push('Kolkata Adda & Mishti Counter: Curate a vintage Bengali Adda lounge with warm mood lighting and live hot baked rasgulla & sandesh live service.');
    ideas.push('Rabindra Sangeet & Baul Fusion Prelude: Gentle acoustic Bengali folk melodies to set an elegant cultural tone.');
  } else if (lowerCity.includes('hyderabad')) {
    ideas.push('Nizami Dum Biryani Deg: Feature authentic slow-cooked dum biryani served straight from clay handis with mirchi ka salan and double ka meetha.');
    ideas.push('Hyderabadi Lac & Pearl Favours: Gift guests handcrafted Laad Bazaar bangles or pearl-studded souvenir pouches.');
  } else if (lowerCity.includes('jaipur') || lowerCity.includes('udaipur') || lowerCity.includes('jodhpur')) {
    ideas.push('Royal Rajputana Hospitality: Greet guests with traditional rosewater attar spray, fragrant marigold garlands, and Rajasthani folk musicians.');
    ideas.push('Dal Baati Churma & Ghewar Station: A dedicated royal heritage thali counter with live ghee-dipped churma variations.');
  } else if (lowerCity.includes('pune')) {
    ideas.push('Puneri Pheta & Tutari Welcome: Welcome guests with royal Maharashtrian turbans (phetas) and traditional Tutari brass fanfares.');
    ideas.push('Ukdiche Modak Live Counter: Serve freshly steamed hot jaggery-coconut modaks drizzled with pure desi ghee.');
  } else {
    // Pan-Indian default touches
    ideas.push(`Auspicious ${city} Welcome: Greet attendees with traditional kumkum tilak, fresh floral gajras, and brass lamp lighting.`);
    ideas.push('Live Regional Mithai Kadhai: Hot jalebis fried live in pure desi ghee paired with chilled rabdi.');
  }

  // 2. Dietary personalization
  if (diet === DIET_TYPES.VEG) {
    ideas.push('Pure Satvik & Jain Friendly Station: Dedicated counter without onion/garlic, featuring paneer tikka, crisp kachoris, and badam milk.');
  } else if (diet === DIET_TYPES.NON_VEG) {
    ideas.push('Live Sigree & Tandoor Grills: Sizzling seekh kebabs, mutton galoutis on coin parathas, and coastal fish fry counters.');
  } else {
    ideas.push('Strictly Partitioned Food Stations: Distinct green and red canopy signs with separate service teams for absolute dining comfort.');
  }

  // 3. Event Type Specific Traditions & Innovations
  if (eventType === EVENT_TYPES.WEDDING) {
    ideas.push('Mehendi Henna Lounge with Foot Reflexology: Set up comfy diwan seating with cushion bolsters so elder relatives can relax while getting mehendi.');
    ideas.push('Interactive Digital QR Photo Drive: Place small table cards with a custom QR code allowing guests to upload their live candid photos directly to a shared family album.');
  } else if (eventType === EVENT_TYPES.BIRTHDAY) {
    ideas.push('Customized Memory Time Capsule: A signature canvas where all attendees leave thumbprints or short heartfelt wishes for the birthday star.');
    ideas.push('DIY Cookie / Cupcake Decorating Corner: Kids receive aprons and chef hats to frost their own party cupcakes with colorful sprinkles.');
  } else {
    ideas.push('Community Volunteer Recognition Ceremony: Present personalized certificates or commemorative shawls to society elders and key organizers.');
    ideas.push('Zero Food Waste Partnership: Pre-arrange with a verified local NGO or Robin Hood Army to collect clean surplus food at the end of the feast.');
  }

  // 4. Free text preference matching
  if (lowerPrefs.includes('dance') || lowerPrefs.includes('bollywood') || lowerPrefs.includes('sangeet')) {
    ideas.push('Choreographed Flash Mob & LED Dance Floor: Surprise the gathering with a curated multi-generation family dance medley on an infinity LED floor.');
  }
  if (lowerPrefs.includes('sustainable') || lowerPrefs.includes('eco') || lowerPrefs.includes('green')) {
    ideas.push('Eco-Friendly Seed Return Favours: Gift guests potted tulsi, flowering succulents, or seed pens to honour an eco-friendly celebration.');
  }
  if (lowerPrefs.includes('photo') || lowerPrefs.includes('reels') || lowerPrefs.includes('instagram')) {
    ideas.push('360-Degree Video Booth: An interactive rotating camera platform with fun Indian props (sunglasses, quirky auto-rickshaw cutouts) for instant social sharing.');
  }

  // 5. Guest Count scale adjustments
  if (guestCount <= 50) {
    ideas.push('Intimate Handwritten Notes: Place a personalized handwritten note on each guest\'s seat expressing gratitude for their presence.');
  } else if (guestCount > 500) {
    ideas.push('Dedicated Buggy & Golf Cart Escorts: For grand venue lawns, deploy golf carts to comfortably escort senior citizens and children from parking to banquet.');
  }

  return ideas;
}

/**
 * Generates the complete, deterministic celebration plan.
 *
 * @param {Object} input - Sanitized user input parameters
 * @param {Date} [referenceDate] - Optional current date for deterministic testing
 * @returns {Object} Complete event plan
 */
export function generatePlan(input, referenceDate = new Date()) {
  const { eventType, venueType, totalBudget, eventDate } = input;

  const budgetBreakdown = calculateBudgetBreakdown(
    eventType,
    venueType,
    totalBudget
  );

  const timelineResult = generateTimeline(
    eventType,
    eventDate,
    referenceDate
  );

  const vendors = generateVendorChecklist(
    eventType,
    venueType,
    budgetBreakdown.categories
  );

  const warnings = generateWarnings(
    input,
    timelineResult.availableDays
  );

  const deterministicIdeas = generateDeterministicIdeas(input);

  const summary = `Comprehensive celebration plan prepared for a ${eventType} in ${input.city} with ${input.guestCount} guests and a total budget of ₹${totalBudget.toLocaleString('en-IN')}.`;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      currency: 'INR',
      referenceDate: formatDate(referenceDate)
    },
    input,
    summary,
    budget: budgetBreakdown,
    timeline: timelineResult,
    vendors,
    warnings,
    personalizedIdeas: deterministicIdeas,
    aiEnriched: false
  };
}
