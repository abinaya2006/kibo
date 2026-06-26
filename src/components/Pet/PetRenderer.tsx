import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePetStore } from "../../state/usePetStore";
import { PetSprite } from "./PetSprite";
import { SpeechBubble } from "../SpeechBubble/SpeechBubble";
import { EmotionIndicator } from "./EmotionIndicator";
import { PetContextMenu } from "../ContextMenu/PetContextMenu";
import { SpeechService } from "../../services/SpeechService";
import { PET_SIZE } from "../../models/PetConfig";
import { petControllerSingleton } from "../../controllers/PetController";
import { useSelectionHandler } from "../../hooks/useSelectionHandler";
import { SelectionPopup } from "../SelectionPopup/SelectionPopup";

// console.log("PET_SIZE:", PET_SIZE);

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
  const [dragOffset, setDragOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const spriteRef = useRef<HTMLDivElement>(null);

  // Wire text selection → popup near pet
  const { handleExplain, handleAskKibo } = useSelectionHandler(
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

  // Drag handlers
  const handlePetMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      store.setPetStateDirect("beingDragged");
      store.setTargetPosition(null);
      store.setVelocity({ x: 0, y: 0 });
    }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (pet.state === "beingDragged" && dragOffset) {
      const nextX = e.clientX - dragOffset.x;
      const nextY = e.clientY - dragOffset.y;
      store.setPosition({ x: nextX, y: nextY });
      petControllerSingleton.behaviorController.handlePetPat();
    }
  };

  const handleGlobalMouseUp = () => {
    if (pet.state === "beingDragged") {
      store.setPetStateDirect("idle");
      setDragOffset(null);
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
  }, [pet.state, dragOffset]);

  // Context menu
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

  // Mouse enter/leave for pass-through
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
            onExplain={() => handleExplain(selectionPopup.text)}
            onAskKibo={() => handleAskKibo(selectionPopup.text)}
            onClose={handleCloseSelectionPopup}
          />
        </>
      )}
    </>
  );
};
