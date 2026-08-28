/**
 * Assemble the core controller graph. Infrastructure, feature, route, media,
 * and startup concerns live in their dedicated runtime modules.
 */
import { confirmAction } from "./confirm-dialog.js";
import { configureCacheManagementUi } from "./cache-management-view.js";
import {
  createMediaControllerAssembly,
  createMediaRuntimeState,
} from "./app-runtime-media-assembly.js";
import { collectShellElements } from "./app-elements.js";
import { refreshAdminStorage as refreshStorage } from "./admin-storage.js";
import { createRuntimeVlogMode } from "./app-runtime-vlog-mode.js";
import { getNextWeekendDate } from "./weekend-date.js";
import {
  extractImageUrls,
  getClipboardImageUrl,
} from "./media-metadata.js";
import {
  APP_RUNTIME_CONFIG,
  DEFAULT_ACCOUNT_PROFILE,
  normalizeThanksColor,
  demoPhotos,
} from "./app-runtime-config.js";
import { createRuntimeInfrastructure } from "./app-runtime-infrastructure.js";
import { createShellControllerAssembly } from "./app-runtime-shell-assembly.js";
import { createAccountControllerAssembly } from "./app-runtime-account-assembly.js";
import { createFeatureControllerAssembly } from "./app-runtime-feature-assembly.js";
import { createFeatureRuntimeBindings } from "./app-runtime-feature-bindings.js";
import {
  createRuntimeRouteEntry,
  pageControllerRegistry,
  secretController,
  wardrobeController,
  recipeController,
  wishlistController,
  shoppingController,
  wishlistHubController,
  weekendController,
  familySettingsController,
  offlineSettingsController,
  dataSafetyController,
  callLoaded,
} from "./app-runtime-route-assembly.js";
import { createRuntimeStateAccessors } from "./app-runtime-state.js";
import {
  getLocalDateKey,
  getOffsetLocalDateKey,
  getPhotoOwnerId,
  getRedirectUrl as resolveRedirectUrl,
  isMissingCloudSchema,
  isYesterdayLoginDate,
  normalizeLoginDateKey,
  normalizeNickname,
  normalizeUuid,
  toDateInputValue,
  usernameToEmail,
} from "./app-domain.js";
import {
  escapeHtml,
  formatDate,
  formatFileSize,
  slugify,
} from "./ui-formatters.js";
import {
  getDefaultSecretSortOrder,
  normalizeSecretImages,
  SECRET_ALBUM_IMAGE_LIMIT,
} from "./secret-domain.js";
import { isNetworkLikeError } from "./network-error.js";

const {
  CLOUDFLARE_AUTH_KEY,
  AUTH_BACKUP_DB,
  AUTH_BACKUP_STORE,
  THEME_KEY,
  HOME_NAME_KEY,
  FAMILY_TAGLINE_KEY,
  VIP_RECHARGE_KEY,
  RECIPES_KEY,
  WEEKEND_KEY,
  ANNIVERSARY_KEY,
  FOOD_OPTIONS_KEY,
  TODAY_POSTS_SEEN_KEY,
  PHOTO_FEED_CACHE_KEY,
  SECRET_ITEMS_CACHE_KEY,
  SECRET_PIN_KEY,
  SECRET_UNLOCK_KEY,
  LEGACY_MEDIA_CACHE_NAME,
  DIARY_MEDIA_CACHE_NAME,
  SECRET_MEDIA_CACHE_NAME,
  DIARY_CACHE_MB_KEY,
  SECRET_CACHE_MB_KEY,
  MEDIA_CACHE_POLICY_KEY,
  DIARY_DRAFT_KEY,
  UPLOAD_QUEUE_DB,
  UPLOAD_QUEUE_STORE,
  EXPERIENCE_KEY,
  TODAY_EXPERIENCE_KEY,
  THANKS_COLOR_KEY,
  AVATAR_CACHE_KEY,
  MOBILE_FEED_LAYOUT_KEY,
  MOBILE_SECRET_LAYOUT_KEY,
  DEFAULT_FAMILY_TAGLINE,
  SECRET_UNLOCK_MAX_MS,
  THANKS_COLORS,
  DEFAULT_THANKS_COLOR,
  PHOTO_CATEGORIES,
  BUCKET,
  PRODUCTION_URL,
  R2_UPLOAD_ENDPOINT,
  R2_PUBLIC_URL,
  PAGE_SIZE,
  VIP_USERS,
  PHOTO_COMMENT_PREVIEW_LIMIT,
  METADATA_CACHE_ITEM_LIMIT,
  AUTO_DIARY_CACHE_ITEM_LIMIT,
  DEFAULT_DIARY_CACHE_MB,
  DEFAULT_SECRET_CACHE_MB,
  MIN_CACHE_MB,
  MAX_CACHE_MB,
  TOOL_DOCK_ORDER_KEY,
  TOOL_DOCK_DEFAULT_ORDER,
  TOOL_DOCK_LABELS,
  MOBILE_DIALOG_BREAKPOINT,
  SECRET_ALL_FOLDER_ID,
  SECRET_FAVORITES_FOLDER_ID,
  DEFAULT_FOOD_OPTIONS,
  GENERATED_TITLE_PREFIXES,
} = APP_RUNTIME_CONFIG;
const runtimeHooks = { renderUploadCenter: null };
const runtimeInfrastructure = createRuntimeInfrastructure({
  documentTarget: document,
  config: {
    r2UploadEndpoint: R2_UPLOAD_ENDPOINT,
    r2PublicUrl: R2_PUBLIC_URL,
    cloudflareAuthKey: CLOUDFLARE_AUTH_KEY,
    authBackupDb: AUTH_BACKUP_DB,
    authBackupStore: AUTH_BACKUP_STORE,
    diaryMediaCacheName: DIARY_MEDIA_CACHE_NAME,
    secretMediaCacheName: SECRET_MEDIA_CACHE_NAME,
    legacyMediaCacheName: LEGACY_MEDIA_CACHE_NAME,
    uploadQueueDb: UPLOAD_QUEUE_DB,
    uploadQueueStore: UPLOAD_QUEUE_STORE,
    bucket: BUCKET,
  },
  usernameToEmail,
  formatFileSize,
  slugify,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getUploadQuality: () => getUploadQuality(),
  isNetworkLikeError: (error) => isNetworkLikeError(error),
  setStatus: (...args) => setStatus(...args),
  secretDataState: {
    getSecretItems: () => secretItems,
    setSecretItems: (value) => { secretItems = value; },
    setSecretFolders: (value) => { secretFolders = value; },
    setSecretCloudAvailable: (value) => { secretCloudAvailable = value; },
    setLastSecretSyncAt: (value) => { lastSecretSyncAt = value; },
  },
  onUploadQueueChange: () => runtimeHooks.renderUploadCenter?.(),
  onTaskChanged: () => runtimeHooks.renderUploadCenter?.(),
});
const {
  performanceMonitor,
  healthMonitor,
  activeUploadTasks,
  appServices,
} = runtimeInfrastructure;
const {
  preferenceStore,
  cloudflareBackend: baseCloudflareBackend,
  mediaCacheService,
  diaryUploadQueue,
  diaryRepository,
  secretRepository,
  secretDataService,
  notificationRepository,
  householdRepository,
  wardrobeRepository,
  photoFavorites,
  assetController,
} = appServices;
const {
  createClient: createCloudflareClient,
  getEndpoint: getCloudflareEndpoint,
  readSession: readCloudflareSession,
  request: cloudflareRequest,
  restoreSessionBackup: restoreCloudflareSessionBackup,
  writeSession: writeCloudflareSession,
  writeSessionBackup: writeCloudflareSessionBackup,
} = baseCloudflareBackend;
let cloudDb = null;
let session = null;
let photos = [];
let recipes = [];
let wishes = [];
let shoppingItems = [];
let weekendPlans = [];
let anniversaries = [];
let gratitudeNotes = [];
let secretItems = [];
let secretFolders = [];
let familyInfo = null;
let familyMembers = [];
let familyInvitations = [];
let familyMemberMap = new Map();
let familyLevelProfiles = new Map();
let activeDialogPhoto = null;
let mobileDiaryPhoto = null;
let mobileDiaryPage = null;
let mobileDiaryRestoreScrollY = 0;
let mobileDiaryImageIndex = 0;
let mobileDiaryReplyToId = null;
let mobileDiaryBackSwipeStart = null;
let mobileDiaryImageSwipeStart = null;
let mobileDiarySuppressImageClickUntil = 0;
let photoComments = [];
let photoCommentPreviewMap = new Map();
let notifications = [];
let commentReplyToId = null;
let photosLoadPromise = null;
let notificationsLoadPromise = null;
let secretLoadPromise = null;
let lastSecretSyncAt = 0;
let galleryRenderSignature = "";
let lastAppBadgeCount = -1;
let pendingNewPhotos = [];
let dismissedFeedRefreshIds = new Set();
let feedRefreshCheckInFlight = false;
let returnToSettingsAfterDialog = false;
let activeSettingsSection = "settingsGeneral";
let dialogRestoreScrollY = 0;
let dialogRestorePhotoId = "";
let dialogRestorePhotoTop = 0;
let dialogRestoreSecretImageUrl = "";
let dialogRestoreElementTop = 0;
let foodOptions = [];
let activePage = "gallery";
let activeFilter = "全部";
let appNavigationController = null;
let processDiaryUploadQueue = () => undefined;
let setUploadExpanded = () => undefined;
let syncExistingPushSubscription = () => undefined;
let registerAppShellWorker = () => undefined;
let renderFoodWheel = () => undefined;
let renderExperience = () => undefined;
let awardExperience = () => undefined;
let renderGratitudeNotes = () => undefined;
let saveThanksColorPreference = () => undefined;
let synchronizeAnniversaries = () => undefined;
let loadCacheCapacityMb = () => 0;
let loadMediaCachePolicy = () => undefined;
let refreshCacheInfo = () => undefined;
let renderCachedPhotoFeed = () => undefined;
let savePhotoFeedCache = () => undefined;
let updateCloudSyncStatus = () => undefined;
let createTrashItem = () => undefined;
let rollbackTrashItem = () => undefined;
let loadFoodOptions = () => [];
let loadThanksColor = () => undefined;
let setSelectedThanksColor = () => undefined;
let saveFoodOptionsCache = () => undefined;
let renderSecretFolderControls = () => undefined;
let openSettingsChildDialog = () => undefined;
let reopenSettingsAfterChildDialog = () => undefined;
let openPhoto = () => undefined;
let deletePhoto = () => undefined;
let openEditPhoto = () => undefined;
let closePhotoDialog = () => undefined;
let closeMobileDiaryPage = () => undefined;
let renderMobileDiaryPage = () => undefined;
let renderMobileDiaryComments = () => undefined;
let openWishImage = () => undefined;
let openWeekendImageGallery = () => undefined;
let renderDialogMedia = () => undefined;
let fitSecretViewerImage = () => undefined;
let refreshDiaryViewerToolbar = () => undefined;
let refreshSecretViewerToolbar = () => undefined;
let resetSecretImageZoom = () => undefined;
let setSecretViewerStatus = () => undefined;
let updateSecretToolbarTop = () => undefined;
let openMobileDiaryImageViewer = () => undefined;
let closeMobileDiaryImageViewer = () => undefined;
let showPhotoDialogPreservingScroll = () => undefined;
let openMobileDiaryPage = () => undefined;
let ensureMobileDiaryPage = () => undefined;
let beginGlobalMobileBackSwipe = () => undefined;
let moveGlobalMobileBackSwipe = () => undefined;
let finishGlobalMobileBackSwipe = () => undefined;
let cancelGlobalMobileBackSwipe = () => undefined;
const mediaHooks = { deletePhoto: null };
const switchPage = (...args) => appNavigationController?.switchPage(...args) ?? false;
const renderOverview = (...args) => appNavigationController?.renderOverview(...args);
const openRandomMemory = (...args) => appNavigationController?.openRandomMemory(...args);
const vlogMode = createRuntimeVlogMode({
  canOpen: () => Boolean(session),
  getActiveFilter: () => activeFilter,
  setActiveFilter: (value) => { activeFilter = value; },
  switchPage: (...args) => switchPage(...args),
  pageSize: PAGE_SIZE,
  setVisiblePhotoCount: (value) => { visiblePhotoCount = value; },
  updateFilterChips: (...args) => updateFilterChips(...args),
  renderGallery: (...args) => renderGallery(...args),
  setUploadExpanded: (...args) => setUploadExpanded(...args),
});
let activeSecretFilter = "全部";
let activeSecretAlbumId = "";
let activeSecretFolderId = SECRET_ALL_FOLDER_ID;
let secretDefaultFolderId = "";
let secretFolderContextMenu = null;
let secretAlbumContextMenu = null;
let secretSearchQuery = "";
let secretSelectionMode = false;
let selectedSecretImageIndexes = new Set();
let secretAlbumEditing = false;
let secretAppendExpanded = false;
let secretMobileToolsExpanded = false;
let diarySearchQuery = "";
let activeWishView = "open";
let activeShoppingFilter = "open";
let visiblePhotoCount = PAGE_SIZE;
let filteredPhotoCount = 0;
let showingCachedFeed = false;
let feedObserver = null;
let feedLoading = false;
let pullRefreshState = null;
let galleryMasonryObserver = null;
let galleryMasonryTimer = null;
let editingPhoto = null;
let editingImages = [];
let editingImageFiles = new Map();
let editingRemovedPaths = new Set();
let editingReplaceIndex = -1;
let editingPreviewUrls = [];
let dialogImages = [];
let dialogImageIndex = 0;
let dialogImageRequestId = 0;
let dialogSwipeStart = null;
let desktopImagePan = null;
let dialogBackSwipeStart = null;
let globalMobileBackSwipeStart = null;
let secretImageGesture = null;
let secretImageZoom = { scale: 1, x: 0, y: 0 };
let diaryImageRotation = 0;
let secretViewerReturnFocus = null;
let secretViewerInfoOpen = false;
let secretViewerResizeTimer = null;
let suppressDialogImageClickUntil = 0;
let suppressDialogSwipeUntil = 0;
let dialogWheelAccumulator = 0;
let dialogWheelResetTimer = null;
let dialogWheelLockedUntil = 0;
let lockedDialogScrollY = 0;
let dialogLockUsesFixed = false;
let dialogRandomMode = false;
let dialogSecretSourceItem = null;
let activeSecretDialogItem = null;
let photoDialogBackdrop = null;
let mobileDiaryImageViewerOpen = false;
let toolDockDragState = null;
let suppressToolDockClick = false;
let activeVipLevel = 1;
let weekendCloudAvailable = false;
let anniversaryCloudAvailable = false;
let secretCloudAvailable = false;
let photoFlagsCloudAvailable = false;
let foodOptionsCloudAvailable = false;
let profilePreferencesCloudAvailable = false;
let thanksColorCloudAvailable = false;
let cloudSyncAvailable = false;
let cloudSyncInFlight = null;
let syncedUserId = "";
let accountDataState = "idle";
let accountProfile = { ...DEFAULT_ACCOUNT_PROFILE, foodOptions: [] };

const runtimeState = createRuntimeStateAccessors({
  cloudDb: { get: () => cloudDb, set: (value) => { cloudDb = value; } },
  session: { get: () => session, set: (value) => { session = value; } },
  photos: { get: () => photos, set: (value) => { photos = value; } },
  recipes: { get: () => recipes, set: (value) => { recipes = value; } },
  wishes: { get: () => wishes, set: (value) => { wishes = value; } },
  shoppingItems: { get: () => shoppingItems, set: (value) => { shoppingItems = value; } },
  weekendPlans: { get: () => weekendPlans, set: (value) => { weekendPlans = value; } },
  anniversaries: { get: () => anniversaries, set: (value) => { anniversaries = value; } },
  gratitudeNotes: { get: () => gratitudeNotes, set: (value) => { gratitudeNotes = value; } },
  secretItems: { get: () => secretItems, set: (value) => { secretItems = value; } },
  familyInfo: { get: () => familyInfo, set: (value) => { familyInfo = value; } },
  familyMembers: { get: () => familyMembers, set: (value) => { familyMembers = value; } },
  familyInvitations: { get: () => familyInvitations, set: (value) => { familyInvitations = value; } },
  familyMemberMap: { get: () => familyMemberMap, set: (value) => { familyMemberMap = value; } },
  accountProfile: { get: () => accountProfile, set: (value) => { accountProfile = value; } },
  familyLevelProfiles: { get: () => familyLevelProfiles, set: (value) => { familyLevelProfiles = value; } },
  lastAppBadgeCount: { get: () => lastAppBadgeCount, set: (value) => { lastAppBadgeCount = value; } },
  activeDialogPhoto: { get: () => activeDialogPhoto, set: (value) => { activeDialogPhoto = value; } },
  secretFolders: { get: () => secretFolders, set: (value) => { secretFolders = value; } },
  photoComments: { get: () => photoComments, set: (value) => { photoComments = value; } },
  photoCommentPreviewMap: { get: () => photoCommentPreviewMap, set: (value) => { photoCommentPreviewMap = value; } },
  notifications: { get: () => notifications, set: (value) => { notifications = value; } },
  commentReplyToId: { get: () => commentReplyToId, set: (value) => { commentReplyToId = value; } },
  photosLoadPromise: { get: () => photosLoadPromise, set: (value) => { photosLoadPromise = value; } },
  notificationsLoadPromise: { get: () => notificationsLoadPromise, set: (value) => { notificationsLoadPromise = value; } },
  secretLoadPromise: { get: () => secretLoadPromise, set: (value) => { secretLoadPromise = value; } },
  dialogRestoreScrollY: { get: () => dialogRestoreScrollY, set: (value) => { dialogRestoreScrollY = value; } },
  dialogRestorePhotoId: { get: () => dialogRestorePhotoId, set: (value) => { dialogRestorePhotoId = value; } },
  dialogRestorePhotoTop: { get: () => dialogRestorePhotoTop, set: (value) => { dialogRestorePhotoTop = value; } },
  dialogRestoreSecretImageUrl: { get: () => dialogRestoreSecretImageUrl, set: (value) => { dialogRestoreSecretImageUrl = value; } },
  dialogRestoreElementTop: { get: () => dialogRestoreElementTop, set: (value) => { dialogRestoreElementTop = value; } },
  feedRefreshCheckInFlight: { get: () => feedRefreshCheckInFlight, set: (value) => { feedRefreshCheckInFlight = value; } },
  galleryRenderSignature: { get: () => galleryRenderSignature, set: (value) => { galleryRenderSignature = value; } },
  galleryMasonryTimer: { get: () => galleryMasonryTimer, set: (value) => { galleryMasonryTimer = value; } },
  galleryMasonryObserver: { get: () => galleryMasonryObserver, set: (value) => { galleryMasonryObserver = value; } },
  feedObserver: { get: () => feedObserver, set: (value) => { feedObserver = value; } },
  feedLoading: { get: () => feedLoading, set: (value) => { feedLoading = value; } },
  pullRefreshState: { get: () => pullRefreshState, set: (value) => { pullRefreshState = value; } },
  mobileDiaryPhoto: { get: () => mobileDiaryPhoto, set: (value) => { mobileDiaryPhoto = value; } },
  mobileDiaryPage: { get: () => mobileDiaryPage, set: (value) => { mobileDiaryPage = value; } },
  diarySearchQuery: { get: () => diarySearchQuery, set: (value) => { diarySearchQuery = value; } },
  toolDockDragState: { get: () => toolDockDragState, set: (value) => { toolDockDragState = value; } },
  suppressToolDockClick: { get: () => suppressToolDockClick, set: (value) => { suppressToolDockClick = value; } },
  activePage: { get: () => activePage, set: (value) => { activePage = value; } },
  activeFilter: { get: () => activeFilter, set: (value) => { activeFilter = value; } },
  activeWishView: { get: () => activeWishView, set: (value) => { activeWishView = value; } },
  activeSecretFilter: { get: () => activeSecretFilter, set: (value) => { activeSecretFilter = value; } },
  activeSecretAlbumId: { get: () => activeSecretAlbumId, set: (value) => { activeSecretAlbumId = value; } },
  activeSecretFolderId: { get: () => activeSecretFolderId, set: (value) => { activeSecretFolderId = value; } },
  secretFolderContextMenu: { get: () => secretFolderContextMenu, set: (value) => { secretFolderContextMenu = value; } },
  secretSearchQuery: { get: () => secretSearchQuery, set: (value) => { secretSearchQuery = value; } },
  secretSelectionMode: { get: () => secretSelectionMode, set: (value) => { secretSelectionMode = value; } },
  selectedSecretImageIndexes: { get: () => selectedSecretImageIndexes, set: (value) => { selectedSecretImageIndexes = value; } },
  secretAlbumEditing: { get: () => secretAlbumEditing, set: (value) => { secretAlbumEditing = value; } },
  secretAppendExpanded: { get: () => secretAppendExpanded, set: (value) => { secretAppendExpanded = value; } },
  secretMobileToolsExpanded: { get: () => secretMobileToolsExpanded, set: (value) => { secretMobileToolsExpanded = value; } },
  secretAlbumContextMenu: { get: () => secretAlbumContextMenu, set: (value) => { secretAlbumContextMenu = value; } },
  secretDefaultFolderId: { get: () => secretDefaultFolderId, set: (value) => { secretDefaultFolderId = value; } },
  activeSettingsSection: { get: () => activeSettingsSection, set: (value) => { activeSettingsSection = value; } },
  returnToSettingsAfterDialog: { get: () => returnToSettingsAfterDialog, set: (value) => { returnToSettingsAfterDialog = value; } },
  activeVipLevel: { get: () => activeVipLevel, set: (value) => { activeVipLevel = value; } },
  cloudSyncAvailable: { get: () => cloudSyncAvailable, set: (value) => { cloudSyncAvailable = value; } },
  cloudSyncInFlight: { get: () => cloudSyncInFlight, set: (value) => { cloudSyncInFlight = value; } },
  weekendCloudAvailable: { get: () => weekendCloudAvailable, set: (value) => { weekendCloudAvailable = value; } },
  anniversaryCloudAvailable: { get: () => anniversaryCloudAvailable, set: (value) => { anniversaryCloudAvailable = value; } },
  secretCloudAvailable: { get: () => secretCloudAvailable, set: (value) => { secretCloudAvailable = value; } },
  photoFlagsCloudAvailable: { get: () => photoFlagsCloudAvailable, set: (value) => { photoFlagsCloudAvailable = value; } },
  foodOptionsCloudAvailable: { get: () => foodOptionsCloudAvailable, set: (value) => { foodOptionsCloudAvailable = value; } },
  profilePreferencesCloudAvailable: { get: () => profilePreferencesCloudAvailable, set: (value) => { profilePreferencesCloudAvailable = value; } },
  thanksColorCloudAvailable: { get: () => thanksColorCloudAvailable, set: (value) => { thanksColorCloudAvailable = value; } },
  accountDataState: { get: () => accountDataState, set: (value) => { accountDataState = value; } },
  activeShoppingFilter: { get: () => activeShoppingFilter, set: (value) => { activeShoppingFilter = value; } },
  lastSecretSyncAt: { get: () => lastSecretSyncAt, set: (value) => { lastSecretSyncAt = value; } },
  syncedUserId: { get: () => syncedUserId, set: (value) => { syncedUserId = value; } },
  foodOptions: { get: () => foodOptions, set: (value) => { foodOptions = value; } },
  mobileDiaryRestoreScrollY: { get: () => mobileDiaryRestoreScrollY, set: (value) => { mobileDiaryRestoreScrollY = value; } },
  mobileDiaryImageIndex: { get: () => mobileDiaryImageIndex, set: (value) => { mobileDiaryImageIndex = value; } },
  mobileDiaryReplyToId: { get: () => mobileDiaryReplyToId, set: (value) => { mobileDiaryReplyToId = value; } },
  mobileDiaryBackSwipeStart: { get: () => mobileDiaryBackSwipeStart, set: (value) => { mobileDiaryBackSwipeStart = value; } },
  mobileDiaryImageSwipeStart: { get: () => mobileDiaryImageSwipeStart, set: (value) => { mobileDiaryImageSwipeStart = value; } },
  mobileDiarySuppressImageClickUntil: { get: () => mobileDiarySuppressImageClickUntil, set: (value) => { mobileDiarySuppressImageClickUntil = value; } },
  editingPhoto: { get: () => editingPhoto, set: (value) => { editingPhoto = value; } },
  editingImages: { get: () => editingImages, set: (value) => { editingImages = value; } },
  editingImageFiles: { get: () => editingImageFiles, set: (value) => { editingImageFiles = value; } },
  editingRemovedPaths: { get: () => editingRemovedPaths, set: (value) => { editingRemovedPaths = value; } },
  editingReplaceIndex: { get: () => editingReplaceIndex, set: (value) => { editingReplaceIndex = value; } },
  editingPreviewUrls: { get: () => editingPreviewUrls, set: (value) => { editingPreviewUrls = value; } },
  dialogImages: { get: () => dialogImages, set: (value) => { dialogImages = value; } },
  dialogImageIndex: { get: () => dialogImageIndex, set: (value) => { dialogImageIndex = value; } },
  dialogImageRequestId: { get: () => dialogImageRequestId, set: (value) => { dialogImageRequestId = value; } },
  dialogSwipeStart: { get: () => dialogSwipeStart, set: (value) => { dialogSwipeStart = value; } },
  desktopImagePan: { get: () => desktopImagePan, set: (value) => { desktopImagePan = value; } },
  dialogBackSwipeStart: { get: () => dialogBackSwipeStart, set: (value) => { dialogBackSwipeStart = value; } },
  secretImageGesture: { get: () => secretImageGesture, set: (value) => { secretImageGesture = value; } },
  secretImageZoom: { get: () => secretImageZoom, set: (value) => { secretImageZoom = value; } },
  diaryImageRotation: { get: () => diaryImageRotation, set: (value) => { diaryImageRotation = value; } },
  secretViewerReturnFocus: { get: () => secretViewerReturnFocus, set: (value) => { secretViewerReturnFocus = value; } },
  secretViewerInfoOpen: { get: () => secretViewerInfoOpen, set: (value) => { secretViewerInfoOpen = value; } },
  secretViewerResizeTimer: { get: () => secretViewerResizeTimer, set: (value) => { secretViewerResizeTimer = value; } },
  suppressDialogImageClickUntil: { get: () => suppressDialogImageClickUntil, set: (value) => { suppressDialogImageClickUntil = value; } },
  suppressDialogSwipeUntil: { get: () => suppressDialogSwipeUntil, set: (value) => { suppressDialogSwipeUntil = value; } },
  dialogWheelAccumulator: { get: () => dialogWheelAccumulator, set: (value) => { dialogWheelAccumulator = value; } },
  dialogWheelResetTimer: { get: () => dialogWheelResetTimer, set: (value) => { dialogWheelResetTimer = value; } },
  dialogWheelLockedUntil: { get: () => dialogWheelLockedUntil, set: (value) => { dialogWheelLockedUntil = value; } },
  lockedDialogScrollY: { get: () => lockedDialogScrollY, set: (value) => { lockedDialogScrollY = value; } },
  dialogLockUsesFixed: { get: () => dialogLockUsesFixed, set: (value) => { dialogLockUsesFixed = value; } },
  dialogRandomMode: { get: () => dialogRandomMode, set: (value) => { dialogRandomMode = value; } },
  dialogSecretSourceItem: { get: () => dialogSecretSourceItem, set: (value) => { dialogSecretSourceItem = value; } },
  activeSecretDialogItem: { get: () => activeSecretDialogItem, set: (value) => { activeSecretDialogItem = value; } },
  photoDialogBackdrop: { get: () => photoDialogBackdrop, set: (value) => { photoDialogBackdrop = value; } },
  mobileDiaryImageViewerOpen: { get: () => mobileDiaryImageViewerOpen, set: (value) => { mobileDiaryImageViewerOpen = value; } },
  pendingNewPhotos: { get: () => pendingNewPhotos, set: (value) => { pendingNewPhotos = value; } },
  dismissedFeedRefreshIds: { get: () => dismissedFeedRefreshIds, set: (value) => { dismissedFeedRefreshIds = value; } },
  showingCachedFeed: { get: () => showingCachedFeed, set: (value) => { showingCachedFeed = value; } },
  visiblePhotoCount: { get: () => visiblePhotoCount, set: (value) => { visiblePhotoCount = value; } },
  filteredPhotoCount: { get: () => filteredPhotoCount, set: (value) => { filteredPhotoCount = value; } },
  activeUploadTasks: { get: () => activeUploadTasks },
});

let appSessionController = null;
const updateAuthUI = (...args) => appSessionController?.updateAuthUI(...args);

const els = collectShellElements(document);
const shellRuntime = createShellControllerAssembly({
  elements: els,
  state: runtimeState,
  services: appServices,
  config: {
    avatarCacheKey: AVATAR_CACHE_KEY,
    photoCategories: PHOTO_CATEGORIES,
    homeNameKey: HOME_NAME_KEY,
    familyTaglineKey: FAMILY_TAGLINE_KEY,
    homeName: "咻蛋之家",
    defaultFamilyTagline: DEFAULT_FAMILY_TAGLINE,
    todayPostsSeenKey: TODAY_POSTS_SEEN_KEY,
    photoCommentPreviewLimit: PHOTO_COMMENT_PREVIEW_LIMIT,
    pageSize: PAGE_SIZE,
    demoPhotos,
    getNextWeekendDate,
    toolDockOrderKey: TOOL_DOCK_ORDER_KEY,
    toolDockDefaultOrder: TOOL_DOCK_DEFAULT_ORDER,
    toolDockLabels: TOOL_DOCK_LABELS,
    mobileFeedLayoutKey: MOBILE_FEED_LAYOUT_KEY,
    mobileSecretLayoutKey: MOBILE_SECRET_LAYOUT_KEY,
    mobileDialogBreakpoint: MOBILE_DIALOG_BREAKPOINT,
    secretAllFolderId: SECRET_ALL_FOLDER_ID,
    secretFavoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
    generatedTitlePrefixes: GENERATED_TITLE_PREFIXES,
  },
  core: {
    escapeHtml,
    slugify,
    getProfileAvatarUrl: (...args) => appServices.assetController.getProfileAvatarUrl(...args),
    getLocalDateKey,
    getPhotoOwnerId,
    isMissingCloudSchema,
    switchPage,
    renderOverview,
    renderExperience: (...args) => renderExperience(...args),
    renderMobileDiaryPage: (...args) => renderMobileDiaryPage(...args),
    renderCachedPhotoFeed: (...args) => renderCachedPhotoFeed(...args),
    savePhotoFeedCache: (...args) => savePhotoFeedCache(...args),
    updateCloudSyncStatus: (...args) => updateCloudSyncStatus(...args),
    openPhoto: (...args) => openPhoto(...args),
    deletePhoto: (...args) => deletePhoto(...args),
    openEditPhoto: (...args) => openEditPhoto(...args),
    renderMobileDiaryComments: (...args) => renderMobileDiaryComments(...args),
    awardExperience: (...args) => awardExperience(...args),
    openSettingsChildDialog: (...args) => openSettingsChildDialog(...args),
    reopenSettingsAfterChildDialog: (...args) => reopenSettingsAfterChildDialog(...args),
    renderSecretFolderControls: (...args) => renderSecretFolderControls(...args),
  },
  pages: {
    familySettingsController,
    offlineSettingsController,
    dataSafetyController,
    callLoaded,
  },
  performanceMonitor,
  healthMonitor,
});
const {
  appFeedbackView,
  performanceDiagnosticsView,
  textScaleController,
  diaryMetadata,
  identityController,
  householdBrandingController,
  diaryFeedController,
  socialController,
  familyActivityController,
  toolDockController,
  layoutSettingsController,
  secretEntryPreferenceController,
} = shellRuntime;
const shellActions = shellRuntime.actions;
const {
  dismissMiniToast,
  isMobileViewport,
  setGlobalStatus,
  setHint,
  setSecretStatus,
  setStatus,
  showMiniToast,
  updateDiaryBackTopButton,
  updateNetworkStatus,
  getDisplayTitle,
  getFinalTitle,
  getPhotoLabel,
  getUploadFileNameBase,
  adminUpdatePhotoCategory,
  canManageItem,
  getAuthorName,
  getSessionBoundEmail,
  getSessionDisplayName,
  getSessionLoginName,
  isAdminAccount,
  loadCachedAvatarUrl,
  renderAccountAvatar,
  renderAvatarMarkup,
  saveCachedAvatarUrl,
  updateSessionDisplayName,
  applyFamilyTagline,
  applyHomeName,
  loadFamilyTagline,
  loadHomeName,
  normalizeFamilyTagline,
  normalizeHomeName,
  saveConfig,
  loadPhotos,
  loadPhotoCommentPreviews,
  getLocalDateKeyFromValue,
  isPhotoPublishedToday,
  getTodayPostsSeenStorageKey,
  loadTodaySeenPostIds,
  saveTodaySeenPostIds,
  getSortedPhotos,
  getTodayPublishedPhotos,
  getUpcomingWeekendPlans,
  getWeekendReminderDismissKey,
  renderWeekendReminderNotice,
  markTodayPostsViewed,
  acknowledgeViewedDiary,
  renderFeedRefreshNotice,
  checkForNewPhotos,
  refreshFeedForNewPhotos,
  updateTodayPostsNotice,
  updateFilterChips,
  showTodayPosts,
  renderPhotoCommentPreview,
  verifyPhotoFlagSchema,
  renderGallery,
  layoutGalleryMasonry,
  scheduleGalleryMasonryLayout,
  ensurePullRefreshIndicator,
  initializePullToRefresh,
  observeGalleryMasonry,
  getPhotoSearchText,
  updateDiarySearchSuggestions,
  filterPhotosBySearch,
  updateDiarySearchUi,
  isPhotoWithinSevenDays,
  togglePhotoFlag,
  togglePhotoFavorite,
  warmUpcomingFeedImages,
  getPhotoImages,
  getPlainNote,
  isFavoritePhoto,
  updateFeedLoader,
  initializeFeedObserver,
  syncAppIconBadge,
  getNotificationText,
  getNotificationActorName,
  getNotificationActorAvatar,
  loadNotifications,
  renderNotifications,
  openNotification,
  openNotificationsPanel,
  markUnreadNotificationsRead,
  loadPhotoComments,
  renderPhotoComments,
  startCommentReply,
  cancelCommentReply,
  savePhotoComment,
  deletePhotoComment,
  getFamilyTimelineEntries,
  getCurrentWeekRange,
  isWithinRange,
  loadWeeklyReview,
  openWeeklyReview,
  renderFamilyTimeline,
  ensureFamilyTimelineUi,
  getToolDockOrderStorageKey,
  normalizeToolDockOrder,
  loadToolDockOrder,
  writeToolDockOrder,
  saveToolDockOrder,
  applyToolDockOrder,
  renderSettingsToolOrderPanel,
  renderSettingsSummary,
  renderSettingsAccountOverview,
  ensureToolDockSortControls,
  startToolDockPointer,
  beginToolDockTouchSort,
  beginToolDockDrag,
  moveToolDockPointer,
  finishToolDockPointer,
  handleToolDockClick,
  moveToolDockItem,
  exitToolDockTouchSort,
  getMobileFeedLayoutKey,
  loadMobileFeedLayout,
  applyMobileFeedLayout,
  setMobileFeedLayout,
  getMobileSecretLayoutKey,
  loadMobileSecretLayout,
  ensureSecretLayoutToggle,
  applyMobileSecretLayout,
  setMobileSecretLayout,
  syncMobileComposerPlacement,
  ensureFamilySignatureUi,
  getSecretDefaultFolderId,
  setSecretDefaultFolderId,
} = shellActions;
const { updateSecretToolbarTop: updateSecretToolbarTopFromLayout } = shellActions;
updateSecretToolbarTop = updateSecretToolbarTopFromLayout;

const {
  cleanupStoredImagePaths,
  compressImage,
  copyUrlToR2,
  deleteR2Object,
  getProfileAvatarUrl,
  getR2Key,
  getR2PublicAssetUrl,
  isR2Path,
  isR2Url,
  migrateImageAsset,
  resolveStoredAssetUrl,
  shouldMigrateImageAsset,
  uploadDiaryMotionFile,
  uploadDiaryVideoFile,
  uploadImageFile,
  uploadToR2,
} = assetController;
const accountRuntime = createAccountControllerAssembly({
  elements: els,
  state: runtimeState,
  services: appServices,
  config: {
    vipRechargeKey: VIP_RECHARGE_KEY,
    experienceKey: EXPERIENCE_KEY,
    todayExperienceKey: TODAY_EXPERIENCE_KEY,
    vipUsers: VIP_USERS,
    themeKey: THEME_KEY,
    secretPinKey: SECRET_PIN_KEY,
    secretUnlockKey: SECRET_UNLOCK_KEY,
    secretUnlockMaxMs: SECRET_UNLOCK_MAX_MS,
    defaultFoodOptions: DEFAULT_FOOD_OPTIONS,
  },
  core: {
    loadNotifications,
    checkForNewPhotos,
    processDiaryUploadQueue: (...args) => processDiaryUploadQueue(...args),
    syncExistingPushSubscription: (...args) => syncExistingPushSubscription(...args),
    getProfileAvatarUrl,
    getLocalDateKey,
    getOffsetLocalDateKey,
    normalizeLoginDateKey,
    isYesterdayLoginDate,
    updateAuthUI,
    renderOverview,
    isMissingCloudSchema,
    normalizeNickname,
    normalizeTheme: (...args) => normalizeTheme(...args),
    loadTheme: (...args) => loadTheme(...args),
    normalizeThanksColor: (...args) => normalizeThanksColor(...args),
    renderGallery,
    renderPhotoComments,
    loadPhotos,
    refreshStorage,
    renderGratitudeNotes: (...args) => renderGratitudeNotes(...args),
    loadFoodOptions: (...args) => loadFoodOptions(...args),
    loadThanksColor: (...args) => loadThanksColor(...args),
    saveThanksColorPreference: (...args) => saveThanksColorPreference(...args),
    setSelectedThanksColor: (...args) => setSelectedThanksColor(...args),
    saveFoodOptionsCache: (...args) => saveFoodOptionsCache(...args),
    renderFoodWheel: (...args) => renderFoodWheel(...args),
    synchronizeAnniversaries: (...args) => synchronizeAnniversaries(...args),
    switchPage,
    setGlobalStatus,
  },
  pages: {
    familySettingsController,
    recipeController,
    wishlistController,
    shoppingController,
    weekendController,
    secretController,
    callLoaded,
  },
  shell: shellRuntime,
  performanceMonitor,
  healthMonitor,
});
const {
  appLifecycleController,
  gamificationController,
  accountSyncController,
  profilePreferencesController,
  secretPinController,
} = accountRuntime;
const accountActions = accountRuntime.actions;
const {
  addTodayExperience,
  awardDailyExperience,
  getCurrentImageLimit,
  getDailyLoginReward,
  getExperienceLevel,
  getLoginStreakBonusBase,
  getNextLoginStreak,
  getTodayExperienceStorageKey,
  getUploadQuality,
  getUpgradeEta,
  getVipAdjustedExperience,
  getVipExpMultiplier,
  isVipUser,
  loadExperience,
  loadLocalExperienceAliases,
  loadFamilyLevelProfiles,
  loadRechargeTotal,
  loadTodayExperience,
  openAchievementDialog,
  openLevelDialog,
  openLevelGuidePage,
  rechargeVip,
  renderAchievementDialog,
  renderLevelDialog,
  renderTopLevelBadge,
  renderVipCenter,
  saveExperience,
  saveRechargeTotal,
  loadFamilyContext,
  loadGratitudeNotes,
  synchronizeWeekendPlans,
  synchronizeAccountData,
  applyTheme,
  clearAvatarPreviewUrl,
  loadTheme,
  normalizeTheme,
  persistHomeNameToCloud,
  restoreDefaultHomeName,
  saveAvatar,
  saveHomeName,
  saveProfileNickname,
  setAvatarPreview,
  toggleTheme,
  updateAvatarPreview,
  appendSecretPinDigit,
  clearUnlockState: clearSecretUnlockState,
  deleteSecretPinDigit,
  isSecretUnlocked,
  markSecretLeft,
  openSecretPinDialog,
  openSecretPinSettings,
} = accountActions;
awardExperience = accountActions.awardExperience;
renderExperience = accountActions.renderExperience;
updateCloudSyncStatus = accountActions.updateCloudSyncStatus;
const secretState = createMediaRuntimeState(runtimeState);
const mediaRuntime = createMediaControllerAssembly({
  elements: els,
  state: secretState,
  dependencies: {
    isMobileViewport,
    getSecretAlbumFilterTags: (...args) => callLoaded(secretController, "getSecretAlbumFilterTags", ...args),
    deleteSecretDialogImage: (...args) => callLoaded(secretController, "deleteSecretDialogImage", ...args),
    updateSecretDialogImage: (...args) => callLoaded(secretController, "updateSecretDialogImage", ...args),
    acknowledgeViewedDiary,
    adminUpdatePhotoCategory,
    awardExperience,
    deletePhotoComment,
    getAuthorName,
    getCurrentImageLimit,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    isAdminAccount,
    isFavoritePhoto,
    isMissingCloudSchema,
    loadPhotoCommentPreviews,
    loadPhotoComments,
    loadPhotos,
    renderAvatarMarkup,
    setGlobalStatus,
    switchPage,
    toDateInputValue,
    togglePhotoFavorite,
    togglePhotoFlag,
    diaryRepository,
    assetController,
  },
  hooks: mediaHooks,
});
const { photoViewerController, photoDetailController } = mediaRuntime;
({
  closePhotoDialog,
  openMobileDiaryImageViewer,
  closeMobileDiaryImageViewer,
  showPhotoDialogPreservingScroll,
  ensureMobileDiaryPage,
  renderMobileDiaryComments,
  renderMobileDiaryPage,
  openMobileDiaryPage,
  closeMobileDiaryPage,
  beginGlobalMobileBackSwipe,
  moveGlobalMobileBackSwipe,
  finishGlobalMobileBackSwipe,
  cancelGlobalMobileBackSwipe,
  openPhoto,
  openWishImage,
  openEditPhoto,
  openWeekendImageGallery,
  renderDialogMedia,
  fitSecretViewerImage,
  refreshDiaryViewerToolbar,
  refreshSecretViewerToolbar,
  resetSecretImageZoom,
  setSecretViewerStatus,
} = mediaRuntime.actions);
const featureRuntime = createFeatureControllerAssembly({
  elements: els,
  state: runtimeState,
  services: appServices,
  config: {
    anniversaryKey: ANNIVERSARY_KEY,
    autoDiaryCacheItemLimit: AUTO_DIARY_CACHE_ITEM_LIMIT,
    defaultDiaryCacheMb: DEFAULT_DIARY_CACHE_MB,
    defaultFoodOptions: DEFAULT_FOOD_OPTIONS,
    defaultSecretCacheMb: DEFAULT_SECRET_CACHE_MB,
    diaryCacheMbKey: DIARY_CACHE_MB_KEY,
    diaryDraftKey: DIARY_DRAFT_KEY,
    diaryMediaCacheName: DIARY_MEDIA_CACHE_NAME,
    foodOptionsKey: FOOD_OPTIONS_KEY,
    legacyMediaCacheName: LEGACY_MEDIA_CACHE_NAME,
    maxCacheMb: MAX_CACHE_MB,
    mediaCachePolicyKey: MEDIA_CACHE_POLICY_KEY,
    minCacheMb: MIN_CACHE_MB,
    metadataCacheItemLimit: METADATA_CACHE_ITEM_LIMIT,
    pageSize: PAGE_SIZE,
    photoCommentPreviewLimit: PHOTO_COMMENT_PREVIEW_LIMIT,
    photoFeedCacheKey: PHOTO_FEED_CACHE_KEY,
    secretCacheMbKey: SECRET_CACHE_MB_KEY,
    secretItemsCacheKey: SECRET_ITEMS_CACHE_KEY,
    secretMediaCacheName: SECRET_MEDIA_CACHE_NAME,
    thanksColorKey: THANKS_COLOR_KEY,
    thanksColors: THANKS_COLORS,
    defaultThanksColor: DEFAULT_THANKS_COLOR,
    productionUrl: PRODUCTION_URL,
    r2UploadEndpoint: R2_UPLOAD_ENDPOINT,
  },
  core: {
    awardExperience,
    awardDailyExperience,
    canManageItem,
    cleanupStoredImagePaths,
    closeMobileDiaryPage,
    closePhotoDialog,
    compressImage,
    confirmAction,
    deleteR2Object,
    escapeHtml,
    formatFileSize,
    getAuthorName,
    getCurrentImageLimit,
    getDefaultSecretSortOrder,
    getFinalTitle,
    getPhotoImages,
    getPhotoLabel,
    getProfileAvatarUrl,
    getSessionBoundEmail,
    getSessionDisplayName,
    getUploadFileNameBase,
    getSortedPhotos,
    isMissingCloudSchema,
    loadCachedAvatarUrl,
    loadFamilyLevelProfiles,
    loadPhotos,
    loadGratitudeNotes,
    normalizeSecretImages,
    normalizeUuid,
    openNotificationsPanel,
    openPhoto,
    refreshCacheInfo,
    renderAccountAvatar,
    renderGallery,
    renderMobileDiaryComments,
    renderSecretGallery: (...args) => callLoaded(secretController, "renderSecretGallery", ...args),
    renderSettingsSummary,
    setGlobalStatus,
    setHint,
    setSecretStatus,
    showMiniToast,
    synchronizeAccountData,
    synchronizeAnniversaries,
    synchronizeWeekendPlans,
    switchPage,
    updateCloudSyncStatus,
    updateSessionDisplayName,
    usernameToEmail,
    isNetworkLikeError,
    getLocalDateKey,
    normalizeLoginDateKey,
    isYesterdayLoginDate,
    normalizeNickname,
    normalizeTheme,
    loadTheme,
    normalizeThanksColor,
    applyTheme,
    saveThanksColorPreference,
    syncExistingPushSubscription,
    renderOverview,
    renderFoodWheel,
    setActiveSettingsSection: (...args) => callLoaded(familySettingsController, "setActiveSettingsSection", ...args),
    openPushDestination: undefined,
    getTodayExperienceStorageKey,
    saveExperience,
    saveRechargeTotal,
    getDailyLoginReward,
    setStatus,
    vlogMode,
    resolveRedirectUrl,
    clearSecretUnlockState,
    loadNotifications,
  },
  pages: {
    secretController,
    recipeController,
    wishlistController,
    shoppingController,
    weekendController,
    familySettingsController,
    offlineSettingsController,
    dataSafetyController,
    callLoaded,
  },
});
const featureBindings = createFeatureRuntimeBindings(featureRuntime);
const {
  secret: { renderSecretFolderControls: featureRenderSecretFolderControls },
  familySettings: {
    openSettingsChildDialog: featureOpenSettingsChildDialog,
    reopenSettingsAfterChildDialog: featureReopenSettingsAfterChildDialog,
  },
  trash,
  diaryComposer,
  offlineCache,
  foodWheel,
  push,
  anniversary,
  gratitude,
} = featureBindings;
setUploadExpanded = diaryComposer.setUploadExpanded;
deletePhoto = trash.deletePhoto;
mediaHooks.deletePhoto = deletePhoto;
createTrashItem = trash.createTrashItem;
rollbackTrashItem = trash.rollbackTrashItem;
processDiaryUploadQueue = diaryComposer.processDiaryUploadQueue;
syncExistingPushSubscription = push.syncExistingPushSubscription;
registerAppShellWorker = push.registerAppShellWorker;
renderFoodWheel = foodWheel.renderFoodWheel;
renderGratitudeNotes = gratitude.renderGratitudeNotes;
saveThanksColorPreference = gratitude.saveThanksColorPreference;
loadFoodOptions = foodWheel.loadFoodOptions;
loadThanksColor = gratitude.loadThanksColor;
setSelectedThanksColor = gratitude.setSelectedThanksColor;
saveFoodOptionsCache = foodWheel.saveFoodOptionsCache;
renderSecretFolderControls = featureRenderSecretFolderControls;
openSettingsChildDialog = featureOpenSettingsChildDialog;
reopenSettingsAfterChildDialog = featureReopenSettingsAfterChildDialog;
synchronizeAnniversaries = anniversary.synchronizeAnniversaries;
loadCacheCapacityMb = offlineCache.loadCacheCapacityMb;
loadMediaCachePolicy = offlineCache.loadMediaCachePolicy;
savePhotoFeedCache = offlineCache.savePhotoFeedCache;
refreshCacheInfo = offlineCache.refreshCacheInfo;
renderCachedPhotoFeed = offlineCache.renderCachedPhotoFeed;
const appRouteRuntime = createRuntimeRouteEntry({
  elements: els,
  documentTarget: document,
  performanceMonitor,
  healthMonitor,
  state: runtimeState,
  services: appServices,
  config: {
    albumImageLimit: SECRET_ALBUM_IMAGE_LIMIT,
    secretAllFolderId: SECRET_ALL_FOLDER_ID,
    secretFavoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
    mobileDialogBreakpoint: MOBILE_DIALOG_BREAKPOINT,
    recipesKey: RECIPES_KEY,
    weekendKey: WEEKEND_KEY,
    r2UploadEndpoint: R2_UPLOAD_ENDPOINT,
    defaultDiaryCacheMb: DEFAULT_DIARY_CACHE_MB,
    defaultSecretCacheMb: DEFAULT_SECRET_CACHE_MB,
    minCacheMb: MIN_CACHE_MB,
    maxCacheMb: MAX_CACHE_MB,
    secretMediaCacheName: SECRET_MEDIA_CACHE_NAME,
    diaryMediaCacheName: DIARY_MEDIA_CACHE_NAME,
    secretItemsCacheKey: SECRET_ITEMS_CACHE_KEY,
    photoFeedCacheKey: PHOTO_FEED_CACHE_KEY,
    homeName: "咻蛋之家",
    defaultAccountProfile: DEFAULT_ACCOUNT_PROFILE,
  },
  baseCore: {
    vlogMode,
    secretState,
    getLocalDateKey,
    getDefaultSecretSortOrder,
    normalizeSecretImages,
    normalizeUuid,
    escapeHtml,
    formatDate,
    formatFileSize,
    getClipboardImageUrl,
    extractImageUrls,
    confirmAction,
    usernameToEmail,
    resolveRedirectUrl,
    openRandomMemory,
    refreshStorage,
    configureCacheManagementUi,
    renderOverview,
    isMissingCloudSchema,
    applyTextScale: (...args) => textScaleController.apply(...args),
    loadTextScale: (...args) => textScaleController.load(...args),
  },
  shell: shellRuntime,
  account: accountRuntime,
  media: mediaRuntime,
  feature: featureRuntime,
  pages: pageControllerRegistry,
});
appNavigationController = appRouteRuntime.appNavigationController;
appSessionController = appRouteRuntime.appSessionController;
runtimeHooks.renderUploadCenter = (...args) =>
  callLoaded(dataSafetyController, "renderUploadCenter", ...args);

export const appRuntime = Object.freeze({
  elements: els,
  appSessionController,
  healthMonitor,
  performanceMonitor,
  performanceDiagnosticsView,
  restoreCloudflareSessionBackup,
  registerAppShellWorker,
  ensureFamilyTimelineUi,
  updateDiarySearchUi,
  renderFoodWheel,
  initializeFeedObserver,
  initializePullToRefresh,
  applyMobileFeedLayout,
  applyMobileSecretLayout,
  syncMobileComposerPlacement,
  switchPage,
  setGlobalStatus,
  showMiniToast,
});
