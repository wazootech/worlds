"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PixelPlanet, PixelPlanetProps } from "./pixel-planet";
import { DialogCloseButton } from "@/components/ui/dialog-close-button";

interface PlanetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: PixelPlanetProps["type"];
  seed: number;
}

export function PlanetDialog({
  isOpen,
  onClose,
  type,
  seed,
}: PlanetDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Lock scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton onClick={onClose} variant="floating" />
        </div>

        <div className="flex-1 min-h-[500px] relative bg-black flex flex-col">
          <PixelPlanet
            type={type}
            seed={seed}
            stars={true}
            advanced={{ orbitControls: true }}
            className="flex-1 w-full h-full"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
