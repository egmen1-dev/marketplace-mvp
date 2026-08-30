package ru.lot.marketplace.alpha.test

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.KeyEvent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import org.junit.Assert.fail

private fun qaError(message: String): Nothing = throw AssertionError(message)

object FirebaseQaLogger {
    private const val TAG = "FirebaseQa"

    fun stepStart(name: String, runId: String? = null) {
        Log.i(TAG, "FIREBASE_QA_STEP_START=$name runId=${runId ?: FirebaseQaConfig.runId}")
    }

    fun stepPass(name: String, detail: String? = null) {
        Log.i(TAG, "FIREBASE_QA_STEP_PASS=$name${detail?.let { " detail=$it" } ?: ""}")
    }

    fun stepFail(name: String, reason: String) {
        Log.e(TAG, "FIREBASE_QA_STEP_FAIL=$name reason=$reason")
    }

    fun info(marker: String, detail: String) {
        Log.i(TAG, "$marker=$detail")
    }
}

object FirebaseQaConfig {
    private val args = InstrumentationRegistry.getArguments()

    val runId: String
        get() = args.getString("RUN_ID") ?: "firebase-qa-${System.currentTimeMillis()}-phone"

    val sellerEmail: String
        get() = args.getString("sellerEmail") ?: "seller@demo.lot"

    val sellerPassword: String
        get() = args.getString("sellerPassword") ?: "demo1234"

    val buyerEmail: String
        get() = args.getString("buyerEmail") ?: "buyer@demo.lot"

    val buyerPassword: String
        get() = args.getString("buyerPassword") ?: "demo1234"

    val apiBaseUrl: String
        get() = args.getString("apiBaseUrl") ?: "https://web-production-e56fb.up.railway.app"

    val appPackage: String
        get() = InstrumentationRegistry.getInstrumentation().targetContext.packageName
}

object FirebaseQaSupport {
    private const val BOOT_WAIT_MS = 60_000L
    private const val TAB_WAIT_MS = 30_000L
    private val TAB_MARKERS = listOf("tab-home", "tab-sell", "tab-profile", "tab-catalog", "tab-orders")

    val device: UiDevice
        get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())

    fun launchApp(clearTask: Boolean = true) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: qaError("Launch intent missing for ${context.packageName}")
        if (clearTask) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
        } else {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(context.packageName)), 20_000)
    }

    fun relaunchApp() {
        device.pressHome()
        Thread.sleep(500)
        launchApp(clearTask = true)
    }

    fun openDeepLink(path: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val normalized = if (path.startsWith("/")) path.drop(1) else path
        val uri = Uri.parse("lot://$normalized")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage(context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        device.wait(Until.hasObject(By.pkg(context.packageName)), 15_000)
    }

    private fun findByDesc(testId: String): UiObject? {
        val byDesc = device.findObject(UiSelector().description(testId))
        if (byDesc.exists()) return byDesc
        val byRes = device.findObject(UiSelector().resourceId("${FirebaseQaConfig.appPackage}:id/$testId"))
        return if (byRes.exists()) byRes else null
    }

    fun waitForTestId(testId: String, timeoutMs: Long = 20_000): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (findByDesc(testId) != null) return true
            device.waitForIdle(250)
        }
        return false
    }

    fun requireTestId(testId: String, timeoutMs: Long = 20_000, step: String = testId) {
        if (!waitForTestId(testId, timeoutMs)) {
            FirebaseQaLogger.stepFail(step, "Missing testID/accessibility: $testId")
            fail("Timed out waiting for $testId (${timeoutMs}ms)")
        }
    }

    fun tapTestId(testId: String, timeoutMs: Long = 20_000) {
        requireTestId(testId, timeoutMs)
        val obj = findByDesc(testId) ?: qaError("Object vanished: $testId")
        obj.click()
    }

    fun tapText(text: String, timeoutMs: Long = 15_000) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val obj = device.findObject(UiSelector().text(text))
            if (obj.exists()) {
                obj.click()
                return
            }
            device.waitForIdle(250)
        }
        fail("Timed out waiting for text: $text")
    }

    fun typeIntoTestId(testId: String, value: String) {
        pasteIntoTestId(testId, value)
    }

    private fun pasteIntoTestId(testId: String, value: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("firebase-qa", value))
        val field = findByDesc(testId) ?: qaError("Input missing: $testId")
        field.click()
        device.waitForIdle(300)
        field.clearTextField()
        device.waitForIdle(150)
        device.pressKeyCode(KeyEvent.KEYCODE_PASTE)
        device.waitForIdle(300)
    }

    fun waitForText(text: String, timeoutMs: Long = 20_000) {
        val ok = device.wait(Until.hasObject(By.text(text)), timeoutMs)
        if (!ok) fail("Timed out waiting for text: $text")
    }

    fun countCardsWithTitle(title: String): Int {
        return device.findObjects(By.text(title)).size
    }

    private fun visibleTextSample(limit: Int = 12): String {
        val texts = mutableListOf<String>()
        val nodes = device.findObjects(By.clickable(true))
        for (node in nodes) {
            val text = node.text?.trim().orEmpty()
            if (text.isNotEmpty()) texts.add(text)
            if (texts.size >= limit) break
        }
        if (texts.isEmpty()) {
            val labels = TAB_MARKERS.filter { waitForTestId(it, 100) }
            if (labels.isNotEmpty()) return "tabMarkers=${labels.joinToString(",")}"
        }
        return texts.joinToString(" | ")
    }

    private fun visibleRouteHint(): String {
        return when {
            waitForTestId("login-email", 200) -> "route=login"
            waitForTestId("tab-home", 200) -> "route=main-tabs(home)"
            waitForTestId("tab-sell", 200) -> "route=main-tabs(sell)"
            waitForTestId("tab-profile", 200) -> "route=main-tabs(profile)"
            waitForTestId("lot-photo-inject-smartphone", 200) -> "route=sell/create"
            device.findObject(UiSelector().textContains("Доступно обновление")).exists() -> "route=update-gate"
            device.findObject(UiSelector().textContains("больше не поддерживается")).exists() -> "route=unsupported-client"
            device.findObject(UiSelector().text("Повторить")).exists() -> "route=boot-error"
            else -> "route=unknown"
        }
    }

    private fun waitForBootSurface(timeoutMs: Long = BOOT_WAIT_MS): String {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            dismissBootRetryIfPresent()
            dismissOptionalUpdateIfPresent()
            when (visibleRouteHint()) {
                "route=login" -> return "login"
                "route=main-tabs(home)",
                "route=main-tabs(sell)",
                "route=main-tabs(profile)",
                "route=main-tabs(catalog)",
                -> return "tabs"
                "route=unsupported-client" -> qaError("UNSUPPORTED_CLIENT screen blocks login")
            }
            device.waitForIdle(400)
        }
        return "timeout"
    }

    private fun dismissBootRetryIfPresent() {
        val retry = device.findObject(UiSelector().text("Повторить"))
        if (retry.exists()) retry.click()
    }

    fun dismissOptionalUpdateIfPresent() {
        val later = device.findObject(UiSelector().text("Позже"))
        if (later.exists()) {
            later.click()
            device.waitForIdle(500)
            FirebaseQaLogger.info("FIREBASE_QA_UPDATE_GATE", "dismissed_optional_update")
        }
    }

    private fun waitForMainTabs(timeoutMs: Long = TAB_WAIT_MS): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            dismissOptionalUpdateIfPresent()
            for (marker in TAB_MARKERS) {
                if (waitForTestId(marker, 250)) return true
            }
            device.waitForIdle(300)
        }
        return false
    }

    fun loginSeller() {
        FirebaseQaLogger.stepStart("FIREBASE_QA_LOGIN_START", FirebaseQaConfig.runId)
        FirebaseQaLogger.info("FIREBASE_QA_LOGIN_CONFIG", "email=${FirebaseQaConfig.sellerEmail} api=${FirebaseQaConfig.apiBaseUrl}")

        launchApp()
        val bootSurface = waitForBootSurface()
        FirebaseQaLogger.info("FIREBASE_QA_BOOT_SURFACE", bootSurface)
        FirebaseQaLogger.info("FIREBASE_QA_ROUTE_BEFORE_AUTH", visibleRouteHint())

        if (bootSurface == "tabs" || waitForMainTabs(2_000)) {
            FirebaseQaLogger.stepPass("FIREBASE_QA_LOGIN", "already_authenticated route=${visibleRouteHint()}")
            return
        }

        if (bootSurface != "login") {
            val reason = "boot_surface=$bootSurface route=${visibleRouteHint()} visible=${visibleTextSample()}"
            FirebaseQaLogger.stepFail("FIREBASE_QA_LOGIN_FAIL", reason)
            fail("Seller login blocked before credentials: $reason")
        }

        requireTestId("login-email", 5_000, "LOGIN_FORM")
        FirebaseQaLogger.info("FIREBASE_QA_LOGIN_SUBMIT", "credentials_submitted")
        pasteIntoTestId("login-email", FirebaseQaConfig.sellerEmail)
        pasteIntoTestId("login-password", FirebaseQaConfig.sellerPassword)
        tapTestId("login-submit")

        val loginDeadline = System.currentTimeMillis() + TAB_WAIT_MS
        var loginOutcome = "pending"
        while (System.currentTimeMillis() < loginDeadline) {
            dismissOptionalUpdateIfPresent()
            if (waitForTestId("login-error", 200)) {
                loginOutcome = "visible_error"
                break
            }
            if (waitForMainTabs(500)) {
                loginOutcome = "main_tabs"
                break
            }
            if (!waitForTestId("login-submit", 200) && !waitForTestId("login-email", 200)) {
                if (waitForMainTabs(1_000)) {
                    loginOutcome = "main_tabs"
                    break
                }
            }
            device.waitForIdle(400)
        }

        FirebaseQaLogger.info("FIREBASE_QA_LOGIN_OUTCOME", loginOutcome)
        FirebaseQaLogger.info("FIREBASE_QA_ROUTE_AFTER_AUTH", visibleRouteHint())
        FirebaseQaLogger.info("FIREBASE_QA_VISIBLE_AFTER_AUTH", visibleTextSample())

        if (loginOutcome == "visible_error") {
            val errorText = device.findObject(UiSelector().description("login-error")).text
                ?: device.findObject(UiSelector().resourceId("${FirebaseQaConfig.appPackage}:id/login-error")).text
                ?: "unknown_login_error"
            val reason = "PRODUCT_AUTH_FAILURE error=$errorText route=${visibleRouteHint()}"
            FirebaseQaLogger.stepFail("FIREBASE_QA_LOGIN_FAIL", reason)
            fail(reason)
        }

        if (!waitForMainTabs(1_000)) {
            val reason =
                "POST_LOGIN_NAV_FAILURE outcome=$loginOutcome route=${visibleRouteHint()} visible=${visibleTextSample()} assertion=tab-home|tab-sell|tab-profile"
            FirebaseQaLogger.stepFail("FIREBASE_QA_LOGIN_FAIL", reason)
            fail("Seller login did not reach main tabs: $reason")
        }

        FirebaseQaLogger.stepPass("FIREBASE_QA_LOGIN", "route=${visibleRouteHint()}")
    }

    fun dismissBootIfNeeded() {
        device.waitForIdle(1_000)
        dismissBootRetryIfPresent()
    }

    fun navigateToCreateLot() {
        FirebaseQaLogger.stepStart("NAV_CREATE_LOT")
        tapTestId("tab-sell")
        tapText("Создать ЛОТ")
        requireTestId("lot-photo-inject-smartphone", 20_000, "NAV_CREATE_LOT")
        FirebaseQaLogger.stepPass("NAV_CREATE_LOT")
    }

    fun injectSmartphoneFixture() {
        tapTestId("lot-photo-inject-smartphone")
    }

    fun waitPhotoReady(timeoutMs: Long = 90_000) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val continueBtn = findByDesc("lot-photo-continue")
            if (continueBtn != null && continueBtn.isEnabled) {
                val uploading = device.findObject(UiSelector().textContains("Загружаем фото"))
                val processing = device.findObject(UiSelector().textContains("Обрабатываем"))
                if (!uploading.exists() && !processing.exists()) return
            }
            device.waitForIdle(500)
        }
        fail("Photo step did not reach READY within ${timeoutMs}ms")
    }

    fun tapPhotoContinueOnce() {
        FirebaseQaLogger.stepStart("PHOTO_CONTINUE_ONE_TAP")
        val btn = findByDesc("lot-photo-continue") ?: qaError("Continue button missing")
        if (!btn.isEnabled) fail("Continue blocked when tap attempted")
        btn.click()
        requireTestId("lot-title", 15_000, "PHOTO_CONTINUE_ONE_TAP")
        FirebaseQaLogger.stepPass("PHOTO_CONTINUE_ONE_TAP", "PHOTO_CONTINUE_ONE_TAP=PASS NO_DOUBLE_TAP_REQUIRED=PASS")
    }

    fun openMyLotsPending() {
        tapTestId("tab-profile")
        tapText("Мои ЛОТы")
        tapTestId("seller-lots-tab-pending")
    }

    fun waitForAnyText(parts: List<String>, timeoutMs: Long) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            for (part in parts) {
                if (device.findObject(UiSelector().textContains(part)).exists()) return
            }
            device.waitForIdle(300)
        }
        fail("Timed out waiting for any of: $parts")
    }
}
