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
            val activity = MainActivity.activeInstance
            if (activity != null && !activity.isFinishing && !activity.isDestroyed) {
                // Notificar en tiempo real al WebView de React
                activity.confirmTransactionFromNotification(txId)
            } else {
                // Guardar confirmación en SharedPreferences para aplicarla al abrir la app
                marcarTxConfirmadaOffline(context, txId)
            }

            Toast.makeText(
                context,
                "✓ Cargo ${if (amount.isNotEmpty()) "$amount " else ""}confirmado en $categoryName",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun marcarTxConfirmadaOffline(context: Context, txId: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString("confirmed_tx_ids", "[]") ?: "[]"
            val array = JSONArray(jsonString)
            array.put(txId)
            prefs.edit().putString("confirmed_tx_ids", array.toString()).apply()
            Log.d(TAG, "Transacción $txId marcada como confirmada offline")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando confirmación offline", e)
        }
    }
}
