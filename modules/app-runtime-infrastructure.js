import { createAppHealthMonitor } from "./app-health-monitor.js";
import { createPerformanceMonitor } from "./performance-monitor.js";
import { createAppServices } from "./app-services.js";

/**
 * Build the runtime infrastructure graph.
 *
 * Backend access, repositories, media cache, upload queue, and asset uploads
 * are owned by app-services. This adapter supplies the runtime-only wiring
 * without mixing it into page, feature, or route assembly.
 */
export function createRuntimeInfrastructure({
  documentTarget,
  config,
  usernameToEmail,
  formatFileSize,
  slugify,
  getSession,
  getDatabase,
  secretDataState,
  getUploadQuality,
  isNetworkLikeError,
  setStatus,
  onUploadQueueChange,
  onTaskChanged,
}) {
  const performanceMonitor = createPerformanceMonitor();
  const healthMonitor = createAppHealthMonitor({
    buildVersion:
      documentTarget.querySelector('meta[name="build-version"]')?.content ||
      "production",
    entry:
      documentTarget
        .querySelector('script[type="module"]')
        ?.getAttribute("src") || "index.js",
  });
  healthMonitor.install();

  const activeUploadTasks = new Map();
  const appServices = createAppServices({
    cloudflare: {
      endpoint: config.r2UploadEndpoint,
      authKey: config.cloudflareAuthKey,
      backupDb: config.authBackupDb,
      backupStore: config.authBackupStore,
      usernameToEmail,
    },
    cache: {
      appCachePrefix: "life-vlog-site-",
      diaryCacheName: config.diaryMediaCacheName,
      secretCacheName: config.secretMediaCacheName,
      legacyCacheName: config.legacyMediaCacheName,
    },
    uploadQueue: {
      dbName: config.uploadQueueDb,
      storeName: config.uploadQueueStore,
    },
    asset: {
      image: {
        endpoint: config.r2UploadEndpoint,
        getAccessToken: () => getSession()?.access_token || "",
        getUploadQuality,
        isNetworkError: (error) => isNetworkLikeError(error),
      },
      controller: {
        publicUrl: config.r2PublicUrl,
        legacyBucket: config.bucket,
        formatFileSize,
        slugify,
        setStatus,
      },
    },
    state: {
      getSession,
      getDatabase,
      ...secretDataState,
    },
    healthMonitor,
    taskMap: activeUploadTasks,
    onUploadQueueChange,
    onTaskChanged,
  });

  return Object.freeze({
    performanceMonitor,
    healthMonitor,
    activeUploadTasks,
    appServices,
  });
}
