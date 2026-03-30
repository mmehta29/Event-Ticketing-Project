// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventRegistry.sol";
import "./TicketCredential.sol";
import "./CredentialRegistry.sol";

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
    CredentialRegistry public credentialRegistry;

    event TicketVerified(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed holder,
        VerificationResult result
    );

    constructor(
        address eventRegistryAddress,
        address ticketCredentialAddress,
        address credentialRegistryAddress
    ) {
        eventRegistry = EventRegistry(eventRegistryAddress);
        ticketCredential = TicketCredential(ticketCredentialAddress);
        credentialRegistry = CredentialRegistry(credentialRegistryAddress);
    }

    // MAIN FUNCTION: called by the gate scanner when someone shows up
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
        // Additional check: revoked via CredentialRegistry
        else if (credentialRegistry.isRevoked(cred.credentialHash)) {
            result = VerificationResult.Revoked;
        }
        // Check 4: does the presented hash match what's stored on-chain?
        else if (cred.credentialHash != presentedHash) {
            result = VerificationResult.Invalid;
        }
        // All checks passed — ticket is valid
        else {
            result = VerificationResult.Valid;
            usedAtGate[ticketId] = true;
        }

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

    function getVerificationLogs(uint256 ticketId)
        external
        view
        returns (VerificationLog[] memory)
    {
        return verificationLogs[ticketId];
    }

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