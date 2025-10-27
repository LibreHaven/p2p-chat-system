// FileReceiveService - centralizes file receiving orchestration (metadata + chunks + completion)
// Behavior mirrors the existing logic inside useFileTransferChannel to keep backwards compatibility.

/**
 * @typedef {Object} FileReceiveCallbacks
 * @property {(metadata: any) => void} [onStart]           // called when metadata arrives
 * @property {(transferId: string, progress: number) => void} [onProgress]
 * @property {(result: { transferId: string, blob: Blob, metadata: any }) => void} [onComplete]
 * @property {(error: Error, transferId?: string) => void} [onError]
 */

/**
 * Create a file receiving service.
 *
 * Exposed handlers are designed to be wired directly to the MessageRouter callbacks:
 *   - onFileMetadata -> handleFileMetadata
 *   - onFileChunk -> handleFileChunk
 *   - onFileTransferComplete -> handleFileTransferComplete
 *
 * The service supports out-of-order arrival: chunks received before metadata are buffered; a
 * completion signal before metadata is also buffered and executed after metadata arrives.
 *
 * @param {FileReceiveCallbacks} [callbacks]
 */
export function createFileReceiveService(callbacks = {}) {
  const transfers = Object.create(null);
  const chunkBuffer = Object.create(null); // transferId -> { [chunkIndex]: ArrayBufferLike }
  const completeBuffer = new Set(); // transferIds with completion signaled before metadata

  const onStart = callbacks.onStart || (() => {});
  const onProgress = callbacks.onProgress || (() => {});
  const onComplete = callbacks.onComplete || (() => {});
  const onError = callbacks.onError || (() => {});

  function handleFileMetadata(metadata) {
    if (!metadata || typeof metadata.transferId !== 'string' || typeof metadata.chunksCount !== 'number') {
      onError(new Error('无效的文件元数据'));
      return;
    }

    const { transferId, chunksCount } = metadata;
    transfers[transferId] = {
      metadata,
      chunks: new Array(chunksCount),
      received: 0,
    };

    // flush buffered chunks, if any
    const buffered = chunkBuffer[transferId];
    if (buffered) {
      Object.entries(buffered).forEach(([indexStr, chunk]) => {
        const idx = Number(indexStr);
        if (Number.isInteger(idx) && chunk && typeof chunk.byteLength === 'number') {
          if (!transfers[transferId].chunks[idx]) {
            transfers[transferId].chunks[idx] = chunk;
            transfers[transferId].received += 1;
          }
        }
      });
      delete chunkBuffer[transferId];
      // emit progress after flushing buffered chunks
      const progress = (transfers[transferId].received / chunksCount) * 100;
      onProgress(transferId, progress);
    }

    onStart(metadata);

    // completion was signaled earlier; finalize now (async to preserve ordering)
    if (completeBuffer.has(transferId)) {
      completeBuffer.delete(transferId);
      setTimeout(() => finalizeTransfer(transferId), 0);
    }
  }

  function handleFileChunk(transferId, chunkIndex, chunkData /* Uint8Array|ArrayBuffer */, _header) {
    // With no metadata yet, buffer the chunk
    const t = transfers[transferId];
    if (!t) {
      if (!chunkBuffer[transferId]) chunkBuffer[transferId] = Object.create(null);
      chunkBuffer[transferId][chunkIndex] = chunkData;
      return;
    }

    try {
      if (!t.chunks[chunkIndex]) {
        t.chunks[chunkIndex] = chunkData;
        t.received += 1;
        const progress = (t.received / t.metadata.chunksCount) * 100;
        onProgress(transferId, progress);
      }
    } catch (error) {
      onError(error, transferId);
    }
  }

  function handleFileTransferComplete(transferId) {
    // if metadata missing, remember completion and wait
    if (!transfers[transferId]) {
      completeBuffer.add(transferId);
      return;
    }
    finalizeTransfer(transferId);
  }

  function finalizeTransfer(transferId) {
    const t = transfers[transferId];
    if (!t) return;

    const { metadata, chunks, received } = t;
    // Validate: all chunks present
    for (let i = 0; i < chunks.length; i += 1) {
      const c = chunks[i];
      if (!c || typeof c.byteLength !== 'number') {
        onError(new Error('缺少或无效的文件块，无法完成传输'), transferId);
        return;
      }
    }
    // Assemble
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const fileData = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach((chunk) => {
      const array = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      fileData.set(array, offset);
      offset += array.byteLength;
    });
    const blob = new Blob([fileData], { type: metadata.fileType });

    // Ensure 100% progress
    if (received < metadata.chunksCount) {
      onProgress(transferId, 100);
    }

    onComplete({ transferId, blob, metadata });
    delete transfers[transferId];
  }

  return {
    handleFileMetadata,
    handleFileChunk,
    handleFileTransferComplete,
  };
}

export default { createFileReceiveService };
