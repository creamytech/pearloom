import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, spacing, radius } from '@/lib/theme';
import { apiFetch } from '@/lib/api';
import type { Guest } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────

interface QrPayload {
  guestId: string;
  siteId: string;
}

// ── Component ──────────────────────────────────────────────────────────

export default function QrScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [scannedGuest, setScannedGuest] = useState<Guest | null>(null);
  const [scanning, setScanning] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const isProcessing = useRef(false);

  // Animations
  const cornerPulseAnim = useRef(new Animated.Value(1)).current;
  const panelSlideAnim = useRef(new Animated.Value(300)).current;
  const greenFlashAnim = useRef(new Animated.Value(0)).current;
  const checkInScaleAnim = useRef(new Animated.Value(1)).current;

  // Corner pulse animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Slide panel up when guest is scanned
  useEffect(() => {
    if (scannedGuest) {
      panelSlideAnim.setValue(300);
      Animated.spring(panelSlideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [scannedGuest]);

  // ── Parse QR data ────────────────────────────────────────────────────

  const parseQrData = (data: string): QrPayload | null => {
    try {
      // Try JSON parse first
      const parsed = JSON.parse(data);
      if (parsed.guestId && parsed.siteId) {
        return { guestId: parsed.guestId, siteId: parsed.siteId };
      }
    } catch {
      // Try URL parse (e.g., https://pearloom.com/checkin?guest=xxx&site=yyy)
      try {
        const url = new URL(data);
        const guestId = url.searchParams.get('guest');
        const siteId = url.searchParams.get('site');
        if (guestId && siteId) {
          return { guestId, siteId };
        }
      } catch {
        // Not a valid URL either
      }
    }
    return null;
  };

  // ── Green flash effect ───────────────────────────────────────────────

  const triggerGreenFlash = useCallback(() => {
    greenFlashAnim.setValue(0.5);
    Animated.timing(greenFlashAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Handle barcode scan ──────────────────────────────────────────────

  const onBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      // Prevent duplicate processing
      if (isProcessing.current || !scanning) return;
      isProcessing.current = true;

      const payload = parseQrData(result.data);

      if (!payload) {
        // Haptic warning for invalid QR
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        isProcessing.current = false;
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid Pearloom guest check-in code.',
          [{ text: 'OK', onPress: () => (isProcessing.current = false) }],
        );
        return;
      }

      // Haptic success feedback + green flash
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      triggerGreenFlash();

      setScanning(false);

      try {
        // Fetch guest details
        const guest = await apiFetch<Guest>(
          `/api/sites/${payload.siteId}/guests/${payload.guestId}`,
        );
        setScannedGuest(guest);
      } catch (err) {
        Alert.alert('Error', 'Could not find guest. Please try again.');
        resetScanner();
      }
    },
    [scanning, triggerGreenFlash],
  );

  // ── Check in guest ───────────────────────────────────────────────────

  const handleCheckIn = useCallback(async () => {
    if (!scannedGuest) return;

    setCheckingIn(true);
    try {
      await apiFetch(`/api/guests/${scannedGuest.id}/check-in`, {
        method: 'POST',
      });

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );

      // Success state animation
      setCheckedIn(true);
      Animated.sequence([
        Animated.timing(checkInScaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(checkInScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Show alert after a short delay to show success state
      setTimeout(() => {
        Alert.alert(
          'Checked In!',
          `${scannedGuest.name} has been checked in successfully.`,
          [{ text: 'Scan Next', onPress: resetScanner }],
        );
      }, 600);
    } catch (err) {
      Alert.alert('Error', 'Failed to check in guest. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  }, [scannedGuest]);

  // ── Reset scanner ────────────────────────────────────────────────────

  const resetScanner = useCallback(() => {
    setScannedGuest(null);
    setScanning(true);
    setCheckedIn(false);
    checkInScaleAnim.setValue(1);
    isProcessing.current = false;
  }, []);

  // ── Permission states ────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.olive} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <FontAwesome name="camera" size={48} color={colors.muted} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>
          To scan guest QR codes for check-in, please allow camera access.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.permissionBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            requestPermission();
          }}
        >
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={12}
        >
          <FontAwesome name="times" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Guest Check-In</Text>
        <View style={styles.closeBtn}>
          {/* Spacer for centering */}
        </View>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
        />

        {/* Green flash overlay on successful scan */}
        <Animated.View
          style={[
            styles.greenFlash,
            { opacity: greenFlashAnim },
          ]}
          pointerEvents="none"
        />

        {/* QR Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Animated corner markers */}
              <Animated.View
                style={[
                  styles.corner,
                  styles.cornerTL,
                  { transform: [{ scale: cornerPulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.cornerTR,
                  { transform: [{ scale: cornerPulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.cornerBL,
                  { transform: [{ scale: cornerPulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.cornerBR,
                  { transform: [{ scale: cornerPulseAnim }] },
                ]}
              />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanHint}>
              {scanning
                ? 'Point camera at guest QR code'
                : 'Processing...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Guest info panel (slides up with spring when scanned) */}
      {scannedGuest && (
        <Animated.View
          style={[
            styles.guestPanel,
            { transform: [{ translateY: panelSlideAnim }] },
          ]}
        >
          <View style={styles.guestPanelHandle} />

          <View style={styles.guestInfo}>
            {/* Avatar */}
            <View style={styles.guestAvatar}>
              <Text style={styles.guestAvatarText}>
                {scannedGuest.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Details */}
            <View style={styles.guestDetails}>
              <Text style={styles.guestName}>{scannedGuest.name}</Text>
              {scannedGuest.email && (
                <Text style={styles.guestEmail}>
                  {scannedGuest.email}
                </Text>
              )}
              <View style={styles.guestMeta}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        scannedGuest.rsvp_status === 'attending'
                          ? colors.olive + '1A'
                          : scannedGuest.rsvp_status === 'declined'
                          ? colors.danger + '1A'
                          : colors.gold + '1A',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          scannedGuest.rsvp_status === 'attending'
                            ? colors.olive
                            : scannedGuest.rsvp_status === 'declined'
                            ? colors.danger
                            : colors.gold,
                      },
                    ]}
                  >
                    {scannedGuest.rsvp_status.toUpperCase()}
                  </Text>
                </View>
                {scannedGuest.plus_ones > 0 && (
                  <Text style={styles.plusOnesLabel}>
                    +{scannedGuest.plus_ones} guest
                    {scannedGuest.plus_ones > 1 ? 's' : ''}
                  </Text>
                )}
                {scannedGuest.meal_preference && (
                  <Text style={styles.mealLabel}>
                    {scannedGuest.meal_preference}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.guestActions}>
            <Animated.View style={{ transform: [{ scale: checkInScaleAnim }] }}>
              <Pressable
                style={({ pressed }) => [
                  checkedIn ? styles.checkInBtnSuccess : styles.checkInBtn,
                  pressed && !checkedIn && styles.checkInBtnPressed,
                ]}
                onPress={handleCheckIn}
                disabled={checkingIn || checkedIn}
              >
                {checkingIn ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : checkedIn ? (
                  <>
                    <FontAwesome
                      name="check-circle"
                      size={20}
                      color={colors.white}
                    />
                    <Text style={styles.checkInBtnText}>Checked In</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome
                      name="check"
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.checkInBtnText}>Check In</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            <Pressable
              style={({ pressed }) => [
                styles.scanAgainBtn,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                resetScanner();
              }}
            >
              <Text style={styles.scanAgainBtnText}>Scan Another</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Constants ──────────────────────────────────────────────────────────

const SCAN_FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.lg,
  },
  permissionBody: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  backBtn: {
    paddingVertical: spacing.sm,
  },
  backBtnText: {
    fontSize: 15,
    color: colors.muted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },

  // Camera
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },

  // Green flash
  greenFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.success,
    zIndex: 5,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  overlayBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  scanHint: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Corner markers
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.olive,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.olive,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: colors.olive,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: colors.olive,
    borderBottomRightRadius: 4,
  },

  // Guest panel
  guestPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  guestPanelHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.creamDeep,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  guestInfo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.olive + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.olive,
  },
  guestDetails: {
    flex: 1,
    gap: 4,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  guestEmail: {
    fontSize: 14,
    color: colors.muted,
  },
  guestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  plusOnesLabel: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  mealLabel: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  guestActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.olive,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
  },
  checkInBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
  },
  checkInBtnPressed: {
    opacity: 0.85,
  },
  checkInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  scanAgainBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  scanAgainBtnText: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '500',
  },
});
