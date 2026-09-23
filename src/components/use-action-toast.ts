"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./toast";

/**
 * Transforme le résultat d'une action serveur (useActionState) en toast :
 * message → succès, errors.form → erreur. Les erreurs de champ restent
 * affichées inline dans le formulaire.
 */
export function useActionToast(
  state: { message?: string; errors?: Record<string, string[]> },
  onSuccess?: () => void,
) {
  const toast = useToast();
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (state.message && !state.errors) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state.errors?.form?.length) {
      toast.error(state.errors.form[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
