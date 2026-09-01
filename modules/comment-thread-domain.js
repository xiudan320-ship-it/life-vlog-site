function normalizeId(value) {
  const id = String(value ?? "").trim();
  return id || null;
}

function compareRecords(left, right) {
  const createdDifference = left.createdAt.localeCompare(right.createdAt);
  return createdDifference || left.id.localeCompare(right.id);
}

function safeAuthorName(getAuthorName, authorId) {
  const value = getAuthorName?.(authorId);
  return String(value || authorId || "成员");
}

function buildLineageMetadata(records, byId) {
  const metadata = new Map();

  function assignPath(path, base) {
    let parentMetadata = base;
    for (let index = path.length - 1; index >= 0; index -= 1) {
      parentMetadata = {
        rootId: parentMetadata.rootId,
        logicalDepth: parentMetadata.logicalDepth + 1,
      };
      metadata.set(path[index].id, parentMetadata);
    }
  }

  for (const start of records) {
    if (metadata.has(start.id)) continue;
    const path = [];
    const pathIndex = new Map();
    let current = start;
    while (current && !metadata.has(current.id) && !pathIndex.has(current.id)) {
      pathIndex.set(current.id, path.length);
      path.push(current);
      current = byId.get(current.parentId);
    }
    if (!path.length) continue;

    const cycleIndex = current ? pathIndex.get(current.id) : undefined;
    if (cycleIndex !== undefined) {
      const cycle = path.slice(cycleIndex);
      const cycleRoot = cycle.reduce((best, record) => compareRecords(record, best) < 0 ? record : best);
      let cursor = cycleRoot;
      let depth = 0;
      do {
        metadata.set(cursor.id, { rootId: cycleRoot.id, logicalDepth: depth });
        cursor = byId.get(cursor.parentId);
        depth += 1;
      } while (cursor && cursor.id !== cycleRoot.id && depth <= cycle.length);
      assignPath(path.slice(0, cycleIndex), metadata.get(cycleRoot.id));
      continue;
    }

    assignPath(path, current ? metadata.get(current.id) : {
      rootId: path.at(-1).id,
      logicalDepth: -1,
    });
  }
  return metadata;
}

function buildOutputOrder(records, byId, childrenByParent) {
  const sorted = records.slice().sort(compareRecords);
  const pending = [];
  const visited = new Set();
  const ordered = [];

  const emitPending = () => {
    while (pending.length) {
      const record = pending.pop();
      if (!record || visited.has(record.id)) continue;
      visited.add(record.id);
      ordered.push(record);
      const children = (childrenByParent.get(record.id) || []).slice().sort(compareRecords).reverse();
      pending.push(...children);
    }
  };

  for (const record of sorted) {
    if (record.parentId && byId.has(record.parentId)) continue;
    pending.push(record);
    emitPending();
  }
  for (const record of sorted) {
    if (visited.has(record.id)) continue;
    pending.push(record);
    emitPending();
  }
  return ordered;
}

export function flattenCommentThread(comments = [], { getAuthorName } = {}) {
  const records = [];
  const byId = new Map();
  for (const comment of Array.isArray(comments) ? comments : []) {
    const id = normalizeId(comment?.id);
    if (!id || byId.has(id)) continue;
    const record = {
      id,
      parentId: normalizeId(comment?.parent_id),
      authorId: normalizeId(comment?.user_id) || "",
      body: String(comment?.body ?? ""),
      createdAt: String(comment?.created_at ?? ""),
    };
    records.push(record);
    byId.set(id, record);
  }

  const childrenByParent = new Map();
  for (const record of records) {
    if (!record.parentId) continue;
    const children = childrenByParent.get(record.parentId) || [];
    children.push(record);
    childrenByParent.set(record.parentId, children);
  }

  const metadata = buildLineageMetadata(records, byId);
  const ordered = buildOutputOrder(records, byId, childrenByParent);
  return ordered.map((record) => {
    const parent = record.parentId ? byId.get(record.parentId) : null;
    const lineage = metadata.get(record.id) || { rootId: record.id, logicalDepth: 0 };
    return {
      id: record.id,
      parentId: record.parentId,
      rootId: lineage.rootId,
      logicalDepth: lineage.logicalDepth,
      authorId: record.authorId,
      replyTargetId: record.parentId,
      replyTargetName: parent
        ? safeAuthorName(getAuthorName, parent.authorId)
        : record.parentId
          ? "原留言已不可用"
          : "",
      body: record.body,
      createdAt: record.createdAt,
    };
  });
}
