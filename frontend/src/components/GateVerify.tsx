import { useState } from "react";
import { makeCredentialHash, VERIFY_RESULT } from "../hooks/useContracts";

interface Props {
    contracts: any;
    address: string;
}

export default function GateVerify({ contracts, address }: Props) {
    const [ticketId, setTicketId] = useState("");
    const [eventId, setEventId] = useState("");
    const [hash, setHash] = useState("");
    const [result, setResult] = useState<number | null>(null);
    const [holderAddr, setHolderAddr] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [autoGenHash, setAutoGenHash] = useState("");

    // Auto-generate helper: given ticketId+eventId+holder, compute hash
    const [autoHolder, setAutoHolder] = useState("");
    const [autoEventId, setAutoEventId] = useState("");

    function generateHash() {
        if (!autoEventId || !autoHolder) return;
        const h = makeCredentialHash(autoEventId, autoHolder);
        setAutoGenHash(h);
        setHash(h);
    }

    async function handleVerify() {
        setStatus("Verifying...");
        setResult(null);
        setHolderAddr(null);
        try {
            const tx = await contracts.gateVerifier.verifyTicket(
                BigInt(ticketId), BigInt(eventId), hash
            );
            setStatus("Waiting for confirmation...");
            const receipt = await tx.wait();
            const log = receipt.logs.find((l: any) => l.fragment?.name === "TicketVerified");
            const resultCode = log ? Number(log.args[3]) : null;
            const holder = log ? log.args[2] : null;
            if (resultCode !== null) {
                setResult(resultCode);
                setHolderAddr(holder);
                setStatus(null);
            } else {
                setStatus("Transaction confirmed but could not parse result");
            }
        } catch (e: any) {
            setStatus(`Error: ${e.reason || e.message}`);
        }
    }

    const resultInfo = result !== null ? VERIFY_RESULT[result] : null;

    return (
        <div className="panel">
            <h3>Gate Verification</h3>
            <p className="hint" style={{ marginBottom: "1.5rem" }}>
                Used at the event entrance to validate tickets on-chain.
            </p>

            {/* Hash helper */}
            <div className="helper-box">
                <h4>Hash Generator (optional)</h4>
                <p className="hint">Auto-generate the expected credential hash from eventId + holder address</p>
                <div className="inline-fields">
                    <div>
                        <label>Event ID</label>
                        <input value={autoEventId} onChange={e => setAutoEventId(e.target.value)} placeholder="0" type="number" />
                    </div>
                    <div>
                        <label>Holder Address</label>
                        <input value={autoHolder} onChange={e => setAutoHolder(e.target.value)} placeholder="0x..." />
                    </div>
                </div>
                <button className="btn-secondary small" onClick={generateHash}>Generate & Fill Hash</button>
                {autoGenHash && <code className="hash" style={{ marginTop: "0.5rem", display: "block" }}>{autoGenHash}</code>}
            </div>

            <div className="form-section">
                <label>Ticket ID</label>
                <input type="number" value={ticketId} onChange={e => setTicketId(e.target.value)} placeholder="0" min="0" />
                <label>Event ID</label>
                <input type="number" value={eventId} onChange={e => setEventId(e.target.value)} placeholder="0" min="0" />
                <label>Credential Hash</label>
                <input value={hash} onChange={e => setHash(e.target.value)} placeholder="0x..." />
                <button className="btn-primary" onClick={handleVerify} disabled={!ticketId || !eventId || !hash}>
                    Verify Ticket
                </button>
            </div>

            {status && (
                <div className={`status ${status.startsWith("Error") ? "error" : "pending"}`}>{status}</div>
            )}

            {resultInfo && (
                <div className="verify-result" style={{ borderColor: resultInfo.color }}>
                    <div className="verify-icon" style={{ color: resultInfo.color }}>{resultInfo.icon}</div>
                    <div className="verify-label" style={{ color: resultInfo.color }}>{resultInfo.label}</div>
                    {holderAddr && <div className="verify-holder">Holder: <code>{holderAddr}</code></div>}
                    <div className="verify-ids">Ticket #{ticketId} · Event #{eventId}</div>
                </div>
            )}
        </div>
    );
}
