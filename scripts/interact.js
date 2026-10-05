const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

// inserisci l'indirizzo del contratto dopo il deploy
const CONTRACT_ADDRESS = "Address Del contratto";

// stampa
function sep(title) {
    console.log('\n==================== ' + title + ' ====================\n');
}

async function printStatus(lottery, publicClient) {
    const isOpen      = await lottery.read.isOpen();
    const ticketPrice = await lottery.read.ticketPrice();
    const tickets     = await lottery.read.getTickets();
    const balance   = await publicClient.getBalance({ address: lottery.address });

    console.log("  Lottery Status  : " + (isOpen ? "OPEN" : "[CLOSED]"));
    console.log("  Ticket Price    : " + formatEther(ticketPrice) + " ETH");
    console.log("  Tickets Sold     : " + tickets.length);
    console.log("  Contract Balance : " + formatEther(balance) + " ETH");
}

async function main() {
    const [manager, player1, player2] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const lottery = await hre.viem.getContractAt("LotteryWithTickets", CONTRACT_ADDRESS);

    sep("Initial Status");
    await printStatus(lottery, publicClient);

    sep("Change Ticket Price");
    console.log(" Manager is changing the ticket price to 0.02 ETH...");
    let hash = await lottery.write.setTicketPrice([parseEther("0.02")], {
        account: manager.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(" [OK] Ticket price changed to 0.02 ETH");

    console.log( " Manager return the price at 0.01 ETH...");
    hash = await lottery.write.setTicketPrice([parseEther("0.01")], {
        account: manager.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(" [OK] Ticket price changed to 0.01 ETH");

    sep("Buy Tickets");
    console.log(" Player1 is buying 2 tickets...");
    hash = await lottery.write.buyTickets([], {
        account: player1.account,
        value: parseEther("0.02"),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(" [OK] Player1 bought 2 tickets");

    console.log(" Player2 is buying 1 ticket...");
    hash = await lottery.write.buyTickets([], {
        account: player2.account,
        value: parseEther("0.01"),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(" [OK] Player2 bought 1 ticket");

    await printStatus(lottery, publicClient);

    sep("Winner extraction");
    console.log(" Manager is closing the lottery before extracting the winner...");
    hash = await lottery.write.closeLottery([], { account: manager.account });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(" [OK] Lottery closed");
    hash = await lottery.write.pickWinner([], { account: manager.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const winnerLogs = await publicClient.getContractEvents({
        address: lottery.address,
        abi: lottery.abi,
        eventName: "WinnerSelected",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
    });

    const { winner, prize } = winnerLogs[0].args;
    console.log("  [WINNER] : " + winner);
    console.log("  [PRIZE] : " + formatEther(prize) + " ETH");

    await printStatus(lottery, publicClient);

    sep("Withdrawal")
    const winnerClient = [manager, player1, player2].find(
        (w) => w.account.address.toLowerCase() === winner.toLowerCase()
    );

    const balBefore = await publicClient.getBalance({ address: winner });
    console.log("  " + winner + " is withdrawing...");

    hash = await lottery.write.withdraw([], { account: winnerClient.account });
    await publicClient.waitForTransactionReceipt({ hash });

    const balAfter = await publicClient.getBalance({ address: winner });
    console.log("  Balance before : " + formatEther(balBefore) + " ETH");
    console.log("  Balance after : " + formatEther(balAfter) + " ETH");
    console.log(" [OK] Withdrawal completed!");

    sep("Reopening of the lottery for the next edition");
    console.log(" Manager reopen the lottery...");
    hash = await lottery.write.openLottery([], { account: manager.account });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  [OK] Lottery reopened");

    await printStatus(lottery, publicClient);
}

main()
    .then(() => process.exit(0)) 
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });