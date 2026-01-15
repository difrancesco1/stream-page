"use client";
import { useState, useCallback, useEffect } from "react";
import CardHeader from "../shared/card-header";
import IntListPlayerCard from "./int-list-player-card";
import IntListFooter from "./int-list-footer";
import EditIntListModal from "./edit-int-list-modal";
import {
  getIntListEntries,
  getIntListContributors,
  type IntListEntry,
  type IntListContributor,
} from "@/app/api/int-list/actions";

interface IntListCardProps {
  onClose?: () => void;
  onMouseDown?: () => void;
  username?: string | null;
}

interface Tab {
  title: string;
  user_id?: string;
}

export default function IntListCard({ onClose, onMouseDown, username}: IntListCardProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [entries, setEntries] = useState<IntListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<IntListEntry | null>(null);

  useEffect(() => {
    const fetchContributors = async () => {
      const result = await getIntListContributors();

      if (result.success && result.contributors.length > 0) {
        // Find rosie's user_id
        const rosie = result.contributors.find(
          (c: IntListContributor) => c.username.toLowerCase() === "rosie"
        );

        // Create exactly 2 tabs: rosie and ALL
        const newTabs: Tab[] = [
          { title: "rosie", user_id: rosie?.user_id },
          { title: "ALL" },
        ];
        setTabs(newTabs);
        setActiveTab(newTabs[0]);
      } else {
        // No contributors yet
        setTabs([]);
        setActiveTab(null);
      }
    };

    fetchContributors();
  }, [refreshKey]);

  // Fetch entries when activeTab changes
  useEffect(() => {
    const fetchEntries = async () => {
      if (!activeTab) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      if (activeTab.title === "ALL") {
        // Fetch all entries and filter out rosie's
        const result = await getIntListEntries();
        if (result.success) {
          const filteredEntries = result.entries.filter(
            (entry) => entry.contributor_username.toLowerCase() !== "rosie"
          );
          setEntries(filteredEntries);
        } else {
          setError(result.error || "Failed to fetch entries");
          setEntries([]);
        }
      } else {
        // Fetch entries for rosie (filter by user_id if available, then filter client-side as safeguard)
        const result = await getIntListEntries(activeTab.user_id);
        if (result.success) {
          // Always filter client-side to ensure only rosie's entries show
          const rosieEntries = result.entries.filter(
            (entry) => entry.contributor_username.toLowerCase() === "rosie"
          );
          setEntries(rosieEntries);
        } else {
          setError(result.error || "Failed to fetch entries");
          setEntries([]);
        }
      }

      setIsLoading(false);
    };

    fetchEntries();
  }, [activeTab]);

  const handleEntryAdded = useCallback(() => {
    // Trigger a refresh of contributors and entries
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleSetActiveTab = useCallback(
    (tab: { title: string }) => {
      // Find the full tab object with user_id
      const fullTab = tabs.find((t) => t.title === tab.title);
      if (fullTab) {
        setActiveTab(fullTab);
      }
    },
    [tabs]
  );

  return (
    <div 
      className="relative wrapper pixel-borders pixel-card w-full max-w-[25rem] h-auto min-h-[17.5rem] aspect-[5/3] bg-foreground"
      onMouseDown={onMouseDown}
    >
      <CardHeader
        title="int list"
        exitbtn={true}
        onClose={onClose}
        showTabs={tabs.length > 0}
        tabs={tabs}
        activeTab={activeTab || undefined}
        setActiveTab={handleSetActiveTab}
      >
        <div className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] w-full h-[calc(100%-1.5rem)] overflow-y-auto">
          <IntListPlayerCard
            username={username}
            entries={entries}
            isLoading={isLoading}
            error={error}
            onEntryClick={(entry) => setEditingEntry(entry)}
            showUsername={activeTab?.title === "ALL"}
          />
        </div>
        <IntListFooter onEntryAdded={handleEntryAdded} />
      </CardHeader>
      {editingEntry && (
        <EditIntListModal
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          entry={editingEntry}
          onSuccess={handleEntryAdded}
        />
      )}
    </div>
  );
}
