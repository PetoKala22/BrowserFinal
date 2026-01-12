export {};

declare global {
  interface ImportMetaEnv {
    readonly DEV?: boolean;
    readonly MODE?: string;
    readonly PROD?: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
