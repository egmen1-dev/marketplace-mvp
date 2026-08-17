import { router } from "expo-router";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileAccountCard } from "../../design-system/components/ProfileAccountCard";
import { ProfileClosedAlphaCard } from "../../design-system/components/ProfileClosedAlphaCard";
import { ProfileDangerSheet } from "../../design-system/components/ProfileDangerSheet";
import { ProfileDiagnosticsSection } from "../../design-system/components/ProfileDiagnosticsSection";
import { ProfileHeader } from "../../design-system/components/ProfileHeader";
import { ProfileQuickActions } from "../../design-system/components/ProfileQuickActions";
import { ProfileSavedData } from "../../design-system/components/ProfileSavedData";
import { ProfileSettingsSection } from "../../design-system/components/ProfileSettingsSection";
import { ProfileShoppingActivity } from "../../design-system/components/ProfileShoppingActivity";
import { ProfileSkeleton } from "../../design-system/components/ProfileSkeleton";
import { ProfileSupportSection } from "../../design-system/components/ProfileSupportSection";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { semantic, surface, text } from "../../design-system/tokens/colors";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useFadeIn } from "../../hooks/useFadeIn";
import type { ProfileDataState } from "./useProfileData";

type Props = {
  state: ProfileDataState;
};

export function ProfileExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useFadeIn();

  if (state.loading) {
    return <ProfileSkeleton />;
  }

  const handleSwitchMode = () => {
    const next = state.mode === "buyer" ? "seller" : "buyer";
    state.switchMode();
    router.replace(next === "seller" ? "/(tabs)/seller-home" : "/(tabs)");
  };

  const handleLogout = async () => {
    await state.logout();
    router.replace("/login");
  };

  const handleDiagnostics = () => {
    state.openDiagnostics();
    router.push("/startup-diagnostics");
  };

  const handleBuildInfo = () => {
    state.openBuildInfo();
    router.push("/build-info");
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] },
        ]}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
      >
        <Animated.View style={{ opacity: fade, gap: spacing.xl }}>
          <ProfileHeader
            displayName={state.displayName}
            displayEmail={state.displayEmail}
            mode={state.mode}
            sellerCapable={state.sellerCapable}
            fromCache={state.fromCache}
            onSwitchMode={handleSwitchMode}
          />

          {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}

          <ProfileAccountCard
            versionName={state.buildInfo.versionName}
            versionCode={state.buildInfo.versionCode}
            buildDateLabel={state.buildDateLabel}
            synced={!state.fromCache && !state.offlineBlocked}
          />

          <ProfileQuickActions actions={state.quickActions} />

          <ProfileShoppingActivity stats={state.stats} />

          <ProfileSavedData recentItems={state.recentItems} categories={state.topCategories} />

          <ProfileSupportSection
            onSupport={() => void state.openSupport()}
            onFaq={() => state.openUrl("/about#faq")}
            onReport={() => void state.reportCrash()}
            onPolicy={() => state.openUrl("/legal/privacy")}
            onTerms={() => state.openUrl("/legal/terms")}
          />

          <ProfileSettingsSection onDiagnostics={handleDiagnostics} />

          <ProfileDiagnosticsSection
            versionName={state.buildInfo.versionName}
            commit={state.buildInfo.commit}
            environment={state.buildInfo.environment}
            buildDateLabel={state.buildDateLabel}
            onBuildInfo={handleBuildInfo}
            onDiagnostics={handleDiagnostics}
            onCrashReport={() => void state.reportCrash()}
          />

          <ProfileClosedAlphaCard
            versionName={state.buildInfo.versionName}
            buildDateLabel={state.buildDateLabel}
            updateInfo={state.updateInfo}
            hasUpdate={state.hasUpdate}
            onUpdate={() => void state.startUpdate()}
          />

          <View style={styles.dangerWrap}>
            <Text style={styles.sectionTitle}>Опасная зона</Text>
            <Pressable
              style={styles.dangerBtn}
              onPress={() => state.setDangerSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Открыть опасную зону"
            >
              <Text style={styles.dangerBtnText}>Выйти и управление данными</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <ProfileDangerSheet
        visible={state.dangerSheetVisible}
        onClose={() => state.setDangerSheetVisible(false)}
        onLogout={() => void handleLogout()}
        onClearCache={() => void state.clearLocalCache()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  sectionTitle: { ...typography.caption, color: text.muted, textTransform: "uppercase", fontWeight: "700" },
  dangerWrap: { gap: spacing.sm },
  dangerBtn: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: semantic.dangerSoft,
    backgroundColor: semantic.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  dangerBtnText: { ...typography.body, color: semantic.danger, fontWeight: "700" },
});
