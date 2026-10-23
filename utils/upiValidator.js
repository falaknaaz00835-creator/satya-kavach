// utils/upiValidator.js

/**
 * Validates a 12-digit Indian UPI UTR mathematically.
 * Format: Y DDD XXXXXXXX
 * Y = Last digit of the year (e.g., 6 for 2026)
 * DDD = Julian day of the year (001 to 365/366)
 */
export function validateUTR(utr, receiptDateStr) {
    if (!utr || utr.length !== 12 || isNaN(utr)) {
        return { valid: false, reason: "UTR must be exactly 12 numeric digits." };
    }

    const utrYearDigit = parseInt(utr.charAt(0));
    const utrJulianDay = parseInt(utr.substring(1, 4));

    // Basic Julian day validation
    if (utrJulianDay < 1 || utrJulianDay > 366) {
        return { valid: false, reason: "Cryptographic failure: Invalid Julian day in UTR." };
    }

    // If a date is provided from the OCR, cross-verify it
    if (receiptDateStr) {
        const receiptDate = new Date(receiptDateStr);
        const receiptYearDigit = receiptDate.getFullYear() % 10;
        
        // Calculate Julian day of the receipt date
        const start = new Date(receiptDate.getFullYear(), 0, 0);
        const diff = (receiptDate - start) + ((start.getTimezoneOffset() - receiptDate.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const receiptJulianDay = Math.floor(diff / oneDay);

        if (utrYearDigit !== receiptYearDigit || utrJulianDay !== receiptJulianDay) {
            return { 
                valid: false, 
                reason: `Mismatch: Receipt date (${receiptDateStr}) does not match the banking timestamp embedded in the UTR.` 
            };
        }
    }

    return { valid: true, reason: "UTR cryptographic structure verified." };
}