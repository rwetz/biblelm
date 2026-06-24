import json


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
