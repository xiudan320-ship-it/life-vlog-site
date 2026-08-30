import { secretFolderFromCloudRow, secretFromCloudRow } from "./cloud-models.js";
import { sortSecretItems } from "./secret-domain.js";

/**
 * Account-scoped secret data belongs to the data layer, not to the secret
 * page controller.  Keeping this request here lets background sync hydrate
 * state without importing or activating the secret UI route.
 */
export function createSecretDataService({
  repository,
  getDatabase = () => null,
  getSession = () => null,
  setItems = () => {},
  setFolders = () => {},
  setCloudAvailable = () => {},
  setLastSyncAt = () => {},
} = {}) {
  let loadPromise = null;

  async function load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (!getDatabase() || !getSession()) {
        setItems([]);
        setFolders([]);
        setCloudAvailable(false);
        return { items: [], folders: [], available: false };
      }

      const [itemsResponse, foldersResponse] = await Promise.all([
        repository.listItems(),
        repository.listFolders(),
      ]);
      if (itemsResponse.error) throw itemsResponse.error;
      if (foldersResponse.error) throw foldersResponse.error;

      const items = sortSecretItems((itemsResponse.data || []).map(secretFromCloudRow));
      const folders = (foldersResponse.data || []).map(secretFolderFromCloudRow);
      setItems(items);
      setFolders(folders);
      setCloudAvailable(true);
      setLastSyncAt(Date.now());
      return { items, folders, available: true };
    })()
      .catch((error) => {
        setCloudAvailable(false);
        throw error;
      })
      .finally(() => {
        loadPromise = null;
      });
    return loadPromise;
  }

  return Object.freeze({ load });
}
