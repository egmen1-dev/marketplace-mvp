package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebaseMyLotsTest {
    @Test
    fun myLotsTabsSearchAndStaleGuard() {
        FirebaseQaLogger.stepStart("MY_LOTS_REGRESSION", FirebaseQaConfig.runId)
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.openMyLotsPending()

        val tabs = listOf("active", "pending", "drafts", "sold")
        for (tab in tabs) {
            FirebaseQaSupport.tapTestId("seller-lots-tab-$tab")
            FirebaseQaSupport.device.waitForIdle(400)
        }

        FirebaseQaSupport.tapTestId("seller-lots-tab-pending")
        val anchor = "${FirebaseQaConfig.runId}"
        FirebaseQaSupport.typeIntoTestId("seller-lots-search", anchor)
        FirebaseQaSupport.device.waitForIdle(1_500)
        FirebaseQaSupport.typeIntoTestId("seller-lots-search", "")
        FirebaseQaSupport.device.waitForIdle(1_000)

        FirebaseQaLogger.stepPass("MY_LOTS_REGRESSION", "tabs+search exercised")
    }
}
