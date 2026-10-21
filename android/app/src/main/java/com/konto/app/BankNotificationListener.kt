package com.konto.app

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Build
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
        private const val DEDUPLICATE_WINDOW_MS = 10000L // 10 segundos para la misma compra

        private var lastPurchaseKey: String? = null
        private var lastPurchaseTime: Long = 0L

        fun requestRebindIfPossible(context: Context) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val component = ComponentName(context, BankNotificationListener::class.java)
                    requestRebind(component)
                    Log.d(TAG, "requestRebind solicitado con éxito para BankNotificationListener")
                }
            } catch (e: Exception) {
                Log.e(TAG, "No se pudo solicitar requestRebind", e)
            }
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "BankNotificationListener CONECTADO y escuchando notificaciones activamente")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "BankNotificationListener DESCONECTADO por el sistema. Intentando reconectar...")
        requestRebindIfPossible(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        // 0. CRÍTICO: NUNCA procesar notificaciones emitidas por nuestra propia aplicación Konto
        val packageName = sbn.packageName?.trim() ?: ""
        val myPackage = applicationContext.packageName ?: "com.konto.app"
        if (packageName.equals(myPackage, ignoreCase = true) ||
            packageName.equals("com.konto.app", ignoreCase = true)) {
            return
        }

        // 1. Ignorar notificaciones persistentes (ej. reproductor de música, descargas) y apps del sistema
        if (sbn.isOngoing) {
            return
        }
        if (packageName.equals("android", ignoreCase = true) ||
            packageName.equals("com.android.systemui", ignoreCase = true) ||
            packageName.equals("com.android.vending", ignoreCase = true) ||
            packageName.equals("com.google.android.googlequicksearchbox", ignoreCase = true)) {
            return
        }

        val extras = sbn.notification?.extras ?: return

        // Extraer todos los campos de texto posibles que usan las apps bancarias y wallets
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim()
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()?.trim()
            ?: ""

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val normalText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()?.trim() ?: ""

        val text = when {
            bigText.isNotEmpty() -> bigText
            normalText.isNotEmpty() -> normalText
            subText.isNotEmpty() -> subText
            infoText.isNotEmpty() -> infoText
            else -> ""
        }

        val combinedContent = "$title $text $subText $infoText".trim()

        // 2. Extraer importe monetario: si no hay un importe numérico positivo, no es una compra
        val monto = KontoNotificationManager.extraerMonto(combinedContent)
        if (monto <= 0.0) {
            return
        }

        // 3. Filtro inteligente para capturar Swedbank, Google Wallet y cualquier app bancaria o de pago
        val isKnownBankOrWallet = packageName.contains("swedbank", ignoreCase = true) ||
                packageName.contains("wallet", ignoreCase = true) ||
                packageName.contains("revolut", ignoreCase = true) ||
                packageName.contains("bbva", ignoreCase = true) ||
                packageName.contains("santander", ignoreCase = true) ||
                packageName.contains("caixabank", ignoreCase = true) ||
                packageName.contains("caixa", ignoreCase = true) ||
                packageName.contains("ing", ignoreCase = true) ||
                packageName.contains("n26", ignoreCase = true) ||
                packageName.contains("imagin", ignoreCase = true) ||
                packageName.contains("sabadell", ignoreCase = true) ||
                packageName.contains("openbank", ignoreCase = true) ||
                packageName.contains("kutxa", ignoreCase = true) ||
                packageName.contains("abanca", ignoreCase = true) ||
                packageName.contains("unicaja", ignoreCase = true) ||
                packageName.contains("cajarural", ignoreCase = true) ||
                packageName.contains("wise", ignoreCase = true) ||
                packageName.contains("paypal", ignoreCase = true) ||
                packageName.contains("bank", ignoreCase = true) ||
                packageName.contains("pank", ignoreCase = true)

        val hasCurrency = combinedContent.contains("EUR", ignoreCase = true) ||
                combinedContent.contains("€") ||
                combinedContent.contains("$") ||
                combinedContent.contains("£") ||
                combinedContent.contains("kr", ignoreCase = true)

        val hasTransactionKeyword = combinedContent.contains("paid", ignoreCase = true) ||
                combinedContent.contains("payment", ignoreCase = true) ||
                combinedContent.contains("purchase", ignoreCase = true) ||
                combinedContent.contains("spent", ignoreCase = true) ||
                combinedContent.contains("received", ignoreCase = true) ||
                combinedContent.contains("credited", ignoreCase = true) ||
                combinedContent.contains("pago", ignoreCase = true) ||
                combinedContent.contains("compra", ignoreCase = true) ||
                combinedContent.contains("pagado", ignoreCase = true) ||
                combinedContent.contains("tarjeta", ignoreCase = true) ||
                combinedContent.contains("cargo", ignoreCase = true) ||
                combinedContent.contains("bizum", ignoreCase = true) ||
                combinedContent.contains("recibo", ignoreCase = true) ||
                combinedContent.contains("transferencia", ignoreCase = true) ||
                combinedContent.contains("ingreso", ignoreCase = true) ||
                combinedContent.contains("abono", ignoreCase = true) ||
                combinedContent.contains("disposición", ignoreCase = true) ||
                combinedContent.contains("retirada", ignoreCase = true) ||
                combinedContent.contains("laekumine", ignoreCase = true) ||
                combinedContent.contains("makse", ignoreCase = true) ||
                combinedContent.contains("kaarditehing", ignoreCase = true) ||
                combinedContent.contains("ost", ignoreCase = true)

        val hasTransactionPatterns = combinedContent.contains("paid at", ignoreCase = true) ||
                combinedContent.contains("paid to", ignoreCase = true) ||
                combinedContent.contains("received from", ignoreCase = true)

        val isFinancialNotification = isKnownBankOrWallet ||
                (hasCurrency && hasTransactionKeyword) ||
                hasTransactionPatterns ||
                combinedContent.contains("swedbank", ignoreCase = true)

        if (!isFinancialNotification) {
            return
        }

        val comercio = KontoNotificationManager.extraerComercio(combinedContent)

        // 4. Mecanismo anti-duplicados estricto por compra (ventana de 10s para mismo banco, monto y comercio)
        val purchaseKey = "$packageName|${"%.2f".format(java.util.Locale.US, monto)}|${comercio.uppercase()}"
        val currentTime = System.currentTimeMillis()
        if (purchaseKey == lastPurchaseKey && (currentTime - lastPurchaseTime) < DEDUPLICATE_WINDOW_MS) {
            Log.d(TAG, "Notificación duplicada ignorada (misma compra en 10s): $purchaseKey")
            return
        }
        lastPurchaseKey = purchaseKey
        lastPurchaseTime = currentTime

        Log.i(TAG, "Notificación bancaria procesada: [$packageName] $comercio -> $monto €")

        val (categoriaId, nombreCategoria) = KontoNotificationManager.resolverCategoria(this, combinedContent, comercio)
        val txId = "tx-noti-${System.currentTimeMillis()}-${(100..999).random()}"

        // 5. Emitir EXACTAMENTE UNA notificación nativa interactiva de Konto en la barra de Android
        KontoNotificationManager.mostrarNotificacionGasto(
            context = this,
            txId = txId,
            monto = monto,
            comercio = comercio,
            categoriaId = categoriaId,
            nombreCategoria = nombreCategoria
        )

        // 6. SIEMPRE guardar en SharedPreferences para garantizar que la app nunca la pierda
        guardarEnColaPendientes(
            title = title,
            text = text,
            packageName = packageName,
            txId = txId,
            monto = monto,
            comercio = comercio,
            categoriaId = categoriaId,
            nombreCategoria = nombreCategoria
        )

        // 7. Si MainActivity está visible en primer plano y React listo, notificar también en tiempo real
        val activity = MainActivity.activeInstance
        if (activity != null && !activity.isFinishing && !activity.isDestroyed && activity.isActivityResumed && activity.isReactReady) {
            activity.dispatchTransactionDetails(
                title = title,
                text = text,
                packageName = packageName,
                txId = txId,
                monto = monto,
                comercio = comercio,
                categoriaId = categoriaId,
                nombreCategoria = nombreCategoria,
                confirmado = false
            )
        }
    }

    private fun guardarEnColaPendientes(
        title: String,
        text: String,
        packageName: String,
        txId: String,
        monto: Double,
        comercio: String,
        categoriaId: String,
        nombreCategoria: String
    ) {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(jsonString)

            val item = JSONObject().apply {
                put("title", title)
                put("text", text)
                put("packageName", packageName)
                put("txId", txId)
                put("monto", monto)
                put("comercio", comercio)
                put("categoriaId", categoriaId)
                put("nombreCategoria", nombreCategoria)
                put("confirmado", false)
                put("timestamp", System.currentTimeMillis())
            }

            array.put(item)
            prefs.edit().putString(KEY_PENDING, array.toString()).apply()
            Log.d(TAG, "Notificación guardada en cola offline: $txId ($monto € en $comercio)")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando notificación en SharedPreferences", e)
        }
    }
}
