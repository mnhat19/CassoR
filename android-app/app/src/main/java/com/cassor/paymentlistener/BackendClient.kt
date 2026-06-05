package com.cassor.paymentlistener

import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

private const val TAG = "BackendClient"

/**
 * Minimal HTTP client that posts payment confirmations to the Cassor backend.
 * Runs on a background thread — no Android main-thread networking.
 */
object BackendClient {

    private val executor = Executors.newSingleThreadExecutor()

    /**
     * Fire-and-forget: confirm payment webhook on background thread.
     * @param serverUrl  Base URL, e.g. "https://your-server.com"
     * @param secret     PAYMENT_WEBHOOK_SECRET from server .env
     * @param payment    Parsed payment data
     * @param onResult   Called on completion (success=true/false, message)
     */
    fun confirmPayment(
        serverUrl: String,
        secret: String,
        payment: ParsedPayment,
        onResult: (success: Boolean, message: String) -> Unit,
    ) {
        executor.submit {
            try {
                val url = URL("$serverUrl/api/v1/payment/webhook/confirm")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Accept", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10_000
                conn.readTimeout = 15_000

                val body = JSONObject().apply {
                    put("reference", payment.reference)
                    put("amount_vnd", payment.amountVnd)
                    put("source", payment.source)
                    put("secret", secret)
                }.toString()

                OutputStreamWriter(conn.outputStream).use { it.write(body) }

                val responseCode = conn.responseCode
                val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                val responseBody = BufferedReader(InputStreamReader(stream)).use { it.readText() }

                Log.d(TAG, "Webhook response $responseCode: $responseBody")

                if (responseCode in 200..299) {
                    val json = JSONObject(responseBody)
                    onResult(true, json.optString("message", "OK"))
                } else {
                    onResult(false, "HTTP $responseCode: $responseBody")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Webhook error: ${e.message}", e)
                onResult(false, e.message ?: "Network error")
            }
        }
    }
}
