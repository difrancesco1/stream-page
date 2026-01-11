"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/app/context/auth-context";
import { useProfile } from "@/app/context/profile-context";
import {
  updateProfile,
  uploadProfilePicture,
  uploadFeaturedImage,
  updateSocialLinks,
  type SocialLink,
} from "@/app/api/user/actions";
import Image from "next/image";
import { getImageUrl, isBackendImage } from "@/lib/api";
import EditOverlay from "./edit-overlay";

const PLATFORMS = [
  "twitter",
  "twitch",
  "youtube",
  "discord",
  "tiktok",
  "highlight",
] as const;
type Platform = (typeof PLATFORMS)[number];

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditProfileModal({
  open,
  onOpenChange,
  onSuccess,
}: EditProfileModalProps) {
  const { token } = useAuth();
  const { profile } = useProfile();

  // Biography fields (2 bullet points)
  const [bio1, setBio1] = useState("");
  const [bio2, setBio2] = useState("");

  // Birthday
  const [birthday, setBirthday] = useState("");

  // Profile picture
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null
  );
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // Featured image
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const featuredInputRef = useRef<HTMLInputElement>(null);

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile && open) {
      const bio = profile.biography || [];
      setBio1(bio[0] || "");
      setBio2(bio[1] || "");
      setBirthday(profile.birthday || "");
      setProfilePicPreview(
        profile.profile_picture ? getImageUrl(profile.profile_picture) : null
      );
      setFeaturedPreview(
        profile.featured_image ? getImageUrl(profile.featured_image) : null
      );
      setSocialLinks(profile.social_links || []);
      setProfilePicFile(null);
      setFeaturedFile(null);
    }
  }, [profile, open]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleFeaturedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedFile(file);
      setFeaturedPreview(URL.createObjectURL(file));
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "twitter", url: "" }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string
  ) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleSave = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      // Update profile (biography, birthday)
      const biography = [bio1, bio2].filter((b) => b.trim() !== "");
      const profileResult = await updateProfile(token, {
        biography,
        birthday: birthday || undefined,
      });
      if (!profileResult.success) {
        throw new Error(profileResult.error || "Failed to update profile");
      }

      // Upload profile picture if changed
      if (profilePicFile) {
        const picResult = await uploadProfilePicture(token, profilePicFile);
        if (!picResult.success) {
          throw new Error(
            picResult.error || "Failed to upload profile picture"
          );
        }
      }

      // Upload featured image if changed
      if (featuredFile) {
        const featuredResult = await uploadFeaturedImage(token, featuredFile);
        if (!featuredResult.success) {
          throw new Error(featuredResult.error || "Failed to upload Banner");
        }
      }

      // Update social links
      const validSocialLinks = socialLinks.filter(
        (link) => link.url.trim() !== ""
      );
      const socialsResult = await updateSocialLinks(token, validSocialLinks);
      if (!socialsResult.success) {
        throw new Error(socialsResult.error || "Failed to update social links");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-foreground pixel-borders max-h-[90vh] overflow-y-auto w-[410px] p-[10]">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 flex-col w-full">
            <label className="main-text">About</label>
            <input
              value={bio1}
              onChange={(e) => setBio1(e.target.value)}
              placeholder="First line..."
              className="p-1 pixel-borders bg-background main-text text-xs"
              disabled={isLoading}
            />
            <input
              value={bio2}
              onChange={(e) => setBio2(e.target.value)}
              placeholder="Second line..."
              className="p-1 pixel-borders bg-background main-text text-xs"
              disabled={isLoading}
            />
          </div>

          <div className="w-full flex flex-col">
            <label className="main-text">Birthday (MM/DD/YY):</label>
            <input
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="MM/DD"
              className="p-1 pixel-borders bg-background main-text text-xs"
              disabled={isLoading}
            />
          </div>
         

          <div className="w-full flex flex-col">
            <label className="main-text">Social Links:</label>
            <div className="space-y-2">
              {socialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-1">
                  <select
                    value={link.platform}
                    onChange={(e) =>
                      updateSocialLink(index, "platform", e.target.value)
                    }
                    className="p-1 pixel-borders bg-background main-text text-xs w-21"
                    disabled={isLoading}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    value={link.url}
                    onChange={(e) =>
                      updateSocialLink(index, "url", e.target.value)
                    }
                    placeholder="URL"
                    className="flex-1 p-1 pixel-borders bg-background main-text text-xs"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="pixel-btn text-xs"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSocialLink}
                className="pixel-btn text-xs"
                disabled={isLoading}
              >
                + Add Link
              </button>
            </div>
          </div>


           <div className="grid grid-cols-3 py-2">
            <div>
              <label className="main-text text-xs flex">Profile Picture:</label>
              <div className="flex items-center">
                  <div
                    className="relative w-27 h-27 flex-shrink-0 pixel-borders"
                    onClick={() => profilePicInputRef.current?.click()}
                  >
                    <EditOverlay />
                    {profilePicPreview && (
                    <Image
                      src={profilePicPreview}
                      alt="Profile preview"
                      fill
                      className="pixel-borders rounded-sm object-cover z-[-10]"
                      unoptimized
                    />
                    )}
                  </div>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/gif,image/png"
                  onChange={handleProfilePicChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="item1">
              <label className="main-text text-xs block">Banner:</label>
              <div className="flex flex-col">
                  <div
                    className="relative w-full aspect-video min-h-27 min-w-37 pixel-borders"
                    onClick={() => featuredInputRef.current?.click()}
                  >
                    <EditOverlay />
                    {featuredPreview && (

                    <Image
                      src={featuredPreview}
                      alt="Featured preview"
                      fill
                      className="pixel-borders rounded-sm object-cover z-[-10]"
                      unoptimized
                    />
                    )}
                  </div>
                <input
                  ref={featuredInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/gif,image/png"
                  onChange={handleFeaturedChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-2 bg-accent/50 pixel-borders">
              <p className="main-text text-xs text-red-200">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end py-1">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="pixel-btn text-xs"
            >
              x
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="pixel-btn text-xs bg-accent text-foreground"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
