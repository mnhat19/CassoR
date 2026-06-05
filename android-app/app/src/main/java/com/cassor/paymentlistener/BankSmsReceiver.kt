package com.cassor.paymentlistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsMessage
import android.util.Log

private const val TAG = "BankSmsReceiver"

/**
 * Receives incoming SMS messages and checks for CASSOR payment references.
 * Some banks (Agribank, older VCB) still primarily use SMS for notifications.
 */
class BankSmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        val bundle = intent.extras ?: return
        val pdus = bundle.get("pdus") as? Array<*> ?: return
        val format = bundle.getString("format")

        val senderNumbers = mutableSetOf<String>()
        val messageTexts = mutableListOf<String>()

        for (pdu in pdus) {
            val sms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                SmsMessage.createFromPdu(pdu as ByteArray, format)
            } else {
                @Suppress("DEPRECATION")
                SmsMessage.createFromPdu(pdu as ByteArray)
            }
            sms?.let {
                senderNumbers.add(it.originatingAddress ?: "")
                messageTexts.add(it.messageBody ?: "")
            }
        }

        val fullText = messageTexts.joinToString(" ")
        val sender = senderNumbers.firstOrNull() ?: "SMS"

        Log.d(TAG, "SMS from $sender: $fullText")

        val parsed = PaymentParser.parse(fullText, "sms:$sender") ?: return

        Log.i(TAG, "Parsed SMS payment: ref=${parsed.reference} amount=${parsed.amountVnd}")

        val prefs = AppPrefs(context)
        BackendClient.confirmPayment(
            serverUrl = prefs.serverUrl,
            secret = prefs.webhookSecret,
            payment = parsed,
        ) { success, message ->
            Log.i(TAG, if (success) "SMS payment confirmed: ${parsed.reference}" else "SMS confirm failed: $message")
        }
    }
}
