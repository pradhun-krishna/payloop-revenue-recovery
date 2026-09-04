/**
 * Utility functions for the Razorpay Triage Dashboard.
 */

/**
 * Format an amount in paise to Indian number system (₹X,XX,XXX).
 * @param {number} paise - Amount in paise
 * @returns {string} Formatted string like "₹1,23,456"
 */
export function formatINR(paise) {
  const rupees = Math.round(paise) / 100;
  return '₹' + formatIndianNumber(rupees);
}

/**
 * Format a number using Indian number system (lakhs, crores).
 * @param {number} num
 * @returns {string}
 */
export function formatIndianNumber(num) {
  const str = Math.floor(num).toString();
  if (str.length <= 3) return str;

  let result = str.slice(-3);
  let remaining = str.slice(0, -3);

  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  // Remove leading comma if exists
  return result.replace(/^,/, '');
}

/**
 * Format an INR amount from rupees (not paise).
 * @param {number} rupees
 * @returns {string}
 */
export function formatINRFromRupees(rupees) {
  return '₹' + formatIndianNumber(Math.round(rupees));
}

/**
 * Convert an ISO timestamp to a relative "time ago" string.
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Relative time like "2m ago", "1h ago"
 */
export function timeAgo(isoString) {
  if (!isoString) return '';

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN');
}

/**
 * Format an ISO timestamp to "HH:MM" for timeline display.
 * @param {string} isoString
 * @returns {string}
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Truncate a string to maxLen characters, adding "..." if truncated.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 40) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

/**
 * Map a failure class to its badge color.
 * @param {string} failureClass
 * @returns {string} hex color
 */
export function getClassColor(failureClass) {
  const colors = {
    NETWORK_TIMEOUT: '#4F7EFF',
    INSUFFICIENT_FUNDS_USER: '#F5A623',
    BANK_HARD_DECLINE: '#8B90A7',
    CARD_EXPIRY: '#A78BFA',
    UPI_TIMEOUT: '#38BDF8',
    FRAUD_BLOCK: '#FF4D6A',
  };
  return colors[failureClass] || '#3D4266';
}

/**
 * Map a payment method to its display dot color.
 * @param {string} method
 * @returns {string} hex color
 */
export function getMethodColor(method) {
  const colors = {
    card: '#4F7EFF',
    upi: '#2DD4A0',
    netbanking: '#A78BFA',
  };
  return colors[method] || '#3D4266';
}

/**
 * Map a status string to display properties.
 * @param {string} status
 * @returns {{ color: string, label: string }}
 */
export function getStatusDisplay(status) {
  const map = {
    success: { color: '#2DD4A0', label: 'Recovered' },
    failed: { color: '#FF4D6A', label: 'Failed' },
    escalated: { color: '#FF4D6A', label: 'Escalated' },
    human_review: { color: '#F5A623', label: 'Review' },
    skipped: { color: '#8B90A7', label: 'Skipped' },
  };
  return map[status] || { color: '#3D4266', label: status };
}

/**
 * Map action type to human-readable description.
 * @param {string} action
 * @returns {string}
 */
export function getActionLabel(action) {
  const labels = {
    RETRY_DELAYED: 'Retried after 15 min',
    RETRY_IMMEDIATE: 'Retried immediately',
    SEND_REMINDER: 'Sent reminder',
    SEND_UPDATE_LINK: 'Sent update link',
    HUMAN_REVIEW: 'Flagged for review',
    ESCALATE_AND_HALT: 'Escalated',
  };
  return labels[action] || action;
}

/**
 * Map payment method to display name.
 * @param {string} method
 * @returns {string}
 */
export function getMethodLabel(method) {
  const labels = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net banking',
  };
  return labels[method] || method;
}
