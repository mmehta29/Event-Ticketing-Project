import { useState } from "react";
import { ethers } from "ethers";
import { makeCredentialHash } from "../hooks/useContracts";

interface Props {
    contracts: any;
    address: string;
}

export default function OrganizerPanel({ contracts, address }: Props) {
    const [tab, setTab] = useState<"create" | "issue" | "revoke">("create");

    // Create Event
    const [eventName, setEventName] = useState("");
    const [venue, setVenue] = useState("");
    const [date, setDate] = useState("");
    const [supply, setSupply] = useState("");
    const [createStatus, setCreateStatus] = useState<string | null>(null);
    const [lastEventId, setLastEventId] = useState<string | null>(null);

    // Issue Ticket
    const [issueEventId, setIssueEventId] = useState("");
    const [buyerAddress, setBuyerAddress] = useState("");
    const [issueStatus, setIssueStatus] = useState<string | null>(null);
    const [lastTicketId, setLastTicketId] = useState<string | null>(null);
    const [lastHash, setLastHash] = useState<string | null>(null);

    // Revoke Ticket
    const [revokeTicketId, setRevokeTicketId] = useState("");
    const [revokeEventId, setRevokeEventId] = useState("");
    const [revokeStatus, setRevokeStatus] = useState<string | null>(null);

    async function handleCreateEvent() {
        setCreateStatus("Sending transaction...");
        try {
            const unixDate = Math.floor(new Date(date).getTime() / 1000);
            const tx = await contracts.eventRegistry.createEvent(
                eventName, venue, unixDate, BigInt(supply)
            );
            setCreateStatus("Waiting for confirmation...");
            const receipt = await tx.wait();
            // Parse EventCreated log to get event ID
            const log = receipt.logs.find((l: any) => l.fragment?.name === "EventCreated");
            const createdId = log ? log.args[0].toString() : "?";
            setLastEventId(createdId);
            setCreateStatus(`✓ Event created! ID: ${createdId}`);
            setEventName(""); setVenue(""); setDate(""); setSupply("");
        } catch (e: any) {
            setCreateStatus(`Error: ${e.reason || e.message}`);
        }
    }

    async function handleIssueTicket() {
        setIssueStatus("Generating credential hash...");
        try {
            if (!ethers.isAddress(buyerAddress)) {
                setIssueStatus("Error: Invalid buyer address");
                return;
            }
            const hash = makeCredentialHash(issueEventId, buyerAddress);
            setIssueStatus("Sending transaction...");
            const tx = await contracts.ticketCredential.issueTicket(
                BigInt(issueEventId), buyerAddress, hash
            );
            setIssueStatus("Waiting for confirmation...");
            const receipt = await tx.wait();
            const log = receipt.logs.find((l: any) => l.fragment?.name === "TicketIssued");
            const ticketId = log ? log.args[0].toString() : "?";
            setLastTicketId(ticketId);
            setLastHash(hash);
            setIssueStatus(`✓ Ticket issued! ID: ${ticketId}`);
            setIssueEventId(""); setBuyerAddress("");
        } catch (e: any) {
            setIssueStatus(`Error: ${e.reason || e.message}`);
        }
    }

    async function handleRevokeTicket() {
        setRevokeStatus("Sending transaction...");
        try {
            const tx = await contracts.ticketCredential.revokeTicket(
                BigInt(revokeTicketId), BigInt(revokeEventId)
            );
            setRevokeStatus("Waiting for confirmation...");
            await tx.wait();
            setRevokeStatus(`✓ Ticket #${revokeTicketId} revoked`);
            setRevokeTicketId(""); setRevokeEventId("");
        } catch (e: any) {
            setRevokeStatus(`Error: ${e.reason || e.message}`);
        }
    }

    return (
        <div className="panel">
            <div className="tab-bar">
                <button className={tab === "create" ? "tab active" : "tab"} onClick={() => setTab("create")}>
                    Create Event
                </button>
                <button className={tab === "issue" ? "tab active" : "tab"} onClick={() => setTab("issue")}>
                    Issue Ticket
                </button>
                <button className={tab === "revoke" ? "tab active" : "tab"} onClick={() => setTab("revoke")}>
                    Revoke Ticket
                </button>
            </div>

            {tab === "create" && (
                <div className="form-section">
                    <h3>Create New Event</h3>
                    <label>Event Name</label>
                    <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. DevCon 2025" />
                    <label>Venue</label>
                    <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Phoenix Convention Center" />
                    <label>Date</label>
                    <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
                    <label>Ticket Supply</label>
                    <input type="number" value={supply} onChange={e => setSupply(e.target.value)} placeholder="e.g. 100" min="1" />
                    <button className="btn-primary" onClick={handleCreateEvent}>Create Event</button>
                    {createStatus && (
                        <div className={`status ${createStatus.startsWith("✓") ? "success" : createStatus.startsWith("Error") ? "error" : "pending"}`}>
                            {createStatus}
                        </div>
                    )}
                    {lastEventId && (
                        <div className="info-box">
                            <span>Event ID</span>
                            <strong>{lastEventId}</strong>
                            <span className="hint">Use this when issuing tickets</span>
                        </div>
                    )}
                </div>
            )}

            {tab === "issue" && (
                <div className="form-section">
                    <h3>Issue Ticket to Buyer</h3>
                    <label>Event ID</label>
                    <input type="number" value={issueEventId} onChange={e => setIssueEventId(e.target.value)} placeholder="0" min="0" />
                    <label>Buyer Wallet Address</label>
                    <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="0x..." />
                    <p className="hint">Credential hash will be auto-generated from eventId + buyer address</p>
                    <button className="btn-primary" onClick={handleIssueTicket}>Issue Ticket</button>
                    {issueStatus && (
                        <div className={`status ${issueStatus.startsWith("✓") ? "success" : issueStatus.startsWith("Error") ? "error" : "pending"}`}>
                            {issueStatus}
                        </div>
                    )}
                    {lastTicketId && lastHash && (
                        <div className="info-box">
                            <div><span>Ticket ID</span> <strong>{lastTicketId}</strong></div>
                            <div><span>Credential Hash</span></div>
                            <code className="hash">{lastHash}</code>
                            <span className="hint">Give this hash to the ticket holder for gate verification</span>
                        </div>
                    )}
                </div>
            )}

            {tab === "revoke" && (
                <div className="form-section">
                    <h3>Revoke a Ticket</h3>
                    <label>Ticket ID</label>
                    <input type="number" value={revokeTicketId} onChange={e => setRevokeTicketId(e.target.value)} placeholder="0" min="0" />
                    <label>Event ID</label>
                    <input type="number" value={revokeEventId} onChange={e => setRevokeEventId(e.target.value)} placeholder="0" min="0" />
                    <button className="btn-danger" onClick={handleRevokeTicket}>Revoke Ticket</button>
                    {revokeStatus && (
                        <div className={`status ${revokeStatus.startsWith("✓") ? "success" : revokeStatus.startsWith("Error") ? "error" : "pending"}`}>
                            {revokeStatus}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
