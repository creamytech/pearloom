import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiFetch } from '@/lib/api';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import GalleryPicker from '@/components/GalleryPicker';

// ── Types ──────────────────────────────────────────────────────────────

interface Block {
  id: string;
  type: string;
  title?: string;
  name?: string;
  visible?: boolean;
  config?: any;
  data?: any;
  [key: string]: any;
}

// ── Block type icon mapping ────────────────────────────────────────────

const BLOCK_ICONS: Record<string, string> = {
  hero: '\u{1F3A8}',
  story: '\u{1F4D6}',
  events: '\u{1F4C5}',
  event: '\u{1F4C5}',
  rsvp: '\u{1F48C}',
  registry: '\u{1F381}',
  travel: '\u{2708}',
  faq: '\u{2753}',
  guestbook: '\u{1F4AC}',
  photos: '\u{1F4F7}',
  gallery: '\u{1F4F7}',
  quote: '\u{201C}',
  countdown: '\u{23F3}',
  spotify: '\u{1F3B5}',
  hashtag: '#',
  video: '\u{1F3AC}',
  text: '\u{1F4DD}',
};

// ── Component ──────────────────────────────────────────────────────────

export default function BlockConfigScreen() {
  const { blockId, siteId, blockType, blockName } =
    useLocalSearchParams<{
      blockId: string;
      siteId: string;
      blockType: string;
      blockName: string;
    }>();
  const router = useRouter();

  const [block, setBlock] = useState<Block | null>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [galleryPickerVisible, setGalleryPickerVisible] = useState(false);
  const galleryPickerTargetRef = useRef<string | null>(null);

  const openGalleryPicker = useCallback((targetField: string) => {
    galleryPickerTargetRef.current = targetField;
    setGalleryPickerVisible(true);
  }, []);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch block data ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const site = await apiFetch<any>(
          `/api/sites/${encodeURIComponent(siteId!)}`,
        );
        const manifest = site.manifest ?? {};
        const found = (manifest.blocks ?? []).find(
          (b: Block) => b.id === blockId,
        );
        if (found) {
          setBlock(found);
          setConfig(found.config ?? found.data ?? {});
        }
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Failed to load block');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [blockId, siteId]);

  // ── Auto-save with debounce ───────────────────────────────────────────

  const saveConfig = useCallback(
    async (updatedConfig: any) => {
      setSaving(true);
      try {
        // Fetch current manifest, update the specific block, save back
        const site = await apiFetch<any>(
          `/api/sites/${encodeURIComponent(siteId!)}`,
        );
        const manifest = site.manifest ?? {};
        const blocks = (manifest.blocks ?? []).map((b: Block) =>
          b.id === blockId ? { ...b, config: updatedConfig } : b,
        );
        await apiFetch(`/api/sites/${encodeURIComponent(siteId!)}/manifest`, {
          method: 'PATCH',
          body: JSON.stringify({ blocks }),
        });
        setDirty(false);
      } catch (err: any) {
        console.warn('Auto-save failed:', err);
      } finally {
        setSaving(false);
      }
    },
    [blockId, siteId],
  );

  const debouncedSave = useCallback(
    (updatedConfig: any) => {
      setDirty(true);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveConfig(updatedConfig);
      }, 1500);
    },
    [saveConfig],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Config update helper ──────────────────────────────────────────────

  const updateField = useCallback(
    (key: string, value: any) => {
      setConfig((prev: any) => {
        const updated = { ...prev, [key]: value };
        debouncedSave(updated);
        return updated;
      });
    },
    [debouncedSave],
  );

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    saveConfig(config);
  }, [config, saveConfig]);

  const handleGallerySelect = useCallback(
    (url: string) => {
      if (galleryPickerTargetRef.current) {
        updateField(galleryPickerTargetRef.current, url);
      }
    },
    [updateField],
  );

  // ── Dynamic form rendering based on block type ────────────────────────

  const type = blockType ?? block?.type ?? 'text';
  const icon = BLOCK_ICONS[type] ?? '\u{1F4E6}';

  const renderFields = () => {
    switch (type) {
      case 'hero':
        return (
          <>
            <FieldInput
              label="Tagline"
              value={config.tagline ?? ''}
              onChange={(v) => updateField('tagline', v)}
              placeholder="A love story written in the stars..."
              multiline
            />
            <FieldInput
              label="Cover Photo URL"
              value={config.coverPhoto ?? ''}
              onChange={(v) => updateField('coverPhoto', v)}
              placeholder="https://..."
            />
            <Pressable
              style={blockConfigStyles.galleryPickerBtn}
              onPress={() => openGalleryPicker('coverPhoto')}
            >
              <FontAwesome name="photo" size={14} color={colors.olive} />
              <Text style={blockConfigStyles.galleryPickerBtnText}>Choose from Gallery</Text>
            </Pressable>
          </>
        );

      case 'text':
      case 'quote':
        return (
          <>
            <FieldInput
              label={type === 'quote' ? 'Quote Text' : 'Content'}
              value={config.text ?? config.content ?? config.quote ?? ''}
              onChange={(v) => updateField(type === 'quote' ? 'quote' : 'text', v)}
              placeholder={type === 'quote' ? 'Enter your quote...' : 'Enter text content...'}
              multiline
              numberOfLines={6}
            />
            {type === 'quote' && (
              <FieldInput
                label="Attribution"
                value={config.author ?? config.attribution ?? ''}
                onChange={(v) => updateField('author', v)}
                placeholder="Author name"
              />
            )}
          </>
        );

      case 'event':
      case 'events':
        return (
          <>
            <SectionLabel text="Event Details" />
            <EventEditor
              events={config.events ?? []}
              onChange={(events) => updateField('events', events)}
            />
          </>
        );

      case 'countdown':
        return (
          <>
            <FieldInput
              label="Date"
              value={config.date ?? ''}
              onChange={(v) => updateField('date', v)}
              placeholder="2025-06-15"
            />
            <FieldInput
              label="Label"
              value={config.label ?? ''}
              onChange={(v) => updateField('label', v)}
              placeholder="Days Until the Big Day"
            />
          </>
        );

      case 'registry':
        return (
          <>
            <SectionLabel text="Registry Links" />
            <ListEditor
              items={config.links ?? config.registries ?? []}
              fields={[
                { key: 'name', label: 'Registry Name', placeholder: 'Amazon' },
                { key: 'url', label: 'URL', placeholder: 'https://...' },
              ]}
              onChange={(items) => updateField('links', items)}
              addLabel="Add Registry"
            />
          </>
        );

      case 'faq':
        return (
          <>
            <SectionLabel text="Questions & Answers" />
            <ListEditor
              items={config.items ?? config.questions ?? []}
              fields={[
                { key: 'question', label: 'Question', placeholder: 'What should I wear?' },
                { key: 'answer', label: 'Answer', placeholder: 'Formal attire...', multiline: true },
              ]}
              onChange={(items) => updateField('items', items)}
              addLabel="Add Q&A"
            />
          </>
        );

      case 'spotify':
        return (
          <FieldInput
            label="Playlist URL"
            value={config.url ?? config.playlistUrl ?? ''}
            onChange={(v) => updateField('url', v)}
            placeholder="https://open.spotify.com/playlist/..."
          />
        );

      case 'hashtag':
        return (
          <FieldInput
            label="Hashtag"
            value={config.hashtag ?? config.text ?? ''}
            onChange={(v) => updateField('hashtag', v)}
            placeholder="SmithAndJones2025"
          />
        );

      case 'video':
        return (
          <>
            <FieldInput
              label="Video URL"
              value={config.url ?? ''}
              onChange={(v) => updateField('url', v)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <FieldInput
              label="Title"
              value={config.title ?? ''}
              onChange={(v) => updateField('title', v)}
              placeholder="Our Wedding Video"
            />
          </>
        );

      case 'story':
        return (
          <>
            <SectionLabel text="Chapters" />
            <Text style={formStyles.hint}>
              Tap each chapter to edit. Add chapters below.
            </Text>
            <ListEditor
              items={config.chapters ?? []}
              fields={[
                { key: 'title', label: 'Title', placeholder: 'How We Met' },
                { key: 'description', label: 'Description', placeholder: 'It all started...', multiline: true },
                { key: 'date', label: 'Date', placeholder: '2020-03' },
              ]}
              onChange={(items) => updateField('chapters', items)}
              addLabel="Add Chapter"
            />
          </>
        );

      default:
        return (
          <FieldInput
            label="Content"
            value={config.text ?? config.content ?? ''}
            onChange={(v) => updateField('text', v)}
            placeholder="Enter content..."
            multiline
            numberOfLines={6}
          />
        );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: blockName ?? 'Block Config',
            headerStyle: { backgroundColor: colors.cream },
            headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.olive} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: blockName ?? block?.title ?? type,
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRight}>
              {saving && (
                <ActivityIndicator
                  size="small"
                  color={colors.olive}
                  style={{ marginRight: spacing.sm }}
                />
              )}
              {dirty && !saving && (
                <View style={styles.dirtyDot} />
              )}
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Block type header */}
          <View style={styles.blockHeader}>
            <Text style={styles.blockIcon}>{icon}</Text>
            <View>
              <Text style={styles.blockTitle}>
                {blockName ?? block?.title ?? type}
              </Text>
              <Text style={styles.blockType}>{type} block</Text>
            </View>
          </View>

          {/* Form fields */}
          <View style={styles.formContainer}>{renderFields()}</View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.saveContainer}>
          <Pressable
            style={[
              styles.saveBtn,
              !dirty && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {dirty ? 'Save Changes' : 'Saved'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <GalleryPicker
        visible={galleryPickerVisible}
        onClose={() => setGalleryPickerVisible(false)}
        onSelect={handleGallerySelect}
      />
    </>
  );
}

const blockConfigStyles = StyleSheet.create({
  galleryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.olive,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  galleryPickerBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.olive,
  },
});

// ── Sub-components ──────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numberOfLines = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={[
          formStyles.input,
          multiline && {
            minHeight: Math.max(80, numberOfLines * 24),
            textAlignVertical: 'top',
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={formStyles.sectionLabel}>{text}</Text>;
}

function EventEditor({
  events,
  onChange,
}: {
  events: any[];
  onChange: (events: any[]) => void;
}) {
  const addEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([
      ...events,
      {
        id: `ev_${Date.now()}`,
        name: '',
        date: '',
        time: '',
        venue: '',
        address: '',
        dressCode: '',
      },
    ]);
  };

  const updateEvent = (index: number, key: string, value: string) => {
    const updated = events.map((ev, i) =>
      i === index ? { ...ev, [key]: value } : ev,
    );
    onChange(updated);
  };

  const removeEvent = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(events.filter((_, i) => i !== index));
  };

  return (
    <View>
      {events.map((event, index) => (
        <View key={event.id ?? index} style={formStyles.listItem}>
          <View style={formStyles.listItemHeader}>
            <Text style={formStyles.listItemTitle}>
              Event {index + 1}
            </Text>
            <Pressable
              onPress={() => removeEvent(index)}
              hitSlop={8}
            >
              <Text style={formStyles.removeBtn}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <FieldInput
            label="Name"
            value={event.name ?? ''}
            onChange={(v) => updateEvent(index, 'name', v)}
            placeholder="Wedding Ceremony"
          />
          <FieldInput
            label="Date"
            value={event.date ?? ''}
            onChange={(v) => updateEvent(index, 'date', v)}
            placeholder="2025-06-15"
          />
          <FieldInput
            label="Time"
            value={event.time ?? ''}
            onChange={(v) => updateEvent(index, 'time', v)}
            placeholder="4:00 PM"
          />
          <FieldInput
            label="Venue"
            value={event.venue ?? ''}
            onChange={(v) => updateEvent(index, 'venue', v)}
            placeholder="The Grand Ballroom"
          />
          <FieldInput
            label="Address"
            value={event.address ?? ''}
            onChange={(v) => updateEvent(index, 'address', v)}
            placeholder="123 Main St, City, State"
          />
          <FieldInput
            label="Dress Code"
            value={event.dressCode ?? ''}
            onChange={(v) => updateEvent(index, 'dressCode', v)}
            placeholder="Black Tie"
          />
        </View>
      ))}
      <Pressable style={formStyles.addItemBtn} onPress={addEvent}>
        <Text style={formStyles.addItemIcon}>+</Text>
        <Text style={formStyles.addItemText}>Add Event</Text>
      </Pressable>
    </View>
  );
}

function ListEditor({
  items,
  fields,
  onChange,
  addLabel,
}: {
  items: any[];
  fields: { key: string; label: string; placeholder?: string; multiline?: boolean }[];
  onChange: (items: any[]) => void;
  addLabel: string;
}) {
  const addItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newItem: any = { id: `item_${Date.now()}` };
    fields.forEach((f) => (newItem[f.key] = ''));
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(updated);
  };

  const removeItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View>
      {items.map((item, index) => (
        <View key={item.id ?? index} style={formStyles.listItem}>
          <View style={formStyles.listItemHeader}>
            <Text style={formStyles.listItemTitle}>
              {item[fields[0]?.key] || `Item ${index + 1}`}
            </Text>
            <Pressable
              onPress={() => removeItem(index)}
              hitSlop={8}
            >
              <Text style={formStyles.removeBtn}>{'\u2715'}</Text>
            </Pressable>
          </View>
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              label={field.label}
              value={item[field.key] ?? ''}
              onChange={(v) => updateItem(index, field.key, v)}
              placeholder={field.placeholder}
              multiline={field.multiline}
            />
          ))}
        </View>
      ))}
      <Pressable style={formStyles.addItemBtn} onPress={addItem}>
        <Text style={formStyles.addItemIcon}>+</Text>
        <Text style={formStyles.addItemText}>{addLabel}</Text>
      </Pressable>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  // Block header
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  blockIcon: {
    fontSize: 36,
  },
  blockTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
  },
  blockType: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  // Form
  formContainer: {
    padding: spacing.lg,
  },
  // Save
  saveContainer: {
    padding: spacing.lg,
    backgroundColor: colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.creamDeep,
  },
  saveBtn: {
    backgroundColor: colors.olive,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.muted + '44',
  },
  saveBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.white,
  },
});

const formStyles = StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    lineHeight: 22,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listItemTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.ink,
  },
  removeBtn: {
    fontSize: 16,
    color: colors.danger,
    padding: spacing.xs,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.olive + '33',
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addItemIcon: {
    fontSize: 18,
    color: colors.olive,
    fontWeight: '600',
  },
  addItemText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.olive,
  },
});
