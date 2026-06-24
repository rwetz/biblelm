import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/modules/theme/ThemeProvider";

function Toaster({ ...props }: ToasterProps) {
  const { resolvedMode } = useTheme();

  return (
    <Sonner
      theme={resolvedMode}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group-[.toaster]:bg-popover/90 group-[.toaster]:border-border group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-brand group-[.toast]:text-brand-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
