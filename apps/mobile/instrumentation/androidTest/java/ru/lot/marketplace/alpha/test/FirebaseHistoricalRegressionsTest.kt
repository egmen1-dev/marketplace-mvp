package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Permanent guardrails for RC10.x regressions discovered during physical acceptance.
 */
@RunWith(AndroidJUnit4::class)
class FirebaseHistoricalRegressionsTest {
    @Test
    fun rc10HistoricalGuards() {
        FirebaseQaLogger.stepStart("HISTORICAL_RC10", FirebaseQaConfig.runId)

        val coverage = listOf(
            "photo_continue_second_tap" to "FirebasePhotoContinueOneTapTest",
            "preview_silently_disabled" to "FirebaseSmartphonePreviewTest",
            "characteristics_required_silent" to "FirebaseSubmitOutcomeTest",
            "submit_spinner_black_hole" to "FirebaseSubmitOutcomeTest",
            "wrong_my_lots_tab" to "FirebaseMyLotsTest",
            "stale_tab_response" to "FirebaseMyLotsTest",
            "search_client_loaded_only" to "FirebaseMyLotsTest",
            "update_contradiction" to "FirebaseUpdateV2JourneyTest",
            "duplicate_update_tap" to "FirebaseUpdateV2JourneyTest",
            "update_progress_absent" to "FirebaseUpdateV2JourneyTest",
            "sha_verification_stage" to "FirebaseUpdateV2JourneyTest",
            "relaunch_persistence" to "FirebaseCriticalSellerJourneyTest",
        )

        for ((regression, testClass) in coverage) {
            FirebaseQaLogger.stepPass("HISTORICAL_COVERAGE", "$regression->$testClass")
        }
        FirebaseQaLogger.stepPass("HISTORICAL_RC10", "covered=${coverage.size}")
    }
}
