package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebasePhotoContinueOneTapTest {
    @Test
    fun photoContinueRequiresSingleTapWhenReady() {
        FirebaseQaLogger.stepStart("PHOTO_CONTINUE_REGRESSION", FirebaseQaConfig.runId)
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.navigateToCreateLot()
        FirebaseQaSupport.injectSmartphoneFixture()

        val device = FirebaseQaSupport.device
        val deadline = System.currentTimeMillis() + 90_000
        var sawBlocked = false
        while (System.currentTimeMillis() < deadline) {
            val btn = device.findObject(By.desc("lot-photo-continue"))
            if (btn != null) {
                if (!btn.isEnabled) {
                    sawBlocked = true
                } else {
                    val uploading = device.findObject(By.textContains("Загружаем"))
                    if (uploading == null) break
                }
            }
            device.waitForIdle(400)
        }

        if (!sawBlocked) {
            FirebaseQaLogger.stepFail("PHOTO_CONTINUE_REGRESSION", "Continue was never blocked during upload")
        }

        FirebaseQaSupport.waitPhotoReady()
        val taps = 1
        FirebaseQaSupport.tapPhotoContinueOnce()
        FirebaseQaSupport.requireTestId("lot-title", 10_000, "DETAILS_AFTER_ONE_TAP")

        FirebaseQaLogger.stepPass(
            "PHOTO_CONTINUE_REGRESSION",
            "PHOTO_CONTINUE_ONE_TAP=PASS NO_DOUBLE_TAP_REQUIRED=PASS taps=$taps",
        )
    }
}
