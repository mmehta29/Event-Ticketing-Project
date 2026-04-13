import { network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

describe("Event Ticketing System", () => {

    // These will hold our deployed contract instances
    let eventRegistry;
    let credentialRegistry;
    let ticketCredential;
    let gateVerifier;

    // These will hold our test wallets (Hardhat gives us 20 fake funded wallets)
    let organizer;
    let buyer;
    let stranger;  // someone who shouldn't have access

    // ethers instance from the network connection
    let ethers;

    // A fake IPFS hash representing ticket data stored off-chain
    // Base hash used in early ticket tests
    const fakeCredentialHash = keccak256(
        toUtf8Bytes("seat:A14,venue:Chase Center,date:2026-05-01")
    );
    // Fresh hashes for gate-verifier tickets so revocation of earlier hashes
    // (e.g., during transfer tests) doesn't trip the revocation check.
    const gateCredentialHash1 = keccak256(
        toUtf8Bytes("gate-ticket-1:unique")
    );
    const gateCredentialHash2 = keccak256(
        toUtf8Bytes("gate-ticket-2:unique")
    );

    const fakeEventDate = Math.floor(Date.now() / 1000) + 86400; // tomorrow

    // before() runs once before all tests — deploys all 3 contracts
    before(async () => {
        const conn = await network.connect();
        ethers = conn.ethers;

        [organizer, buyer, stranger] = await ethers.getSigners();

        // Deploy EventRegistry first
        const EventRegistry = await ethers.getContractFactory("EventRegistry");
        eventRegistry = await EventRegistry.connect(organizer).deploy();
        await eventRegistry.waitForDeployment();

        // Deploy CredentialRegistry (revocation list)
        const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
        credentialRegistry = await CredentialRegistry.connect(organizer).deploy();
        await credentialRegistry.waitForDeployment();

        // Deploy TicketCredential, passing EventRegistry + CredentialRegistry addresses
        const TicketCredential = await ethers.getContractFactory("TicketCredential");
        ticketCredential = await TicketCredential.connect(organizer).deploy(
            await eventRegistry.getAddress(),
            await credentialRegistry.getAddress()
        );
        await ticketCredential.waitForDeployment();

        // Deploy GateVerifier, passing all three addresses
        const GateVerifier = await ethers.getContractFactory("GateVerifier");
        gateVerifier = await GateVerifier.connect(organizer).deploy(
            await eventRegistry.getAddress(),
            await ticketCredential.getAddress(),
            await credentialRegistry.getAddress()
        );
        await gateVerifier.waitForDeployment();
    });

    // ─── EventRegistry tests ──────────────────────────────────────────

    describe("EventRegistry", () => {

        it("organizer can create an event", async () => {
            const tx = await eventRegistry.connect(organizer).createEvent(
                "ASU Blockchain Summit",
                "Tempe, AZ",
                fakeEventDate,
                100  // 100 tickets
            );
            await tx.wait();

            const event = await eventRegistry["getEvent(uint256)"](0);
            assert.equal(event.name, "ASU Blockchain Summit");
            assert.equal(event.venue, "Tempe, AZ");
            assert.equal(event.ticketSupply, 100n);
            assert.equal(event.ticketsSold, 0n);
            assert.equal(event.organizer, organizer.address);
        });

        it("fails if event name is empty", async () => {
            await assert.rejects(
                eventRegistry.connect(organizer).createEvent("", "Tempe, AZ", fakeEventDate, 100),
                /Name cannot be empty/
            );
        });

        it("fails if ticket supply is zero", async () => {
            await assert.rejects(
                eventRegistry.connect(organizer).createEvent("Test", "Tempe, AZ", fakeEventDate, 0),
                /Must have at least 1 ticket/
            );
        });

        it("reports correct tickets available", async () => {
            const available = await eventRegistry.ticketsAvailable(0);
            assert.equal(available, 100n);
        });

    });

    // ─── TicketCredential tests ───────────────────────────────────────

    describe("TicketCredential", () => {

        it("organizer can issue a ticket to a buyer", async () => {
            const tx = await ticketCredential.connect(organizer).issueTicket(
                0,  // eventId
                buyer.address,
                fakeCredentialHash
            );
            await tx.wait();

            const cred = await ticketCredential.getCredential(0);
            assert.equal(cred.holder, buyer.address);
            assert.equal(cred.credentialHash, fakeCredentialHash);
            assert.equal(cred.status, 0n); // 0 = Valid
        });

        it("issuing a ticket reduces available supply", async () => {
            const available = await eventRegistry.ticketsAvailable(0);
            assert.equal(available, 99n); // was 100, now 99
        });

        it("stranger cannot issue a ticket", async () => {
            await assert.rejects(
                ticketCredential.connect(stranger).issueTicket(0, buyer.address, fakeCredentialHash),
                /Only organizer can issue tickets/
            );
        });

        it("buyer can transfer ticket to stranger", async () => {
            const newHash = keccak256(
                toUtf8Bytes("seat:A14,venue:Chase Center,newHolder:stranger")
            );

            const tx = await ticketCredential.connect(buyer).transferTicket(
                0,  // ticketId
                stranger.address,
                newHash
            );
            await tx.wait();

            const cred = await ticketCredential.getCredential(0);
            assert.equal(cred.holder, stranger.address);
            assert.equal(cred.credentialHash, newHash);
        });

        it("original buyer can no longer transfer the ticket", async () => {
            await assert.rejects(
                ticketCredential.connect(buyer).transferTicket(0, stranger.address, fakeCredentialHash),
                /Not the ticket holder/
            );
        });

    });

    // ─── GateVerifier tests ───────────────────────────────────────────

    describe("GateVerifier", () => {

        // Issue a fresh ticket to buyer for gate tests
        before(async () => {
            const tx = await ticketCredential.connect(organizer).issueTicket(
                0,
                buyer.address,
                gateCredentialHash1
            );
            await tx.wait();
        });

        it("valid ticket passes verification", async () => {
            const tx = await gateVerifier.connect(organizer).verifyTicket(
                1,  // ticketId (second ticket issued)
                0,  // eventId
                gateCredentialHash1
            );
            await tx.wait();

            const log = await gateVerifier.getLastVerification(1);
            assert.equal(log.result, 0n); // 0 = Valid
        });

        it("same ticket fails on second scan (already used)", async () => {
            const tx = await gateVerifier.connect(organizer).verifyTicket(
                1,
                0,
                gateCredentialHash1
            );
            await tx.wait();

            const log = await gateVerifier.getLastVerification(1);
            assert.equal(log.result, 3n); // 3 = AlreadyUsed
        });

        it("fake ticket hash fails verification", async () => {
            const fakeHash = keccak256(
                toUtf8Bytes("this is a totally fake ticket")
            );

            // Issue a new ticket first so it hasn't been used
            const issueTx = await ticketCredential.connect(organizer).issueTicket(
                0,
                buyer.address,
                gateCredentialHash2
            );
            await issueTx.wait();

            // Try to verify with the wrong hash
            const tx = await gateVerifier.connect(organizer).verifyTicket(
                2,  // ticketId
                0,
                fakeHash  // wrong hash — simulates a forged ticket
            );
            await tx.wait();

            const log = await gateVerifier.getLastVerification(2);
            assert.equal(log.result, 1n); // 1 = Invalid
        });

        it("revoked ticket fails verification", async () => {
            // Issue a ticket then revoke it
            const issueTx = await ticketCredential.connect(organizer).issueTicket(
                0,
                buyer.address,
                fakeCredentialHash
            );
            await issueTx.wait();

            const revokeTx = await ticketCredential.connect(organizer).revokeTicket(3, 0);
            await revokeTx.wait();

            const tx = await gateVerifier.connect(organizer).verifyTicket(
                3,
                0,
                fakeCredentialHash
            );
            await tx.wait();

            const log = await gateVerifier.getLastVerification(3);
            assert.equal(log.result, 2n); // 2 = Revoked
        });

    });

});
