import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
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
  const isProcessing = useRef(false);

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

      // Haptic success feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );

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
    [scanning],
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

      Alert.alert(
        'Checked In!',
        `${scannedGuest.name} has been checked in successfully.`,
        [{ text: 'Scan Next', onPress: resetScanner }],
      );
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
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
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
          onPress={() => router.back()}
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

        {/* QR Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
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

      {/* Guest info panel (slides up when scanned) */}
      {scannedGuest && (
        <View style={styles.guestPanel}>
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
            <Pressable
              style={({ pressed }) => [
                styles.checkInBtn,
                pressed && styles.checkInBtnPressed,
              ]}
              onPress={handleCheckIn}
              disabled={checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color={colors.white} />
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

            <Pressable
              style={styles.scanAgainBtn}
              onPress={resetScanner}
            >
              <Text style={styles.scanAgainBtnText}>Scan Another</Text>
            </Pressable>
          </View>
        </View>
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
