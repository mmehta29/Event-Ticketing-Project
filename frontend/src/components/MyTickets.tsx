import { useState, useEffect } from "react";
import { makeCredentialHash, TICKET_STATUS } from "../hooks/useContracts";

interface Credential {
    ticketId: bigint;
    eventId: bigint;
    holder: string;
    credentialHash: string;
    status: number;
    issuedAt: bigint;
    exists: boolean;
}

interface EventInfo {
    name: string;
    venue: string;
    date: bigint;
}

interface Props {
    contracts: any;
    address: string;
}

export default function MyTickets({ contracts, address }: Props) {
    const [tickets, setTickets] = useState<Credential[]>([]);
    const [eventNames, setEventNames] = useState<Record<string, EventInfo>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Transfer state
    const [transferTicketId, setTransferTicketId] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [transferStatus, setTransferStatus] = useState<string | null>(null);

    async function loadTickets() {
        setLoading(true);
        setError(null);
        try {
            const ids: bigint[] = await contracts.ticketCredential.getHolderTickets(address);
            const creds: Credential[] = await Promise.all(
                ids.map((id) => contracts.ticketCredential.getCredential(id))
            );
            setTickets(creds);

            // Load event names
            const evtMap: Record<string, EventInfo> = {};
            const uniqueEventIds = [...new Set(creds.map(c => c.eventId.toString()))];
            await Promise.all(
                uniqueEventIds.map(async (eid) => {
                    try {
                        const evt = await contracts.eventRegistry.getEvent(BigInt(eid));
                        evtMap[eid] = { name: evt.name, venue: evt.venue, date: evt.date };
                    } catch { }
                })
            );
            setEventNames(evtMap);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (contracts && address) loadTickets();
    }, [contracts, address]);

    async function handleTransfer() {
        setTransferStatus("Sending transaction...");
        try {
            const newHash = makeCredentialHash(
                tickets.find(t => t.ticketId.toString() === transferTicketId)?.eventId.toString() || "0",
                transferTo
            );
            const tx = await contracts.ticketCredential.transferTicket(
                BigInt(transferTicketId), transferTo, newHash
            );
            setTransferStatus("Waiting for confirmation...");
            await tx.wait();
            setTransferStatus(`✓ Ticket #${transferTicketId} transferred`);
            setTransferTicketId(""); setTransferTo("");
            await loadTickets();
        } catch (e: any) {
            setTransferStatus(`Error: ${e.reason || e.message}`);
        }
    }

    return (
        <div className="panel">
            <div className="panel-header">
                <h3>My Tickets</h3>
                <button className="btn-secondary" onClick={loadTickets} disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {error && <div className="status error">{error}</div>}

            {tickets.length === 0 && !loading && (
                <div className="empty-state">No tickets found for this wallet</div>
            )}

            <div className="ticket-grid">
                {tickets.map((t) => {
                    const status = TICKET_STATUS[t.status] || { label: "Unknown", color: "#888" };
                    const evtInfo = eventNames[t.eventId.toString()];
                    const hash = makeCredentialHash(t.eventId.toString(), t.holder);
                    return (
                        <div key={t.ticketId.toString()} className="ticket-card">
                            <div className="ticket-top">
                                <div>
                                    <div className="ticket-event">{evtInfo?.name || `Event #${t.eventId.toString()}`}</div>
                                    <div className="ticket-venue">{evtInfo?.venue}</div>
                                    {evtInfo?.date && (
                                        <div className="ticket-date">
                                            {new Date(Number(evtInfo.date) * 1000).toLocaleDateString("en-US", {
                                                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </div>
                                    )}
                                </div>
                                <span className="status-badge" style={{ color: status.color, borderColor: status.color }}>
                                    {status.label}
                                </span>
                            </div>
                            <div className="ticket-meta">
                                <div><span>Ticket ID</span> <strong>#{t.ticketId.toString()}</strong></div>
                                <div><span>Event ID</span> <strong>#{t.eventId.toString()}</strong></div>
                                <div><span>Issued</span> <strong>{new Date(Number(t.issuedAt) * 1000).toLocaleDateString()}</strong></div>
                            </div>
                            <div className="ticket-hash-section">
                                <span>Your credential hash (for gate entry):</span>
                                <code className="hash">{hash}</code>
                            </div>
                        </div>
                    );
                })}
            </div>

            {tickets.length > 0 && (
                <div className="form-section" style={{ marginTop: "2rem", borderTop: "1px solid var(--border)" }}>
                    <h4>Transfer a Ticket</h4>
                    <label>Ticket ID</label>
                    <input type="number" value={transferTicketId} onChange={e => setTransferTicketId(e.target.value)} placeholder="0" />
                    <label>Transfer To (wallet address)</label>
                    <input value={transferTo} onChange={e => setTransferTo(e.target.value)} placeholder="0x..." />
                    <button className="btn-secondary" onClick={handleTransfer}>Transfer</button>
                    {transferStatus && (
                        <div className={`status ${transferStatus.startsWith("✓") ? "success" : transferStatus.startsWith("Error") ? "error" : "pending"}`}>
                            {transferStatus}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
