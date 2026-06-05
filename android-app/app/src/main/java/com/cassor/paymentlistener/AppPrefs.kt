package com.cassor.paymentlistener

import android.content.Context

private const val PREF_NAME = "cassor_prefs"
private const val KEY_SERVER_URL = "server_url"
private const val KEY_WEBHOOK_SECRET = "webhook_secret"
private const val DEFAULT_SERVER_URL = "http://192.168.1.100:8000"
private const val DEFAULT_SECRET = "cassor-webhook-secret-change-me"

/**
 * Thin wrapper around SharedPreferences for persisting the server URL and webhook secret.
 */
class AppPrefs(context: Context) {
    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()

    var webhookSecret: String
        get() = prefs.getString(KEY_WEBHOOK_SECRET, DEFAULT_SECRET) ?: DEFAULT_SECRET
        set(value) = prefs.edit().putString(KEY_WEBHOOK_SECRET, value).apply()
}
