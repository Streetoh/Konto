package com.konto.app

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import org.json.JSONArray

class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "KontoNotifAction"
        private const val PREFS_NAME = "konto_prefs"
        private const val KEY_PENDING = "pending_notifications"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val txId = intent.getStringExtra("tx_id") ?: return
        val notifId = intent.getIntExtra("notif_id", -1)
        val categoryName = intent.getStringExtra("category_name") ?: "su categoría"
        val amount = intent.getStringExtra("amount") ?: ""

        Log.i(TAG, "Acción recibida: $action para txId: $txId")

        // Cancelar la notificación al pulsar Aceptar
        if (notifId != -1) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(notifId)
        }

        if (action == "com.konto.app.ACTION_ACCEPT_TX") {
            // SIEMPRE marcar en SharedPreferences para garantizar que al abrir la app esté confirmada
            marcarTxConfirmadaOffline(context, txId)

            val activity = MainActivity.activeInstance
            if (activity != null && !activity.isFinishing && !activity.isDestroyed && activity.isActivityResumed) {
                // Notificar en tiempo real al WebView de React si está en primer plano
                activity.confirmTransactionFromNotification(txId)
            }

            Toast.makeText(
                context,
                "✓ Cargo ${if (amount.isNotEmpty()) "$amount " else ""}confirmado en $categoryName",
                Toast.LENGTH_SHORT
            ).show()
        } else if (action == "com.konto.app.ACTION_DENY_TX") {
            // SIEMPRE marcar descarte en SharedPreferences para que no se registre
            marcarTxDescartadaOffline(context, txId)

            val activity = MainActivity.activeInstance
            if (activity != null && !activity.isFinishing && !activity.isDestroyed && activity.isActivityResumed) {
                activity.discardTransactionFromNotification(txId)
            }

            Toast.makeText(
                context,
                "✕ Cargo ${if (amount.isNotEmpty()) "$amount " else ""}descartado",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun marcarTxConfirmadaOffline(context: Context, txId: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString("confirmed_tx_ids", "[]") ?: "[]"
            val array = JSONArray(jsonString)
            var yaExiste = false
            for (i in 0 until array.length()) {
                if (array.getString(i) == txId) {
                    yaExiste = true
                    break
                }
            }
            if (!yaExiste) array.put(txId)

            val pendingJson = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val pendingArray = JSONArray(pendingJson)
            for (i in 0 until pendingArray.length()) {
                val item = pendingArray.getJSONObject(i)
                if (item.optString("txId") == txId) {
                    item.put("confirmado", true)
                }
            }

            prefs.edit()
                .putString("confirmed_tx_ids", array.toString())
                .putString(KEY_PENDING, pendingArray.toString())
                .apply()
            Log.d(TAG, "Transacción $txId marcada como confirmada offline")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando confirmación offline", e)
        }
    }

    private fun marcarTxDescartadaOffline(context: Context, txId: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val discardedJson = prefs.getString("discarded_tx_ids", "[]") ?: "[]"
            val discardedArray = JSONArray(discardedJson)
            var yaExiste = false
            for (i in 0 until discardedArray.length()) {
                if (discardedArray.getString(i) == txId) {
                    yaExiste = true
                    break
                }
            }
            if (!yaExiste) discardedArray.put(txId)

            // Eliminar de pending_notifications si estuviera
            val pendingJson = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val pendingArray = JSONArray(pendingJson)
            val newPending = JSONArray()
            for (i in 0 until pendingArray.length()) {
                val item = pendingArray.getJSONObject(i)
                if (item.optString("txId") != txId) {
                    newPending.put(item)
                }
            }

            prefs.edit()
                .putString("discarded_tx_ids", discardedArray.toString())
                .putString(KEY_PENDING, newPending.toString())
                .apply()
            Log.d(TAG, "Transacción $txId marcada como descartada offline")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando descarte offline", e)
        }
    }
}
