/**
 * Centralized Named Constants for Utsav Event Planner
 * All values adhere to Indian celebration standards (INR currency, regional customs).
 */

export const EVENT_TYPES = Object.freeze({
  WEDDING: 'wedding',
  BIRTHDAY: 'birthday',
  COMMUNITY: 'community'
});

export const VENUE_TYPES = Object.freeze({
  INDOOR: 'indoor',
  OUTDOOR: 'outdoor'
});

export const DIET_TYPES = Object.freeze({
  VEG: 'veg',
  NON_VEG: 'non-veg',
  MIXED: 'mixed'
});

/**
 * Ideal lead time (in calendar days) recommended for Indian events.
 * If lead time is shorter, the planner triggers timeline compression and warnings.
 */
export const IDEAL_LEAD_DAYS = Object.freeze({
  [EVENT_TYPES.WEDDING]: 180,
  [EVENT_TYPES.COMMUNITY]: 60,
  [EVENT_TYPES.BIRTHDAY]: 30
});

/**
 * Recommended minimum per-guest budget in INR.
 * Events below these thresholds generate contextual financial warnings.
 */
export const MIN_BUDGET_PER_GUEST_INR = Object.freeze({
  [EVENT_TYPES.WEDDING]: 1200,
  [EVENT_TYPES.COMMUNITY]: 250,
  [EVENT_TYPES.BIRTHDAY]: 400
});

/**
 * Input limits to safeguard system stability and defend against abuse.
 */
export const INPUT_LIMITS = Object.freeze({
  MIN_GUEST_COUNT: 5,
  MAX_GUEST_COUNT: 10000,
  MIN_BUDGET_INR: 2000,
  MAX_BUDGET_INR: 500000000, // 50 Crores INR
  MAX_PREFERENCES_LENGTH: 500,
  MAX_CITY_LENGTH: 80,
  MAX_BODY_BYTES: 65536 // 64 KB
});

/**
 * Percentage allocations by event type and venue configuration.
 * Percentages must sum to 100.
 */
export const BUDGET_ALLOCATIONS = Object.freeze({
  [EVENT_TYPES.WEDDING]: {
    [VENUE_TYPES.INDOOR]: [
      { id: 'catering', name: 'Catering & Shaadi Feast', percent: 32 },
      { id: 'venue', name: 'Venue & Banquet Hospitality', percent: 22 },
      { id: 'decor', name: 'Decor, Floral Mandap & Lighting', percent: 16 },
      { id: 'photography', name: 'Photography & Cinematography', percent: 12 },
      { id: 'attire_styling', name: 'Bridal/Groom Attire & Mehendi', percent: 8 },
      { id: 'entertainment', name: 'DJ, Sangeet & Sound Setup', percent: 6 },
      { id: 'contingency', name: 'Contingency, Sweets & Logistics', percent: 4 }
    ],
    [VENUE_TYPES.OUTDOOR]: [
      { id: 'catering', name: 'Catering & Live Food Counters', percent: 30 },
      { id: 'decor_tentage', name: 'Waterproof Tentage, Mandap & Decor', percent: 20 },
      { id: 'venue', name: 'Lawn/Ground Venue Rental', percent: 18 },
      { id: 'photography', name: 'Photography & Drone Coverage', percent: 12 },
      { id: 'attire_styling', name: 'Bridal/Groom Attire & Mehendi', percent: 8 },
      { id: 'genset_backup', name: 'Genset, Power & Weather Backup', percent: 6 },
      { id: 'entertainment', name: 'DJ, Dhol & Sangeet Sound', percent: 6 }
    ]
  },
  [EVENT_TYPES.BIRTHDAY]: {
    [VENUE_TYPES.INDOOR]: [
      { id: 'catering', name: 'Food, Snacks & Mocktail Bar', percent: 35 },
      { id: 'venue', name: 'Party Hall / Banquet Rental', percent: 20 },
      { id: 'decor', name: 'Theme Balloon Styling & Backdrop', percent: 15 },
      { id: 'entertainment', name: 'Games Host, Magician & Sound', percent: 12 },
      { id: 'cake', name: 'Custom Designer Cake & Desserts', percent: 10 },
      { id: 'favours', name: 'Curated Return Gifts / Favours', percent: 8 }
    ],
    [VENUE_TYPES.OUTDOOR]: [
      { id: 'catering', name: 'Live Food Carts & Snacks', percent: 32 },
      { id: 'venue', name: 'Lawn / Open Terrace Space', percent: 22 },
      { id: 'entertainment', name: 'Inflatable Play, Games Host & Music', percent: 14 },
      { id: 'decor', name: 'Canopy Styling, Lights & Photo Booth', percent: 14 },
      { id: 'cake', name: 'Custom Designer Cake & Pastries', percent: 10 },
      { id: 'favours', name: 'Curated Return Gifts & Sweets', percent: 8 }
    ]
  },
  [EVENT_TYPES.COMMUNITY]: {
    [VENUE_TYPES.INDOOR]: [
      { id: 'catering', name: 'Community Feast / Mahaprasad / Buffet', percent: 38 },
      { id: 'venue', name: 'Community Hall / Auditorium Rental', percent: 22 },
      { id: 'av_sound', name: 'PA System, Stage & Microphones', percent: 18 },
      { id: 'decor', name: 'Stage Floral Decor, Banners & Seating', percent: 10 },
      { id: 'permits_security', name: 'Civic Permissions, Security & Helpers', percent: 6 },
      { id: 'waste_contingency', name: 'Eco Sanitation & Contingency Reserve', percent: 6 }
    ],
    [VENUE_TYPES.OUTDOOR]: [
      { id: 'catering', name: 'Community Feast / Langar Service', percent: 35 },
      { id: 'venue_shamiana', name: 'Ground Rental & Pandal / Shamiana', percent: 24 },
      { id: 'av_power', name: 'High-Wattage PA, Stage, Lights & Genset', percent: 20 },
      { id: 'decor', name: 'Pandal Entrance Decor & Wayfinding Signage', percent: 9 },
      { id: 'permits_security', name: 'Police NOC, Fire Safety & Crowd Control', percent: 6 },
      { id: 'waste_contingency', name: 'Eco Waste Management & Weather Buffer', percent: 6 }
    ]
  }
});

/**
 * Standard milestone blueprints with relative target percentages of total lead time.
 * When short notice occurs, these percentages gracefully compress within the available days.
 */
export const MILESTONE_TEMPLATES = Object.freeze({
  [EVENT_TYPES.WEDDING]: [
    {
      id: 'wm-1',
      title: 'Fix Auspicious Muhurat & Book Venue',
      relOffsetPercent: 1.0, // 100% of lead time before event
      phase: 'Foundation',
      description: 'Consult family priest/astrologer for muhurat; secure central banquet or resort with advance token.'
    },
    {
      id: 'wm-2',
      title: 'Shortlist Caterer & Food Tasting Session',
      relOffsetPercent: 0.8,
      phase: 'Catering',
      description: 'Finalize menu items (chaat, main regional thali, dessert counter) and verify service crockery staff.'
    },
    {
      id: 'wm-3',
      title: 'Book Photographer & Mandap Decorator',
      relOffsetPercent: 0.65,
      phase: 'Vendors',
      description: 'Review portfolio for candid coverage, drone permissions, and traditional floral mandap concepts.'
    },
    {
      id: 'wm-4',
      title: 'Select Wedding Attire & Bridal Mehendi Artist',
      relOffsetPercent: 0.5,
      phase: 'Attire & Styling',
      description: 'Schedule fittings for sherwani/lehenga and book henna artist for sangeet evening.'
    },
    {
      id: 'wm-5',
      title: 'Dispatch Digital & Print Invitations (Lagan Patrika)',
      relOffsetPercent: 0.35,
      phase: 'Invitations',
      description: 'Send RSVP links and gift boxes to outstation relatives; arrange hotel room blocks.'
    },
    {
      id: 'wm-6',
      title: 'Sangeet Choreography & DJ Music Playlist Finalization',
      relOffsetPercent: 0.2,
      phase: 'Rehearsals',
      description: 'Coordinate family dance routines and submit specific song list to DJ/Dhol performers.'
    },
    {
      id: 'wm-7',
      title: 'Final Headcount & Vendor Coordination Walkthrough',
      relOffsetPercent: 0.08,
      phase: 'Countdown',
      description: 'Freeze guest count with caterer, confirm transit timings for baraat and pooja samagri list.'
    },
    {
      id: 'wm-8',
      title: 'Event Day Celebrations & Auspicious Rituals',
      relOffsetPercent: 0.0,
      phase: 'Event Day',
      description: 'Ceremonial welcome, saat phere / vows, family banquet, and bidaai.'
    }
  ],
  [EVENT_TYPES.BIRTHDAY]: [
    {
      id: 'bm-1',
      title: 'Select Party Theme & Lock Venue',
      relOffsetPercent: 1.0,
      phase: 'Foundation',
      description: 'Decide on child/adult theme (e.g., Jungle Safari, Bollywood Retro, Superhero) and secure space.'
    },
    {
      id: 'bm-2',
      title: 'Order Custom Theme Cake & Plan Snacks Menu',
      relOffsetPercent: 0.7,
      phase: 'Bakery & Food',
      description: 'Select tier flavours, eggless/dietary choices, and fingerprint-friendly finger food for kids.'
    },
    {
      id: 'bm-3',
      title: 'Book Entertainer / Magician & Music Host',
      relOffsetPercent: 0.5,
      phase: 'Entertainment',
      description: 'Hire magic performer, balloon sculptor, face painter, or karaoke host to engage guests.'
    },
    {
      id: 'bm-4',
      title: 'Send Digital WhatsApp Invites & Collect RSVPs',
      relOffsetPercent: 0.35,
      phase: 'Invitations',
      description: 'Share location pin, dress code theme, and dietary preference options.'
    },
    {
      id: 'bm-5',
      title: 'Assemble Return Favours & DIY Activity Packs',
      relOffsetPercent: 0.15,
      phase: 'Favours',
      description: 'Pack themed goodies, sweets, and personalised stationery bags for young attendees.'
    },
    {
      id: 'bm-6',
      title: 'Celebration Day, Cake Cutting & Party Games',
      relOffsetPercent: 0.0,
      phase: 'Event Day',
      description: 'Welcome guests, kickstart interactive games, cake cutting ritual, and photography.'
    }
  ],
  [EVENT_TYPES.COMMUNITY]: [
    {
      id: 'cm-1',
      title: 'Core Committee Meeting & Budget Sanction',
      relOffsetPercent: 1.0,
      phase: 'Governance',
      description: 'Form sub-committees (cultural, food, stage, reception) and open community contribution register.'
    },
    {
      id: 'cm-2',
      title: 'Apply for Municipal, Police & Sound Permissions',
      relOffsetPercent: 0.75,
      phase: 'Compliance',
      description: 'Submit NOC applications for loudspeaker usage, park/hall booking, and fire safety equipment.'
    },
    {
      id: 'cm-3',
      title: 'Contract Shamiana, Stage, Lighting & High-Wattage PA',
      relOffsetPercent: 0.55,
      phase: 'Infrastructure',
      description: 'Inspect ground leveling, water points, power backup generator, and emergency exits.'
    },
    {
      id: 'cm-4',
      title: 'Finalize Community Feast / Mahaprasad Arrangements',
      relOffsetPercent: 0.35,
      phase: 'Prasad & Food',
      description: 'Organize raw ingredients bulk purchase, volunteer seva roster, and eco-friendly leaf plates.'
    },
    {
      id: 'cm-5',
      title: 'Distribute Public Circulars & Digital Society Notice',
      relOffsetPercent: 0.2,
      phase: 'Outreach',
      description: 'Post schedule on resident WhatsApp groups, notice boards, and invite neighborhood dignitaries.'
    },
    {
      id: 'cm-6',
      title: 'Stage Run-Through, Sound Check & Safety Audit',
      relOffsetPercent: 0.07,
      phase: 'Readiness',
      description: 'Microphone level check, first-aid station setup, and waste segregation bins deployment.'
    },
    {
      id: 'cm-7',
      title: 'Utsav Inauguration, Cultural Program & Maha Feast',
      relOffsetPercent: 0.0,
      phase: 'Event Day',
      description: 'Lamp lighting, community performances, prasad distribution, and clean-up drive.'
    }
  ]
});

/**
 * Vendor checklist items with priorities and budget fraction relative to category.
 */
export const VENDOR_TEMPLATES = Object.freeze({
  [EVENT_TYPES.WEDDING]: [
    {
      id: 'v-wed-1',
      name: 'Banquet Hall or Heritage Lawn Venue',
      category: 'Venue',
      priority: 'high',
      notes: 'Verify AC backup, dressing room keys, and guest valet parking.'
    },
    {
      id: 'v-wed-2',
      name: 'Halwai / Royal Caterer',
      category: 'Catering',
      priority: 'high',
      notes: 'Ensure distinct live counters, mineral water jars, and adequate serving stewards.'
    },
    {
      id: 'v-wed-3',
      name: 'Floral Decorator & Traditional Mandap Setup',
      category: 'Decor',
      priority: 'high',
      notes: 'Specify marigold, rajnigandha, jasmine garlands, and stage backdrop lighting.'
    },
    {
      id: 'v-wed-4',
      name: 'Candid Wedding Photographer & Drone Team',
      category: 'Photography',
      priority: 'high',
      notes: 'Confirm delivery timeline for teaser reel, cinematic highlights, and raw drive.'
    },
    {
      id: 'v-wed-5',
      name: 'Bridal Henna & Mehendi Artist Group',
      category: 'Attire & Styling',
      priority: 'medium',
      notes: 'Book for bride and 15-20 immediate family members during the sangeet afternoon.'
    },
    {
      id: 'v-wed-6',
      name: 'Sangeet DJ, Sound Setup & Dhol Players',
      category: 'Entertainment',
      priority: 'medium',
      notes: 'Curate regional folk tracks and popular Bollywood/bhangra wedding anthems.'
    },
    {
      id: 'v-wed-7',
      name: 'Pooja Samagri & Pandit / Officiant Team',
      category: 'Rituals',
      priority: 'high',
      notes: 'Procure havan samagri, dry fruits, fresh flowers, and ceremonial coconut.'
    },
    {
      id: 'v-wed-8',
      name: 'Baraat Brass Band & Vintage Car / Chariot',
      category: 'Logistics',
      priority: 'low',
      notes: 'Coordinate arrival point and municipal permissions for procession music.'
    }
  ],
  [EVENT_TYPES.BIRTHDAY]: [
    {
      id: 'v-bday-1',
      name: 'Party Hall / Rooftop Cafe Venue',
      category: 'Venue',
      priority: 'high',
      notes: 'Ensure safe play perimeter and seating arrangement for parents.'
    },
    {
      id: 'v-bday-2',
      name: 'Custom Theme Cake Baker',
      category: 'Bakery',
      priority: 'high',
      notes: 'Confirm customized fondent/buttercream design, flavour, and safe delivery timing.'
    },
    {
      id: 'v-bday-3',
      name: 'Kids Snack Caterer & Mocktail Station',
      category: 'Catering',
      priority: 'high',
      notes: 'Arrange mini pizzas, sliders, pasta, mocktails, and fresh juices.'
    },
    {
      id: 'v-bday-4',
      name: 'Themed Balloon Sculptor & Backdrop Artist',
      category: 'Decor',
      priority: 'medium',
      notes: 'Install balloon arches, character cutouts, and neon age number signs.'
    },
    {
      id: 'v-bday-5',
      name: 'Party Host / Game Master & Magician',
      category: 'Entertainment',
      priority: 'medium',
      notes: 'Coordinate 45-minute interactive magic session and pass-the-parcel coordination.'
    },
    {
      id: 'v-bday-6',
      name: 'Curated Return Gift Supplier',
      category: 'Gifts',
      priority: 'low',
      notes: 'Source eco-friendly wooden toys, books, and personalised sweet hampers.'
    }
  ],
  [EVENT_TYPES.COMMUNITY]: [
    {
      id: 'v-com-1',
      name: 'Community Ground / Samaj Bhavan Management',
      category: 'Venue',
      priority: 'high',
      notes: 'Confirm deposit terms, electricity meter check, and cleaning clearance.'
    },
    {
      id: 'v-com-2',
      name: 'Community Feast / Mahaprasad Kitchen Team',
      category: 'Catering',
      priority: 'high',
      notes: 'Prepare satvik/pure feast with hot serving dispensers and water stations.'
    },
    {
      id: 'v-com-3',
      name: 'PA Sound Engineer & Stage Lighting Technician',
      category: 'Sound & Stage',
      priority: 'high',
      notes: 'Provide wireless podium mics, feedback filters, and stage monitors.'
    },
    {
      id: 'v-com-4',
      name: 'Shamiana, Pandal & Seating Chair Supplier',
      category: 'Infrastructure',
      priority: 'high',
      notes: 'Erect waterproof German hanger or traditional fabric shamiana with plastic chairs.'
    },
    {
      id: 'v-com-5',
      name: 'Emergency Silent Generator (Genset) Vendor',
      category: 'Power Backup',
      priority: 'medium',
      notes: 'Ensure 62.5+ kVA diesel genset with operator for zero interruption.'
    },
    {
      id: 'v-com-6',
      name: 'Eco Waste Management & Clean-up Crew',
      category: 'Sanitation',
      priority: 'medium',
      notes: 'Install wet/dry segregated dustbins and post-event sweepers.'
    }
  ]
});
