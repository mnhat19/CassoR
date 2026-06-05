package com.cassor.paymentlistener

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat

private const val TAG = "BankNotifService"

// Commonly known Vietnamese bank app package names
private val BANK_PACKAGES = setOf(
    "com.mbmobile",           // MB Bank
    "com.VCB",                // Vietcombank
    "vn.com.techcombank.bb.app", // Techcombank
    "com.bidv.smartbanking",  // BIDV SmartBanking
    "com.vnpay.agribank",     // Agribank E-Mobile
    "com.acb.mobile",         // ACB ONE
    "com.sacombank.mb",       // Sacombank Pay
    "com.vpbank.vpbankneo",   // VPBank NEO
    "vn.tpbank.ebank",        // TPBank Mobile
    "vn.shinhanbank.app",     // Shinhan SOL
    "vn.hdbank.mobile",       // HDBank
    "com.ocb.mobile",         // OCB OMNI
    "vn.vietinbank.ipay",     // VietinBank iPay
)

/**
 * Listens to all status-bar notifications. Filters to bank apps, then parses
 * CASSOR reference codes and POSTs confirmation to the backend.
 */
class BankNotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName
        if (pkg !in BANK_PACKAGES) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""

        val fullText = "$title $text $bigText"
        Log.d(TAG, "Bank notification from $pkg: $fullText")

        val prefs = AppPrefs(applicationContext)
        val parsed = PaymentParser.parse(fullText, "notification:$pkg") ?: return

        Log.i(TAG, "Parsed payment: ref=${parsed.reference} amount=${parsed.amountVnd}")
        notifyUser("Phát hiện thanh toán: ${parsed.reference}", "Đang xác nhận với server...")

        BackendClient.confirmPayment(
            serverUrl = prefs.serverUrl,
            secret = prefs.webhookSecret,
            payment = parsed,
        ) { success, message ->
            val msg = if (success) "✅ Xác nhận thành công: ${parsed.reference}" else "❌ Lỗi xác nhận: $message"
            Log.i(TAG, msg)
            notifyUser("Cassor Payment", msg)
        }
    }

    private fun notifyUser(title: String, text: String) {
        val channelId = "cassor_payment"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Cassor Payments", NotificationManager.IMPORTANCE_HIGH)
            nm.createNotificationChannel(channel)
        }

        val notif = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .build()

        nm.notify(System.currentTimeMillis().toInt(), notif)
    }
}
