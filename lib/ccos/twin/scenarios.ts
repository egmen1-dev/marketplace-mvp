import type { TwinScenario } from "./types";

export const DEFAULT_SCENARIOS: TwinScenario[] = [
  {
    id: "scenario_photo",
    label: "Заменить первое фото",
    type: "replace_first_photo",
    actions: [{ type: "replace_first_photo" }],
  },
  {
    id: "scenario_video",
    label: "Добавить видео",
    type: "add_video",
    actions: [{ type: "add_video" }],
  },
  {
    id: "scenario_price_3",
    label: "Снизить цену на 3%",
    type: "change_price",
    actions: [{ type: "change_price", params: { percent: -3 } }],
  },
  {
    id: "scenario_price_15",
    label: "Снизить цену на 15%",
    type: "change_price",
    actions: [{ type: "change_price", params: { percent: -15 } }],
  },
  {
    id: "scenario_seo",
    label: "Улучшить SEO",
    type: "change_seo",
    actions: [{ type: "change_seo" }],
  },
  {
    id: "scenario_promotion",
    label: "Включить продвижение",
    type: "enable_promotion",
    actions: [{ type: "enable_promotion" }],
  },
  {
    id: "scenario_description",
    label: "Улучшить описание",
    type: "improve_description",
    actions: [{ type: "improve_description" }],
  },
  {
    id: "scenario_reorder",
    label: "Изменить порядок фотографий",
    type: "reorder_photos",
    actions: [{ type: "reorder_photos" }],
  },
  {
    id: "scenario_combo",
    label: "Фото + цена -3%",
    type: "combined",
    actions: [
      { type: "replace_first_photo" },
      { type: "change_price", params: { percent: -3 } },
    ],
  },
];

export function resolveScenarios(scenarioIds?: string[]): TwinScenario[] {
  if (!scenarioIds?.length) return DEFAULT_SCENARIOS;
  const set = new Set(scenarioIds);
  const picked = DEFAULT_SCENARIOS.filter((s) => set.has(s.id));
  return picked.length > 0 ? picked : DEFAULT_SCENARIOS;
}
