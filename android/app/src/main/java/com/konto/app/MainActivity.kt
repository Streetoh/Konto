package com.konto.app

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import java.io.File
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var isPageLoaded = false
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var pendingModifyTxId: String? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val intent = result.data
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, intent)
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    companion object {
        private const val TAG = "KontoMainActivity"
        private const val PREFS_NAME = "konto_prefs"
        private const val KEY_PENDING = "pending_notifications"

        @Volatile
        var activeInstance: MainActivity? = null
    }

    // Interfaz Javascript expuesta como window.AndroidBridge
    inner class AndroidBridge {
        @JavascriptInterface
        fun openNotificationSettings() {
            try {
                val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error abriendo ajustes de oyente de notificaciones", e)
            }
        }

        @JavascriptInterface
        fun isNotificationAccessGranted(): Boolean {
            return isNotificationPermissionGranted()
        }

        @JavascriptInterface
        fun isNotificationPermissionGranted(): Boolean {
            return this@MainActivity.checkNotificationPermission()
        }

        @JavascriptInterface
        fun recognizeTextFromBase64(base64Data: String) {
            recognizeScreenshotBase64(base64Data)
        }

        @JavascriptInterface
        fun shareBackup(jsonContent: String, fileName: String) {
            runOnUiThread {
                try {
                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, jsonContent)
                        putExtra(Intent.EXTRA_SUBJECT, fileName)
                        type = "text/plain"
                    }
                    val shareIntent = Intent.createChooser(sendIntent, "Guardar o compartir copia de seguridad")
                    shareIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    startActivity(shareIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Error compartiendo backup", e)
                }
            }
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            runOnUiThread {
                try {
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("Konto Backup", text)
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(this@MainActivity, "Copia de seguridad copiada al portapapeles", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error copiando al portapapeles", e)
                }
            }
        }

        @JavascriptInterface
        fun downloadJsonFile(fileName: String, jsonContent: String) {
            runOnUiThread {
                try {
                    val resolver = contentResolver
                    var guardadoExitoso = false

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val contentValues = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                            put(MediaStore.MediaColumns.MIME_TYPE, "application/json")
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                            put(MediaStore.MediaColumns.IS_PENDING, 1)
                        }

                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                        if (uri != null) {
                            resolver.openOutputStream(uri)?.use { outputStream ->
                                outputStream.write(jsonContent.toByteArray(Charsets.UTF_8))
                            }
                            contentValues.clear()
                            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                            resolver.update(uri, contentValues, null, null)
                            guardadoExitoso = true
                        }
                    }

                    if (!guardadoExitoso) {
                        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        if (!downloadsDir.exists()) {
                            downloadsDir.mkdirs()
                        }
                        val file = File(downloadsDir, fileName)
                        file.writeText(jsonContent, Charsets.UTF_8)
                        android.media.MediaScannerConnection.scanFile(
                            this@MainActivity,
                            arrayOf(file.absolutePath),
                            arrayOf("application/json"),
                            null
                        )
                    }

                    Toast.makeText(this@MainActivity, "Archivo descargado en Descargas:\n$fileName", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error descargando archivo JSON", e)
                    try {
                        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        val file = File(downloadsDir, fileName)
                        file.writeText(jsonContent, Charsets.UTF_8)
                        Toast.makeText(this@MainActivity, "Archivo guardado en Descargas:\n$fileName", Toast.LENGTH_LONG).show()
                    } catch (e2: Exception) {
                        Log.e(TAG, "Error en fallback de descarga", e2)
                        Toast.makeText(this@MainActivity, "Error al descargar: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        @JavascriptInterface
        fun requestIgnoreBatteryOptimizations() {
            runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        val powerManager = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                        if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                            val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            startActivity(intent)
                        } else {
                            Toast.makeText(this@MainActivity, "El ahorro de batería ya está desactivado para Konto", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error solicitando ignorar optimizaciones de batería, intentando fallback", e)
                    try {
                        val fallbackIntent = Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(fallbackIntent)
                    } catch (e2: Exception) {
                        Log.e(TAG, "Error en fallback de optimizaciones", e2)
                    }
                }
            }
        }

        @JavascriptInterface
        fun openAppInfoSettings() {
            runOnUiThread {
                try {
                    val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Error abriendo información de la aplicación", e)
                }
            }
        }

        @JavascriptInterface
        fun rebindNotificationListener() {
            BankNotificationListener.requestRebindIfPossible(this@MainActivity)
        }

        @JavascriptInterface
        fun syncCategoriesAndDictionary(categoriesJson: String, dictionaryJson: String) {
            try {
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("cached_categories", categoriesJson)
                    .putString("cached_dictionary", dictionaryJson)
                    .apply()
                Log.d(TAG, "Categorías y diccionario sincronizados en SharedPreferences")
            } catch (e: Exception) {
                Log.e(TAG, "Error sincronizando categorías", e)
            }
        }

        @JavascriptInterface
        fun vibrate(durationMs: Long) {
            try {
                val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? android.os.VibratorManager
                    vibratorManager?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                }
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(android.os.VibrationEffect.createOneShot(durationMs, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(durationMs)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al emitir vibración", e)
            }
        }
    }

    fun checkNotificationPermission(): Boolean {
        return try {
            val listeners = NotificationManagerCompat.getEnabledListenerPackages(this)
            listeners.contains(packageName)
        } catch (e: Exception) {
            Log.e(TAG, "Error comprobando si el permiso de notificaciones está activo", e)
            false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeInstance = this

        // Configuración de colores oscuros para las barras del sistema
        window.decorView.setBackgroundColor(Color.parseColor("#09090b"))
        window.statusBarColor = Color.parseColor("#09090b")
        window.navigationBarColor = Color.parseColor("#09090b")

        // Configurar el cargador de assets con esquema seguro https://appassets.androidplatform.net
        // Esto permite que ES Modules (<script type="module">), CSS y Web APIs funcionen 100% sin restricciones de CORS
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        // Contenedor raíz FrameLayout para gestionar de forma limpia los márgenes de la barra de estado y navegación
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#09090b"))
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#09090b"))
        }

        rootLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(rootLayout)

        // Resuelve el solapamiento: ajusta el padding para que ni el header ni la barra inferior queden tapados
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        configurarWebView()
        configurarBotonAtras()

        // Solicitar permiso explícito de notificaciones en Android 13+ (API 33+) para que no salga gris
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                androidx.core.app.ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }

        // Cargar la aplicación SPA a través del dominio virtual seguro de assets
        val intentData = intent?.dataString
        val actionExtra = intent?.getStringExtra("action")
        val txIdExtra = intent?.getStringExtra("tx_id")

        if (actionExtra == "modify_category" && !txIdExtra.isNullOrEmpty()) {
            pendingModifyTxId = txIdExtra
        }

        val initialUrl = if (intentData?.contains("action=new_expense") == true || actionExtra == "new_expense") {
            "https://appassets.androidplatform.net/assets/dist/index.html?action=new_expense"
        } else {
            "https://appassets.androidplatform.net/assets/dist/index.html"
        }
        webView.loadUrl(initialUrl)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val intentData = intent.dataString
        val actionExtra = intent.getStringExtra("action")
        val txIdExtra = intent.getStringExtra("tx_id")

        if (actionExtra == "modify_category" && !txIdExtra.isNullOrEmpty()) {
            runOnUiThread {
                val safeTxId = escapeJsString(txIdExtra)
                webView.evaluateJavascript(
                    "if (typeof window !== 'undefined' && typeof window.onKontoOpenModifyCategory === 'function') { window.onKontoOpenModifyCategory('$safeTxId'); }",
                    null
                )
            }
            return
        }

        if (intentData?.contains("action=new_expense") == true || actionExtra == "new_expense") {
            runOnUiThread {
                val jsCode = """
                    (function() {
                        if (typeof window !== 'undefined') {
                            if (typeof window.onKontoShortcutTriggered === 'function') {
                                window.onKontoShortcutTriggered('new_expense');
                            } else {
                                window.location.search = '?action=new_expense';
                            }
                        }
                    })();
                """.trimIndent()
                webView.evaluateJavascript(jsCode, null)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        webView.setBackgroundColor(Color.parseColor("#09090b"))

        // WebChromeClient para redirigir console.log/error de JavaScript al Logcat y soportar selector de archivos
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    val msg = "[JS ${consoleMessage.messageLevel()}] ${consoleMessage.message()} (${consoleMessage.sourceId()}:${consoleMessage.lineNumber()})"
                    when (consoleMessage.messageLevel()) {
                        ConsoleMessage.MessageLevel.ERROR -> Log.e(TAG, msg)
                        ConsoleMessage.MessageLevel.WARNING -> Log.w(TAG, msg)
                        else -> Log.d(TAG, msg)
                    }
                }
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                try {
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    fileChooserLauncher.launch(intent)
                    return true
                } catch (e: Exception) {
                    Log.e(TAG, "Error lanzando selector de archivos", e)
                    fileUploadCallback = null
                    return false
                }
            }
        }

        // Vincular el puente nativo Android -> JS
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d(TAG, "Página cargada en WebView: $url")
                isPageLoaded = true
                drenarNotificacionesPendientes()
                notificarEstadoPermisoAReact()

                if (pendingModifyTxId != null) {
                    val safeTxId = escapeJsString(pendingModifyTxId!!)
                    webView.evaluateJavascript(
                        "if (typeof window !== 'undefined' && typeof window.onKontoOpenModifyCategory === 'function') { window.onKontoOpenModifyCategory('$safeTxId'); }",
                        null
                    )
                    pendingModifyTxId = null
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false // Permitir navegación interna en la SPA
            }
        }
    }

    private fun configurarBotonAtras() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        activeInstance = this
        BankNotificationListener.requestRebindIfPossible(this)
        if (isPageLoaded) {
            drenarNotificacionesPendientes()
            notificarEstadoPermisoAReact()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (activeInstance === this) {
            activeInstance = null
        }
    }

    private fun notificarEstadoPermisoAReact() {
        val granted = checkNotificationPermission()
        runOnUiThread {
            webView.evaluateJavascript(
                "if (typeof window.onPermissionStatusChecked === 'function') { window.onPermissionStatusChecked($granted); }",
                null
            )
        }
    }

    /**
     * Inyecta la transacción enriquecida directamente en React ejecutando window.onKontoExpenseDetected()
     */
    fun dispatchTransactionDetails(
        title: String,
        text: String,
        packageName: String,
        txId: String,
        monto: Double,
        comercio: String,
        categoriaId: String,
        nombreCategoria: String
    ) {
        runOnUiThread {
            if (!isPageLoaded) {
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
                    put("timestamp", System.currentTimeMillis())
                }
                array.put(item)
                prefs.edit().putString(KEY_PENDING, array.toString()).apply()
                return@runOnUiThread
            }

            val safeTitle = escapeJsString(title)
            val safeText = escapeJsString(text)
            val safePkg = escapeJsString(packageName)
            val safeTxId = escapeJsString(txId)
            val safeComercio = escapeJsString(comercio)
            val safeCatId = escapeJsString(categoriaId)
            val safeCatNombre = escapeJsString(nombreCategoria)

            val jsCode = """
                (function() {
                    if (typeof window.onKontoExpenseDetected === 'function') {
                        window.onKontoExpenseDetected({
                            id: '$safeTxId',
                            importe: $monto,
                            comercio: '$safeComercio',
                            categoriaId: '$safeCatId',
                            categoriaNombre: '$safeCatNombre',
                            rawText: '$safeTitle. $safeText',
                            packageName: '$safePkg'
                        });
                    } else if (typeof window.onBankNotificationReceived === 'function') {
                        window.onBankNotificationReceived('$safeTitle', '$safeText', '$safePkg');
                    }
                })();
            """.trimIndent()

            webView.evaluateJavascript(jsCode) { result ->
                Log.d(TAG, "Resultado JS al evaluar transacción detectada: $result")
            }
        }
    }

    /**
     * Confirma una transacción en tiempo real en React cuando se pulsa Aceptar en la barra de Android
     */
    fun confirmTransactionFromNotification(txId: String) {
        runOnUiThread {
            val safeTxId = escapeJsString(txId)
            val jsCode = """
                if (typeof window !== 'undefined' && typeof window.onKontoNotificationConfirmed === 'function') {
                    window.onKontoNotificationConfirmed('$safeTxId');
                }
            """.trimIndent()
            webView.evaluateJavascript(jsCode, null)
        }
    }

    /**
     * Inyecta la notificación en la aplicación React ejecutando window.onBankNotificationReceived()
     */
    fun dispatchNotification(title: String, text: String, packageName: String) {
        runOnUiThread {
            if (!isPageLoaded) {
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
                return@runOnUiThread
            }

            val safeTitle = escapeJsString(title)
            val safeText = escapeJsString(text)
            val safePkg = escapeJsString(packageName)

            val jsCode = """
                (function() {
                    if (typeof window.onBankNotificationReceived === 'function') {
                        window.onBankNotificationReceived('$safeTitle', '$safeText', '$safePkg');
                    } else {
                        console.warn('window.onBankNotificationReceived no está disponible aún en window');
                    }
                })();
            """.trimIndent()

            webView.evaluateJavascript(jsCode) { result ->
                Log.d(TAG, "Resultado JS al evaluar notificación: $result")
            }
        }
    }

    /**
     * Recupera y procesa cualquier notificación acumulada mientras la app estuvo en background o cerrada.
     */
    private fun drenarNotificacionesPendientes() {
        try {
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // 1. Drenar confirmaciones pendientes
            val confirmedJson = prefs.getString("confirmed_tx_ids", "[]") ?: "[]"
            val confirmedArray = JSONArray(confirmedJson)
            if (confirmedArray.length() > 0) {
                val list = mutableListOf<String>()
                for (i in 0 until confirmedArray.length()) {
                    list.add("'" + escapeJsString(confirmedArray.getString(i)) + "'")
                }
                val jsConfirmed = """
                    if (typeof window !== 'undefined' && typeof window.onKontoBatchConfirmTransactions === 'function') {
                        window.onKontoBatchConfirmTransactions([${list.joinToString(",")}]);
                    }
                """.trimIndent()
                webView.evaluateJavascript(jsConfirmed, null)
                prefs.edit().putString("confirmed_tx_ids", "[]").apply()
            }

            // 2. Drenar notificaciones pendientes
            val jsonString = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(jsonString)

            if (array.length() == 0) return

            Log.i(TAG, "Drenando ${array.length()} notificaciones pendientes acumuladas en segundo plano...")

            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                val title = item.optString("title", "")
                val text = item.optString("text", "")
                val pkg = item.optString("packageName", "")
                val txId = item.optString("txId", "")
                val monto = item.optDouble("monto", 0.0)
                val comercio = item.optString("comercio", "")
                val catId = item.optString("categoriaId", "")
                val catNombre = item.optString("nombreCategoria", "")

                if (txId.isNotEmpty() && monto > 0) {
                    dispatchTransactionDetails(title, text, pkg, txId, monto, comercio, catId, catNombre)
                } else {
                    dispatchNotification(title, text, pkg)
                }
            }

            // Limpiar la cola tras procesarla
            prefs.edit().putString(KEY_PENDING, "[]").apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error drenando notificaciones pendientes", e)
        }
    }

    private fun escapeJsString(input: String): String {
        return input
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
    }

    /**
     * Procesa una captura de pantalla codificada en Base64 utilizando Google ML Kit Text Recognition.
     * Retorna bloques, líneas de texto y coordenadas espaciales para mapear el listado bancario.
     */
    private fun recognizeScreenshotBase64(base64Data: String) {
        try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            if (bitmap == null) {
                runOnUiThread {
                    webView.evaluateJavascript("window.onOcrError && window.onOcrError('No se pudo decodificar la imagen')", null)
                }
                return
            }

            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            val inputImage = InputImage.fromBitmap(bitmap, 0)

            recognizer.process(inputImage)
                .addOnSuccessListener { visionText ->
                    val linesArray = JSONArray()
                    for (block in visionText.textBlocks) {
                        for (line in block.lines) {
                            val lineObj = JSONObject()
                            lineObj.put("text", line.text)
                            line.boundingBox?.let { box ->
                                lineObj.put("left", box.left)
                                lineObj.put("top", box.top)
                                lineObj.put("right", box.right)
                                lineObj.put("bottom", box.bottom)
                                lineObj.put("width", box.width())
                                lineObj.put("height", box.height())
                            }
                            linesArray.put(lineObj)
                        }
                    }
                    val jsonPayload = JSONObject().apply {
                        put("fullText", visionText.text)
                        put("lines", linesArray)
                        put("imageWidth", bitmap.width)
                        put("imageHeight", bitmap.height)
                    }
                    val escapedPayload = jsonPayload.toString()
                        .replace("\\", "\\\\")
                        .replace("'", "\\'")
                        .replace("\n", "\\n")
                        .replace("\r", "")
                    runOnUiThread {
                        webView.evaluateJavascript("window.onOcrResult && window.onOcrResult(JSON.parse('$escapedPayload'))", null)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Error reconociendo texto con ML Kit", e)
                    val errorMsg = e.message?.replace("'", "\\'") ?: "Error en OCR nativo"
                    runOnUiThread {
                        webView.evaluateJavascript("window.onOcrError && window.onOcrError('$errorMsg')", null)
                    }
                }
        } catch (e: Exception) {
            Log.e(TAG, "Error procesando imagen para OCR", e)
            val errorMsg = e.message?.replace("'", "\\'") ?: "Error desconocido"
            runOnUiThread {
                webView.evaluateJavascript("window.onOcrError && window.onOcrError('$errorMsg')", null)
            }
        }
    }
}
