declare module 'sharp' {
  interface Sharp {
    resize(width?: number, height?: number, options?: any): Sharp;
    extract(options: { left: number; top: number; width: number; height: number }): Sharp;
    toFile(fileOut: string): Promise<any>;
    toBuffer(): Promise<Buffer>;
    metadata(): Promise<{ width?: number; height?: number;[key: string]: any }>;
    jpeg(options?: { quality?: number }): Sharp;
  }

  interface SharpStatic {
    (input?: string | Buffer): Sharp;
  }

  const sharp: SharpStatic;
  export = sharp;
}