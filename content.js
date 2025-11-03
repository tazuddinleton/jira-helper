// if (!window.location.hostname.includes('atlassian.net') && !/jira/i.test(window.location.hostname)) {
//   return;
// }

function initJiraHelper() {
  if (window.jiraHelperLoaded) return;
  window.jiraHelperLoaded = true;

  if (document.getElementById('jira-unified-helper')) return;

  const panel = document.createElement('div');
  panel.id = 'jira-unified-helper';
  panel.innerHTML = `
    <div class="jira-helper-tab">JIRA <i> PANI</i></div>
    <div class="jira-helper-content">
      <h4>Your missing JIRA companion</h4>
      <button id="btn-total-sp">Total Story Points (Column)</button>
      <button id="btn-sp-from-estimate">SP from Total Estimate</button>

      <h4 style="margin-top:16px;">Pick IDs from "Work"</h4>
      <button id="btn-pick-ids">Pick the IDs</button>
      <div id="id-list" style="max-height:150px;overflow-y:auto;margin:8px 0;font-size:13px;"></div>

      <div style="display:flex;gap:6px;margin-top:8px;">
        <button id="btn-prev-id" disabled>◀ Prev</button>
        <button id="btn-next-id" disabled>Next ▶</button>
        <button id="btn-apply-jql" style="flex:1;margin-left:8px;">Apply to JQL</button>
      </div>
      <div id="helper-status" style="margin-top:6px;font-size:12px;color:#0065ff;"></div>
    </div>
  `;
  document.body.appendChild(panel);

  let allIssueIDs = [];
  let checkedIDs = new Set();
  let currentIndex = -1; // for prev/next navigation

  // Toggle panel
  panel.querySelector('.jira-helper-tab').addEventListener('click', () => {
    panel.classList.toggle('expanded');
  });

  // === Story Points Logic ===
  function getTotalStoryPoints() {
    const c = document.querySelector('[data-vc="issue-table-main-container"]');
    if (!c) return null;
    const h = c.querySelector('th[aria-label="Story Points"]');
    if (!h) return null;
    const i = Array.from(h.parentNode.children).indexOf(h);
    let t = 0;
    c.querySelectorAll('tbody tr').forEach(r => {
      const cell = r.children[i];
      if (cell) {
        const v = parseFloat(cell.textContent.replace(/[^\d.-]/g, ''));
        if (!isNaN(v)) t += v;
      }
    });
    return t;
  }

  function sumStoryPointsFromOriginalEstimate() {
    const c = document.querySelector('[data-vc="issue-table-main-container"]');
    if (!c) return null;
    const h = c.querySelector('th[aria-label="Original estimate"]');
    if (!h) return null;
    const i = Array.from(h.parentNode.children).indexOf(h);
    if (i === -1) return null;

    const parse = txt => {
      const l = txt.toLowerCase().trim();
      let h = 0;
      const w = l.match(/([\d.]+)\s*(?:w|week|weeks)/);
      if (w) h += parseFloat(w[1]) * 30;
      const d = l.match(/([\d.]+)\s*(?:d|day|days)/);
      if (d) h += parseFloat(d[1]) * 6;
      const hr = l.match(/([\d.]+)\s*(?:h|hr|hrs|hour|hours)/);
      if (hr) h += parseFloat(hr[1]);
      if (h === 0) {
        const f = parseFloat(l.replace(/[^\d.-]/g, ''));
        if (!isNaN(f)) h = f;
      }
      return h;
    };

    const map = h => {
      if (h >= 127) return 34;
      if (h >= 79) return 21;
      if (h >= 49) return 13;
      if (h >= 31) return 8;
      if (h >= 19) return 5;
      if (h >= 13) return 3;
      if (h >= 7) return 2;
      return 1;
    };

    let totalH = 0;
    c.querySelectorAll('tbody tr').forEach(r => {
      const cell = r.children[i];
      if (cell?.textContent?.trim()) {
        const h = parse(cell.textContent);
        if (!isNaN(h) && h > 0) totalH += h;
      }
    });
    return map(totalH);
  }

  panel.querySelector('#btn-total-sp').addEventListener('click', () => {
    const t = getTotalStoryPoints();
    panel.querySelector('#helper-status').textContent = t !== null ? `✅ Total SP: ${t}` : '❌ SP column not found';
  });

  panel.querySelector('#btn-sp-from-estimate').addEventListener('click', () => {
    const sp = sumStoryPointsFromOriginalEstimate();
    panel.querySelector('#helper-status').textContent = sp !== null ? `✅ SP from Estimate: ${sp}` : '❌ Original estimate not found';
  });

  // === ID Picker Logic ===
  panel.querySelector('#btn-pick-ids').addEventListener('click', () => {
    const c = document.querySelector('[data-vc="issue-table-main-container"]');
    if (!c) return setStatus('❌ Issue table not found');
    const h = c.querySelector('th[aria-label="Work"]');
    if (!h) return setStatus('❌ "Work" column not found');
    const idx = Array.from(h.parentNode.children).indexOf(h);
    if (idx === -1) return setStatus('❌ Column index error');

    const ids = [];
    c.querySelectorAll('tbody tr').forEach(row => {
      const cell = row.children[idx];
      if (cell) {
        const a = cell.querySelector('a[href*="/browse/"]');
        if (a) {
          const m = a.href.match(/\/browse\/([A-Z]+-\d+)/);
          if (m) ids.push(m[1]);
        }
      }
    });

    if (ids.length === 0) return setStatus('⚠️ No IDs found in "Work" column');

    allIssueIDs = [...new Set(ids)];
    checkedIDs = new Set(allIssueIDs); // auto-select all
    currentIndex = 0;
    renderIDList();
    updateNavButtons();
    setStatus(`✅ Found ${allIssueIDs.length} IDs`);
  });

  function renderIDList() {
    const list = panel.querySelector('#id-list');
    list.innerHTML = '';
    allIssueIDs.forEach(id => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" ${checkedIDs.has(id) ? 'checked' : ''}> ${id}`;
      label.style.display = 'block';
      label.style.margin = '2px 0';
      label.style.cursor = 'pointer';
      label.querySelector('input').onchange = e => {
        if (e.target.checked) {
          checkedIDs.add(id);
        } else {
          checkedIDs.delete(id);
        }
        const arr = Array.from(checkedIDs);
        if (currentIndex >= arr.length) currentIndex = Math.max(0, arr.length - 1);
        updateNavButtons();
      };
      list.appendChild(label);
    });
  }

  function setStatus(msg) {
    panel.querySelector('#helper-status').textContent = msg;
  }

  function updateNavButtons() {
    const ids = Array.from(checkedIDs);
    const prev = panel.querySelector('#btn-prev-id');
    const next = panel.querySelector('#btn-next-id');
    prev.disabled = ids.length === 0 || currentIndex <= 0;
    next.disabled = ids.length === 0 || currentIndex >= ids.length - 1;
  }

  panel.querySelector('#btn-prev-id').addEventListener('click', () => {
    const ids = Array.from(checkedIDs);
    if (ids.length === 0) return;
    if (currentIndex > 0) {
      currentIndex--;
      const id = ids[currentIndex];
      performSearchForID(id);
      updateNavButtons();
      setStatus(`🔍 Searching: ${id}`);
    }
  });

  panel.querySelector('#btn-next-id').addEventListener('click', () => {
    const ids = Array.from(checkedIDs);
    if (ids.length === 0) return;
    if (currentIndex < ids.length - 1) {
      currentIndex++;
      const id = ids[currentIndex];
      performSearchForID(id);
      updateNavButtons();
      setStatus(`🔍 Searching: ${id}`);
    }
  });

 function performSearchForID(issueKey) {
  const jqlContainer = document.querySelector('[data-vc="jql-builder-ui-container"]');
  const editor = jqlContainer?.querySelector('[contenteditable="true"]');
  if (!editor) return;

  // Replace entire JQL content with a simple query: issueKey = "ORD-123"
  const newJQL = `issueKey = "${issueKey}"`;
  
  // Clear existing content
  editor.innerHTML = `<p spellcheck="false">${newJQL}</p>`;
  
  // Dispatch input event so Jira recognizes the change
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Trigger search
  const searchBtn = editor.querySelector('[data-testid="jql-editor-search"]');
  if (searchBtn) {
    searchBtn.click();
  }
}

  // === Apply to JQL + Trigger Search ===
  panel.querySelector('#btn-apply-jql').addEventListener('click', () => {
    const ids = Array.from(checkedIDs);
    if (ids.length === 0) return setStatus('⚠️ No IDs selected');

    const jqlContainer = document.querySelector('[data-vc="jql-builder-ui-container"]');
    const editor = jqlContainer?.querySelector('[contenteditable="true"]');
    if (!editor) return setStatus('❌ JQL editor not found');

    const idStr = `"${ids.join('", "')}"`;

    // Find workItemLink IN clause
    const paragraphs = editor.querySelectorAll('p');
    let updated = false;

    for (const p of paragraphs) {
      const field = p.querySelector('span[data-token-type="field"]');
      const op = p.querySelector('span[data-token-type="operator"]');

      if (field?.textContent.trim() === 'workItemLink' && op?.textContent.trim() === 'IN') {
        // Find text node AFTER operator
        let afterOp = false;
        for (const node of p.childNodes) {
          if (node === op) {
            afterOp = true;
            continue;
          }
          if (afterOp && node.nodeType === Node.TEXT_NODE) {
            node.textContent = ` (${idStr})`;
            updated = true;
            break;
          }
        }
        if (updated) break;
      }
    }

    if (!updated) return setStatus('⚠️ "workItemLink IN" not found in JQL');

    // Trigger Jira's input handler
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // 🔍 NOW TRIGGER SEARCH
    const searchBtn = editor.querySelector('[data-testid="jql-editor-search"]');
    if (searchBtn) {
      searchBtn.click();
      setStatus('✅ JQL updated and search triggered!');
    } else {
      setStatus('✅ JQL updated (search button not found)');
    }
  });
}

setTimeout(initJiraHelper, 1500);