import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type {
  LotCharacteristicDefinition,
  LotCharacteristicFormValue,
} from "./lot-characteristics";
import { splitCharacteristicDefinitions } from "./lot-characteristics";

import { LOT_CREATE_COPY } from "./lot-create-copy";
import { colors, radii, spacing, typography } from "../theme/tokens";

type Props = {
  definitions: LotCharacteristicDefinition[];
  values: Record<string, LotCharacteristicFormValue>;
  showOptional: boolean;
  highlightedIds?: Set<string>;
  onToggleOptional: () => void;
  onChange: (definitionId: string, value: LotCharacteristicFormValue) => void;
};

function CharacteristicField({
  def,
  value,
  highlighted,
  onChange,
}: {
  def: LotCharacteristicDefinition;
  value: LotCharacteristicFormValue | undefined;
  highlighted?: boolean;
  onChange: (value: LotCharacteristicFormValue) => void;
}) {
  const label = `${def.name}${def.required ? " *" : ""}${def.unit ? ` (${def.unit})` : ""}`;

  if (def.type === "BOOLEAN") {
    return (
      <View testID={`lot-char-${def.id}`} style={[styles.field, highlighted ? styles.fieldHighlight : null]}>
        <View style={styles.booleanRow}>
          <Text style={styles.label}>{label}</Text>
          <Switch
            value={Boolean(value?.boolean)}
            onValueChange={(checked) => onChange({ boolean: checked })}
            trackColor={{ true: colors.orangeSoft, false: colors.gray200 }}
            thumbColor={value?.boolean ? colors.orange : colors.white}
          />
        </View>
      </View>
    );
  }

  if (def.type === "SELECT" || def.type === "SIZE" || def.type === "COLOR") {
    const options = def.options ?? [];
    return (
      <View testID={`lot-char-${def.id}`} style={[styles.field, highlighted ? styles.fieldHighlight : null]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.optionRow}>
          {options.map((opt) => {
            const selected = value?.text === opt;
            return (
              <Pressable
                key={opt}
                testID={`lot-char-option-${def.id}-${opt}`}
                accessibilityLabel={opt}
                style={[styles.optionChip, selected ? styles.optionChipActive : null]}
                onPress={() => onChange({ text: opt })}
              >
                <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (def.type === "MULTISELECT") {
    const options = def.options ?? [];
    const selected = new Set(value?.multi ?? []);
    return (
      <View style={[styles.field, highlighted ? styles.fieldHighlight : null]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.optionRow}>
          {options.map((opt) => {
            const isOn = selected.has(opt);
            return (
              <Pressable
                key={opt}
                style={[styles.optionChip, isOn ? styles.optionChipActive : null]}
                onPress={() => {
                  const next = new Set(selected);
                  if (isOn) next.delete(opt);
                  else next.add(opt);
                  onChange({ multi: [...next] });
                }}
              >
                <Text style={[styles.optionText, isOn ? styles.optionTextActive : null]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View testID={`lot-char-${def.id}`} style={[styles.field, highlighted ? styles.fieldHighlight : null]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`lot-char-input-${def.id}`}
        accessibilityLabel={`lot-char-input-${def.id}`}
        style={styles.input}
        placeholder={def.placeholder ?? def.name}
        keyboardType={def.type === "NUMBER" ? "numeric" : "default"}
        value={def.type === "NUMBER" ? (value?.number ?? "") : (value?.text ?? "")}
        onChangeText={(text) =>
          onChange(def.type === "NUMBER" ? { number: text } : { text })
        }
      />
    </View>
  );
}

export function LotCharacteristicsSection({
  definitions,
  values,
  showOptional,
  highlightedIds,
  onToggleOptional,
  onChange,
}: Props) {
  if (!definitions.length) return null;

  const { required, optional } = splitCharacteristicDefinitions(definitions);
  const visibleOptional = showOptional ? optional : [];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{LOT_CREATE_COPY.characteristicsTitle}</Text>
      <Text style={styles.sectionHint}>{LOT_CREATE_COPY.characteristicsHint}</Text>

      {required.map((def) => (
        <CharacteristicField
          key={def.id}
          def={def}
          value={values[def.id]}
          highlighted={highlightedIds?.has(def.id)}
          onChange={(next) => onChange(def.id, next)}
        />
      ))}

      {optional.length > 0 ? (
        <Pressable onPress={onToggleOptional} accessibilityRole="button">
          <Text style={styles.optionalToggle}>
            {showOptional ? LOT_CREATE_COPY.hideOptionalCharacteristics : LOT_CREATE_COPY.addCharacteristics}
          </Text>
        </Pressable>
      ) : null}

      {visibleOptional.map((def) => (
        <CharacteristicField
          key={def.id}
          def={def}
          value={values[def.id]}
          highlighted={highlightedIds?.has(def.id)}
          onChange={(next) => onChange(def.id, next)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.h2, color: colors.black },
  sectionHint: { ...typography.caption, color: colors.gray500 },
  field: { gap: spacing.xs },
  fieldHighlight: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  label: { ...typography.caption, color: colors.gray700, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.black,
  },
  booleanRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  optionChipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  optionText: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
  optionTextActive: { color: colors.white },
  optionalToggle: { ...typography.caption, color: colors.orange, fontWeight: "700", marginTop: spacing.xs },
});
