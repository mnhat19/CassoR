package com.cassor.paymentlistener

import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.Menu
import android.view.MenuItem
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val SMS_PERMISSION_CODE = 101

    private lateinit var prefs: AppPrefs
    private lateinit var tvStatus: TextView
    private lateinit var etServerUrl: EditText
    private lateinit var etWebhookSecret: EditText
    private lateinit var btnSave: Button
    private lateinit var btnTestWebhook: Button
    private lateinit var tvNotifStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        supportActionBar?.title = "Cassor Payment Listener"

        prefs = AppPrefs(this)

        tvStatus = findViewById(R.id.tv_status)
        etServerUrl = findViewById(R.id.et_server_url)
        etWebhookSecret = findViewById(R.id.et_webhook_secret)
        btnSave = findViewById(R.id.btn_save)
        btnTestWebhook = findViewById(R.id.btn_test_webhook)
        tvNotifStatus = findViewById(R.id.tv_notif_status)

        // Load saved values
        etServerUrl.setText(prefs.serverUrl)
        etWebhookSecret.setText(prefs.webhookSecret)

        btnSave.setOnClickListener {
            val url = etServerUrl.text.toString().trimEnd('/')
            val secret = etWebhookSecret.text.toString().trim()
            if (url.isEmpty() || secret.isEmpty()) {
                Toast.makeText(this, "Vui lòng điền đầy đủ thông tin", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.serverUrl = url
            prefs.webhookSecret = secret
            Toast.makeText(this, "Đã lưu cấu hình", Toast.LENGTH_SHORT).show()
            updateStatusDisplay()
        }

        btnTestWebhook.setOnClickListener { testWebhook() }

        requestSmsPermission()
        updateStatusDisplay()
    }

    override fun onResume() {
        super.onResume()
        updateStatusDisplay()
    }

    private fun updateStatusDisplay() {
        val notifEnabled = isNotificationListenerEnabled()
        tvNotifStatus.text = if (notifEnabled) "✅ Quyền thông báo: Đã cấp" else "❌ Quyền thông báo: Chưa cấp — nhấn nút bên dưới"
        tvNotifStatus.setTextColor(
            if (notifEnabled) getColor(android.R.color.holo_green_dark)
            else getColor(android.R.color.holo_red_dark)
        )

        val smsEnabled = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        tvStatus.text = buildString {
            appendLine("Server: ${prefs.serverUrl}")
            appendLine("Quyền SMS: ${if (smsEnabled) "✅ Đã cấp" else "❌ Chưa cấp"}")
            appendLine("Lắng nghe thông báo ngân hàng: ${if (notifEnabled) "✅ Hoạt động" else "⚠️ Cần cấp quyền"}")
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
        return flat.contains(packageName)
    }

    private fun requestSmsPermission() {
        val perms = arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
        val missing = perms.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), SMS_PERMISSION_CODE)
        }
    }

    private fun testWebhook() {
        val testPayment = ParsedPayment(
            reference = "CSRTEST123",
            amountVnd = 3000,
            rawText = "Test webhook",
            source = "manual_test",
        )
        tvStatus.text = "Đang kiểm tra webhook..."
        BackendClient.confirmPayment(
            serverUrl = prefs.serverUrl,
            secret = prefs.webhookSecret,
            payment = testPayment,
        ) { success, message ->
            runOnUiThread {
                val result = if (success) "✅ Webhook OK: $message" else "❌ Webhook lỗi: $message"
                Toast.makeText(this, result, Toast.LENGTH_LONG).show()
                updateStatusDisplay()
            }
        }
    }

    fun openNotificationSettings(view: android.view.View) {
        try {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "Vào Cài đặt → Ứng dụng → Quyền thông báo đặc biệt", Toast.LENGTH_LONG).show()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        updateStatusDisplay()
    }
}
