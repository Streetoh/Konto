package com.konto.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject

object KontoNotificationManager {

    private const val TAG = "KontoNotificationMgr"
    const val CHANNEL_ID = "konto_bank_notifications"
    private const val CHANNEL_NAME = "Gastos Detectados de Konto"
    private const val CHANNEL_DESC = "Notificaciones interactivas para confirmar o cambiar categoría de gastos detectados"

    fun crearCanalNotificaciones(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                enableVibration(true)
                setShowBadge(true)
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.createNotificationChannel(channel)
        }
    }

    fun extraerMonto(texto: String): Double {
        // 1. Con símbolo de moneda: 12.50 EUR, 12,50 €, etc.
        val regexConMoneda = """(?:[+-])?\s*(?:EUR|€|\$)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:EUR|€|\$)""".toRegex(RegexOption.IGNORE_CASE)
        val match1 = regexConMoneda.find(texto)
        if (match1 != null && match1.groupValues.size > 1) {
            val normalizado = match1.groupValues[1].replace(',', '.')
            val valor = normalizado.toDoubleOrNull()
            if (valor != null && valor > 0) return valor
        }

        // 2. Número con 2 decimales
        val regexDosDecimales = """(?:[+-])?\s*(\d{1,6}[.,]\d{2})""".toRegex()
        val match2 = regexDosDecimales.find(texto)
        if (match2 != null && match2.groupValues.size > 1) {
            val normalizado = match2.groupValues[1].replace(',', '.')
            val valor = normalizado.toDoubleOrNull()
            if (valor != null && valor > 0) return valor
        }

        return 0.0
    }

    fun extraerComercio(texto: String): String {
        val conectores = listOf(
            """(?i)(?:paid at|makstud kohas)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:paid to|makse saajale|payment to)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:pago con tarjeta en|compra en)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:received from|saadud saatjalt)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:\bfrom\b)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:\ben\b)\s+([^,.\n]+)""".toRegex(),
            """(?i)(?:\bto\b)\s+([^,.\n]+)""".toRegex()
        )

        for (regex in conectores) {
            val match = regex.find(texto)
            if (match != null && match.groupValues.size > 1) {
                val candidate = match.groupValues[1].trim()
                val limpio = limpiarNombreComercio(candidate)
                if (limpio.isNotEmpty() && limpio.length > 1) {
                    return limpio
                }
            }
        }

        // Fallback: si no se encontró conector, limpiar palabras de bancos y moneda
        var fallback = texto
            .replace("""(?i)notification from swedbank[:.]?""".toRegex(), "")
            .replace("""(?i)swedbank[:.]?""".toRegex(), "")
            .replace("""(?i)pago con tarjeta de?""".toRegex(), "")
            .replace("""(?i)compra con tarjeta de?""".toRegex(), "")
            .replace("""(?i)kaarditehing[:.]?""".toRegex(), "")
            .replace("""(?i)uus kaardimakse[:.]?""".toRegex(), "")
            .replace("""(?i)card payment""".toRegex(), "")
            .replace("""(?i)payment of""".toRegex(), "")
            .replace("""(?i)\bEUR\b""".toRegex(), "")
            .replace("€", "")
            .replace("$", "")
            .replace("""\d+([.,]\d{1,2})?""".toRegex(), "") // quitar números
            .trim()

        val limpioFallback = limpiarNombreComercio(fallback)
        return if (limpioFallback.isNotEmpty()) limpioFallback else "Comercio"
    }

    private fun limpiarNombreComercio(nombre: String): String {
        return nombre
            .replace("""^["'«»“‘]+|["'«»”’]+$""".toRegex(), "")
            .replace("""^[\s,.:;_\-+/()]+|[\s,.:;_\-+/()]+$""".toRegex(), "")
            .replace("""\s+""".toRegex(), " ")
            .trim()
    }

    fun resolverCategoria(context: Context, textoCompleto: String, comercio: String): Pair<String, String> {
        val prefs = context.getSharedPreferences("konto_prefs", Context.MODE_PRIVATE)
        val categoriasJson = prefs.getString("cached_categories", "[]") ?: "[]"
        val diccionarioJson = prefs.getString("cached_dictionary", "{}") ?: "{}"

        var categoriaIdEncontrada: String? = null
        val textoUpper = "$comercio $textoCompleto".uppercase()

        // 1. Buscar en diccionario de reglas sincronizado
        try {
            val dictObj = JSONObject(diccionarioJson)
            val keys = dictObj.keys()
            var mejorLongitud = 0

            while (keys.hasNext()) {
                val k = keys.next()
                val kUpper = k.uppercase().trim()
                if (kUpper.isNotEmpty() && textoUpper.contains(kUpper)) {
                    if (kUpper.length > mejorLongitud) {
                        mejorLongitud = kUpper.length
                        val valObj = dictObj.get(k)
                        if (valObj is String) {
                            categoriaIdEncontrada = valObj
                        } else if (valObj is JSONObject) {
                            categoriaIdEncontrada = valObj.optString("categoriaId", null)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error consultando diccionario de categorías", e)
        }

        // 2. Mapear a nombre legible de categoría
        var nombreCategoria = "Gastos Variables"
        var catIdFinal = categoriaIdEncontrada ?: "cat-compras"

        try {
            val array = JSONArray(categoriasJson)
            var encontrada = false
            for (i in 0 until array.length()) {
                val c = array.getJSONObject(i)
                val cId = c.optString("id", "")
                if (cId == catIdFinal) {
                    nombreCategoria = c.optString("nombre", nombreCategoria)
                    encontrada = true
                    break
                }
            }
            if (!encontrada && array.length() > 0) {
                // Intentar buscar 'Supermercado' o la primera categoría disponible
                var indexDefault = 0
                for (i in 0 until array.length()) {
                    val c = array.getJSONObject(i)
                    val nombre = c.optString("nombre", "").lowercase()
                    if (nombre.contains("supermercado") || nombre.contains("compra")) {
                        indexDefault = i
                        break
                    }
                }
                val chosen = array.getJSONObject(indexDefault)
                catIdFinal = chosen.optString("id", catIdFinal)
                nombreCategoria = chosen.optString("nombre", nombreCategoria)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parseando cached_categories", e)
        }

        return Pair(catIdFinal, nombreCategoria)
    }

    fun mostrarNotificacionGasto(
        context: Context,
        txId: String,
        monto: Double,
        comercio: String,
        categoriaId: String,
        nombreCategoria: String
    ) {
        crearCanalNotificaciones(context)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val notifId = (System.currentTimeMillis() % 100000).toInt()

        val montoFormateado = if (monto % 1.0 == 0.0) {
            String.format(java.util.Locale.US, "%.0f €", monto)
        } else {
            String.format(java.util.Locale.US, "%.2f €", monto)
        }

        val titulo = "Konto • $montoFormateado en $comercio"
        val textoCorto = "Registrado en «$nombreCategoria»"
        val textoExpandido = "Cargo de $montoFormateado en $comercio registrado en la categoría «$nombreCategoria».\n\nPulsa «Aceptar» si es correcto o «Modificar» para cambiar de categoría."

        // Intent al tocar el cuerpo de la notificación
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            putExtra("action", "view_tx")
            putExtra("tx_id", txId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val tapPendingIntent = PendingIntent.getActivity(
            context,
            notifId * 10,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Acción 1: "✓ Aceptar" (Confirmar sin abrir la app)
        val acceptIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = "com.konto.app.ACTION_ACCEPT_TX"
            putExtra("tx_id", txId)
            putExtra("notif_id", notifId)
            putExtra("amount", montoFormateado)
            putExtra("category_name", nombreCategoria)
        }
        val acceptPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId * 10 + 1,
            acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Acción 2: "✎ Modificar" (Abre la app directamente en el modal de cambiar categoría)
        val modifyIntent = Intent(context, MainActivity::class.java).apply {
            action = "com.konto.app.ACTION_MODIFY_CATEGORY"
            putExtra("action", "modify_category")
            putExtra("tx_id", txId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val modifyPendingIntent = PendingIntent.getActivity(
            context,
            notifId * 10 + 2,
            modifyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_shortcut_add)
            .setColor(0xFF10B981.toInt()) // Emerald 500 Konto
            .setContentTitle(titulo)
            .setContentText(textoCorto)
            .setStyle(NotificationCompat.BigTextStyle().bigText(textoExpandido))
            .setContentIntent(tapPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(0, "✓ Aceptar", acceptPendingIntent)
            .addAction(0, "✎ Modificar", modifyPendingIntent)

        notificationManager.notify(notifId, builder.build())
        Log.i(TAG, "Notificación interactiva de Konto emitida con éxito: $titulo")
    }
}
