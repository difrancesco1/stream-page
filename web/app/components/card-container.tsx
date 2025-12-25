"use client";

import Draggable from "react-draggable";
import { useRef, useState, useEffect, useCallback } from "react";
import MainCard from "./main-card/main-card";
import IntList from "./int-list/int-list-card";
import OpggCard from "./opgg/opgg-card";
import CatPictureContainer from "./cat-pics/cat-picture-container";
import MediaContainer from "./media/media-container";
import Image from "next/image";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface CardState {
  id: CardId;
  position: { x: number; y: number } | null;
  zIndex: number;
  isVisible: boolean;
  isClosable: boolean;
}

type CardsRecord = Record<CardId, CardState>;

const initialCards: CardsRecord = {
  main: {
    id: "main",
    position: null,
    zIndex: 1,
    isVisible: true,
    isClosable: false,
  },
  intList: {
    id: "intList",
    position: null,
    zIndex: 2,
    isVisible: false,
    isClosable: true,
  },
  opgg: {
    id: "opgg",
    position: null,
    zIndex: 3,
    isVisible: false,
    isClosable: true,
  },
  movies: {
    id: "movies",
    position: null,
    zIndex: 4,
    isVisible: false,
    isClosable: true,
  },
  catPictures: {
    id: "catPictures",
    position: null,
    zIndex: 5,
    isVisible: false,
    isClosable: true,
  },
};

export default function CardContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const intListRef = useRef<HTMLDivElement>(null);
  const opggRef = useRef<HTMLDivElement>(null);
  const moviesRef = useRef<HTMLDivElement>(null);
  const catPicturesRef = useRef<HTMLDivElement>(null);

  const [cards, setCards] = useState<CardsRecord>(initialCards);
  const zIndexCounterRef = useRef(10);

  const bringToFront = useCallback((cardId: CardId) => {
    zIndexCounterRef.current += 1;
    const newZ = zIndexCounterRef.current;
    setCards((prevCards) => ({
      ...prevCards,
      [cardId]: {
        ...prevCards[cardId],
        zIndex: newZ,
      },
    }));
  }, []);

  const openCard = useCallback(
    (cardId: CardId) => {
      setCards((prevCards) => ({
        ...prevCards,
        [cardId]: {
          ...prevCards[cardId],
          isVisible: true,
        },
      }));
      bringToFront(cardId);
    },
    [bringToFront]
  );

  const closeCard = useCallback((cardId: CardId) => {
    setCards((prevCards) => ({
      ...prevCards,
      [cardId]: {
        ...prevCards[cardId],
        isVisible: false,
      },
    }));
  }, []);

  const updateCardPosition = useCallback(
    (cardId: CardId, position: { x: number; y: number }) => {
      setCards((prevCards) => ({
        ...prevCards,
        [cardId]: {
          ...prevCards[cardId],
          position,
        },
      }));
    },
    []
  );

  const getStaggeredPosition = useCallback((index: number) => {
    if (!containerRef.current) return { x: 50, y: 50 };
    const container = containerRef.current.getBoundingClientRect();
    const offset = 30 * index;
    return {
      x: Math.min(offset + 50, container.width - 420),
      y: Math.min(offset + 50, container.height - 220),
    };
  }, []);

  useEffect(() => {
    const initializePositions = () => {
      if (containerRef.current && mainCardRef.current) {
        const container = containerRef.current.getBoundingClientRect();
        const card = mainCardRef.current.getBoundingClientRect();

        const centerX = (container.width - card.width) / 2;
        const centerY = (container.height - card.height) / 2;

        setCards((prev) => ({
          ...prev,
          main: { ...prev.main, position: { x: centerX, y: centerY } },
        }));
      }

      // Initialize positions for other cards with staggered offsets
      setCards((prev) => ({
        ...prev,
        intList: { ...prev.intList, position: getStaggeredPosition(0) },
        opgg: { ...prev.opgg, position: getStaggeredPosition(1) },
        movies: { ...prev.movies, position: getStaggeredPosition(2) },
        catPictures: { ...prev.catPictures, position: getStaggeredPosition(3) },
      }));
    };

    // Use requestAnimationFrame to ensure DOM measurements are accurate
    requestAnimationFrame(initializePositions);
  }, [getStaggeredPosition]);

  return (

    
    <div
      ref={containerRef}
      className="w-full h-full bg-card border border-border p-2 rounded-lg shadow-md relative"
    >
      <Image
        src="/background.gif"
        alt="Background image"
        fill // Fills the parent element
        className="object-cover" // Ensures the image covers the area
        quality={75} // Default quality, can be adjusted
        priority // Preload the image if it's the LCP element
      />
      {/* Main Card - Always visible */}
      <Draggable
        nodeRef={mainCardRef}
        bounds="parent"
        handle=".drag-handle"
        position={cards.main.position ?? undefined}
        onStart={() => bringToFront("main")}
        onStop={(_, data) =>
          updateCardPosition("main", { x: data.x, y: data.y })
        }
      >
        <div
          ref={mainCardRef}
          className={`w-fit absolute transition-opacity duration-150 ${
            cards.main.position === null ? "opacity-0" : "opacity-100"
          }`}
          style={{ zIndex: cards.main.zIndex }}
          onMouseDown={() => bringToFront("main")}
        >
          <MainCard onOpenCard={openCard} />
        </div>
      </Draggable>

      {/* IntList Card */}
      {cards.intList.isVisible && (
        <Draggable
          nodeRef={intListRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.intList.position ?? undefined}
          onStart={() => bringToFront("intList")}
          onStop={(_, data) =>
            updateCardPosition("intList", { x: data.x, y: data.y })
          }
        >
          <div
            ref={intListRef}
            className={`w-fit absolute transition-opacity duration-150 ${
              cards.intList.position === null ? "opacity-0" : "opacity-100"
            }`}
            style={{ zIndex: cards.intList.zIndex }}
            onMouseDown={() => bringToFront("intList")}
          >
            <IntList onClose={() => closeCard("intList")} />
          </div>
        </Draggable>
      )}

      {/* OPGG Card */}
      {cards.opgg.isVisible && (
        <Draggable
          nodeRef={opggRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.opgg.position ?? undefined}
          onStart={() => bringToFront("opgg")}
          onStop={(_, data) =>
            updateCardPosition("opgg", { x: data.x, y: data.y })
          }
        >
          <div
            ref={opggRef}
            className={`w-fit absolute transition-opacity duration-150 ${
              cards.opgg.position === null ? "opacity-0" : "opacity-100"
            }`}
            style={{ zIndex: cards.opgg.zIndex }}
            onMouseDown={() => bringToFront("opgg")}
          >
            <OpggCard onClose={() => closeCard("opgg")} />
          </div>
        </Draggable>
      )}

      {/* Movies Card */}
      {cards.movies.isVisible && (
        <Draggable
          nodeRef={moviesRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.movies.position ?? undefined}
          onStart={() => bringToFront("movies")}
          onStop={(_, data) =>
            updateCardPosition("movies", { x: data.x, y: data.y })
          }
        >
          <div
            ref={moviesRef}
            className={`w-fit absolute transition-opacity duration-150 ${
              cards.movies.position === null ? "opacity-0" : "opacity-100"
            }`}
            style={{ zIndex: cards.movies.zIndex }}
            onMouseDown={() => bringToFront("movies")}
          >
            <MediaContainer
              onClose={() => closeCard("movies")}
            />
          </div>
        </Draggable>
      )}

      {/* Cat Pictures Card */}
      {cards.catPictures.isVisible && (
        <Draggable
          nodeRef={catPicturesRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.catPictures.position ?? undefined}
          onStart={() => bringToFront("catPictures")}
          onStop={(_, data) =>
            updateCardPosition("catPictures", { x: data.x, y: data.y })
          }
        >
          <div
            ref={catPicturesRef}
            className={`w-fit absolute transition-opacity duration-150 ${
              cards.catPictures.position === null ? "opacity-0" : "opacity-100"
            }`}
            style={{ zIndex: cards.catPictures.zIndex }}
            onMouseDown={() => bringToFront("catPictures")}
          >
            <CatPictureContainer
              onClose={() => closeCard("catPictures")}
            />
          </div>
        </Draggable>
      )}
    </div>
  );
}
