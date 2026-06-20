/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_DISABLE_MOCKS?: string
  readonly VITE_LEAF_MODEL_URL?: string
  readonly VITE_LEAF_MODEL_LAYOUT?: 'nchw-imagenet' | 'nhwc-raw'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
