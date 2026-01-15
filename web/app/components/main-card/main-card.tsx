"use client";
import { useState } from "react";
import CardHeader from "../shared/card-header";
import ProfileSection from "./profile-section";
import MainContainer from "./main-container";
import EditProfileModal from "./edit-profile-modal";
import { useEditMode } from "@/app/context/edit-mode-context";
import { useProfile } from "@/app/context/profile-context";

type CardId = "main" | "intList" | "opgg" | "movies" | "catPictures";

interface MainCardProps {
  onOpenCard?: (cardId: CardId) => void;
  onMouseDown?: () => void;
}

export default function MainCard({ onOpenCard, onMouseDown }: MainCardProps) {
  const { isEditMode } = useEditMode();
  const { refetch } = useProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditSuccess = () => {
    refetch();
  };

  return (
    <div 
      className="relative wrapper pixel-borders pixel-card w-full max-w-[var(--card-main-width)] h-auto min-h-[var(--card-main-min-height)] aspect-[5/3] bg-foreground"
      onMouseDown={onMouseDown}
    >
      {/* Edit Button */}
      {isEditMode && (
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-1 right-1 z-10 pixel-btn text-xs px-2 py-0.5 bg-accent text-foreground hover:animate-pulse"
        >
          edit
        </button>
      )}
      
      <CardHeader title="about" exitbtn={false} showTabs={false}>
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
          <ProfileSection />
          <MainContainer onOpenCard={onOpenCard} />
        </div>
      </CardHeader>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
