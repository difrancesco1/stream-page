"use client";
import CardHeader from "../shared/card-header";
import ProfileSection from "./profile-section";
import MainContainer from "./main-container";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainCardProps {
  onOpenCard?: (cardId: CardId) => void;
  onMouseDown?: () => void;
}

export default function MainCard({ onOpenCard, onMouseDown }: MainCardProps) {
  return (
    <div 
      className="relative wrapper pixel-borders pixel-card w-full max-w-[350px] h-auto min-h-[237px] aspect-[5/3] bg-foreground"
      onMouseDown={onMouseDown}
    >
      <CardHeader title="about" exitbtn={false} showTabs={false}>
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
          <ProfileSection />
          <MainContainer onOpenCard={onOpenCard} />
        </div>
      </CardHeader>
    </div>
  );
}
