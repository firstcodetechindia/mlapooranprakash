/**
 * Provider-agnostic object storage. Nothing outside /src/lib/storage
 * should import @aws-sdk or touch the filesystem directly — swapping
 * providers means writing one new file here. See getStorageProvider().
 */
export interface StorageProvider {
  readonly name: string;
  upload(params: { key: string; buffer: Buffer; contentType: string }): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
