import { invoke } from "@tauri-apps/api/core";
import { useAppStore, type GpuInfo } from "@/store/appStore";

/**
 * Query the GPU and record the result — including the failure.
 *
 * The probe shells out to Python/torch, so it fails for ordinary reasons: no
 * venv yet, torch not installed, Python not on PATH. Swallowing that error left
 * the VRAM meter saying "querying GPU…" forever, with nothing to retry and no
 * hint at the cause.
 */
export async function refreshGpuInfo(): Promise<void> {
  const { setGpuInfo, setGpuError } = useAppStore.getState();
  setGpuInfo(null);
  setGpuError(null);
  try {
    setGpuInfo(await invoke<GpuInfo>("gpu_info"));
  } catch (err) {
    setGpuError(String(err));
  }
}
