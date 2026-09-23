import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "@/components/toast";

export function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
