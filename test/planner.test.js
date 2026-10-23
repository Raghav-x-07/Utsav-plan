import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetBreakdown,
  generateTimeline,
  generateVendorChecklist,
  generateWarnings,
  generateDeterministicIdeas,
  generatePlan
} from '../src/planner.js';
import { EVENT_TYPES, VENUE_TYPES, DIET_TYPES } from '../src/constants.js';

describe('Planner Module - calculateBudgetBreakdown Exact Sum', () => {
  const testBudgets = [2000, 15000, 123456, 500000, 999999, 2500000, 10000000];
  const eventTypes = Object.values(EVENT_TYPES);
  const venueTypes = Object.values(VENUE_TYPES);

  for (const eventType of eventTypes) {
    for (const venueType of venueTypes) {
      for (const budget of testBudgets) {
        it(`sums EXACTLY to totalBudget ₹${budget} for ${eventType} (${venueType})`, () => {
          const result = calculateBudgetBreakdown(eventType, venueType, budget);
          const calculatedSum = result.categories.reduce((acc, cat) => acc + cat.amount, 0);

          assert.equal(calculatedSum, budget, `Sum discrepancy for budget ${budget}`);
          assert.equal(result.checkSum, budget);

          const percentSum = result.categories.reduce((acc, cat) => acc + cat.percent, 0);
          assert.equal(percentSum, 100, `Percentage sum should equal 100%`);
        });
      }
    }
  }
});

describe('Planner Module - generateTimeline Ordering & Compression', () => {
  const refDate = new Date(2026, 9, 23); // 2026-10-23

  it('generates standard timeline with ample lead time (180 days for wedding)', () => {
    const res = generateTimeline(EVENT_TYPES.WEDDING, '2027-04-21', refDate);
    assert.equal(res.isCompressed, false);
    assert.ok(res.availableDays >= 180);
    assert.ok(res.milestones.length >= 7);

    // Verify chronological ordering
    for (let i = 0; i < res.milestones.length - 1; i++) {
      assert.ok(
        res.milestones[i].targetDate <= res.milestones[i + 1].targetDate,
        `Milestone ${i} (${res.milestones[i].targetDate}) occurs after ${res.milestones[i + 1].targetDate}`
      );
    }
  });

  it('compresses timeline gracefully for short notice (event in 5 days)', () => {
    const res = generateTimeline(EVENT_TYPES.WEDDING, '2026-10-28', refDate);
    assert.equal(res.isCompressed, true);
    assert.equal(res.availableDays, 5);

    // All milestones must still be ordered and fall between refDate and eventDate
    for (let i = 0; i < res.milestones.length - 1; i++) {
      assert.ok(res.milestones[i].targetDate <= res.milestones[i + 1].targetDate);
    }

    const lastMilestone = res.milestones[res.milestones.length - 1];
    assert.equal(lastMilestone.targetDate, '2026-10-28');
  });

  it('handles same-day event (0 days lead time) without error', () => {
    const res = generateTimeline(EVENT_TYPES.BIRTHDAY, '2026-10-23', refDate);
    assert.equal(res.isCompressed, true);
    assert.equal(res.availableDays, 0);
    assert.ok(res.milestones.length > 0);
    res.milestones.forEach((m) => {
      assert.equal(m.targetDate, '2026-10-23');
    });
  });
});

describe('Planner Module - generateVendorChecklist Conditional Logic', () => {
  it('adds power/genset vendor for outdoor venue but not for indoor', () => {
    const mockCategories = [
      { id: 'catering', amount: 300000 },
      { id: 'venue', amount: 200000 },
      { id: 'decor', amount: 150000 },
      { id: 'genset_backup', amount: 50000 }
    ];

    const outdoorVendors = generateVendorChecklist(
      EVENT_TYPES.WEDDING,
      VENUE_TYPES.OUTDOOR,
      mockCategories
    );
    const hasGensetOutdoor = outdoorVendors.some((v) => v.id.includes('genset'));
    assert.equal(hasGensetOutdoor, true);

    const indoorVendors = generateVendorChecklist(
      EVENT_TYPES.WEDDING,
      VENUE_TYPES.INDOOR,
      mockCategories
    );
    const hasGensetIndoor = indoorVendors.some((v) => v.id.includes('outdoor-genset'));
    assert.equal(hasGensetIndoor, false);
  });

  it('assigns valid priorities and positive suggested budgets', () => {
    const mockCategories = [{ id: 'catering', amount: 100000 }];
    const vendors = generateVendorChecklist(
      EVENT_TYPES.BIRTHDAY,
      VENUE_TYPES.INDOOR,
      mockCategories
    );

    vendors.forEach((v) => {
      assert.ok(['high', 'medium', 'low'].includes(v.priority));
      assert.ok(v.suggestedBudget > 0);
      assert.equal(v.checked, false);
    });
  });
});

describe('Planner Module - generateWarnings Contextual Rules', () => {
  it('triggers tight budget warning when per-guest budget is below threshold', () => {
    // 500 guests with ₹50,000 total = ₹100/guest for wedding (threshold is ₹1,200)
    const warnings = generateWarnings({
      eventType: EVENT_TYPES.WEDDING,
      guestCount: 500,
      totalBudget: 50000,
      venueType: VENUE_TYPES.INDOOR,
      diet: DIET_TYPES.VEG
    }, 120);

    assert.ok(warnings.some((w) => w.id === 'warn-tight-budget'));
  });

  it('triggers outdoor weather caution for outdoor venues', () => {
    const warnings = generateWarnings({
      eventType: EVENT_TYPES.BIRTHDAY,
      guestCount: 50,
      totalBudget: 100000,
      venueType: VENUE_TYPES.OUTDOOR,
      diet: DIET_TYPES.VEG
    }, 60);

    assert.ok(warnings.some((w) => w.id === 'warn-outdoor-weather'));
  });

  it('triggers large crowd warning for > 300 guests', () => {
    const warnings = generateWarnings({
      eventType: EVENT_TYPES.COMMUNITY,
      guestCount: 800,
      totalBudget: 500000,
      venueType: VENUE_TYPES.INDOOR,
      diet: DIET_TYPES.VEG
    }, 60);

    assert.ok(warnings.some((w) => w.id === 'warn-large-crowd'));
  });

  it('triggers mixed diet segregation warning', () => {
    const warnings = generateWarnings({
      eventType: EVENT_TYPES.WEDDING,
      guestCount: 150,
      totalBudget: 1000000,
      venueType: VENUE_TYPES.INDOOR,
      diet: DIET_TYPES.MIXED
    }, 120);

    assert.ok(warnings.some((w) => w.id === 'warn-mixed-diet'));
  });
});

describe('Planner Module - generateDeterministicIdeas Cultural Personalization', () => {
  it('includes regional Delhi chaat and dhol touches for Delhi', () => {
    const ideas = generateDeterministicIdeas({
      eventType: EVENT_TYPES.WEDDING,
      guestCount: 200,
      city: 'Delhi NCR',
      diet: DIET_TYPES.VEG,
      preferences: ''
    });

    assert.ok(ideas.some((i) => i.toLowerCase().includes('delhi')));
  });

  it('includes Rajputana hospitality for Jaipur', () => {
    const ideas = generateDeterministicIdeas({
      eventType: EVENT_TYPES.WEDDING,
      guestCount: 200,
      city: 'Jaipur',
      diet: DIET_TYPES.VEG,
      preferences: ''
    });

    assert.ok(ideas.some((i) => i.toLowerCase().includes('rajputana') || i.toLowerCase().includes('rajasthani')));
  });

  it('matches keyword preferences for sustainability and dancing', () => {
    const ideas = generateDeterministicIdeas({
      eventType: EVENT_TYPES.BIRTHDAY,
      guestCount: 40,
      city: 'Pune',
      diet: DIET_TYPES.VEG,
      preferences: 'eco-friendly and lots of bollywood dance'
    });

    assert.ok(ideas.some((i) => i.toLowerCase().includes('eco') || i.toLowerCase().includes('seed')));
    assert.ok(ideas.some((i) => i.toLowerCase().includes('dance') || i.toLowerCase().includes('flash mob')));
  });
});

describe('Planner Module - generatePlan End-to-End Deterministic Formulation', () => {
  it('assembles a full plan object with exact metadata and components', () => {
    const plan = generatePlan({
      eventType: EVENT_TYPES.WEDDING,
      guestCount: 250,
      totalBudget: 2000000,
      eventDate: '2026-12-25',
      city: 'Udaipur',
      venueType: VENUE_TYPES.OUTDOOR,
      diet: DIET_TYPES.MIXED,
      preferences: 'Lake view mandap'
    }, new Date(2026, 9, 23));

    assert.equal(plan.budget.checkSum, 2000000);
    assert.ok(plan.timeline.milestones.length > 5);
    assert.ok(plan.vendors.length > 5);
    assert.ok(plan.warnings.length > 0);
    assert.ok(plan.personalizedIdeas.length > 3);
    assert.equal(plan.aiEnriched, false);
  });
});
