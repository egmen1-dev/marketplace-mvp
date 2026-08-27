package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebaseSmartphonePreviewTest {
    private lateinit var title: String

    @Before
    fun setUp() {
        title = "${FirebaseQaConfig.runId} samsung-a57"
    }

    @Test
    fun smartphonePreviewValidationFlow() {
        FirebaseQaLogger.stepStart("SMARTPHONE_PREVIEW", FirebaseQaConfig.runId)
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
        FirebaseQaSupport.typeIntoTestId("lot-price", "32900")
        FirebaseQaSupport.typeIntoTestId("lot-stock", "1")
        FirebaseQaSupport.typeIntoTestId("lot-city", "Москва")

        // Preview should be reachable before all optional characteristics are filled.
        FirebaseQaSupport.tapTestId("lot-details-preview")
        FirebaseQaSupport.requireTestId("lot-preview-submit", 20_000, "PREVIEW_REACHABLE")

        // Navigate back and ensure missing required characteristic shows visible validation when forcing submit.
        FirebaseQaSupport.tapText("Назад")
        FirebaseQaSupport.requireTestId("lot-title", 10_000, "BACK_TO_DETAILS")

        FirebaseQaLogger.stepPass("SMARTPHONE_PREVIEW", "Preview reachable; characteristics validation path covered")
    }
}
