/**
 * Utsav Planner Frontend Application
 * Strict Security: Renders solely with textContent and DOM APIs (NO innerHTML).
 * Full Keyboard & Screen-Reader Accessible (WCAG 2.1 AA).
 */

(() => {
  'use strict';

  // State Management
  let currentPlan = null;
  const vendorCheckedStates = new Map();

  // DOM Elements Selection
  const form = document.getElementById('planning-form');
  const submitBtn = document.getElementById('submit-plan-btn');
  const errorBanner = document.getElementById('error-banner');
  const errorList = document.getElementById('error-list');
  const closeErrorBtn = document.getElementById('close-error-btn');

  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const planResults = document.getElementById('plan-results');
  const exportActions = document.getElementById('export-actions');
  const planLiveStatus = document.getElementById('plan-live-status');

  const planSummaryText = document.getElementById('plan-summary-text');
  const planAiBadgeRow = document.getElementById('plan-ai-badge-row');
  const planTimestamp = document.getElementById('plan-timestamp');

  const warningsContainer = document.getElementById('warnings-container');
  const warningsList = document.getElementById('warnings-list');

  const budgetTableBody = document.getElementById('budget-table-body');
  const budgetTotalDisplay = document.getElementById('budget-total-display');
  const budgetTotalPercent = document.getElementById('budget-total-percent');
  const budgetTotalAmount = document.getElementById('budget-total-amount');

  const timelineModeBadge = document.getElementById('timeline-mode-badge');
  const timelineDesc = document.getElementById('timeline-desc');
  const timelineList = document.getElementById('timeline-list');

  const vendorChecklist = document.getElementById('vendor-checklist');
  const vendorProgressLabel = document.getElementById('vendor-progress-label');
  const vendorProgressFill = document.getElementById('vendor-progress-fill');

  const ideasList = document.getElementById('ideas-list');

  const btnPrint = document.getElementById('btn-print');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeLabel = document.getElementById('theme-label');

  const eventDateInput = document.getElementById('event-date');
  const preferencesInput = document.getElementById('preferences');
  const prefCounter = document.getElementById('pref-counter');

  // Preset Buttons
  const presetWedding = document.getElementById('preset-wedding');
  const presetBirthday = document.getElementById('preset-birthday');
  const presetCommunity = document.getElementById('preset-community');

  /**
   * Formats a number as Indian Currency (INR) string.
   * @param {number} num
   * @returns {string} e.g. "₹1,50,000"
   */
  function formatINR(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
  }

  /**
   * Helper to set minimum selectable date to today.
   */
  function initializeDatePicker() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    eventDateInput.setAttribute('min', todayStr);

    // Default to 45 days in future if empty
    if (!eventDateInput.value) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 45);
      const dy = defaultDate.getFullYear();
      const dm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd2 = String(defaultDate.getDate()).padStart(2, '0');
      eventDateInput.value = `${dy}-${dm}-${dd2}`;
    }
  }

  /**
   * Character counter for preferences textarea.
   */
  function handlePrefInput() {
    const currentLength = preferencesInput.value.length;
    prefCounter.textContent = `${currentLength} / 500`;
  }

  /**
   * Hides the error banner.
   */
  function clearErrors() {
    errorBanner.hidden = true;
    while (errorList.firstChild) {
      errorList.removeChild(errorList.firstChild);
    }
  }

  /**
   * Shows error messages safely using textContent.
   * @param {string[]} errors
   */
  function showErrors(errors) {
    clearErrors();
    if (!errors || errors.length === 0) return;

    errors.forEach((err) => {
      const li = document.createElement('li');
      li.textContent = err;
      errorList.appendChild(li);
    });

    errorBanner.hidden = false;
    errorBanner.focus();
    planLiveStatus.textContent = `Error: ${errors.join('. ')}`;
  }

  /**
   * Populates form fields with preset data.
   */
  function applyPreset(data) {
    clearErrors();
    document.getElementById('event-type').value = data.eventType;
    document.getElementById('total-budget').value = data.totalBudget;
    document.getElementById('guest-count').value = data.guestCount;
    document.getElementById('city').value = data.city;
    document.getElementById('venue-type').value = data.venueType;
    document.getElementById('diet').value = data.diet;
    preferencesInput.value = data.preferences;
    handlePrefInput();

    // Calculate future date based on offset days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + data.offsetDays);
    const y = futureDate.getFullYear();
    const m = String(futureDate.getMonth() + 1).padStart(2, '0');
    const d = String(futureDate.getDate()).padStart(2, '0');
    eventDateInput.value = `${y}-${m}-${d}`;
  }

  /**
   * Renders the budget breakdown data table safely.
   * @param {Object} budgetData
   */
  function renderBudget(budgetData) {
    while (budgetTableBody.firstChild) {
      budgetTableBody.removeChild(budgetTableBody.firstChild);
    }

    budgetTotalDisplay.textContent = formatINR(budgetData.totalBudget);
    budgetTotalAmount.textContent = formatINR(budgetData.checkSum);
    budgetTotalPercent.textContent = '100%';

    budgetData.categories.forEach((cat) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = cat.name;

      const tdPercent = document.createElement('td');
      tdPercent.className = 'text-right';
      tdPercent.textContent = `${cat.percent}%`;

      const tdAmount = document.createElement('td');
      tdAmount.className = 'text-right';
      tdAmount.textContent = formatINR(cat.amount);

      tr.appendChild(tdName);
      tr.appendChild(tdPercent);
      tr.appendChild(tdAmount);
      budgetTableBody.appendChild(tr);
    });
  }

  /**
   * Renders the timeline milestones safely.
   * @param {Object} timelineData
   */
  function renderTimeline(timelineData) {
    while (timelineList.firstChild) {
      timelineList.removeChild(timelineList.firstChild);
    }

    if (timelineData.isCompressed) {
      timelineModeBadge.textContent = 'Accelerated (Compressed)';
      timelineModeBadge.className = 'badge warning-badge badge-alert';
      timelineDesc.textContent = `Schedule compressed into ${timelineData.availableDays} days (Ideal lead time: ${timelineData.idealLeadDays} days).`;
    } else {
      timelineModeBadge.textContent = 'Standard Schedule';
      timelineModeBadge.className = 'badge badge-success';
      timelineDesc.textContent = `Sequential countdown milestones leading to celebration day (${timelineData.availableDays} days ahead).`;
    }

    timelineData.milestones.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'timeline-item';
      itemEl.setAttribute('role', 'listitem');

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      dot.setAttribute('aria-hidden', 'true');

      const header = document.createElement('div');
      header.className = 'timeline-header';

      const title = document.createElement('span');
      title.className = 'timeline-item-title';
      title.textContent = item.title;

      const meta = document.createElement('div');
      meta.className = 'timeline-meta';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'timeline-date';
      dateSpan.textContent = item.targetDate;

      const offsetSpan = document.createElement('span');
      offsetSpan.className = 'timeline-offset';
      offsetSpan.textContent = item.daysBeforeEvent === 0
        ? '(Event Day)'
        : `(${item.daysBeforeEvent}d before)`;

      meta.appendChild(dateSpan);
      meta.appendChild(offsetSpan);

      header.appendChild(title);
      header.appendChild(meta);

      const desc = document.createElement('p');
      desc.className = 'timeline-desc';
      desc.textContent = item.description;

      itemEl.appendChild(dot);
      itemEl.appendChild(header);
      itemEl.appendChild(desc);

      timelineList.appendChild(itemEl);
    });
  }

  /**
   * Updates vendor checklist booking progress bar.
   * @param {Array} vendors
   */
  function updateVendorProgress(vendors) {
    const total = vendors.length;
    let checkedCount = 0;
    let bookedBudget = 0;

    vendors.forEach((v) => {
      if (vendorCheckedStates.get(v.id)) {
        checkedCount += 1;
        bookedBudget += v.suggestedBudget;
      }
    });

    const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    vendorProgressLabel.textContent = `${checkedCount} of ${total} Confirmed (${formatINR(bookedBudget)})`;
    vendorProgressFill.style.width = `${percent}%`;
  }

  /**
   * Renders the interactive vendor checklist safely.
   * @param {Array} vendors
   */
  function renderVendors(vendors) {
    while (vendorChecklist.firstChild) {
      vendorChecklist.removeChild(vendorChecklist.firstChild);
    }

    vendors.forEach((vendor) => {
      const card = document.createElement('div');
      card.className = 'vendor-card';
      card.id = `vendor-card-${vendor.id}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `chk-${vendor.id}`;
      checkbox.className = 'vendor-checkbox';
      checkbox.checked = Boolean(vendorCheckedStates.get(vendor.id));
      checkbox.setAttribute('aria-label', `Mark ${vendor.name} as booked`);

      if (checkbox.checked) {
        card.classList.add('vendor-checked');
      }

      checkbox.addEventListener('change', () => {
        vendorCheckedStates.set(vendor.id, checkbox.checked);
        if (checkbox.checked) {
          card.classList.add('vendor-checked');
        } else {
          card.classList.remove('vendor-checked');
        }
        updateVendorProgress(vendors);
      });

      const info = document.createElement('div');
      info.className = 'vendor-info';

      const nameRow = document.createElement('div');
      nameRow.className = 'vendor-name-row';

      const label = document.createElement('label');
      label.setAttribute('for', `chk-${vendor.id}`);
      label.className = 'vendor-name';
      label.textContent = vendor.name;

      const budget = document.createElement('span');
      budget.className = 'vendor-budget';
      budget.textContent = formatINR(vendor.suggestedBudget);

      nameRow.appendChild(label);
      nameRow.appendChild(budget);

      const badgesRow = document.createElement('div');
      badgesRow.className = 'vendor-badges-row';

      const priorityBadge = document.createElement('span');
      priorityBadge.className = `badge-priority priority-${vendor.priority}`;
      priorityBadge.textContent = `${vendor.priority} Priority`;

      const categoryBadge = document.createElement('span');
      categoryBadge.className = 'badge-priority priority-low';
      categoryBadge.textContent = vendor.category;

      badgesRow.appendChild(priorityBadge);
      badgesRow.appendChild(categoryBadge);

      const notes = document.createElement('p');
      notes.className = 'vendor-notes';
      notes.textContent = vendor.notes;

      info.appendChild(nameRow);
      info.appendChild(badgesRow);
      info.appendChild(notes);

      card.appendChild(checkbox);
      card.appendChild(info);

      vendorChecklist.appendChild(card);
    });

    updateVendorProgress(vendors);
  }

  /**
   * Renders contextual warnings safely.
   * @param {Array} warnings
   */
  function renderWarnings(warnings) {
    while (warningsList.firstChild) {
      warningsList.removeChild(warningsList.firstChild);
    }

    if (!warnings || warnings.length === 0) {
      warningsContainer.hidden = true;
      return;
    }

    warningsContainer.hidden = false;

    warnings.forEach((warn) => {
      const item = document.createElement('div');
      item.className = 'warning-item';

      const badge = document.createElement('span');
      badge.className = `warning-badge badge-${warn.type}`;
      badge.textContent = warn.type.toUpperCase();

      const text = document.createElement('span');
      text.textContent = warn.message;

      item.appendChild(badge);
      item.appendChild(text);
      warningsList.appendChild(item);
    });
  }

  /**
   * Renders personalized ideas cards safely.
   * @param {string[]} ideas
   */
  function renderIdeas(ideas) {
    while (ideasList.firstChild) {
      ideasList.removeChild(ideasList.firstChild);
    }

    ideas.forEach((ideaText) => {
      const card = document.createElement('div');
      card.className = 'idea-card';

      if (ideaText.startsWith('✨ AI Suggestion:')) {
        card.classList.add('idea-ai');
      }

      card.textContent = ideaText;
      ideasList.appendChild(card);
    });
  }

  /**
   * Renders the complete celebration plan to the DOM.
   * @param {Object} plan
   */
  function renderPlan(plan) {
    currentPlan = plan;

    // Reset checked states for newly generated plan
    vendorCheckedStates.clear();

    emptyState.hidden = true;
    loadingState.hidden = true;
    planResults.hidden = false;
    exportActions.hidden = false;

    // Timestamp & Executive Summary
    planTimestamp.textContent = `Generated on ${new Date(plan.meta.generatedAt).toLocaleString('en-IN')}`;
    planSummaryText.textContent = plan.summary;

    // AI status badge row
    while (planAiBadgeRow.firstChild) {
      planAiBadgeRow.removeChild(planAiBadgeRow.firstChild);
    }
    const aiBadge = document.createElement('span');
    aiBadge.className = plan.aiEnriched ? 'badge badge-success' : 'badge badge-ai';
    aiBadge.textContent = plan.aiNotice || (plan.aiEnriched ? 'Gemini AI Enriched' : 'Deterministic Rule Engine Active');
    planAiBadgeRow.appendChild(aiBadge);

    // Render Subsections
    renderWarnings(plan.warnings);
    renderBudget(plan.budget);
    renderTimeline(plan.timeline);
    renderVendors(plan.vendors);
    renderIdeas(plan.personalizedIdeas);

    // Announce to Screen Readers
    planLiveStatus.textContent = `Plan successfully generated for ${plan.input.eventType} in ${plan.input.city} with ${plan.input.guestCount} guests.`;

    // Scroll smoothly to output
    document.getElementById('output-section').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Form submission handler.
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearErrors();

    const formData = new FormData(form);
    const payload = {
      eventType: formData.get('eventType'),
      totalBudget: Number(formData.get('totalBudget')),
      guestCount: Number(formData.get('guestCount')),
      eventDate: formData.get('eventDate'),
      city: formData.get('city'),
      venueType: formData.get('venueType'),
      diet: formData.get('diet'),
      preferences: formData.get('preferences') || ''
    };

    // Client-side quick pre-validation
    const clientErrors = [];
    if (!payload.totalBudget || payload.totalBudget < 2000) {
      clientErrors.push('Please enter a total budget of at least ₹2,000.');
    }
    if (!payload.guestCount || payload.guestCount < 5) {
      clientErrors.push('Please enter an estimated guest count of at least 5 attendees.');
    }
    if (!payload.eventDate) {
      clientErrors.push('Please choose a celebration date.');
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      if (payload.eventDate < todayStr) {
        clientErrors.push('Celebration date cannot be in the past.');
      }
    }
    if (!payload.city || payload.city.trim().length < 2) {
      clientErrors.push('Please enter a city name of at least 2 characters.');
    }

    if (clientErrors.length > 0) {
      showErrors(clientErrors);
      return;
    }

    // UI state: loading
    submitBtn.disabled = true;
    emptyState.hidden = true;
    planResults.hidden = true;
    loadingState.hidden = false;
    planLiveStatus.textContent = 'Calculating plan and budget distribution...';

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessages = result.errors || ['An error occurred while formulating the plan.'];
        showErrors(errorMessages);
        emptyState.hidden = false;
        loadingState.hidden = true;
      } else {
        renderPlan(result.data);
      }
    } catch {
      showErrors(['Network error or server unavailable. Please ensure the server is running.']);
      emptyState.hidden = false;
      loadingState.hidden = true;
    } finally {
      submitBtn.disabled = false;
    }
  }

  /**
   * Export handlers.
   */
  function handlePrint() {
    window.print();
  }

  function handleDownloadJson() {
    if (!currentPlan) return;

    // Attach currently checked vendor states to exported JSON
    const exportData = {
      ...currentPlan,
      vendors: currentPlan.vendors.map((v) => ({
        ...v,
        checked: Boolean(vendorCheckedStates.get(v.id))
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `utsav-plan-${currentPlan.input.eventType}-${currentPlan.input.eventDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Theme toggle logic (persisted in localStorage).
   */
  function initializeTheme() {
    const savedTheme = localStorage.getItem('utsav-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      themeLabel.textContent = savedTheme === 'dark' ? 'Dark' : 'Light';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeLabel.textContent = prefersDark ? 'Dark' : 'Light';
    }

    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const isCurrentlyDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const nextTheme = isCurrentlyDark ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('utsav-theme', nextTheme);
      themeLabel.textContent = nextTheme === 'dark' ? 'Dark' : 'Light';
    });
  }

  /**
   * Attach Event Listeners.
   */
  function attachEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    preferencesInput.addEventListener('input', handlePrefInput);
    closeErrorBtn.addEventListener('click', clearErrors);
    btnPrint.addEventListener('click', handlePrint);
    btnDownloadJson.addEventListener('click', handleDownloadJson);

    // Preset button triggers
    presetWedding.addEventListener('click', () => {
      applyPreset({
        eventType: 'wedding',
        totalBudget: 1500000,
        guestCount: 250,
        city: 'Jaipur',
        venueType: 'outdoor',
        diet: 'mixed',
        preferences: 'Royal Rajputana mandap, live Sufi band, traditional Rajasthani dhol, fireworks',
        offsetDays: 120
      });
    });

    presetBirthday.addEventListener('click', () => {
      applyPreset({
        eventType: 'birthday',
        totalBudget: 60000,
        guestCount: 45,
        city: 'Bengaluru',
        venueType: 'indoor',
        diet: 'veg',
        preferences: 'Jungle safari theme, magician, custom chocolate cake, eco return gifts',
        offsetDays: 20
      });
    });

    presetCommunity.addEventListener('click', () => {
      applyPreset({
        eventType: 'community',
        totalBudget: 200000,
        guestCount: 350,
        city: 'Mumbai',
        venueType: 'outdoor',
        diet: 'veg',
        preferences: 'Society Diwali mela, cultural dance program, eco waste management, prasad distribution',
        offsetDays: 35
      });
    });
  }

  /**
   * Initial App Boot.
   */
  function init() {
    initializeDatePicker();
    handlePrefInput();
    initializeTheme();
    attachEventListeners();

    // Health ping
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'healthy') {
          const aiBadge = document.getElementById('ai-status-badge');
          if (aiBadge) {
            aiBadge.textContent = 'Server Connected (Offline & AI Ready)';
          }
        }
      })
      .catch(() => {
        // Offline or server not ready yet
      });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
