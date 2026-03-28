// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventRegistry.sol";
import "./TicketCredential.sol";

contract GateVerifier {

    enum VerificationResult { Valid, Invalid, Revoked, AlreadyUsed, EventMismatch }

    struct VerificationLog {
        uint256 ticketId;
        uint256 eventId;
        address holder;
        VerificationResult result;
        uint256 timestamp;
    }

    // Store verification logs by ticketId
    mapping(uint256 => VerificationLog[]) public verificationLogs;

    // Track which tickets have already been scanned at the gate
    mapping(uint256 => bool) public usedAtGate;

    EventRegistry public eventRegistry;
    TicketCredential public ticketCredential;

    event TicketVerified(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed holder,
        VerificationResult result
    );

    constructor(address eventRegistryAddress, address ticketCredentialAddress) {
        eventRegistry = EventRegistry(eventRegistryAddress);
        ticketCredential = TicketCredential(ticketCredentialAddress);
    }

    // MAIN FUNCTION: called by the gate scanner when someone shows up
    // presentedHash = the hash computed from the ticket the buyer presents
    function verifyTicket(
        uint256 ticketId,
        uint256 eventId,
        bytes32 presentedHash
    ) external returns (VerificationResult) {

        TicketCredential.Credential memory cred = ticketCredential.getCredential(ticketId);

        VerificationResult result;

        // Check 1: does the ticket belong to this event?
        if (cred.eventId != eventId) {
            result = VerificationResult.EventMismatch;
        }
        // Check 2: has this ticket already been scanned today?
        else if (usedAtGate[ticketId]) {
            result = VerificationResult.AlreadyUsed;
        }
        // Check 3: has the ticket been revoked?
        else if (cred.status == TicketCredential.TicketStatus.Revoked) {
            result = VerificationResult.Revoked;
        }
        // Check 4: does the presented hash match what's stored on-chain?
        // This is the core anti-fraud check — a fake ticket won't match
        else if (cred.credentialHash != presentedHash) {
            result = VerificationResult.Invalid;
        }
        // All checks passed — ticket is valid
        else {
            result = VerificationResult.Valid;
            usedAtGate[ticketId] = true; // mark as used so it can't be scanned again
        }

        // Log the verification attempt — audit trail, no PII stored
        verificationLogs[ticketId].push(VerificationLog({
            ticketId: ticketId,
            eventId: eventId,
            holder: cred.holder,
            result: result,
            timestamp: block.timestamp
        }));

        emit TicketVerified(ticketId, eventId, cred.holder, result);

        return result;
    }

    // READ all verification attempts for a ticket (audit trail)
    function getVerificationLogs(uint256 ticketId)
        external
        view
        returns (VerificationLog[] memory)
    {
        return verificationLogs[ticketId];
    }

    // READ the last verification result for a ticket
    function getLastVerification(uint256 ticketId)
        external
        view
        returns (VerificationLog memory)
    {
        require(verificationLogs[ticketId].length > 0, "No verifications yet");
        uint256 last = verificationLogs[ticketId].length - 1;
        return verificationLogs[ticketId][last];
    }
}