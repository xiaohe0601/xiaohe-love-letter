/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 路由基础路径 */
  readonly VITE_BASE_URL: string;
  /** 平台名称 */
  readonly VITE_PLATFORM_NAME: string;
  /** 是否启用 console 剔除 */
  readonly VITE_ENABLE_DROP_CONSOLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}