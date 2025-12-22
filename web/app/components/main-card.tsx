"use client";
import Topbar from "./topbar";
import ProfileSection from "./profile-section";
import MainContainer from "./main-container";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainCardProps {
  onOpenCard?: (cardId: CardId) => void;
}

export default function MainCard({ onOpenCard }: MainCardProps) {
  return (
    <div className="wrapper pixel-borders pixel-card w-full max-w-[500px] h-auto min-h-[305px] aspect-[5/3] bg-foreground">
      <div className="col-start-1 col-end-6 row-start-1 mx-0.5 my-0.5 relative pointer-events-none"></div>
      <div className="col-start-1 col-end-6 row-start-1 row-end-5 flex flex-col justify-start h-full overflow-hidden">
        <div className="mx-0.5 my-0.5 flex flex-col gap-1 flex-shrink-0">
          <Topbar title="about" exitbtn={false} />
        </div>
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden ml-0.5">
          <ProfileSection />
          <MainContainer onOpenCard={onOpenCard} />
        </div>
      </div>
    </div>
  );
}
