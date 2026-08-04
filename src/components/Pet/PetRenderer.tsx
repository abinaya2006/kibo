import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePetStore } from "../../state/usePetStore";
import { PetSprite } from "./PetSprite";
import { SpeechBubble } from "../SpeechBubble/SpeechBubble";
import { EmotionIndicator } from "./EmotionIndicator";
import { PetContextMenu } from "../ContextMenu/PetContextMenu";
import { RareEventSprite } from "./RareEventSprite";
import { SpeechService } from "../../services/SpeechService";
import { PET_SIZE } from "../../models/PetConfig";
import { petControllerSingleton } from "../../controllers/PetController";
import { rareEventController } from "../../controllers/RareEventController";
import { useSelectionHandler } from "../../hooks/useSelectionHandler";
import { SelectionPopup } from "../SelectionPopup/SelectionPopup";

export const PetRenderer: React.FC = () => {
  const store = usePetStore();
  const { pet, isLoaded } = store;
  const { position, facing } = pet.physics;

  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionPopup, setSelectionPopup] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // ── Drag state as refs (no re-renders mid-drag) ──────────────────────────
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);

  const spriteRef = useRef<HTMLDivElement>(null);

  // Wire text selection → popup near pet
  const { handleRead, handleExplain, handleAskKibo } = useSelectionHandler(
    setActiveSpeech,
    (text, x, y) => {
      window.electronAPI?.setIgnoreMouseEvents(false);
      setSelectionPopup({ text, x, y });
    },
  );

  // Periodic random speeches
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      const speech = SpeechService.getSpeech(pet.state, pet.mood, 0.2);
      if (speech) setActiveSpeech(speech);
    }, 12000);
    return () => clearInterval(interval);
  }, [isLoaded, pet.state, pet.mood]);

  // Rare wander events — a butterfly, firefly, leaf, etc. every few hours
  useEffect(() => {
    if (!isLoaded) return;
    rareEventController.start();
    return () => rareEventController.stop();
  }, [isLoaded]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handlePetMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      dragMoved.current = false;
      store.setPetStateDirect("beingDragged");
      store.setTargetPosition(null);
      store.setVelocity({ x: 0, y: 0 });
    }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (pet.state === "beingDragged" && dragOffset.current) {
      const movedX = Math.abs(e.clientX - (position.x + dragOffset.current.x));
      const movedY = Math.abs(e.clientY - (position.y + dragOffset.current.y));

      // Only mark as a real drag after moving 4px — avoids triggering on click jitter
      if (movedX > 4 || movedY > 4) {
        dragMoved.current = true;
      }

      const nextX = e.clientX - dragOffset.current.x;
      const nextY = e.clientY - dragOffset.current.y;
      store.setPosition({ x: nextX, y: nextY });
    }
  };

  const handleGlobalMouseUp = () => {
    if (pet.state === "beingDragged") {
      console.log("mouseup — dragMoved:", dragMoved.current);
      if (!dragMoved.current) {
        console.log("firing handlePetPat");
        petControllerSingleton.behaviorController.handlePetPat();
      }
      store.setPetStateDirect("idle");
      dragOffset.current = null;
      dragMoved.current = false;
      store.touchInteraction();
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [pet.state]);

  // ── Context menu ─────────────────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI?.setIgnoreMouseEvents(false);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    if (!selectionPopup) {
      window.electronAPI?.setIgnoreMouseEvents(true);
    }
  };

  // ── Mouse enter/leave for pass-through ───────────────────────────────────
  const handleMouseEnter = () => {
    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    if (contextMenu) return;
    if (selectionPopup) return;
    window.electronAPI?.setIgnoreMouseEvents(true);
  };

  const handleCloseSelectionPopup = () => {
    setSelectionPopup(null);
    if (!contextMenu) {
      window.electronAPI?.setIgnoreMouseEvents(true);
    }
  };

  if (!isLoaded) return null;

  return (
    <>
      <motion.div
        ref={spriteRef}
        onMouseDown={handlePetMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "fixed",
          width: `${PET_SIZE}px`,
          height: `${PET_SIZE}px`,
          left: 0,
          top: 0,
          x: position.x,
          y: position.y,
          cursor: pet.state === "beingDragged" ? "grabbing" : "grab",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <EmotionIndicator mood={pet.mood} hidden={!!activeSpeech} />
        <SpeechBubble
          text={activeSpeech}
          onClose={() => setActiveSpeech(null)}
        />
        <PetSprite
          species={pet.species}
          state={pet.state}
          mood={pet.mood}
          facing={facing}
        />
      </motion.div>

      {/* Rare wander event — butterfly, firefly, leaf, etc. */}
      <RareEventSprite />

      {/* Context menu backdrop + menu */}
      {contextMenu && (
        <>
          <div
            onClick={handleCloseContextMenu}
            onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9998,
              background: "transparent",
              pointerEvents: "auto",
            }}
          />
          <PetContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleCloseContextMenu}
          />
        </>
      )}

      {/* Selection popup */}
      {selectionPopup && (
        <>
          <div
            onClick={handleCloseSelectionPopup}
            onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 99998,
              background: "transparent",
              pointerEvents: "auto",
            }}
          />
          <SelectionPopup
            text={selectionPopup.text}
            x={selectionPopup.x}
            y={selectionPopup.y}
            onRead={() => handleRead(selectionPopup.text)}
            onExplain={() => handleExplain(selectionPopup.text)}
            onAskKibo={() => handleAskKibo(selectionPopup.text)}
            onClose={handleCloseSelectionPopup}
          />
        </>
      )}
    </>
  );
};
