package com.konto.app

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class BankNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "KontoBankListener"
        private const val PREFS_NAME = "konto_prefs"
        private const val KEY_PENDING = "pending_notifications"
        private const val DEDUPLICATE_WINDOW_MS = 3000L

        private var lastNotificationHash: String? = null
        private var lastNotificationTime: Long = 0L
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        // 1. Ignorar notificaciones persistentes (ej. reproductor de música, descargas)
        if (sbn.isOngoing) {
            return
        }

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val packageName = sbn.packageName?.trim() ?: ""

        val combinedContent = "$title $text"

        // 2. Filtro inteligente para capturar Swedbank o notificaciones bancarias compatibles
        val isSwedbankPackage = packageName.contains("swedbank", ignoreCase = true)
        val hasSwedbankKeyword = combinedContent.contains("swedbank", ignoreCase = true)
        val hasTransactionPatterns = combinedContent.contains("paid at", ignoreCase = true) ||
                combinedContent.contains("paid to", ignoreCase = true) ||
                combinedContent.contains("received from", ignoreCase = true) ||
                (combinedContent.contains("EUR", ignoreCase = true) &&
                        (combinedContent.contains("paid", ignoreCase = true) ||
                                combinedContent.contains("received", ignoreCase = true) ||
                                combinedContent.contains("pago", ignoreCase = true) ||
                                combinedContent.contains("ingreso", ignoreCase = true)))

        if (!isSwedbankPackage && !hasSwedbankKeyword && !hasTransactionPatterns) {
            return
        }

        // 3. Mecanismo anti-duplicados (ventana de 3 segundos)
        val currentHash = "$packageName|$title|$text"
        val currentTime = System.currentTimeMillis()
        if (currentHash == lastNotificationHash && (currentTime - lastNotificationTime) < DEDUPLICATE_WINDOW_MS) {
            Log.d(TAG, "Notificación duplicada ignorada (dentro de los 3s): $combinedContent")
            return
        }
        lastNotificationHash = currentHash
        lastNotificationTime = currentTime

        Log.i(TAG, "Notificación bancaria interceptada con éxito: [$packageName] $combinedContent")

        // 4. Si MainActivity está en ejecución, inyectar inmediatamente en el WebView
        val activity = MainActivity.activeInstance
        if (activity != null && !activity.isFinishing && !activity.isDestroyed) {
            activity.dispatchNotification(title, text, packageName)
        } else {
            // 5. Si la app está en segundo plano o cerrada, guardar en SharedPreferences para procesar al abrir
            guardarEnColaPendientes(title, text, packageName)
        }
    }

    private fun guardarEnColaPendientes(title: String, text: String, packageName: String) {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(jsonString)

            val item = JSONObject().apply {
                put("title", title)
                put("text", text)
                put("packageName", packageName)
                put("timestamp", System.currentTimeMillis())
            }

            array.put(item)
            prefs.edit().putString(KEY_PENDING, array.toString()).apply()
            Log.d(TAG, "Notificación guardada en cola offline de SharedPreferences. Total pendientes: ${array.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando notificación pendiente en SharedPreferences", e)
        }
    }
}
