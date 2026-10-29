import json


def _mps_ceiling() -> int:
    """Metal's recommended working set, or two thirds of physical memory."""
    try:
        import torch
        return int(torch.mps.recommended_max_memory())
    except Exception:
        import os
        return int(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") * 2 // 3)


def main() -> None:
    try:
        import torch
        if torch.cuda.is_available():
            dev = 0
            props = torch.cuda.get_device_properties(dev)
            total = props.total_memory
            reserved = torch.cuda.memory_reserved(dev)
            allocated = torch.cuda.memory_allocated(dev)
            free = max(0, total - reserved)
            print(json.dumps({
                "available": True,
                "name": props.name,
                "total_mb": total // (1024 * 1024),
                "free_mb": free // (1024 * 1024),
                "allocated_mb": allocated // (1024 * 1024),
                "reserved_mb": reserved // (1024 * 1024),
                "device_count": torch.cuda.device_count(),
            }))
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            # Apple silicon: the GPU draws on the computer's own memory, so the
            # ceiling is what Metal recommends (about two thirds of it) and
            # everything else running shares it.
            total = _mps_ceiling()
            allocated = torch.mps.driver_allocated_memory() if hasattr(torch.mps, "driver_allocated_memory") else 0
            print(json.dumps({
                "available": True,
                "name": "Apple GPU (shared memory)",
                "total_mb": total // (1024 * 1024),
                "free_mb": max(0, total - allocated) // (1024 * 1024),
                "allocated_mb": allocated // (1024 * 1024),
                "reserved_mb": allocated // (1024 * 1024),
                "device_count": 1,
                "unified": True,
            }))
        else:
            print(json.dumps({
                "available": False,
                "name": "CPU only",
                "total_mb": 0,
                "free_mb": 0,
                "allocated_mb": 0,
                "reserved_mb": 0,
                "device_count": 0,
            }))
    except Exception as exc:
        print(json.dumps({
            "available": False,
            "name": "CPU only",
            "total_mb": 0,
            "free_mb": 0,
            "allocated_mb": 0,
            "reserved_mb": 0,
            "device_count": 0,
            "error": str(exc),
        }))


if __name__ == "__main__":
    main()
