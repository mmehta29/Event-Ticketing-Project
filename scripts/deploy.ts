import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // 1. CredentialRegistry (no deps)
    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy();
    await credentialRegistry.waitForDeployment();
    const crAddr = await credentialRegistry.getAddress();
    console.log("CredentialRegistry:", crAddr);

    // 2. EventRegistry (no deps)
    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    const eventRegistry = await EventRegistry.deploy();
    await eventRegistry.waitForDeployment();
    const erAddr = await eventRegistry.getAddress();
    console.log("EventRegistry:     ", erAddr);

    // 3. TicketCredential (needs EventRegistry + CredentialRegistry)
    const TicketCredential = await ethers.getContractFactory("TicketCredential");
    const ticketCredential = await TicketCredential.deploy(erAddr, crAddr);
    await ticketCredential.waitForDeployment();
    const tcAddr = await ticketCredential.getAddress();
    console.log("TicketCredential:  ", tcAddr);

    // 4. GateVerifier (needs all three)
    const GateVerifier = await ethers.getContractFactory("GateVerifier");
    const gateVerifier = await GateVerifier.deploy(erAddr, tcAddr, crAddr);
    await gateVerifier.waitForDeployment();
    const gvAddr = await gateVerifier.getAddress();
    console.log("GateVerifier:      ", gvAddr);

    console.log("\n✓ All contracts deployed!");
    console.log("\nPaste these into frontend/src/config.ts:");
    console.log(`
export const CONTRACT_ADDRESSES = {
  EventRegistry: "${erAddr}",
  TicketCredential: "${tcAddr}",
  GateVerifier: "${gvAddr}",
  CredentialRegistry: "${crAddr}",
};`);
}

main().catch((e) => { console.error(e); process.exit(1); });