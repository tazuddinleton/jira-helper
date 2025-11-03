// if (!window.location.hostname.includes('atlassian.net') && !/jira/i.test(window.location.hostname)) {
//   return;
// }

function initJiraHelpers() {
  if (window.jiraHelpersLoaded) return;
  window.jiraHelpersLoaded = true;

  // =============================
  // 1. STORY POINTS PANEL
  // =============================
  function createStoryPointsUI() {
    if (document.getElementById('jira-sp-helper')) return;

    const panel = document.createElement('div');
    panel.id = 'jira-sp-helper';
    panel.innerHTML = `
      <div class="jira-helper-tab" style="background:#0052cc">SP</div>
      <div class="jira-helper-content">
        <h4>Story Points Helper</h4>
        <button class="btn-sp">Total Story Points (Column)</button>
        <button class="btn-estimate">SP from Total Estimate</button>
        <div class="result">-</div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.jira-helper-tab').addEventListener('click', () => {
      panel.classList.toggle('expanded');
    });

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

    panel.querySelector('.btn-sp').addEventListener('click', () => {
      const t = getTotalStoryPoints();
      panel.querySelector('.result').textContent = t !== null ? `Total SP: ${t}` : '❌ Not found';
    });

    panel.querySelector('.btn-estimate').addEventListener('click', () => {
      const sp = sumStoryPointsFromOriginalEstimate();
      panel.querySelector('.result').textContent = sp !== null ? `SP from Estimate: ${sp}` : '❌ Not found';
    });
  }

  // =============================
  // 2. ID PICKER PANEL
  // =============================
  function createIDPickerUI() {
    if (document.getElementById('jira-id-picker')) return;

    const panel = document.createElement('div');
    panel.id = 'jira-id-picker';
    panel.innerHTML = `
      <div class="jira-helper-tab" style="background:#00875a">IDs</div>
      <div class="jira-helper-content">
        <h4>Pick Issue IDs</h4>
        <button id="btn-pick-ids">Pick the IDs</button>
        <div id="id-list" style="max-height:200px;overflow-y:auto;margin:8px 0;"></div>
        <div style="display:flex;gap:6px;">
          <button id="btn-prev" disabled>◀ Prev</button>
          <button id="btn-next" disabled>Next ▶</button>
        </div>
        <button id="btn-apply-jql" style="margin-top:10px;width:100%;">Apply to JQL</button>
        <div id="jql-status" style="margin-top:6px;font-size:12px;color:#0065ff;"></div>
      </div>
    `;
    document.body.appendChild(panel);

    let allIDs = [];
    let currentPage = 0;
    const pageSize = 10;
    let checked = new Set();

    panel.querySelector('.jira-helper-tab').addEventListener('click', () => {
      panel.classList.toggle('expanded');
    });

    panel.querySelector('#btn-pick-ids').addEventListener('click', () => {
      const c = document.querySelector('[data-vc="issue-table-main-container"]');
      if (!c) return alert('Table not found');
      const h = c.querySelector('th[aria-label="Work"]');
      if (!h) return alert('"Work" column not found');
      const idx = Array.from(h.parentNode.children).indexOf(h);
      if (idx === -1) return alert('Column index error');

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

      allIDs = [...new Set(ids)];
      currentPage = 0;
      checked = new Set();
      render();
      updateNav();
    });

    function render() {
      const start = currentPage * pageSize;
      const page = allIDs.slice(start, start + pageSize);
      const el = panel.querySelector('#id-list');
      el.innerHTML = '';
      page.forEach(id => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" ${checked.has(id) ? 'checked' : ''}> ${id}`;
        label.style.display = 'block';
        label.style.fontSize = '13px';
        label.style.margin = '2px 0';
        label.style.cursor = 'pointer';
        label.querySelector('input').onchange = e => {
          e.target.checked ? checked.add(id) : checked.delete(id);
        };
        el.appendChild(label);
      });
    }

    function updateNav() {
      const p = panel.querySelector('#btn-prev');
      const n = panel.querySelector('#btn-next');
      p.disabled = currentPage === 0;
      n.disabled = (currentPage + 1) * pageSize >= allIDs.length;
    }

    panel.querySelector('#btn-prev').onclick = () => {
      if (currentPage > 0) {
        currentPage--;
        render();
        updateNav();
      }
    };

    panel.querySelector('#btn-next').onclick = () => {
      if ((currentPage + 1) * pageSize < allIDs.length) {
        currentPage++;
        render();
        updateNav();
      }
    };

    panel.querySelector('#btn-apply-jql').onclick = () => {
      const container = document.querySelector('[data-vc="jql-builder-ui-container"]');
      const editor = container?.querySelector('[contenteditable="true"]');
      if (!editor) {
        panel.querySelector('#jql-status').textContent = '❌ JQL editor not found';
        return;
      }

      const ids = Array.from(checked);
      if (ids.length === 0) {
        panel.querySelector('#jql-status').textContent = '⚠️ No IDs selected';
        return;
      }

      const idStr = `"${ids.join('", "')}"`;

      // Find paragraph with workItemLink IN
      const paragraphs = editor.querySelectorAll('p');
      let updated = false;

      for (const p of paragraphs) {
        const field = p.querySelector('span[data-token-type="field"]');
        const op = p.querySelector('span[data-token-type="operator"]');

        if (field?.textContent.trim() === 'workItemLink' && op?.textContent.trim() === 'IN') {
          // Now find the text node IMMEDIATELY after the operator span
          let textNode = null;
          let afterOperator = false;
          for (const node of p.childNodes) {
            if (node === op) {
              afterOperator = true;
              continue;
            }
            if (afterOperator && node.nodeType === Node.TEXT_NODE) {
              textNode = node;
              break;
            }
          }

          if (textNode) {
            // Replace ONLY the (...) part
            textNode.textContent = ` (${idStr})`;
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        panel.querySelector('#jql-status').textContent = '⚠️ "workItemLink IN" not found';
        return;
      }

      // Notify Jira of change
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      panel.querySelector('#jql-status').textContent = '✅ JQL updated!';
    };
  }

  // Inject both
  setTimeout(() => {
    createStoryPointsUI();
    createIDPickerUI();
  }, 1500);
}

initJiraHelpers();