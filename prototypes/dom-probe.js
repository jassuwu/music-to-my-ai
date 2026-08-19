/* ===========================================================================
   DOM PROBE — paste into the DevTools console on claude.ai or chatgpt.com,
   while signed in. Answers the open questions on ticket 0006:

     1. What granularity/cadence does MutationObserver actually see while a
        response streams? (characterData growth vs childList appends vs
        wholesale subtree re-renders)
     2. claude.ai — does data-is-streaming really flip true -> false?
     3. chatgpt.com — is stop-button presence the reliable streaming signal,
        and are the action buttons genuinely absent mid-stream?

   USAGE
     1. Open the site, signed in, on a conversation.
     2. Open DevTools -> Console. If Chrome asks, type:  allow pasting
     3. Paste this whole file and press Enter. It starts watching immediately.
     4. Send a prompt that produces a decent-length answer (ask for ~200 words,
        ideally including a code block). Let it finish completely.
     5. Run:  probe.report()
        The summary prints and is copied to your clipboard. Paste it back.

   Optional: probe.stop() to detach. probe.report() auto-stops.
   Nothing is sent anywhere — this only reads the page and prints locally.
   =========================================================================== */

(function () {
  if (window.probe && window.probe.stop) { try { window.probe.stop(); } catch (e) {} }

  var SITE = location.hostname;
  var t0 = performance.now();
  var now = function () { return Math.round(performance.now() - t0); };

  // Selectors both sites are suspected to expose, per the desk research.
  var CANDIDATES = [
    '[data-is-streaming]',
    '[data-is-streaming="true"]',
    '[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
    '[data-testid^="conversation-turn-"]',
    '[data-message-author-role="assistant"]',
    '[data-testid="user-message"]',
    '.font-claude-message',
    '.font-claude-response',
    '.result-streaming',
    '[data-testid="copy-turn-action-button"]',
    'button[aria-label*="Copy" i]',
    '[class*="streaming"]'
  ];

  function snapshotSelectors() {
    var out = {};
    CANDIDATES.forEach(function (s) {
      var n = 0;
      try { n = document.querySelectorAll(s).length; } catch (e) { n = -1; }
      if (n) out[s] = n;
    });
    return out;
  }

  // Best guess at the element holding the in-progress assistant message.
  function findAssistant() {
    var tries = [
      '[data-is-streaming="true"]',
      '[data-message-author-role="assistant"]',
      '.font-claude-message',
      '.font-claude-response',
      '[data-testid^="conversation-turn-"]'
    ];
    for (var i = 0; i < tries.length; i++) {
      var els = document.querySelectorAll(tries[i]);
      if (els.length) return { el: els[els.length - 1], via: tries[i] };
    }
    return { el: null, via: null };
  }

  var state = {
    mutations: 0,
    byType: { childList: 0, characterData: 0, attributes: 0 },
    growth: [],          // {t, delta} — text actually getting longer
    gaps: [],            // ms between consecutive growth events
    lastGrowthT: null,
    charDataGrowth: 0,   // growth seen via characterData
    childListGrowth: 0,  // growth seen via appended nodes
    removals: 0,         // nodes removed inside the assistant subtree
    bigRerenders: 0,     // childList mutations removing 3+ nodes at once
    attrFlips: [],       // interesting attribute changes
    selectorTimeline: [],// {t, label, selectors}
    assistantVia: null,
    textLen: 0,
    codeSeen: false
  };

  var INTERESTING_ATTRS = /^(data-is-streaming|data-streaming|data-testid|aria-label|data-state|disabled)$/;
  var lengths = new WeakMap();

  function noteGrowth(delta, source) {
    if (delta <= 0) return;
    var t = now();
    if (state.lastGrowthT !== null) state.gaps.push(t - state.lastGrowthT);
    state.lastGrowthT = t;
    state.growth.push({ t: t, d: delta });
    if (source === 'characterData') state.charDataGrowth++;
    else state.childListGrowth++;
  }

  var target = findAssistant();
  state.assistantVia = target.via;
  state.selectorTimeline.push({ t: 0, label: 'on paste', selectors: snapshotSelectors() });

  var obs = new MutationObserver(function (records) {
    records.forEach(function (r) {
      state.mutations++;
      state.byType[r.type] = (state.byType[r.type] || 0) + 1;

      if (r.type === 'characterData') {
        var prev = lengths.get(r.target) || 0;
        var cur = (r.target.data || '').length;
        lengths.set(r.target, cur);
        noteGrowth(cur - prev, 'characterData');
      }

      if (r.type === 'childList') {
        var added = 0;
        for (var i = 0; i < r.addedNodes.length; i++) {
          var n = r.addedNodes[i];
          added += (n.textContent || '').length;
          if (n.nodeType === 1 && (n.matches && (n.matches('pre, code') || n.querySelector('pre, code')))) {
            state.codeSeen = true;
          }
        }
        noteGrowth(added, 'childList');
        if (r.removedNodes.length) state.removals += r.removedNodes.length;
        if (r.removedNodes.length >= 3) state.bigRerenders++;
      }

      if (r.type === 'attributes' && INTERESTING_ATTRS.test(r.attributeName)) {
        var el = r.target;
        var val = el.getAttribute ? el.getAttribute(r.attributeName) : null;
        // keep it small: only record real transitions, capped
        if (state.attrFlips.length < 60 && r.oldValue !== val) {
          state.attrFlips.push({
            t: now(),
            tag: el.tagName ? el.tagName.toLowerCase() : '?',
            attr: r.attributeName,
            from: r.oldValue === null ? '(none)' : String(r.oldValue).slice(0, 40),
            to: val === null ? '(removed)' : String(val).slice(0, 40)
          });
        }
      }
    });
  });

  obs.observe(document.body, {
    childList: true, subtree: true,
    characterData: true, characterDataOldValue: false,
    attributes: true, attributeOldValue: true,
    attributeFilter: ['data-is-streaming', 'data-streaming', 'data-testid',
                      'aria-label', 'data-state', 'disabled', 'class']
  });

  // Poll selector presence a few times a second so we can see when the
  // stop button / streaming flag appear and disappear.
  var seenSelectors = {};
  var poll = setInterval(function () {
    var snap = snapshotSelectors();
    Object.keys(snap).forEach(function (k) {
      if (!seenSelectors[k]) {
        seenSelectors[k] = { firstSeen: now(), lastSeen: now(), max: snap[k] };
      } else {
        seenSelectors[k].lastSeen = now();
        seenSelectors[k].max = Math.max(seenSelectors[k].max, snap[k]);
      }
    });
    Object.keys(seenSelectors).forEach(function (k) {
      if (!snap[k] && seenSelectors[k].goneAt === undefined) seenSelectors[k].goneAt = now();
    });
    if (!state.assistantVia) {
      var t = findAssistant();
      if (t.via) state.assistantVia = t.via;
    }
  }, 250);

  function pct(arr, p) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
  }

  window.probe = {
    stop: function () { obs.disconnect(); clearInterval(poll); },
    report: function () {
      this.stop();
      state.selectorTimeline.push({ t: now(), label: 'at report', selectors: snapshotSelectors() });
      var deltas = state.growth.map(function (g) { return g.d; });
      var span = state.growth.length
        ? state.growth[state.growth.length - 1].t - state.growth[0].t : 0;

      var rep = {
        site: SITE,
        observedForMs: now(),
        streamSpanMs: span,
        assistantFoundVia: state.assistantVia,
        codeBlockSeen: state.codeSeen,

        mutations: {
          total: state.mutations,
          byType: state.byType,
          growthViaCharacterData: state.charDataGrowth,
          growthViaChildList: state.childListGrowth,
          nodeRemovalsInside: state.removals,
          bulkRerenders_3plusRemoved: state.bigRerenders
        },

        // This is the money question: how often does text actually grow,
        // and by how much? It sets the note rate for the Direct mapping.
        textGrowth: {
          events: state.growth.length,
          eventsPerSecond: span ? +(state.growth.length / (span / 1000)).toFixed(1) : null,
          charsPerEvent: {
            median: pct(deltas, 0.5), p90: pct(deltas, 0.9),
            max: deltas.length ? Math.max.apply(null, deltas) : null
          },
          gapMs: {
            median: pct(state.gaps, 0.5), p90: pct(state.gaps, 0.9),
            max: state.gaps.length ? Math.max.apply(null, state.gaps) : null,
            under50ms: state.gaps.filter(function (g) { return g < 50; }).length,
            over500ms: state.gaps.filter(function (g) { return g > 500; }).length
          }
        },

        selectorLifetimes: seenSelectors,
        attributeFlips: state.attrFlips,
        selectorTimeline: state.selectorTimeline
      };

      var json = JSON.stringify(rep, null, 2);
      console.log('%c=== DOM PROBE REPORT (' + SITE + ') ===', 'font-weight:bold');
      console.log(json);
      try { copy(json); console.log('%cCopied to clipboard.', 'color:#7cf5c4'); }
      catch (e) { console.log('Select the JSON above and copy it manually.'); }
      return rep;
    }
  };

  console.log('%cDOM probe armed on ' + SITE + '.', 'color:#7cf5c4;font-weight:bold');
  console.log('Now send a prompt (ask for ~200 words with a code block). When the answer' +
              ' has fully finished, run:  probe.report()');
})();
