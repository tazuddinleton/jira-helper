// Select the container by data-vc attribute

function getTotalStoryPoints() {

const container = document.querySelector('[data-vc="issue-table-main-container"]');
if (!container) {
  console.error('Container with data-vc="issue-table-main-container" not found');
  return;
}

// Find the header with aria-label="Story Points"
const header = container.querySelector('th[aria-label="Story Points"]');
if (!header) {
  console.error('Header with aria-label="Story Points" not found');
  return;
}

// Determine the column index
const columnIndex = Array.from(header.parentNode.children).indexOf(header);
if (columnIndex === -1) {
  console.error('Could not determine column index');
  return;
}

// Get all data rows (assume they're in tbody; adjust if needed)
const rows = container.querySelectorAll('tbody tr');

let totalStoryPoints = 0;
rows.forEach(row => {
  const cell = row.children[columnIndex];
  if (cell) {
    const text = cell.textContent.trim();
    // Extract numeric part (Story Points are integers: 1, 2, 3, 5, 8, etc.)
    const numberStr = text.replace(/[^\d.-]/g, '');
    const value = parseFloat(numberStr);
    if (!isNaN(value)) {
      totalStoryPoints += value;
    }
  }
});

console.log('✅ Total Story Points:', totalStoryPoints);
}