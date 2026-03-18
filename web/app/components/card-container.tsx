"use client";

import Draggable from "react-draggable";
import { useRef, useState, useEffect, useCallback } from "react";
import MainCard from "./main-card/main-card";
import IntList from "./int-list/int-list-card";
import OpggCard from "./opgg/opgg-card";
import CatPictureContainer from "./cat-pics/cat-picture-container";
import DuoTrackerContainer from "./duo-tracker/duo-tracker-container";
import FirstTrackerContainer from "./first-tracker/first-tracker-container";
import MediaContainer from "./media/media-container";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/auth-context";
import { useEditMode } from "@/app/context/edit-mode-context";
import AuthModal from "./auth/auth-modal";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures" | "duoTracker" | "firstTracker";

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
  duoTracker: {
    id: "duoTracker",
    position: null,
    zIndex: 6,
    isVisible: false,
    isClosable: true,
  },
  firstTracker: {
    id: "firstTracker",
    position: null,
    zIndex: 7,
    isVisible: false,
    isClosable: true,
  }
};

export default function CardContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const intListRef = useRef<HTMLDivElement>(null);
  const opggRef = useRef<HTMLDivElement>(null);
  const moviesRef = useRef<HTMLDivElement>(null);
  const catPicturesRef = useRef<HTMLDivElement>(null);
  const duoTrackerRef = useRef<HTMLDivElement>(null);
  const firstTrackerRef = useRef<HTMLDivElement>(null);

  const [cards, setCards] = useState<CardsRecord>(initialCards);
  const zIndexCounterRef = useRef(10);

  const { isAuthenticated, user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAddUserMode, setIsAddUserMode] = useState(false);
  const { isEditMode, toggleEditMode, canEdit } = useEditMode();

  const isRosie = user?.username.toLowerCase() === 'rosie';
  const username = user?.username;

  const searchParams = useSearchParams();
  const focusCardParam = searchParams.get("card");
  const focusCard = focusCardParam && focusCardParam in initialCards ? (focusCardParam as CardId) : null;

  const openLoginModal = () => {
    setIsAddUserMode(false);
    setAuthModalOpen(true);
  };

  const openAddUserModal = () => {
    setIsAddUserMode(true);
    setAuthModalOpen(true);
  };

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
    requestAnimationFrame(() => {
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;

      setCards((prev) => {
        const next = { ...prev };

        if (focusCard) {
          for (const key of Object.keys(next) as CardId[]) {
            next[key] = { ...next[key], isVisible: key === focusCard };
          }
        }

        if (!focusCard && mainCardRef.current) {
          const card = mainCardRef.current.getBoundingClientRect();
          next.main = {
            ...next.main,
            position: {
              x: (container.width - card.width) / 2,
              y: (container.height - card.height) / 2,
            },
          };
        }

        const staggerMap: [CardId, number][] = [
          ["intList", 0], ["opgg", 1], ["movies", 2],
          ["catPictures", 3], ["duoTracker", 4], ["firstTracker", 5],
        ];
        for (const [id, idx] of staggerMap) {
          if (id !== focusCard) {
            next[id] = { ...next[id], position: getStaggeredPosition(idx) };
          }
        }

        return next;
      });

      if (focusCard) {
        requestAnimationFrame(() => {
          const refMap = {
            main: mainCardRef, intList: intListRef, opgg: opggRef,
            movies: moviesRef, catPictures: catPicturesRef,
            duoTracker: duoTrackerRef, firstTracker: firstTrackerRef,
          };
          const focusRef = refMap[focusCard];
          if (focusRef.current && containerRef.current) {
            const cRect = containerRef.current.getBoundingClientRect();
            const cardRect = focusRef.current.getBoundingClientRect();
            setCards((prev) => ({
              ...prev,
              [focusCard]: {
                ...prev[focusCard],
                position: {
                  x: (cRect.width - cardRect.width) / 2,
                  y: (cRect.height - cardRect.height) / 2,
                },
              },
            }));
          }
        });
      }
    });
  }, [getStaggeredPosition, focusCard]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-card p-[0.125rem] rounded-lg shadow-md relative"
    >
      <Image
        src="/background.gif"
        alt="Background image"
        fill
        className="object-cover pixel-borders"
        quality={0} 
        priority
      />

      <div className="absolute top-4 right-4 z-[9999]">
        {isAuthenticated ? (
          <div className="flex gap-2">
            {isRosie && (
              <button 
                className="pixel-btn text-xs flex items-center gap-2 hover:animate-pulse"
                onClick={openAddUserModal}
                title="Add new user"
              >
                add user
              </button>
            )}
            {canEdit && (
              <button 
                className={`pixel-btn text-xs flex items-center gap-2 hover:animate-pulse ${isEditMode ? 'bg-accent text-foreground' : ''}`}
                onClick={toggleEditMode}
                title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              >
                {isEditMode ? "✓ edit" : "edit"}
              </button>
            )}
            <button 
              className="pixel-btn text-xs flex items-center gap-2 hover:animate-pulse"
              onClick={logout}
            >
              x
            </button>
          </div>
        ) : (
          <button 
            className="pixel-btn text-xs hover:animate-pulse"
            onClick={openLoginModal}
          >
            login
          </button>
        )}
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        allowedTabs={isAddUserMode ? ['register '] : ['login ']}
        initialTab={isAddUserMode ? 'register ' : 'login '}
      />
      {/* Main Card */}
      {cards.main.isVisible && (
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
            <MainCard onOpenCard={openCard} onMouseDown={() => bringToFront("main")} />
          </div>
        </Draggable>
      )}

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
            <IntList username={username} onClose={() => closeCard("intList")} onMouseDown={() => bringToFront("intList")} />
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
            <OpggCard onClose={() => closeCard("opgg")} onMouseDown={() => bringToFront("opgg")} />
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
              onMouseDown={() => bringToFront("movies")}
              username={username}
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
              onMouseDown={() => bringToFront("catPictures")}
            />
          </div>
        </Draggable>
      )}
      {/* Duo Tracker Card */}
      {cards.duoTracker.isVisible && (
        <Draggable
          nodeRef={duoTrackerRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.duoTracker.position ?? undefined}
          onStart={() => bringToFront("duoTracker")}
          onStop={(_, data) =>
            updateCardPosition("duoTracker", { x: data.x, y: data.y })
          }
        >
          <div
            ref={duoTrackerRef}
            className={`w-fit absolute transition-opacity duration-150 ${cards.duoTracker.position === null ? "opacity-0" : "opacity-100"
              }`}
            style={{ zIndex: cards.duoTracker.zIndex }}
            onMouseDown={() => bringToFront("duoTracker")}
          >
            <DuoTrackerContainer
              onClose={() => closeCard("duoTracker")}
              onMouseDown={() => bringToFront("duoTracker")}
              isRosie={isRosie}
              onOpenOpgg={() => openCard("opgg")}
            />
          </div>
        </Draggable>
      )}
      {/* First Tracker Card */}
      {cards.firstTracker.isVisible && (
        <Draggable
          nodeRef={firstTrackerRef}
          bounds="parent"
          handle=".drag-handle"
          position={cards.firstTracker.position ?? undefined}
          onStart={() => bringToFront("firstTracker")}
          onStop={(_, data) =>
            updateCardPosition("firstTracker", { x: data.x, y: data.y })
          }
        >
          <div
            ref={firstTrackerRef}
            className={`w-fit absolute transition-opacity duration-150 ${cards.firstTracker.position === null ? "opacity-0" : "opacity-100"
              }`}
            style={{ zIndex: cards.firstTracker.zIndex }}
            onMouseDown={() => bringToFront("firstTracker")}
          >
            <FirstTrackerContainer
              onClose={() => closeCard("firstTracker")}
              onMouseDown={() => bringToFront("firstTracker")}
              isRosie={isRosie}
            />
          </div>
        </Draggable>
      )}
    </div>
  );
}
