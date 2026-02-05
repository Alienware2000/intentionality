"use client";

// =============================================================================
// FREEMIUM PROVIDER
// Context for managing freemium UI state including:
// - Upgrade modal open/close state
// - Usage data (fetched from API)
// - Waitlist status
//
// LEARNING: Centralized Modal Management
// --------------------------------------
// Having a provider manage modal state allows any component to trigger
// the upgrade modal without prop drilling. Components can use:
// - openUpgradeModal() to show the modal
// - usage data to show indicators
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { UsageData } from "./UsageIndicator";
import UpgradeModal from "./UpgradeModal";
import LimitReachedModal from "./LimitReachedModal";
import { fetchApi } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type UsageState = {
  chat: UsageData;
  brain_dump: UsageData;
  insights: UsageData;
  briefing: UsageData;
};

type FeatureType = "chat" | "brain_dump" | "insights" | "briefing";

type FreemiumContextValue = {
  /** Current usage data for all features */
  usage: UsageState | null;
  /** Whether usage data is loading */
  isLoadingUsage: boolean;
  /** Refresh usage data from API */
  refreshUsage: () => Promise<void>;
  /** Whether the upgrade modal is open */
  isUpgradeModalOpen: boolean;
  /** Open the upgrade modal */
  openUpgradeModal: (source?: string) => void;
  /** Close the upgrade modal */
  closeUpgradeModal: () => void;
  /** Whether user is on the waitlist */
  isOnWaitlist: boolean | null;
  /** Feature that hit limit (for limit reached modal) */
  limitReachedFeature: FeatureType | null;
  /** Open the limit reached modal for a specific feature */
  openLimitReachedModal: (feature: FeatureType) => void;
  /** Close the limit reached modal */
  closeLimitReachedModal: () => void;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const FreemiumContext = createContext<FreemiumContextValue | null>(null);

/**
 * Hook to access freemium context.
 * Must be used within FreemiumProvider.
 */
export function useFreemium() {
  const ctx = useContext(FreemiumContext);
  if (!ctx) {
    throw new Error("useFreemium must be used within FreemiumProvider");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
  /** User's email for pre-filling waitlist form */
  userEmail?: string;
};

export function FreemiumProvider({ children, userEmail }: Props) {
  // Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState("upgrade_modal");

  // Limit reached modal state
  const [limitReachedFeature, setLimitReachedFeature] = useState<FeatureType | null>(null);

  // Usage state
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Waitlist status
  const [isOnWaitlist, setIsOnWaitlist] = useState<boolean | null>(null);

  // -------------------------------------------------------------------------
  // Modal Actions
  // -------------------------------------------------------------------------

  const openUpgradeModal = useCallback((source = "upgrade_modal") => {
    setModalSource(source);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  const openLimitReachedModal = useCallback((feature: FeatureType) => {
    setLimitReachedFeature(feature);
  }, []);

  const closeLimitReachedModal = useCallback(() => {
    setLimitReachedFeature(null);
  }, []);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  /**
   * Fetch current usage from API.
   */
  const refreshUsage = useCallback(async () => {
    setIsLoadingUsage(true);
    try {
      const response = await fetchApi<{ ok: boolean; usage: UsageState }>(
        "/api/premium/usage"
      );
      setUsage(response.usage);
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setIsLoadingUsage(false);
    }
  }, []);

  /**
   * Check waitlist status.
   */
  const checkWaitlistStatus = useCallback(async () => {
    try {
      const response = await fetchApi<{ ok: boolean; onWaitlist: boolean }>(
        "/api/premium/waitlist"
      );
      setIsOnWaitlist(response.onWaitlist);
    } catch (error) {
      console.error("Failed to check waitlist status:", error);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Fetch usage data on mount
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Check waitlist status on mount
  useEffect(() => {
    checkWaitlistStatus();
  }, [checkWaitlistStatus]);

  // Refresh waitlist status when modal closes (in case user joined)
  useEffect(() => {
    if (!isUpgradeModalOpen) {
      // Small delay to allow API to process
      const timer = setTimeout(checkWaitlistStatus, 500);
      return () => clearTimeout(timer);
    }
  }, [isUpgradeModalOpen, checkWaitlistStatus]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const value: FreemiumContextValue = {
    usage,
    isLoadingUsage,
    refreshUsage,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    isOnWaitlist,
    limitReachedFeature,
    openLimitReachedModal,
    closeLimitReachedModal,
  };

  return (
    <FreemiumContext.Provider value={value}>
      {children}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        userEmail={userEmail}
        source={modalSource}
      />
      <LimitReachedModal
        isOpen={limitReachedFeature !== null}
        onClose={closeLimitReachedModal}
        feature={limitReachedFeature}
        onOpenUpgrade={() => openUpgradeModal("limit_reached")}
      />
    </FreemiumContext.Provider>
  );
}
