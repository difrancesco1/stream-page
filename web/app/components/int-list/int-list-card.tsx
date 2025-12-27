"use client"
import { useState, useCallback, useEffect } from "react"
import CardHeader from "../shared/card-header"
import IntListPlayerCard from "./int-list-player-card"
import IntListFooter from "./int-list-footer"
import { 
    getIntListEntries, 
    getIntListContributors,
    type IntListEntry, 
    type IntListContributor 
} from "@/app/api/int-list/actions"

interface IntListCardProps {
    onClose?: () => void;
}

interface Tab {
    title: string;
    user_id?: string;
}

export default function IntListCard({ onClose }: IntListCardProps) {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [entries, setEntries] = useState<IntListEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContributors = async () => {
            const result = await getIntListContributors();
            
            if (result.success && result.contributors.length > 0) {
                const contributorTabs: Tab[] = result.contributors.map((c: IntListContributor) => ({
                    title: `${c.username} `,
                    user_id: c.user_id,
                }));
                setTabs(contributorTabs);
                setActiveTab(contributorTabs[0]);
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
            
            const result = await getIntListEntries(activeTab.user_id);
            
            if (result.success) {
                setEntries(result.entries);
            } else {
                setError(result.error || "Failed to fetch entries");
                setEntries([]);
            }
            
            setIsLoading(false);
        };

        fetchEntries();
    }, [activeTab]);

    const handleEntryAdded = useCallback(() => {
        // Trigger a refresh of contributors and entries
        setRefreshKey(prev => prev + 1);
    }, []);

    const handleSetActiveTab = useCallback((tab: { title: string }) => {
        // Find the full tab object with user_id
        const fullTab = tabs.find(t => t.title === tab.title);
        if (fullTab) {
            setActiveTab(fullTab);
        }
    }, [tabs]);

    return (
        <div className="relative wrapper pixel-borders pixel-card w-full max-w-[400px] h-auto min-h-[280px] aspect-[5/3] bg-foreground">
            <CardHeader
                title="int list"
                exitbtn={true}
                onClose={onClose}
                showTabs={tabs.length > 0}
                tabs={tabs}
                activeTab={activeTab || undefined}
                setActiveTab={handleSetActiveTab}
            >
                <div className="px-1 py-1 w-full h-[calc(100%-24px)] overflow-y-auto">
                    <IntListPlayerCard 
                        entries={entries} 
                        isLoading={isLoading} 
                        error={error} 
                    />
                </div>
                <IntListFooter onEntryAdded={handleEntryAdded} />
            </CardHeader>
        </div>
    )
}
