package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebaseSubmitOutcomeTest {
    @Test
    fun submitNeverBlackHoles() {
        FirebaseQaLogger.stepStart("SUBMIT_OUTCOME", FirebaseQaConfig.runId)
        val title = "${FirebaseQaConfig.runId} submit-outcome"
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.navigateToCreateLot()
        FirebaseQaSupport.injectSmartphoneFixture()
        FirebaseQaSupport.waitPhotoReady()
        FirebaseQaSupport.tapPhotoContinueOnce()

        FirebaseQaSupport.typeIntoTestId("lot-title", title)
        FirebaseQaSupport.tapText("Электроника")
        FirebaseQaSupport.device.waitForIdle(2_000)
        FirebaseQaSupport.tapText("Смартфоны")
        FirebaseQaSupport.device.waitForIdle(2_000)
        FirebaseQaSupport.tapText("Смартфоны")
        FirebaseQaSupport.typeIntoTestId("lot-price", "19900")
        FirebaseQaSupport.typeIntoTestId("lot-stock", "2")
        FirebaseQaSupport.typeIntoTestId("lot-city", "Санкт-Петербург")

        FirebaseQaSupport.tapTestId("lot-details-preview")
        FirebaseQaSupport.tapTestId("lot-preview-submit")

        val device = FirebaseQaSupport.device
        val deadline = System.currentTimeMillis() + 60_000
        var outcome: String? = null
        while (System.currentTimeMillis() < deadline) {
            if (device.findObject(By.text("Проверяем ЛОТ")) != null) {
                outcome = "SUCCESS_SCREEN"
                break
            }
            if (device.findObject(By.textContains("Не получилось")) != null ||
                device.findObject(By.textContains("заполните")) != null
            ) {
                outcome = "VISIBLE_ERROR"
                break
            }
            val stillPreview = device.findObject(By.desc("lot-preview-submit"))
            val spinnerOnly = stillPreview != null && device.findObject(By.text("Проверяем ЛОТ")) == null
            if (spinnerOnly && System.currentTimeMillis() > deadline - 5_000) {
                outcome = "BLACK_HOLE"
                break
            }
            device.waitForIdle(500)
        }

        if (outcome == null || outcome == "BLACK_HOLE") {
            FirebaseQaLogger.stepFail("SUBMIT_OUTCOME", "ACTION_STARTED without SUCCESS_SCREEN or VISIBLE_ERROR")
            throw AssertionError("SUBMIT_BLACK_HOLE detected")
        }
        FirebaseQaLogger.stepPass("SUBMIT_OUTCOME", "outcome=$outcome SUBMIT_BLACK_HOLE=NO")
    }
}
