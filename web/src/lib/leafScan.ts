/**
 * Leaf-scan orchestrator. Tries the cloud vision AI first (Gemini, most accurate
 * on real field photos), and transparently falls back to the free on-device
 * model if the cloud endpoint isn't configured or fails.
 */
import type { LeafScanResult } from '@/api/types'
import { classifyLeaf } from './leafModel'
import { classifyLeafViaLLM } from './llmLeafScan'

export async function classifyLeafSmart(file: File): Promise<LeafScanResult> {
  try {
    return await classifyLeafViaLLM(file)
  } catch (e) {
    console.warn('[scan] cloud AI unavailable; using on-device model:', e)
    return await classifyLeaf(file)
  }
}
