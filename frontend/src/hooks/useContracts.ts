import { useMemo } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../config";
import EventRegistryFull from "../abis/EventRegistry.json";
import TicketCredentialFull from "../abis/TicketCredential.json";
import GateVerifierFull from "../abis/GateVerifier.json";

const EventRegistryABI = (EventRegistryFull as any).abi ?? EventRegistryFull;
const TicketCredentialABI = (TicketCredentialFull as any).abi ?? TicketCredentialFull;
const GateVerifierABI = (GateVerifierFull as any).abi ?? GateVerifierFull;

export function useContracts(signer: ethers.Signer | null, provider: ethers.BrowserProvider | null) {
    return useMemo(() => {
        const runner = signer || provider;
        if (!runner) return null;

        return {
            eventRegistry: new ethers.Contract(
                CONTRACT_ADDRESSES.EventRegistry,
                EventRegistryABI,
                runner
            ),
            ticketCredential: new ethers.Contract(
                CONTRACT_ADDRESSES.TicketCredential,
                TicketCredentialABI,
                runner
            ),
            gateVerifier: new ethers.Contract(
                CONTRACT_ADDRESSES.GateVerifier,
                GateVerifierABI,
                runner
            ),
        };
    }, [signer, provider]);
}

// Helper: generate a deterministic credential hash from eventId + buyer address
export function makeCredentialHash(eventId: string | number, buyerAddress: string): string {
    return ethers.solidityPackedKeccak256(
        ["uint256", "address"],
        [BigInt(eventId), buyerAddress]
    );
}

// Ticket status labels
export const TICKET_STATUS: Record<number, { label: string; color: string }> = {
    0: { label: "Valid", color: "#00ff88" },
    1: { label: "Used", color: "#888" },
    2: { label: "Revoked", color: "#ff4444" },
    3: { label: "Transferred", color: "#ffaa00" },
};

// Gate verification result labels
export const VERIFY_RESULT: Record<number, { label: string; color: string; icon: string }> = {
    0: { label: "Valid ✓", color: "#00ff88", icon: "✓" },
    1: { label: "Invalid ✗", color: "#ff4444", icon: "✗" },
    2: { label: "Revoked", color: "#ff4444", icon: "✗" },
    3: { label: "Already Used", color: "#ffaa00", icon: "!" },
    4: { label: "Event Mismatch", color: "#ffaa00", icon: "!" },
};
