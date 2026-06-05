package com.cassor.paymentlistener

import java.util.regex.Pattern

data class ParsedPayment(
    val reference: String,
    val amountVnd: Long,
    val rawText: String,
    val source: String,
)

/**
 * Parses bank notification text (SMS or push notification) to extract:
 * - CASSOR reference code (format: CSR + 8 uppercase hex chars, e.g. CSRX4A7B2C1)
 * - Transaction amount in VND
 *
 * Covers notification formats from major Vietnamese banks:
 * MB Bank, Vietcombank (VCB), Techcombank (TCB), BIDV, Agribank, ACB, Sacombank, VPBank, TPBank
 */
object PaymentParser {

    // Reference pattern: CSR followed by exactly 8 uppercase alphanumeric chars
    private val REF_PATTERN = Pattern.compile("""CSR[A-F0-9]{8}""", Pattern.CASE_INSENSITIVE)

    // Amount patterns — captures the numeric part, handles dots and commas as separators
    // Examples: "+3,000 VND", "tang 3000VND", "+3.000d", "3 000 dong"
    private val AMOUNT_PATTERNS = listOf(
        Pattern.compile("""[+]?\s*([\d][,.\d\s]*)\s*(?:VND|vnd|đ|dong|Dong|vnđ)"""),
        Pattern.compile("""(?:tang|cong|+|credit|CR)\s*:?\s*([\d][,.\d\s]*)""", Pattern.CASE_INSENSITIVE),
        Pattern.compile("""([\d][,.\d\s]*)\s*(?:VND|vnd|đ|dong)"""),
    )

    fun parse(text: String, source: String): ParsedPayment? {
        val refMatcher = REF_PATTERN.matcher(text)
        if (!refMatcher.find()) return null

        val reference = refMatcher.group().uppercase()
        val amount = extractAmount(text)

        return ParsedPayment(
            reference = reference,
            amountVnd = amount,
            rawText = text,
            source = source,
        )
    }

    private fun extractAmount(text: String): Long {
        for (pattern in AMOUNT_PATTERNS) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                val raw = matcher.group(1) ?: continue
                val cleaned = raw.replace(Regex("""[,.\s]"""), "")
                return cleaned.toLongOrNull() ?: continue
            }
        }
        return 0L
    }
}
