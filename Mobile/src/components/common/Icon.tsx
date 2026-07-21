/**
 * AutoWashPro Icon Component
 * SVG icon wrapper using @expo/vector-icons
 * Following UX guidelines: No emoji icons, consistent stroke width, vector-only assets
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColors } from '../../theme/ThemeContext';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  style,
}) => {
  const colors = useColors();
  return (
    <Ionicons
      name={name as any}
      size={size}
      color={color ?? colors.textPrimary}
      style={style}
    />
  );
};

// Catalog of icon names — curated for AutoWashPro flows
export const Icons = {
  // Navigation
  home: 'home',
  homeOutline: 'home-outline',
  calendar: 'calendar',
  calendarOutline: 'calendar-outline',
  list: 'list',
  listOutline: 'list-outline',
  gift: 'gift',
  giftOutline: 'gift-outline',
  person: 'person',
  personOutline: 'person-outline',

  // Actions
  back: 'chevron-back',
  backIOS: 'chevron-back',
  forward: 'chevron-forward',
  close: 'close',
  checkmark: 'checkmark',
  add: 'add',
  remove: 'remove',
  search: 'search',
  settings: 'settings',
  settingsOutline: 'settings-outline',
  share: 'share-outline',
  copy: 'copy-outline',

  // Status
  success: 'checkmark-circle',
  successOutline: 'checkmark-circle-outline',
  warning: 'warning',
  warningOutline: 'warning-outline',
  error: 'alert-circle',
  errorOutline: 'alert-circle-outline',
  info: 'information-circle',
  infoOutline: 'information-circle-outline',

  // Communication
  chat: 'chatbubbles',
  chatOutline: 'chatbubbles-outline',
  notifications: 'notifications',
  notificationsOutline: 'notifications-outline',
  mail: 'mail',
  mailOutline: 'mail-outline',
  call: 'call',
  callOutline: 'call-outline',
  mic: 'mic',
  micOutline: 'mic-outline',
  addCircleOutline: 'add-circle-outline',

  // Location
  location: 'location',
  locationOutline: 'location-outline',
  map: 'map',
  mapOutline: 'map-outline',
  pin: 'pin',
  pinOutline: 'pin-outline',

  // Vehicle
  car: 'car',
  carOutline: 'car-outline',
  carSport: 'car-sport',
  carSportOutline: 'car-sport-outline',
  bus: 'bus',
  busOutline: 'bus-outline',
  bicycle: 'bicycle',
  bicycleOutline: 'bicycle-outline',

  // Services
  sparkle: 'sparkles',
  sparkleOutline: 'sparkles-outline',
  time: 'time',
  timeOutline: 'time-outline',
  wallet: 'wallet',
  walletOutline: 'wallet-outline',
  card: 'card',
  cardOutline: 'card-outline',
  cash: 'cash',
  cashOutline: 'cash-outline',

  // Content
  star: 'star',
  starOutline: 'star-outline',
  starHalf: 'star-half',
  camera: 'camera',
  cameraOutline: 'camera-outline',
  qrCode: 'qr-code',
  qrCodeOutline: 'qr-code-outline',
  image: 'image',
  imageOutline: 'image-outline',
  document: 'document-text',
  documentOutline: 'document-text-outline',
  statsChart: 'stats-chart',
  statsChartOutline: 'stats-chart-outline',

  // Security
  eye: 'eye',
  eyeOutline: 'eye-outline',
  eyeOff: 'eye-off',
  eyeOffOutline: 'eye-off-outline',
  lock: 'lock-closed',
  lockOutline: 'lock-closed-outline',
  lockOpen: 'lock-open',
  lockOpenOutline: 'lock-open-outline',
  shield: 'shield-checkmark',
  shieldOutline: 'shield-checkmark-outline',

  // User
  personCircle: 'person-circle',
  personCircleOutline: 'person-circle-outline',
  people: 'people',
  peopleOutline: 'people-outline',
  happy: 'happy',
  happyOutline: 'happy-outline',
  sad: 'sad',
  sadOutline: 'sad-outline',
  logOut: 'log-out',
  logOutOutline: 'log-out-outline',
  logIn: 'log-in',
  logInOutline: 'log-in-outline',

  // Misc
  refresh: 'refresh',
  refreshOutline: 'refresh-outline',
  more: 'ellipsis-horizontal',
  moreOutline: 'ellipsis-horizontal-outline',
  moreVertical: 'ellipsis-vertical',
  filter: 'filter',
  filterOutline: 'filter-outline',
  sort: 'swap-vertical',
  download: 'download',
  downloadOutline: 'download-outline',
  upload: 'cloud-upload',
  trash: 'trash',
  trashOutline: 'trash-outline',
  create: 'create',
  createOutline: 'create-outline',
  chatBot: 'chatbubbles',
  voucher: 'pricetag',
  voucherOutline: 'pricetag-outline',
  menu: 'menu',
  cart: 'cart',
  cartOutline: 'cart-outline',
  trendingUp: 'trending-up',
  trendingDown: 'trending-down',
  globe: 'globe',
  globeOutline: 'globe-outline',
  language: 'language',
  languageOutline: 'language-outline',
  moon: 'moon',
  moonOutline: 'moon-outline',
  sunny: 'sunny',
  sunnyOutline: 'sunny-outline',
  cloud: 'cloud',
  cloudOutline: 'cloud-outline',
  moon2: 'cloudy-night',
  cloudDay: 'cloudy-day',
  volume: 'volume-high',
  volumeOutline: 'volume-high-outline',
  vibrate: 'tablet-portrait',
  bulb: 'bulb',
  bulbOutline: 'bulb-outline',
  bug: 'bug',
  bugOutline: 'bug-outline',
  storefront: 'storefront',
  storefrontOutline: 'storefront-outline',
  cube: 'cube',
  cubeOutline: 'cube-outline',
  hourglass: 'hourglass',
  hourglassOutline: 'hourglass-outline',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  chevronLeft: 'chevron-back',
  chevronRight: 'chevron-forward',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  help: 'help-circle',
  helpOutline: 'help-circle-outline',
  flag: 'flag',
  flagOutline: 'flag-outline',
  bookmark: 'bookmark',
  bookmarkOutline: 'bookmark-outline',
  heart: 'heart',
  heartOutline: 'heart-outline',
  diamond: 'diamond',
  diamondOutline: 'diamond-outline',
  trophy: 'trophy',
  trophyOutline: 'trophy-outline',
  ribbon: 'ribbon',
  ribbonOutline: 'ribbon-outline',
  thumbsUp: 'thumbs-up',
  thumbsUpOutline: 'thumbs-up-outline',
  flash: 'flash',
  flashOutline: 'flash-outline',
  water: 'water',
  waterOutline: 'water-outline',
  receipt: 'receipt',
  receiptOutline: 'receipt-outline',
  calendarClear: 'calendar-clear',
  calendarClearOutline: 'calendar-clear-outline',
  speedometer: 'speedometer',
  speedometerOutline: 'speedometer-outline',
  construct: 'construct',
  constructOutline: 'construct-outline',
  flask: 'flask',
  flaskOutline: 'flask-outline',
  barcode: 'barcode',
  barcodeOutline: 'barcode-outline',

  // Missing or legacy icons used in codebase
  checkmarkDoneCircleOutline: 'checkmark-done-circle-outline',
  informationCircleOutline: 'information-circle-outline',
  closeCircleOutline: 'close-circle-outline',
  shareOutline: 'share-outline',
  chevronForward: 'chevron-forward',
  helpCircleOutline: 'help-circle-outline',

  // Brand logos
  logoApple: 'logo-apple',
  logoFacebook: 'logo-facebook',
  logoGoogle: 'logo-google',
} as const;

export type IconName = keyof typeof Icons;

export default Icon;