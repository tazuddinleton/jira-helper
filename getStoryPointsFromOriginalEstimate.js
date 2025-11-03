function sumStoryPointsFromOriginalEstimate() {
  const container = document.querySelector('[data-vc="issue-table-main-container"]');
  if (!container) {
    console.error('Container with data-vc="issue-table-main-container" not found');
    return null;
  }

  const header = container.querySelector('th[aria-label="Original estimate"]');
  if (!header) {
    console.error('Header with aria-label="Original estimate" not found');
    return null;
  }

  const columnIndex = Array.from(header.parentNode.children).indexOf(header);
  if (columnIndex === -1) {
    console.error('Could not determine column index');
    return null;
  }

  const rows = container.querySelectorAll('tbody tr');


  // Convert text like "2d 3h", "1.5w", "8h" → total hours
  function parseToHours(text) {
    const lower = text.toLowerCase().trim();
    let totalHours = 0;

    // Match weeks (w, week, weeks)
    const weekMatch = lower.match(/([\d.]+)\s*(?:w|week|weeks)/);
    if (weekMatch) {
      totalHours += parseFloat(weekMatch[1]) * 30; // 1w = 5d * 6h = 30h
    }

    // Match days (d, day, days)
    const dayMatch = lower.match(/([\d.]+)\s*(?:d|day|days)/);
    if (dayMatch) {
      totalHours += parseFloat(dayMatch[1]) * 6; // 1d = 6h
    }

    // Match hours (h, hr, hrs, hour, hours)
    const hourMatch = lower.match(/([\d.]+)\s*(?:h|hr|hrs|hour|hours)/);
    if (hourMatch) {
      totalHours += parseFloat(hourMatch[1]);
    }

    // If no unit found, assume it's in hours (e.g., "15")
    if (totalHours === 0) {
      const fallback = parseFloat(lower.replace(/[^\d.-]/g, ''));
      if (!isNaN(fallback)) totalHours = fallback;
    }

    console.log(`Parsed "${text}" to ${totalHours} hours`);
    return totalHours;
  }

  // Map hours → Story Points (based on your table)
  function getStoryPoints(hours) {
    if (hours >= 127) return 34;   // 127–204 hrs
    if (hours >= 79)  return 21;   // 79–126 hrs
    if (hours >= 49)  return 13;   // 49–78 hrs
    if (hours >= 31)  return 8;    // 31–48 hrs
    if (hours >= 19)  return 5;    // 19–30 hrs
    if (hours >= 13)  return 3;    // 13–18 hrs
    if (hours >= 7)   return 2;    // 7–12 hrs    
    return 1;                      // < 3 hrs → 0 SP (or change to 1 if needed)
  }

  let totalHours = 0;
  rows.forEach(row => {
    const cell = row.children[columnIndex];
    if (cell && cell.textContent.trim()) {
      const text = cell.textContent;
      const hours = parseToHours(text);
      if (!isNaN(hours) && hours > 0) {
        
        totalHours += hours;
        // Optional debug: console.log(`${text} → ${hours}h → ${sp} SP`);
      }
    }
  });


  const totalStoryPoints = getStoryPoints(totalHours);
  console.log('✅ Total Story Points (from Original Estimate):', totalStoryPoints);
  return totalStoryPoints;
}