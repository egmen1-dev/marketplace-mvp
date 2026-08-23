import { Stack } from "expo-router";

import { colors } from "../../src/theme/tokens";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.black,
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Сообщения" }} />
      <Stack.Screen name="[conversationId]" options={{ title: "Переписка" }} />
    </Stack>
  );
}
