// Solid action colours for the console's decision buttons (white text passes WCAG AA on each).
// Passed as Button className: they replace the primary button's gradient with a flat colour.

const FLAT = 'bg-none text-white shadow-none hover:translate-y-0 hover:shadow-none';

/** Approve, disburse, mark repaid. */
export const APPROVE_CLASS = `${FLAT} bg-[#047857] hover:bg-[#065f46]`;

/** Reject, default, delete. */
export const REJECT_CLASS = `${FLAT} bg-[#b91c1c] hover:bg-[#991b1b]`;

/** Neutral forward steps and page actions ("Start reviewing", "Add lender"). */
export const PRIMARY_CLASS = `${FLAT} bg-[#7c3aed] hover:bg-[#6d28d9]`;
