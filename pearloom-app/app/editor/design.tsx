import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';

// ── Theme Presets ──────────────────────────────────────────────────────

const THEME_PRESETS = [
  {
    id: 'garden',
    name: 'Garden',
    palette: ['#A3B18A', '#C4A96A', '#FAF7F2', '#1C1C1C', '#F5F1E8'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    palette: ['#2C3E6B', '#C4A96A', '#0F1B2D', '#E8E4DD', '#1A2744'],
  },
  {
    id: 'blush',
    name: 'Blush',
    palette: ['#D4A0A0', '#E8C4A0', '#FFF5F5', '#3D2C2C', '#FFF0EE'],
  },
  {
    id: 'coastal',
    name: 'Coastal',
    palette: ['#6BAEBC', '#E8D4A0', '#F5FAFB', '#2C3D3F', '#EAF4F5'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    palette: ['#9B8EC4', '#D4A0C4', '#F8F5FD', '#2D2640', '#F0ECF8'],
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    palette: ['#C47D5C', '#D4B896', '#FBF6F1', '#3D2E24', '#F5ECE4'],
  },
  {
    id: 'emerald',
    name: 'Emerald',
    palette: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24', '#E2F0E8'],
  },
  {
    id: 'moody',
    name: 'Moody',
    palette: ['#6D597A', '#C4A96A', '#F5F0F7', '#2D2433', '#EDE8F0'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    palette: ['#333333', '#888888', '#FFFFFF', '#111111', '#F5F5F5'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    palette: ['#E8785E', '#F0B860', '#FFF8F0', '#3D2420', '#FFF0E8'],
  },
];

const FONT_PAIRS = [
  { id: 'classic', name: 'Classic', heading: 'Playfair Display', body: 'Inter' },
  { id: 'modern', name: 'Modern', heading: 'Montserrat', body: 'Open Sans' },
  { id: 'elegant', name: 'Elegant', heading: 'Cormorant Garamond', body: 'Lato' },
  { id: 'romantic', name: 'Romantic', heading: 'Great Vibes', body: 'Raleway' },
  { id: 'rustic', name: 'Rustic', heading: 'Amatic SC', body: 'Source Sans Pro' },
  { id: 'minimal', name: 'Minimal', heading: 'DM Sans', body: 'DM Sans' },
];

const PALETTE_LABELS = ['Primary', 'Accent', 'Background', 'Text', 'Surface'];

// ── Component ──────────────────────────────────────────────────────────

export default function DesignScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [palette, setPalette] = useState<string[]>(['#A3B18A', '#C4A96A', '#FAF7F2', '#1C1C1C', '#F5F1E8']);
  const [fontPair, setFontPair] = useState('classic');
  const [activePreset, setActivePreset] = useState<string | null>('garden');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [editColorValue, setEditColorValue] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch current design ──────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const site = await apiFetch<any>(
          `/api/sites/${encodeURIComponent(siteId!)}`,
        );
        const manifest = site.manifest ?? {};
        if (manifest.vibeSkin?.palette) {
          setPalette(manifest.vibeSkin.palette);
          // Try to match existing preset
          const match = THEME_PRESETS.find(
            (p) => JSON.stringify(p.palette) === JSON.stringify(manifest.vibeSkin.palette),
          );
          setActivePreset(match?.id ?? null);
        }
        if (manifest.vibeSkin?.fontPair) {
          setFontPair(manifest.vibeSkin.fontPair);
        }
      } catch (err: any) {
        console.warn('Failed to load design settings:', err);
      } finally {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }
    load();
  }, [siteId]);

  // ── Save design to API ────────────────────────────────────────────────

  const saveDesign = useCallback(
    async (newPalette: string[], newFontPair: string) => {
      setSaving(true);
      try {
        await apiFetch(`/api/sites/${encodeURIComponent(siteId!)}/manifest`, {
          method: 'PATCH',
          body: JSON.stringify({
            vibeSkin: {
              palette: newPalette,
              fontPair: newFontPair,
            },
          }),
        });
      } catch (err: any) {
        Alert.alert('Error', 'Failed to save design changes');
      } finally {
        setSaving(false);
      }
    },
    [siteId],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handlePresetSelect = useCallback(
    (preset: typeof THEME_PRESETS[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPalette(preset.palette);
      setActivePreset(preset.id);
      saveDesign(preset.palette, fontPair);
    },
    [fontPair, saveDesign],
  );

  const handleFontPairSelect = useCallback(
    (pair: typeof FONT_PAIRS[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFontPair(pair.id);
      saveDesign(palette, pair.id);
    },
    [palette, saveDesign],
  );

  const handleColorEdit = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingColorIndex(index);
    setEditColorValue(palette[index] ?? '#000000');
  }, [palette]);

  const handleColorSave = useCallback(() => {
    if (editingColorIndex === null) return;
    // Validate hex
    const hex = editColorValue.startsWith('#') ? editColorValue : `#${editColorValue}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      Alert.alert('Invalid Color', 'Please enter a valid hex color (e.g. #A3B18A)');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPalette = [...palette];
    newPalette[editingColorIndex] = hex;
    setPalette(newPalette);
    setActivePreset(null);
    setEditingColorIndex(null);
    saveDesign(newPalette, fontPair);
  }, [editingColorIndex, editColorValue, palette, fontPair, saveDesign]);

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Design',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.olive} />
          <Text style={styles.loadingText}>Loading design...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Design',
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
          headerShadowVisible: false,
          headerRight: () =>
            saving ? (
              <ActivityIndicator
                size="small"
                color={colors.olive}
                style={{ marginRight: spacing.md }}
              />
            ) : null,
        }}
      />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Color Palette Editor ─────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Color Palette</Text>
            <Text style={styles.sectionDesc}>
              Tap a color circle to customize
            </Text>
            <View style={styles.paletteRow}>
              {palette.slice(0, 5).map((color, index) => (
                <Pressable
                  key={index}
                  style={styles.swatchWrapper}
                  onPress={() => handleColorEdit(index)}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: color },
                      editingColorIndex === index && styles.swatchActive,
                    ]}
                  />
                  <Text style={styles.swatchLabel}>
                    {PALETTE_LABELS[index]}
                  </Text>
                  <Text style={styles.swatchHex}>{color}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Live Preview ─────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View
              style={[
                styles.previewBox,
                { backgroundColor: palette[2] ?? colors.cream },
              ]}
            >
              <View
                style={[
                  styles.previewHero,
                  { backgroundColor: palette[0] ?? colors.olive },
                ]}
              >
                <Text
                  style={[
                    styles.previewNames,
                    { color: '#FFFFFF' },
                  ]}
                >
                  Sarah & James
                </Text>
              </View>
              <View style={styles.previewBody}>
                <View
                  style={[
                    styles.previewAccentBar,
                    { backgroundColor: palette[1] ?? colors.gold },
                  ]}
                />
                <Text
                  style={[
                    styles.previewText,
                    { color: palette[3] ?? colors.ink },
                  ]}
                >
                  Sample body text
                </Text>
                <View
                  style={[
                    styles.previewBtn,
                    { backgroundColor: palette[0] ?? colors.olive },
                  ]}
                >
                  <Text style={styles.previewBtnText}>RSVP</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Font Pairs ───────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Font Pair</Text>
            <Text style={styles.sectionDesc}>
              Choose a heading + body font combination
            </Text>
            <View style={styles.fontPairsGrid}>
              {FONT_PAIRS.map((pair) => (
                <Pressable
                  key={pair.id}
                  style={[
                    styles.fontPairCard,
                    fontPair === pair.id && styles.fontPairCardActive,
                    fontPair === pair.id && { borderColor: palette[0] },
                  ]}
                  onPress={() => handleFontPairSelect(pair)}
                >
                  <Text style={styles.fontPairName}>{pair.name}</Text>
                  <Text style={styles.fontPairHeading}>
                    {pair.heading}
                  </Text>
                  <Text style={styles.fontPairBody}>{pair.body}</Text>
                  {fontPair === pair.id && (
                    <View
                      style={[
                        styles.fontPairCheck,
                        { backgroundColor: palette[0] },
                      ]}
                    >
                      <Text style={styles.fontPairCheckIcon}>
                        {'\u2713'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Theme Presets Grid ────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Theme Presets</Text>
            <Text style={styles.sectionDesc}>
              Quick-apply a coordinated color palette
            </Text>
            <View style={styles.presetsGrid}>
              {THEME_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    activePreset === preset.id && styles.presetCardActive,
                  ]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <View style={styles.presetColors}>
                    {preset.palette.slice(0, 4).map((c, ci) => (
                      <View
                        key={ci}
                        style={[
                          styles.presetDot,
                          { backgroundColor: c },
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.presetName,
                      activePreset === preset.id && { color: colors.ink },
                    ]}
                  >
                    {preset.name}
                  </Text>
                  {activePreset === preset.id && (
                    <View
                      style={[
                        styles.presetCheck,
                        { backgroundColor: preset.palette[0] },
                      ]}
                    >
                      <Text style={styles.presetCheckIcon}>{'\u2713'}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Color Picker Modal ──────────────────────────────────────── */}
        <Modal
          visible={editingColorIndex !== null}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setEditingColorIndex(null)}
        >
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>
                Edit {PALETTE_LABELS[editingColorIndex ?? 0]} Color
              </Text>
              <Pressable
                onPress={() => setEditingColorIndex(null)}
                hitSlop={12}
              >
                <Text style={modalStyles.close}>{'\u2715'}</Text>
              </Pressable>
            </View>

            <View style={modalStyles.content}>
              {/* Large preview swatch */}
              <View
                style={[
                  modalStyles.previewSwatch,
                  {
                    backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(
                      editColorValue.startsWith('#')
                        ? editColorValue
                        : `#${editColorValue}`,
                    )
                      ? editColorValue.startsWith('#')
                        ? editColorValue
                        : `#${editColorValue}`
                      : '#CCCCCC',
                  },
                ]}
              />

              {/* Hex input */}
              <View style={modalStyles.inputRow}>
                <Text style={modalStyles.inputPrefix}>#</Text>
                <TextInput
                  style={modalStyles.input}
                  value={editColorValue.replace('#', '')}
                  onChangeText={(v) =>
                    setEditColorValue(v.startsWith('#') ? v : `#${v}`)
                  }
                  placeholder="A3B18A"
                  placeholderTextColor={colors.muted}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {/* Quick color picks */}
              <Text style={modalStyles.quickLabel}>Quick Colors</Text>
              <View style={modalStyles.quickColors}>
                {[
                  '#A3B18A', '#C4A96A', '#6D597A', '#E8785E',
                  '#5B9BD5', '#6BAEBC', '#D4A0A0', '#333333',
                  '#2D6A4F', '#E87373', '#9B8EC4', '#C47D5C',
                ].map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      modalStyles.quickSwatch,
                      { backgroundColor: c },
                      editColorValue.toUpperCase() === c.toUpperCase() && modalStyles.quickSwatchActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setEditColorValue(c);
                    }}
                  />
                ))}
              </View>

              <Pressable style={modalStyles.saveBtn} onPress={handleColorSave}>
                <Text style={modalStyles.saveBtnText}>Apply Color</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // Section cards
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  // Palette editor
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swatchWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  swatchActive: {
    borderColor: colors.olive,
    borderWidth: 3,
  },
  swatchLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  swatchHex: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  // Preview
  previewBox: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  previewHero: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNames: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  previewBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewAccentBar: {
    height: 3,
    width: 30,
    borderRadius: 1.5,
  },
  previewText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  previewBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  previewBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 0.5,
  },
  // Font pairs
  fontPairsGrid: {
    gap: spacing.sm,
  },
  fontPairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  fontPairCardActive: {
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  fontPairName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.ink,
    width: 65,
  },
  fontPairHeading: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    flex: 1,
  },
  fontPairBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  fontPairCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontPairCheckIcon: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '700',
  },
  // Theme presets
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetCard: {
    width: '48%',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetCardActive: {
    borderColor: colors.olive,
    backgroundColor: colors.white,
  },
  presetColors: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  presetDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  presetName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.inkSoft,
  },
  presetCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetCheckIcon: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
  },
  close: {
    fontSize: 20,
    color: colors.muted,
    padding: spacing.sm,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  previewSwatch: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.xl,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  inputPrefix: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.muted,
    marginRight: 4,
  },
  input: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.ink,
    paddingVertical: spacing.md,
    flex: 1,
    letterSpacing: 2,
  },
  quickLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  quickColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  quickSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  quickSwatchActive: {
    borderColor: colors.ink,
    borderWidth: 3,
  },
  saveBtn: {
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
});
