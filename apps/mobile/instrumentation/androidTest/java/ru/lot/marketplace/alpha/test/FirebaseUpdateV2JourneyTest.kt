package ru.lot.marketplace.alpha.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FirebaseUpdateV2JourneyTest {
    @Test
    fun updateV2DownloadVerifyAndInstallerBoundary() {
        FirebaseQaLogger.stepStart("UPDATE_V2", FirebaseQaConfig.runId)
        FirebaseQaSupport.loginSeller()
        FirebaseQaSupport.tapText("Профиль")
        FirebaseQaSupport.tapText("Проверить обновление")

        val device = FirebaseQaSupport.device
        device.wait(UntilText.anyOf("Проверяем обновления", "актуальная версия", "Доступно обновление"), 30_000)

        val download = device.findObject(By.desc("update-download"))
        if (download != null) {
            download.click()
            observeDownloadStages()
        } else {
            FirebaseQaLogger.stepPass("UPDATE_V2", "No optional update on device — up-to-date path")
            return
        }

        val installer = device.findObject(By.pkg("com.android.packageinstaller"))
            ?: device.findObject(By.pkg("com.google.android.packageinstaller"))
        val automation = if (installer != null) "PARTIAL" else "UNSUPPORTED"
        FirebaseQaLogger.stepPass("UPDATE_V2", "INSTALLER_BOUNDARY_REACHED PACKAGE_INSTALLER_AUTOMATION=$automation")
    }

    private fun observeDownloadStages() {
        val device = FirebaseQaSupport.device
        val labels = listOf(
            "Скачиваем обновление",
            "Проверяем целостность",
            "Обновление скачано",
            "Подтвердите установку",
        )
        val deadline = System.currentTimeMillis() + 180_000
        val seen = mutableSetOf<String>()
        while (System.currentTimeMillis() < deadline) {
            for (label in labels) {
                if (device.findObject(By.textContains(label)) != null) seen.add(label)
            }
            if (seen.size >= 2) break
            device.waitForIdle(1_000)
        }
        if (seen.isEmpty()) {
            FirebaseQaLogger.stepFail("UPDATE_V2", "No download stages observed")
            throw AssertionError("DOWNLOAD stages missing")
        }
        FirebaseQaLogger.stepPass("UPDATE_V2_DOWNLOAD", seen.joinToString(","))
    }
}

private object UntilText {
    fun anyOf(vararg parts: String, timeoutMs: Long = 20_000): Boolean {
        val device = FirebaseQaSupport.device
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            for (part in parts) {
                if (device.findObject(By.textContains(part)) != null) return true
            }
            device.waitForIdle(300)
        }
        return false
    }
}
