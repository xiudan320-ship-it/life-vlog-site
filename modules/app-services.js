import { createAssetController } from "./asset-controller.js";
import { createCloudflareBackend } from "./cloudflare-client.js";
import {
  createDiaryRepository,
  createNotificationRepository,
  createSecretRepository,
  createWardrobeRepository,
} from "./data-repositories.js";
import { createHouseholdRepository } from "./household-repository.js";
import {
  createImageService,
  getVideoContentType,
  getVideoFileExtension,
} from "./image-service.js";
import { createMediaCacheService } from "./media-cache.js";
import { createPhotoFavoritesStore } from "./photo-favorites.js";
import { createPreferenceStore } from "./preferences-store.js";
import { createUploadQueue } from "./upload-queue.js";
import { createSecretDataService } from "./secret-data-service.js";

/**
 * Build the application's infrastructure graph in one place.
 *
 * This module owns backend clients, repositories, cache/upload infrastructure,
 * and the asset boundary. Controllers receive the resulting graph; they do
 * not know how persistence or transport clients are constructed.
 */
export function createAppServices({
  cloudflare,
  cache,
  uploadQueue,
  asset,
  state,
  healthMonitor,
  taskMap,
  onUploadQueueChange,
  onTaskChanged,
}) {
  const preferenceStore = createPreferenceStore();
  const cloudflareBackend = createCloudflareBackend({
    ...cloudflare,
    getActiveSession: state.getSession,
    onRequestError: (error) => healthMonitor.recordApiError(error),
  });
  const mediaCacheService = createMediaCacheService(cache);
  const diaryUploadQueue = createUploadQueue({
    ...uploadQueue,
    onChanged: onUploadQueueChange,
  });
  const diaryRepository = createDiaryRepository({
    getDatabase: state.getDatabase,
    getSession: state.getSession,
  });
  const secretRepository = createSecretRepository({
    getDatabase: state.getDatabase,
    getSession: state.getSession,
  });
  const secretDataService = createSecretDataService({
    repository: secretRepository,
    getDatabase: state.getDatabase,
    getSession: state.getSession,
    setItems: state.setSecretItems,
    setFolders: state.setSecretFolders,
    setCloudAvailable: state.setSecretCloudAvailable,
    setLastSyncAt: state.setLastSecretSyncAt,
  });
  const notificationRepository = createNotificationRepository({
    getDatabase: state.getDatabase,
  });
  const householdRepository = createHouseholdRepository({
    getDatabase: state.getDatabase,
    getSession: state.getSession,
  });
  const wardrobeRepository = createWardrobeRepository({
    getDatabase: state.getDatabase,
  });
  const photoFavorites = createPhotoFavoritesStore({ repository: diaryRepository });
  const imageService = createImageService({
    ...asset.image,
    taskMap,
    onTaskChanged,
  });
  const assetController = createAssetController({
    imageService,
    getVideoContentType,
    getVideoFileExtension,
    ...asset.controller,
  });

  return Object.freeze({
    preferenceStore,
    cloudflareBackend,
    mediaCacheService,
    diaryUploadQueue,
    diaryRepository,
    secretRepository,
    secretDataService,
    notificationRepository,
    householdRepository,
    wardrobeRepository,
    photoFavorites,
    imageService,
    assetController,
  });
}
