/** Currency formatting shared across the VM wizard steps and cost summary. */
export function formatPrice(amount: number, currency: string, hourly = false): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency || "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: hourly ? 4 : 2,
	}).format(amount)
}
