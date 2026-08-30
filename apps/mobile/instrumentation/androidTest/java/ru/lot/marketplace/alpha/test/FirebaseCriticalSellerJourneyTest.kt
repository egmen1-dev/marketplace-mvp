package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebaseCriticalSellerJourneyTest {
    private lateinit var runId: String
    private lateinit var title: String

    @Before
    fun setUp() {
        runId = FirebaseQaConfig.runId
        title = "$runId critical"
    }

    @Test
    fun criticalSellerJourney() {
        FirebaseQaLogger.stepStart("CRITICAL_SELLER_JOURNEY", runId)
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.navigateToCreateLot()

        FirebaseQaLogger.stepStart("ADD_PHOTO_FIXTURE")
        FirebaseQaSupport.injectSmartphoneFixture()
        FirebaseQaSupport.waitPhotoReady()
        FirebaseQaLogger.stepPass("ADD_PHOTO_FIXTURE")

        FirebaseQaSupport.tapPhotoContinueOnce()

        FirebaseQaLogger.stepStart("FILL_DETAILS")
        FirebaseQaSupport.typeIntoTestId("lot-title", title)
        FirebaseQaSupport.tapText("Электроника")
        FirebaseQaSupport.device.waitForIdle(2_000)
        FirebaseQaSupport.tapText("Смартфоны")
        FirebaseQaSupport.device.waitForIdle(2_000)
        FirebaseQaSupport.tapText("Смартфоны")
        FirebaseQaSupport.typeIntoTestId("lot-price", "45900")
        FirebaseQaSupport.typeIntoTestId("lot-stock", "1")
        FirebaseQaSupport.typeIntoTestId("lot-city", "Москва")
        fillRequiredCharacteristicsIfPresent()
        FirebaseQaLogger.stepPass("FILL_DETAILS")

        FirebaseQaLogger.stepStart("PREVIEW_SUBMIT")
        FirebaseQaSupport.tapTestId("lot-details-preview")
        FirebaseQaSupport.requireTestId("lot-preview-submit", 20_000, "PREVIEW_REACHED")
        FirebaseQaSupport.tapTestId("lot-preview-submit")
        FirebaseQaSupport.waitForText("Проверяем ЛОТ", 60_000)
        FirebaseQaLogger.stepPass("PREVIEW_SUBMIT", "SUBMIT_VISIBLE_OUTCOME=PASS SUBMIT_BLACK_HOLE=NO")

        FirebaseQaLogger.stepStart("MY_LOTS_PENDING_SEARCH")
        FirebaseQaSupport.tapTestId("lot-success-my-lots")
        FirebaseQaSupport.tapTestId("seller-lots-tab-pending")
        FirebaseQaSupport.typeIntoTestId("seller-lots-search", title)
        FirebaseQaSupport.device.waitForIdle(2_000)
        val matches = FirebaseQaSupport.countCardsWithTitle(title)
        if (matches != 1) {
            FirebaseQaLogger.stepFail("MY_LOTS_SEARCH", "expected 1 card, found $matches")
            throw AssertionError("MY_LOTS_SEARCH expected exactly one card for $title")
        }
        FirebaseQaLogger.stepPass("MY_LOTS_PENDING_SEARCH", "MY_LOTS_CORRECT_TAB=PASS MY_LOTS_SEARCH=PASS NO_DUPLICATE_CARD=PASS")

        FirebaseQaLogger.stepStart("RELAUNCH_PERSISTENCE")
        FirebaseQaSupport.relaunchApp()
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.openMyLotsPending()
        FirebaseQaSupport.typeIntoTestId("seller-lots-search", title)
        FirebaseQaSupport.device.waitForIdle(2_000)
        val afterRelaunch = FirebaseQaSupport.countCardsWithTitle(title)
        if (afterRelaunch < 1) {
            FirebaseQaLogger.stepFail("RELAUNCH_PERSISTENCE", "card missing after relaunch")
            throw AssertionError("RELAUNCH_PERSISTENCE=FAIL")
        }
        FirebaseQaLogger.stepPass("RELAUNCH_PERSISTENCE", "RELAUNCH_PERSISTENCE=PASS")
        FirebaseQaLogger.stepPass("CRITICAL_SELLER_JOURNEY")
    }

    private fun fillRequiredCharacteristicsIfPresent() {
        val deadline = System.currentTimeMillis() + 5_000
        while (System.currentTimeMillis() < deadline) {
            val inputs = FirebaseQaSupport.device.findObjects(
                androidx.test.uiautomator.By.descContains("lot-char-input-"),
            )
            if (inputs.isEmpty()) return
            for (input in inputs) {
                if (input.text.isNullOrBlank()) input.text = "QA"
            }
            val samsung = FirebaseQaSupport.device.findObject(androidx.test.uiautomator.By.text("Samsung"))
            samsung?.click()
            val a57 = FirebaseQaSupport.device.findObject(androidx.test.uiautomator.By.textContains("A57"))
            a57?.click()
            return
        }
    }
}
