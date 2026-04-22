// ─────────────────────────────────────────────────────────────
// Pearloom / lib/assets.ts
// Public-path registry for the v2 design asset sheets. After
// running `npm run assets:extract`, each entry resolves to a real
// PNG. Until then the paths 404 (use `onError` fallback in the
// consumer or swap to inline SVG placeholders).
// ─────────────────────────────────────────────────────────────

const BASE = '/assets/v2';

export const V2_ASSETS = {
  // Editorial still-lifes (sheet 1 — 12 items, ordered row-by-row)
  stills: {
    pear: `${BASE}/stills/still-01.png`,
    floralCard: `${BASE}/stills/still-02.png`,
    vase: `${BASE}/stills/still-03.png`,
    linen: `${BASE}/stills/still-04.png`,
    envelope: `${BASE}/stills/still-05.png`,
    waxSeal: `${BASE}/stills/still-06.png`,
    cup: `${BASE}/stills/still-07.png`,
    polaroids: `${BASE}/stills/still-08.png`,
    journal: `${BASE}/stills/still-09.png`,
    giftBox: `${BASE}/stills/still-10.png`,
    ribbonTag: `${BASE}/stills/still-11.png`,
    lavenderCard: `${BASE}/stills/still-12.png`,
  },
  // Pressed flowers (sheet 5 — ordered row-by-row)
  flowers: {
    oliveSprig: `${BASE}/flowers/flower-01.png`,
    lavenderStems: `${BASE}/flowers/flower-02.png`,
    babyBreath: `${BASE}/flowers/flower-03.png`,
    cosmos: `${BASE}/flowers/flower-04.png`,
    leafSprig: `${BASE}/flowers/flower-05.png`,
    lavenderBouquet: `${BASE}/flowers/flower-06.png`,
    delicateStems: `${BASE}/flowers/flower-07.png`,
    whiteCosmo: `${BASE}/flowers/flower-08.png`,
    lavenderSingle: `${BASE}/flowers/flower-09.png`,
    statice: `${BASE}/flowers/flower-10.png`,
    leafBranch: `${BASE}/flowers/flower-11.png`,
    cornerSpray: `${BASE}/flowers/flower-12.png`,
    smallSprig: `${BASE}/flowers/flower-13.png`,
    pressedBlooms: `${BASE}/flowers/flower-14.png`,
    babyBreathTall: `${BASE}/flowers/flower-15.png`,
    cosmosStem: `${BASE}/flowers/flower-16.png`,
    trailingLeaves: `${BASE}/flowers/flower-17.png`,
    lavenderCluster: `${BASE}/flowers/flower-18.png`,
    lavenderCorner: `${BASE}/flowers/flower-19.png`,
  },
  // Pear logos (sheet 3)
  pears: {
    filled: `${BASE}/pears/pear-01.png`,
    outline: `${BASE}/pears/pear-02.png`,
    filledBloom: `${BASE}/pears/pear-03.png`,
    circleOutline: `${BASE}/pears/pear-04.png`,
    roundedBadge: `${BASE}/pears/pear-05.png`,
    slim: `${BASE}/pears/pear-06.png`,
    cute: `${BASE}/pears/pear-07.png`,
    purpleHalo: `${BASE}/pears/pear-08.png`,
    ovalCrest: `${BASE}/pears/pear-09.png`,
    bouquet: `${BASE}/pears/pear-10.png`,
    scallopBadge: `${BASE}/pears/pear-11.png`,
    withHeart: `${BASE}/pears/pear-12.png`,
    tinySparkle: `${BASE}/pears/pear-13.png`,
    flowerBadge: `${BASE}/pears/pear-14.png`,
    stemOnly: `${BASE}/pears/pear-15.png`,
    laurelCrest: `${BASE}/pears/pear-16.png`,
  },
  // Thread dividers + corner flourishes (sheet 4)
  threads: {
    loopTopper: `${BASE}/threads/thread-01.png`,
    waveGold: `${BASE}/threads/thread-02.png`,
    scrollGold: `${BASE}/threads/thread-03.png`,
    waveOlive: `${BASE}/threads/thread-04.png`,
    sparkDivider: `${BASE}/threads/thread-05.png`,
    braidedRow: `${BASE}/threads/thread-06.png`,
    knotOlive: `${BASE}/threads/thread-07.png`,
    beadedGold: `${BASE}/threads/thread-08.png`,
    dottedNodes: `${BASE}/threads/thread-09.png`,
    scrollFlourish: `${BASE}/threads/thread-10.png`,
    fineRule: `${BASE}/threads/thread-11.png`,
    xBowGold: `${BASE}/threads/thread-12.png`,
    xBowOlive: `${BASE}/threads/thread-13.png`,
    cornerOliveL: `${BASE}/threads/thread-14.png`,
    cornerGoldL: `${BASE}/threads/thread-15.png`,
    rayBurst: `${BASE}/threads/thread-16.png`,
    cornerGoldR: `${BASE}/threads/thread-17.png`,
    cornerOliveR: `${BASE}/threads/thread-18.png`,
    leafVine: `${BASE}/threads/thread-19.png`,
    braidedGold: `${BASE}/threads/thread-20.png`,
    lavenderVine: `${BASE}/threads/thread-21.png`,
  },
  // Line icons (sheet 2)
  icons: {
    windowScene: `${BASE}/icons/icon-01.png`,
    envelopeHeart: `${BASE}/icons/icon-02.png`,
    calendar: `${BASE}/icons/icon-03.png`,
    suitcase: `${BASE}/icons/icon-04.png`,
    giftTag: `${BASE}/icons/icon-05.png`,
    camera: `${BASE}/icons/icon-06.png`,
    openBook: `${BASE}/icons/icon-07.png`,
    map: `${BASE}/icons/icon-08.png`,
    laptopPlay: `${BASE}/icons/icon-09.png`,
    toastGlasses: `${BASE}/icons/icon-10.png`,
    photoBoard: `${BASE}/icons/icon-11.png`,
    chatHeart: `${BASE}/icons/icon-12.png`,
    bed: `${BASE}/icons/icon-13.png`,
    calculator: `${BASE}/icons/icon-14.png`,
    ballotBox: `${BASE}/icons/icon-15.png`,
    card: `${BASE}/icons/icon-16.png`,
    cloche: `${BASE}/icons/icon-17.png`,
    hangerTowel: `${BASE}/icons/icon-18.png`,
    speechBubbles: `${BASE}/icons/icon-19.png`,
    gardenGate: `${BASE}/icons/icon-20.png`,
    bannerFlags: `${BASE}/icons/icon-21.png`,
    rings: `${BASE}/icons/icon-22.png`,
    clipboardQ: `${BASE}/icons/icon-23.png`,
    donationBox: `${BASE}/icons/icon-24.png`,
  },
} as const;

export type V2Category = keyof typeof V2_ASSETS;
export type V2AssetKey<C extends V2Category> = keyof (typeof V2_ASSETS)[C];

export function asset<C extends V2Category>(cat: C, key: V2AssetKey<C>): string {
  return (V2_ASSETS[cat] as Record<string, string>)[key as string];
}
