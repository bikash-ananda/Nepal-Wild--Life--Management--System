import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

function ToastCountdown({ expiresAt }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  const language = document.documentElement.lang === "ne" ? "ne-NP" : "en";
  const remainingText = new Intl.NumberFormat(language).format(seconds);

  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground" aria-label={`${remainingText} ${language === "ne-NP" ? "सेकेन्ड बाँकी" : "seconds remaining"}`}>
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{remainingText}{language === "ne-NP" ? " से" : "s"}</span>
    </span>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function (toastItem) {
        const { id, title, description, action, duration, expiresAt, onOpenChange, ...props } = toastItem;
        void duration;
        void onOpenChange;
        return (
          <Toast key={id} {...props} data-state={props.open ? "open" : "closed"}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <ToastCountdown expiresAt={expiresAt} />
            {action}
            <ToastClose onClick={() => dismiss(id)} aria-label="Dismiss notification" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
