const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
    console.log("Deploying LotteryWithTickets...\n");

    const lottery = await hre.viem.deployContract("LotteryWithTickets");

    console.log("[OK] LotteryWithTickets deployed to: ", lottery.address);

    const manager = await lottery.read.manager();
    console.log("[OK] Manager: " + manager);

    const ticketPrice = await lottery.read.ticketPrice();
    console.log("[OK] Ticket Price: " + formatEther(ticketPrice) + " ETH");

    return lottery.address;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });