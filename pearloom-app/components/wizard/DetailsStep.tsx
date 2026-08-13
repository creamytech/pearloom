import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import VibeChips from '@/components/VibeChips';
import type { WizardState, VibeOption } from '@/lib/types';

const OCCASIONS = ['Wedding', 'Birthday', 'Anniversary', 'Engagement', 'Other'];

interface DetailsStepProps {
  state: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onGenerate: () => void;
}

function GlassInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  optional,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  optional?: boolean;
  multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {optional && <Text style={styles.optionalTag}>optional</Text>}
      </View>
      <View
        style={[
          styles.glassInputWrap,
          focused && styles.glassInputFocused,
          multiline && styles.glassInputMultiline,
        ]}
      >
        <FontAwesome
          name={icon}
          size={14}
          color={focused ? colors.olive : colors.muted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.textInput, multiline && styles.textInputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted + '80'}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function DetailsStep({
  state,
  onUpdate,
  onGenerate,
}: DetailsStepProps) {
  const scrollRef = useRef<ScrollView>(null);

  function handleOccasionSelect(occasion: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ occasion });
  }

  function handleVibeToggle(vibe: VibeOption) {
    const current = state.selectedVibes;
    let updatedVibes: VibeOption[];
    let updatedText: string;

    if (current.includes(vibe)) {
      updatedVibes = current.filter((v) => v !== vibe);
      // Remove vibe word from text
      updatedText = state.vibeText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.toLowerCase() !== vibe.toLowerCase())
        .join(', ');
    } else {
      updatedVibes = [...current, vibe];
      // Add vibe word to text
      const parts = state.vibeText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      parts.push(vibe);
      updatedText = parts.join(', ');
    }

    onUpdate({ selectedVibes: updatedVibes, vibeText: updatedText });
  }

  function handleDatePress() {
    // On a real device this would open a native date picker.
    // For now we set a placeholder date.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!state.eventDate) {
      onUpdate({ eventDate: new Date() });
    }
  }

  const formattedDate = state.eventDate
    ? state.eventDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Choose a date';

  const canGenerate =
    state.name1.trim().length > 0 &&
    state.name2.trim().length > 0 &&
    state.occasion.length > 0;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Section: Names */}
      <Text style={styles.sectionHeading}>Who's celebrating?</Text>

      <GlassInput
        label="First name"
        placeholder="e.g. Sarah"
        value={state.name1}
        onChangeText={(text) => onUpdate({ name1: text })}
        icon="user"
      />
      <GlassInput
        label="Partner's name"
        placeholder="e.g. James"
        value={state.name2}
        onChangeText={(text) => onUpdate({ name2: text })}
        icon="user"
      />

      {/* Section: Occasion */}
      <Text style={[styles.sectionHeading, { marginTop: spacing.xl }]}>
        What's the occasion?
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.occasionRow}
      >
        {OCCASIONS.map((occ) => {
          const isSelected = state.occasion === occ;
          return (
            <Pressable
              key={occ}
              onPress={() => handleOccasionSelect(occ)}
              style={[
                styles.occasionPill,
                isSelected && styles.occasionPillSelected,
              ]}
            >
              <Text
                style={[
                  styles.occasionPillText,
                  isSelected && styles.occasionPillTextSelected,
                ]}
              >
                {occ}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section: Vibe */}
      <Text style={[styles.sectionHeading, { marginTop: spacing.xl }]}>
        Describe your vibe
      </Text>

      <GlassInput
        label="Vibe description"
        placeholder="e.g. garden party under string lights, barefoot elegance..."
        value={state.vibeText}
        onChangeText={(text) => onUpdate({ vibeText: text })}
        icon="paint-brush"
        multiline
      />

      <Text style={styles.chipLabel}>Quick vibes -- tap to add</Text>
      <VibeChips
        selected={state.selectedVibes}
        onToggle={handleVibeToggle}
      />

      {/* Section: Date & Venue */}
      <Text style={[styles.sectionHeading, { marginTop: spacing.xl }]}>
        Event details
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Event date</Text>
        <Pressable
          style={[styles.glassInputWrap, styles.dateButton]}
          onPress={handleDatePress}
        >
          <FontAwesome name="calendar" size={14} color={colors.olive} style={styles.inputIcon} />
          <Text
            style={[
              styles.dateText,
              !state.eventDate && styles.datePlaceholder,
            ]}
          >
            {formattedDate}
          </Text>
        </Pressable>
      </View>

      <GlassInput
        label="Venue name"
        placeholder="e.g. The Garden Estate"
        value={state.venueName}
        onChangeText={(text) => onUpdate({ venueName: text })}
        icon="map-marker"
        optional
      />

      {/* Generate CTA */}
      <Pressable
        onPress={onGenerate}
        disabled={!canGenerate}
        style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
      >
        <FontAwesome
          name="magic"
          size={18}
          color={canGenerate ? colors.white : colors.muted}
        />
        <Text
          style={[
            styles.generateButtonText,
            !canGenerate && styles.generateButtonTextDisabled,
          ]}
        >
          Generate My Site
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + 80,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  inputLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  optionalTag: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    backgroundColor: colors.creamDeep,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  glassInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.creamDeep,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  glassInputFocused: {
    borderColor: colors.olive,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  glassInputMultiline: {
    alignItems: 'flex-start',
    minHeight: 90,
    paddingVertical: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.md,
    marginTop: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  textInputMultiline: {
    minHeight: 60,
    lineHeight: 22,
  },
  occasionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  occasionPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.olive + '35',
    backgroundColor: 'transparent',
  },
  occasionPillSelected: {
    backgroundColor: colors.olive,
    borderColor: colors.olive,
  },
  occasionPillText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.oliveDeep,
  },
  occasionPillTextSelected: {
    color: colors.white,
  },
  chipLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dateButton: {
    paddingVertical: spacing.lg,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  datePlaceholder: {
    color: colors.muted + '80',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.olive,
    paddingVertical: 18,
    borderRadius: radius.lg,
    marginTop: spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  generateButtonDisabled: {
    backgroundColor: colors.creamDeep,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  generateButtonTextDisabled: {
    color: colors.muted,
  },
});
