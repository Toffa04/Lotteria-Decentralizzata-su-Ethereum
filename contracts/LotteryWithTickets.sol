// SPDX-Licens-Identifier: MIT
pragma solidity ^0.8.0;

contract LotteryWithTickets {
    // indirizzo del manager (chi deploya il contratto)
    address public manager;

    // array dei biglietti, ogni biglietto corrisponde all'indirizzo di chi acquista
    // se un utente acquista piu' biglietti, il suo indirizzo appare piu' volte
    address[] public tickets;

    mapping(address => uint256) public pendingWithdrawals;

    // montepremi della sola edizione corrente (somma dei msg.value)
    uint256 public currentPot;

    // prezzo singolo biglietto
    uint public ticketPrice = 0.01 ether;

    // stato lotteria 
    bool public isOpen = true;

    event WinnerSelected(address indexed winner, uint256 prize);
    event Withdrawal(address indexed user, uint256 amount);
    event LotteryOpened();
    event LotteryClosed();
    event TicketPriceChanged(uint256 oldPrice, uint256 newPrice);

    constructor() {
        manager = msg.sender;
    }

    // limita alcune funzioni al solo manager
    modifier restricted() {
        require(msg.sender == manager, "Solo il manager puo chiamare questa funzione");
        _;
    }

    // consebte l'azione solo se la lotteria e' aperta
    modifier onlyWhenOpen() {
        require(isOpen, "La lotteria e' chiusa");
        _;
    }

    // consente l'azione solo se la lotteria e' chiusa
    modifier onlyWhenClosed() {
        require(!isOpen, "Chiudi la lotteria prima di estrarre il vincitore");
        _;
    }

    // apre la lotteria 
    function openLottery() public restricted {
        require(!isOpen, "La lotteria e' gia' aperta");
        isOpen = true;
        emit LotteryOpened();
    }

    // chiude la lotteria
    function closeLottery() public restricted {
        require(isOpen, "La lotteria e' gia' chiusa");
        isOpen = false;
        emit LotteryClosed();
    }

    // cambia prezzo del biglietto, modificato solo quando non ci sono biglietti venduti
    function setTicketPrice(uint256 newPrice) public restricted {
        require(newPrice > 0, "Il prezzo deve essere maggiore di zero");
        require(tickets.length == 0, "Non puoi cambiare il prezzo con biglietti gia' venduti");
        uint256 oldPrice = ticketPrice;
        ticketPrice = newPrice;
        emit TicketPriceChanged(oldPrice, newPrice);
    }

    /*
    funzione per scegliere il vincitore, solo il manager puo' chiamarla e seleziona un biglietto a caso,
    salda l'intero saldo del contratto per il vincitore e resetta l'array dei biglietti per la prossima edizione.
    La lotteria deve essere chiusa per poter estrarre
    */

    function pickWinner() public restricted onlyWhenClosed {
        require(tickets.length > 0, "Non ci sono biglietti acquistati");
        uint index = random() % tickets.length;
        address winner = tickets[index];

        // reset dei biglietti per una nuova edizione della lotteria (prima di accreditare il premio)
        delete tickets;

        uint256 prize = currentPot;
        currentPot = 0; 

        pendingWithdrawals[winner] += prize;
        emit WinnerSelected(winner, prize);
    }

    /*
    funzione per acquistare i biglietti. L'utente deve inviare un importo maggiore
    o uguale al prezzo di un biglietto, e l'importo inviato deve essere un multiplo di ticketPrice.
    La lotteria deve essere aperta per poter acquistare
    */

    function buyTickets() public payable onlyWhenOpen {
        require(msg.value >= ticketPrice, "Devi inviare il prezzo del biglietto");
        require(msg.value % ticketPrice == 0, "L'importo inviato deve essere un multiplo del prezzo del biglietto");
        uint numberOfTickets = msg.value / ticketPrice;
        for(uint i = 0; i < numberOfTickets; i++) {
            tickets.push(msg.sender);
        }
        currentPot += msg.value;
    }

    // permette al vincitore di ritirare i fondi in modo sicuro
    function withdraw() public {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nessun fondo da prelevare");
        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Ritiro fallito");

        emit Withdrawal(msg.sender, amount);
    }

    // funzione per visualizzare i biglietti acquistati
    function getTickets() public view returns (address[] memory) {
        return tickets;
    }

    // Genera un numero casuale
    function random() private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, tickets.length)));
    }

    receive() external payable {
        revert("Usa buyTickets per mandare ETH");
    }

    fallback() external payable {
        revert();
    }
}