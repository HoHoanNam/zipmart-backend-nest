/** Used whenever `Product.lowStockThreshold` is null — the admin dashboard and the `/inventory` low-stock list must both fall back to this exact value, or the two screens would disagree on what "low stock" means. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
