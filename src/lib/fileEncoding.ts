export function decodeCp1254Buffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return new TextDecoder('windows-1254').decode(bytes);
}

export function decodeTextBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return decodeCp1254Buffer(bytes);
  }
}

export async function readCp1254TextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return decodeCp1254Buffer(buffer);
}

export async function readTextFileAuto(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return decodeTextBuffer(buffer);
}
