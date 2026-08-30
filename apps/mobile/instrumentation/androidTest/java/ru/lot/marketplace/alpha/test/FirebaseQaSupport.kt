package ru.lot.marketplace.alpha.test

import android.content.Intent
import android.net.Uri
import android.util.Log
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
        requireTestId(testId)
        val field = findByDesc(testId) ?: qaError("Input missing: $testId")
        field.click()
        field.clearTextField()
        field.setText(value)
    }

    fun waitForText(text: String, timeoutMs: Long = 20_000) {
        val ok = device.wait(Until.hasObject(By.text(text)), timeoutMs)
        if (!ok) fail("Timed out waiting for text: $text")
    }

    fun countCardsWithTitle(title: String): Int {
        return device.findObjects(By.text(title)).size
    }

    fun loginSeller() {
        FirebaseQaLogger.stepStart("SELLER_LOGIN", FirebaseQaConfig.runId)
        launchApp()
        dismissBootIfNeeded()
        if (waitForTestId("login-email", 5_000)) {
            typeIntoTestId("login-email", FirebaseQaConfig.sellerEmail)
            typeIntoTestId("login-password", FirebaseQaConfig.sellerPassword)
            tapTestId("login-submit")
            device.wait(Until.gone(By.desc("login-submit")), 30_000)
        }
        val onTabs = device.wait(Until.hasObject(By.text("Продать")), 30_000)
        if (!onTabs) fail("Seller login did not reach main tabs")
        FirebaseQaLogger.stepPass("SELLER_LOGIN")
    }

    fun dismissBootIfNeeded() {
        device.waitForIdle(1_000)
        val retry = device.findObject(UiSelector().text("Повторить"))
        if (retry.exists()) retry.click()
    }

    fun navigateToCreateLot() {
        FirebaseQaLogger.stepStart("NAV_CREATE_LOT")
        tapText("Продать")
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
        tapText("Профиль")
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
