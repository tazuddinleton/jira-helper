// Only run on Jira pages (adjust if needed)
// if (!window.location.hostname.includes('atlassian.net') && !/jira/i.test(window.location.hostname)) {
//   return;
// }

function createHelperUI() {
  // Avoid adding panel multiple times
  if (document.getElementById('jira-sp-helper')) return;

  const panel = document.createElement('div');
  panel.id = 'jira-sp-helper';
  panel.innerHTML = `
    <h4>Story Points Helper</h4>
    <button id="btn-sum-sp">Total Story Points (Column)</button>
    <button id="btn-sum-sp-estimate">SP from Total Estimate</button>
    <div class="result" id="sp-result">-</div>
  `;
  document.body.appendChild(panel);

  // === Your exact getTotalStoryPoints logic ===
  function getTotalStoryPoints() {
    const container = document.querySelector('[data-vc="issue-table-main-container"]');
    if (!container) return null;

    const header = container.querySelector('th[aria-label="Story Points"]');
    if (!header) return null;

    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    if (columnIndex === -1) return null;

    let total = 0;
    container.querySelectorAll('tbody tr').forEach(row => {
      const cell = row.children[columnIndex];
      if (cell) {
        const val = parseFloat(cell.textContent.replace(/[^\d.-]/g, ''));
        if (!isNaN(val)) total += val;
      }
    });
    return total;
  }

  // === Your exact sumStoryPointsFromOriginalEstimate logic ===
  function sumStoryPointsFromOriginalEstimate() {
    const container = document.querySelector('[data-vc="issue-table-main-container"]');
    if (!container) return null;

    const header = container.querySelector('th[aria-label="Original estimate"]');
    if (!header) return null;

    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    if (columnIndex === -1) return null;

    const rows = container.querySelectorAll('tbody tr');

    function parseToHours(text) {
      const lower = text.toLowerCase().trim();
      let totalHours = 0;

      const weekMatch = lower.match(/([\d.]+)\s*(?:w|week|weeks)/);
      if (weekMatch) totalHours += parseFloat(weekMatch[1]) * 30;

      const dayMatch = lower.match(/([\d.]+)\s*(?:d|day|days)/);
      if (dayMatch) totalHours += parseFloat(dayMatch[1]) * 6;

      const hourMatch = lower.match(/([\d.]+)\s*(?:h|hr|hrs|hour|hours)/);
      if (hourMatch) totalHours += parseFloat(hourMatch[1]);

      if (totalHours === 0) {
        const fallback = parseFloat(lower.replace(/[^\d.-]/g, ''));
        if (!isNaN(fallback)) totalHours = fallback;
      }
      return totalHours;
    }

    function getStoryPoints(hours) {
      if (hours >= 127) return 34;
      if (hours >= 79)  return 21;
      if (hours >= 49)  return 13;
      if (hours >= 31)  return 8;
      if (hours >= 19)  return 5;
      if (hours >= 13)  return 3;
      if (hours >= 7)   return 2;
      return 1; // < 7h → 1 SP (as per your code)
    }

    let totalHours = 0;
    rows.forEach(row => {
      const cell = row.children[columnIndex];
      if (cell && cell.textContent.trim()) {
        const hours = parseToHours(cell.textContent);
        if (!isNaN(hours) && hours > 0) {
          totalHours += hours;
        }
      }
    });

    return getStoryPoints(totalHours);
  }

  // Button: Direct Story Points
  panel.querySelector('#btn-sum-sp').addEventListener('click', () => {
    const total = getTotalStoryPoints();
    if (total !== null) {
      panel.querySelector('#sp-result').textContent = `Total SP: ${total}`;
    } else {
      panel.querySelector('#sp-result').textContent = '❌ SP column not found';
    }
  });

  // Button: SP from total estimate
  panel.querySelector('#btn-sum-sp-estimate').addEventListener('click', () => {
    const sp = sumStoryPointsFromOriginalEstimate();
    if (sp !== null) {
      panel.querySelector('#sp-result').textContent = `SP from Estimate: ${sp}`;
    } else {
      panel.querySelector('#sp-result').textContent = '❌ "Original estimate" not found';
    }
  });
}

// Inject after a short delay to ensure Jira DOM is ready
setTimeout(createHelperUI, 1500);