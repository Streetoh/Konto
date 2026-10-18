# Konto - Módulo Android Nativo con Escucha de Swedbank

Este directorio contiene el contenedor nativo de Android (`com.konto.app`) para compilar **Konto** en formato APK instalable en teléfonos Android.

---

## 🚀 Arquitectura del Módulo Nativo

1. **`BankNotificationListener : NotificationListenerService`**
   - Intercepta notificaciones del sistema de forma pasiva en segundo plano.
   - Filtra exclusivamente las notificaciones de Swedbank (`ee.swedbank.mobile` o que contengan patrones como `paid at`, `received from`, `Swedbank`, `EUR`).
   - Cuenta con una ventana anti-duplicados de 3 segundos.
   - Si la aplicación está abierta (`MainActivity.activeInstance != null`), inyecta la notificación en vivo en el WebView mediante:
     ```javascript
     window.onBankNotificationReceived(title, text, packageName)
     ```
   - Si la aplicación está cerrada o en segundo plano, encola las notificaciones en `SharedPreferences` ("pending_notifications") para procesarlas en cuanto el usuario abra la app.

2. **`MainActivity`**
   - Ejecuta un `WebView` de alto rendimiento optimizado con soporte de DOM Storage y aceleración por hardware.
   - Carga la compilación local empaquetada en `file:///android_asset/dist/index.html` (100% offline, ultrarrápida).
   - Expone el puente nativo `window.AndroidBridge.openNotificationSettings()` para que el usuario pueda activar el permiso de lectura de notificaciones con un solo toque desde la pestaña de **Ajustes** de la app.
   - Al iniciarse o volver al primer plano (`onResume`), drena y procesa cualquier notificación acumulada en segundo plano.

---

## 🛠️ Cómo compilar el APK

### Paso 1: Sincronizar la compilación web
En la raíz del proyecto ejecuta:
```bash
npm run build:android
```
Este comando compila la app React con Vite y copia los archivos a `android/app/src/main/assets/dist/`.

### Paso 2: Abrir en Android Studio
1. Abre **Android Studio**.
2. Selecciona **Open** y elige la carpeta `android/` de este proyecto.
3. Espera a que Gradle sincronice las dependencias.
4. Conecta tu teléfono Android por USB (con depuración USB activada) o selecciona un emulador.
5. Haz clic en **Run 'app'** (`Shift + F10`) o en **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 📱 Activar Permisos en el Teléfono

1. Abre **Konto** en el teléfono.
2. Ve a la pestaña **Ajustes** (icono de engranaje).
3. En la tarjeta **Conexión con Swedbank (Android)**, pulsa en:
   > **"Activar permiso de lectura de notificaciones"**
4. Se abrirá la pantalla del sistema Android: busca **Konto** en la lista y activa el interruptor.

---

## 🧪 Pruebas con ADB (Línea de comandos)

Puedes simular una notificación de Swedbank en el emulador o dispositivo real conectado con ADB:

```bash
adb shell cmd notification post -S bigtext -t "Notification from Swedbank." "Tag1" "14.80 EUR paid at \"LIDL JOHVI\""
```

O probar la entrada universal por parámetro URL:
```bash
# Si pruebas en navegador local:
http://localhost:5173/?notif=Notification%20from%20Swedbank.%2024.50%20EUR%20paid%20at%20%22SELVER%22
```
