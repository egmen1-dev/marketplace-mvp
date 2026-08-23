import { Stack } from "expo-router";

export default function SellStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
      }}
    >
      <Stack.Screen name="create" options={{ title: "Создать ЛОТ" }} />
    </Stack>
  );
}
