import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, spacing, radius } from '@/lib/theme';
import { apiFetch, uploadPhoto } from '@/lib/api';
import type { WizardState, WizardPhoto } from '@/lib/types';
import GeneratingStep from '@/components/wizard/GeneratingStep';

// ── Types ──────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'pear';
  text: string;
  ts: number;
  cards?: Array<{ label: string; value: string; icon?: string }>;
  cardType?: 'occasion' | 'names' | 'date' | 'vibe' | 'photos' | 'build';
  imageUri?: string;
}

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
}

// ── Occasion labels ────────────────────────────────────────────

const OCCASIONS = [
  { label: 'Wedding', value: 'wedding', icon: 'heart' as const },
  { label: 'Birthday', value: 'birthday', icon: 'birthday-cake' as const },
  { label: 'Anniversary', value: 'anniversary', icon: 'star' as const },
  { label: 'Engagement', value: 'engagement', icon: 'diamond' as const },
  { label: 'Other', value: 'story', icon: 'book' as const },
];

const VIBE_OPTIONS = [
  { label: 'Romantic', value: 'romantic elegant' },
  { label: 'Modern', value: 'modern minimal' },
  { label: 'Rustic', value: 'rustic natural' },
  { label: 'Bold', value: 'bold colorful' },
  { label: 'Whimsical', value: 'whimsical fun' },
  { label: 'Celestial', value: 'celestial dreamy' },
];

function needsTwoNames(occasion?: string): boolean {
  return occasion === 'wedding' || occasion === 'engagement' || occasion === 'anniversary';
}

function hasAllRequired(c: Collected, photosDecided: boolean): boolean {
  const hasName = c.names && c.names[0];
  const namesOk = needsTwoNames(c.occasion) ? (hasName && c.names![1]) : hasName;
  return !!(c.occasion && namesOk && c.date && c.vibe && photosDecided);
}

// ── Component ──────────────────────────────────────────────────

export default function PearWizard() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState<Collected>({});
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [photosDecided, setPhotosDecided] = useState(false);
  const [waitingForDate, setWaitingForDate] = useState(false);
  const [phase, setPhase] = useState<'chat' | 'generating'>('chat');

  // Refs for async callbacks
  const collectedRef = useRef(collected);
  collectedRef.current = collected;

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  // Greeting
  useEffect(() => {
    addPearMessage(
      "Hey! I'm Pear. Tell me about your celebration and I'll build you something beautiful.",
      'occasion',
      OCCASIONS.map(o => ({ label: o.label, value: o.value, icon: o.icon })),
    );
  }, []);

  // ── Helpers ────────────────────────────────────────────────

  function addPearMessage(
    text: string,
    cardType?: ChatMessage['cardType'],
    cards?: ChatMessage['cards'],
    imageUri?: string,
  ) {
    setMessages(prev => [...prev, {
      role: 'pear', text, ts: Date.now(), cardType, cards, imageUri,
    }]);
  }

  function addUserMessage(text: string) {
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
  }

  // ── Card handlers ──────────────────────────────────────────

  function handleOccasionPick(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = OCCASIONS.find(o => o.value === value)?.label ?? value;
    addUserMessage(label);
    setCollected(prev => ({ ...prev, occasion: value }));

    setTimeout(() => {
      if (needsTwoNames(value)) {
        addPearMessage(
          `A ${label.toLowerCase()} -- how exciting! What are both names?`,
          'names',
        );
      } else {
        addPearMessage(
          `A ${label.toLowerCase()} -- love it! Who is this for?`,
          'names',
        );
      }
    }, 400);
  }

  function handleNameSubmit() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addUserMessage(text);
    setInput('');

    // Parse names: "Shauna & Marcus", "Shauna and Marcus", or just "Shauna"
    const parts = text.split(/\s*(?:&|and)\s*/i).map(s => s.trim()).filter(Boolean);
    const name1 = parts[0] || '';
    const name2 = parts[1] || '';
    const names: [string, string] = [name1, name2];

    setCollected(prev => ({ ...prev, names }));

    setTimeout(() => {
      if (needsTwoNames(collectedRef.current.occasion) && !name2) {
        addPearMessage("What's their partner's name?", 'names');
      } else {
        const nameDisplay = name2 ? `${name1} & ${name2}` : name1;
        addPearMessage(
          `Got it -- the site will be for ${nameDisplay}! When's the date? (e.g. June 15, 2026)`,
          'date',
        );
        setWaitingForDate(true);
      }
    }, 400);
  }

  function handleSecondName() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addUserMessage(text);
    setInput('');

    setCollected(prev => ({
      ...prev,
      names: [prev.names?.[0] || '', text],
    }));

    setTimeout(() => {
      const nameDisplay = `${collectedRef.current.names?.[0]} & ${text}`;
      addPearMessage(
        `${nameDisplay} -- beautiful! When's the date? (e.g. June 15, 2026)`,
        'date',
      );
      setWaitingForDate(true);
    }, 400);
  }

  function handleDateInput() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addUserMessage(text);
    setInput('');
    setWaitingForDate(false);

    // Try to parse the date from natural language
    const parsed = new Date(text);
    const currentYear = new Date().getFullYear();
    let dateStr: string;

    if (!isNaN(parsed.getTime())) {
      // Valid date parsed — ensure it's in the future
      if (parsed.getTime() < Date.now()) {
        parsed.setFullYear(currentYear);
        if (parsed.getTime() < Date.now()) parsed.setFullYear(currentYear + 1);
      }
      dateStr = parsed.toISOString().slice(0, 10);
    } else {
      // Couldn't parse — store as-is and let the AI figure it out later
      dateStr = text;
    }

    setCollected(prev => ({ ...prev, date: dateStr }));

    setTimeout(() => {
      addPearMessage("Where's the venue? (Or type 'skip' if you haven't decided yet)");
    }, 400);
  }

  function handleVenueOrFreeText() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addUserMessage(text);
    setInput('');

    const c = collectedRef.current;

    // If we don't have a venue yet
    if (!c.venue && c.date) {
      const isSkip = text.toLowerCase() === 'skip' || text.toLowerCase() === 'tbd';
      setCollected(prev => ({ ...prev, venue: isSkip ? 'TBD' : text }));

      setTimeout(() => {
        addPearMessage(
          "What's the vibe you're going for? Pick one or describe your own:",
          'vibe',
          VIBE_OPTIONS.map(v => ({ label: v.label, value: v.value })),
        );
      }, 400);
      return;
    }

    // If we don't have a vibe yet, treat this as custom vibe text
    if (!c.vibe) {
      setCollected(prev => ({ ...prev, vibe: text }));
      setTimeout(() => askAboutPhotos(), 400);
      return;
    }

    // General free-text during chat
    sendToAI(text);
  }

  function handleVibePick(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const label = VIBE_OPTIONS.find(v => v.value === value)?.label ?? value;
    addUserMessage(label);
    setCollected(prev => ({ ...prev, vibe: value }));

    setTimeout(() => askAboutPhotos(), 400);
  }

  function askAboutPhotos() {
    addPearMessage(
      'Want to add photos? They make the site so much more personal.',
      'photos',
      [
        { label: 'Add Photos', value: 'add-photos', icon: 'camera' },
        { label: 'Skip Photos', value: 'skip-photos', icon: 'arrow-right' },
      ],
    );
  }

  async function handlePickPhotos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      addPearMessage('I need photo library access to add your photos. Please grant permission in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 40,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const newPhotos: WizardPhoto[] = result.assets.map((a, i) => ({
      uri: a.uri,
      id: `photo_${Date.now()}_${i}`,
    }));

    setPhotos(newPhotos);
    setPhotosDecided(true);
    addUserMessage(`Added ${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''}`);

    setTimeout(() => {
      addPearMessage(
        `${newPhotos.length} photos added -- I'll weave them into your story. Ready to build?`,
        'build',
        [{ label: 'Build My Site', value: 'build', icon: 'magic' }],
      );
    }, 400);
  }

  function handleSkipPhotos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addUserMessage('Skip photos for now');
    setPhotosDecided(true);

    setTimeout(() => {
      addPearMessage(
        'No problem -- you can always add photos later. Ready to build?',
        'build',
        [{ label: 'Build My Site', value: 'build', icon: 'magic' }],
      );
    }, 400);
  }

  function handleBuild() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addUserMessage('Build my site!');

    setTimeout(() => {
      setPhase('generating');
    }, 600);
  }

  // ── AI chat fallback for free-form conversation ─────────

  async function sendToAI(text: string) {
    setLoading(true);
    try {
      const res = await apiFetch<{ reply: string; data?: { extracted?: Partial<Collected> } }>(
        '/api/ai-chat',
        {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            manifest: null,
          }),
        },
      );

      const reply = res.reply || "I didn't quite catch that. Could you tell me more?";
      addPearMessage(reply);
    } catch {
      addPearMessage('Sorry, I had trouble understanding that. Could you try again?');
    } finally {
      setLoading(false);
    }
  }

  // ── Determine what the current input does ──────────────

  function handleSend() {
    const c = collectedRef.current;

    // Waiting for names
    if (c.occasion && !c.names?.[0]) {
      handleNameSubmit();
      return;
    }

    // Waiting for second name
    if (c.occasion && c.names?.[0] && !c.names?.[1] && needsTwoNames(c.occasion)) {
      handleSecondName();
      return;
    }

    // Waiting for date
    if (waitingForDate) {
      handleDateInput();
      return;
    }

    // Anything else — venue, vibe, or free text
    handleVenueOrFreeText();
  }

  // ── Card click router ──────────────────────────────────

  function handleCardClick(cardType: string | undefined, value: string) {
    switch (cardType) {
      case 'occasion': handleOccasionPick(value); break;
      case 'vibe': handleVibePick(value); break;
      case 'photos':
        if (value === 'add-photos') handlePickPhotos();
        else handleSkipPhotos();
        break;
      case 'build': handleBuild(); break;
    }
  }

  // ── Generating phase ───────────────────────────────────

  if (phase === 'generating') {
    const c = collected;
    const wizardState: WizardState = {
      photos,
      name1: c.names?.[0] || '',
      name2: c.names?.[1] || '',
      occasion: c.occasion || '',
      vibeText: c.vibe || '',
      selectedVibes: [],
      eventDate: c.date ? new Date(c.date + 'T12:00:00') : null,
      venueName: c.venue || '',
    };

    return (
      <GeneratingStep
        state={wizardState}
        onRetry={() => setPhase('chat')}
      />
    );
  }

  // ── Chat UI ────────────────────────────────────────────

  const placeholder = (() => {
    const c = collected;
    if (c.occasion && !c.names?.[0]) {
      return needsTwoNames(c.occasion) ? 'Both names (e.g. Alex & Jordan)' : 'Their name';
    }
    if (c.names?.[0] && !c.names?.[1] && needsTwoNames(c.occasion)) {
      return "Partner's name";
    }
    if (waitingForDate) return 'e.g. June 15, 2026';
    if (c.date && !c.venue) return 'Venue name or "skip"';
    if (c.venue && !c.vibe) return 'Describe your style...';
    return 'Talk to Pear...';
  })();

  // Only show text input when appropriate (not during card-only steps)
  const showInput = !!collected.occasion && (
    // Waiting for name
    (!collected.names?.[0]) ||
    // Waiting for second name
    (collected.names?.[0] && !collected.names?.[1] && needsTwoNames(collected.occasion)) ||
    // Waiting for date
    waitingForDate ||
    // Waiting for venue
    (collected.date && !collected.venue) ||
    // Waiting for custom vibe
    (collected.venue && !collected.vibe) ||
    // General chat after everything collected
    (collected.vibe)
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <FontAwesome name="chevron-left" size={16} color={colors.ink} />
        </Pressable>
        <Text style={s.headerTitle}>Create with Pear</Text>
        <View style={s.backBtn} />
      </View>

      {/* Progress dots */}
      <View style={s.progressRow}>
        {['Occasion', 'Names', 'Date', 'Style', 'Photos'].map((label, i) => {
          const steps = [
            !!collected.occasion,
            !!collected.names?.[0],
            !!collected.date,
            !!collected.vibe,
            photosDecided,
          ];
          const done = steps[i];
          return (
            <View key={label} style={s.progressItem}>
              <View style={[s.progressDot, done && s.progressDotDone]} />
              <Text style={[s.progressLabel, done && s.progressLabelDone]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.chatScroll}
          contentContainerStyle={s.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) => (
            <View
              key={msg.ts + '-' + i}
              style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubblePear]}
            >
              {msg.role === 'pear' && (
                <View style={s.pearAvatar}>
                  <FontAwesome name="leaf" size={14} color={colors.olive} />
                </View>
              )}
              <View style={[s.bubbleCard, msg.role === 'user' ? s.bubbleCardUser : s.bubbleCardPear]}>
                {msg.imageUri && (
                  <Image source={{ uri: msg.imageUri }} style={s.chatImage} resizeMode="cover" />
                )}
                <Text style={[s.bubbleText, msg.role === 'user' && s.bubbleTextUser]}>
                  {msg.text}
                </Text>

                {/* Inline cards */}
                {msg.cards && msg.cards.length > 0 && (
                  <View style={s.cardsRow}>
                    {msg.cards.map((card) => (
                      <Pressable
                        key={card.value}
                        style={s.card}
                        onPress={() => handleCardClick(msg.cardType, card.value)}
                      >
                        {card.icon && typeof card.icon === 'string' && (
                          <FontAwesome
                            name={card.icon as any}
                            size={14}
                            color={colors.olive}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <Text style={s.cardLabel}>{card.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Loading indicator */}
          {loading && (
            <View style={[s.bubble, s.bubblePear]}>
              <View style={s.pearAvatar}>
                <FontAwesome name="leaf" size={14} color={colors.olive} />
              </View>
              <View style={[s.bubbleCard, s.bubbleCardPear]}>
                <ActivityIndicator size="small" color={colors.olive} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        {showInput && (
          <View style={s.inputBar}>
            <TextInput
              ref={inputRef}
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <FontAwesome
                name="send"
                size={16}
                color={input.trim() ? colors.white : colors.muted}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamDeep,
  },
  progressItem: {
    alignItems: 'center',
    gap: 3,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.creamDeep,
  },
  progressDotDone: {
    backgroundColor: colors.olive,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  progressLabelDone: {
    color: colors.oliveDeep,
    fontFamily: fonts.bodySemibold,
  },

  // Chat
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bubblePear: {
    justifyContent: 'flex-start',
  },
  bubbleUser: {
    justifyContent: 'flex-end',
  },
  pearAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.olive + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bubbleCard: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(43,30,20,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  bubbleCardPear: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 4,
  },
  bubbleCardUser: {
    backgroundColor: colors.olive,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  bubbleTextUser: {
    color: colors.white,
  },
  chatImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },

  // Cards
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.olive + '10',
    borderWidth: 1,
    borderColor: colors.olive + '30',
  },
  cardLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.oliveDeep,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.creamDeep,
    backgroundColor: colors.cream,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.creamDeep,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.olive,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.olive,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: colors.creamDeep,
    shadowOpacity: 0,
    elevation: 0,
  },
});
