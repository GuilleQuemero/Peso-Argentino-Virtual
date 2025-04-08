// Direcciones de contratos
const ARSVTokenAddress = "0xd53702873A346bF73b1De9232ab9Ba3Bcf232dAC";
const USDTTokenAddress = "0x7bc4B2fFcEaa7a612057DCed6f20f37e0575c1F8";
const ARSVTreasuryAddress = "0x81e2872E29b3e3f991fa62767bCdD1BA7cc8fe29";

// ABI mínimo para ERC20 (usado en ARSVToken y USDTToken)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"  // aunque vamos a asumir 4 decimales
];

// ABI de ARSVTreasury con las funciones de compra, venta y lectura de balances
const ARSVTreasury_ABI = [
  "function buyARSV(uint256 usdtAmount) public",
  "function sellARSV(uint256 arsvAmount) public",
  "function getUSDTBalance() view returns (uint256)",
  "function getARSVBalance() view returns (uint256)",
  "function getMaxBuyableUSDT() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function approvedWithdrawer() view returns (address)",
  "function buyPrice() view returns (uint256)",
  "function sellPrice() view returns (uint256)",
  "function buyFee() view returns (uint256)",
  "function sellFee() view returns (uint256)",
  "event TokensPurchased(address indexed buyer, uint256 usdtAmount, uint256 arsvAmount)",
  "event TokensSold(address indexed seller, uint256 arsvAmount, uint256 usdtAmount)"
];

let provider, signer, account;
let ARSVToken, USDTToken, ARSVTreasury;

// Para este ejemplo, asumimos que ambos tokens usan 4 decimales.
const DECIMALS = 4;

async function connect() {
  if (!window.ethereum) {
    document.getElementById("status").innerText = "MetaMask no está instalado.";
    return;
  }
  try {
    // Conectar con MetaMask y solicitar cuentas
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    document.getElementById("account").innerText = account;

    // Verificar red Sepolia (Chain ID: 11155111)
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
      document.getElementById("status").innerText = "Conéctate a la red Sepolia.";
      return;
    }

    // Instanciar contratos
    ARSVToken = new ethers.Contract(ARSVTokenAddress, ERC20_ABI, signer);
    USDTToken = new ethers.Contract(USDTTokenAddress, ERC20_ABI, signer);
    ARSVTreasury = new ethers.Contract(ARSVTreasuryAddress, ARSVTreasury_ABI, signer);

    document.getElementById("status").innerText = "Conectado a Sepolia y contratos inicializados.";
    await updateBalances();
    listenToEvents();
  } catch (error) {
    console.error(error);
    document.getElementById("status").innerText = "Error al conectar: " + error.message;
  }
}

async function updateBalances() {
  try {
    const usdtBalance = await USDTToken.balanceOf(account);
    const arsvBalance = await ARSVToken.balanceOf(account);
    // Usamos 4 decimales para ambos tokens
    document.getElementById("usdt-balance").innerText = ethers.utils.formatUnits(usdtBalance, DECIMALS);
    document.getElementById("arsv-balance").innerText = ethers.utils.formatUnits(arsvBalance, DECIMALS);
  } catch (error) {
    console.error("Error al actualizar balances:", error);
  }
}

async function buyARSV() {
  try {
    const amount = document.getElementById("amount").value;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert("Ingresa una cantidad válida.");
      return;
    }
    // USDT tiene 4 decimales
    const parsedAmount = ethers.utils.parseUnits(amount.toString(), DECIMALS);

    document.getElementById("status").innerText = "Aprobando USDT...";
    const approveTx = await USDTToken.approve(ARSVTreasuryAddress, parsedAmount);
    await approveTx.wait();

    document.getElementById("status").innerText = "Comprando ARSV...";
    const tx = await ARSVTreasury.buyARSV(parsedAmount);
    await tx.wait();

    document.getElementById("status").innerText = "Compra completada.";
    await updateBalances();
  } catch (error) {
    console.error("Error al comprar ARSV:", error);
    document.getElementById("status").innerText = "Error: " + error.message;
  }
}

async function sellARSV() {
  try {
    const amount = document.getElementById("amount").value;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert("Ingresa una cantidad válida.");
      return;
    }
    // ARSV tiene 4 decimales
    const parsedAmount = ethers.utils.parseUnits(amount.toString(), DECIMALS);

    document.getElementById("status").innerText = "Aprobando ARSV...";
    const approveTx = await ARSVToken.approve(ARSVTreasuryAddress, parsedAmount);
    await approveTx.wait();

    document.getElementById("status").innerText = "Vendiendo ARSV...";
    const tx = await ARSVTreasury.sellARSV(parsedAmount);
    await tx.wait();

    document.getElementById("status").innerText = "Venta completada.";
    await updateBalances();
  } catch (error) {
    console.error("Error al vender ARSV:", error);
    document.getElementById("status").innerText = "Error: " + error.message;
  }
}

// Función para escuchar eventos del contrato Treasury
function listenToEvents() {
  // Escuchar el evento TokensPurchased
  ARSVTreasury.on("TokensPurchased", (buyer, usdtAmount, arsvAmount, event) => {
    const logItem = document.createElement("li");
    // Formateamos ambos valores con 4 decimales
    logItem.textContent = `Compra: ${buyer} compró ${ethers.utils.formatUnits(arsvAmount, DECIMALS)} ARSV con ${ethers.utils.formatUnits(usdtAmount, DECIMALS)} USDT`;
    document.getElementById("event-log").appendChild(logItem);
  });

  // Escuchar el evento TokensSold
  ARSVTreasury.on("TokensSold", (seller, arsvAmount, usdtAmount, event) => {
    const logItem = document.createElement("li");
    logItem.textContent = `Venta: ${seller} vendió ${ethers.utils.formatUnits(arsvAmount, DECIMALS)} ARSV por ${ethers.utils.formatUnits(usdtAmount, DECIMALS)} USDT`;
    document.getElementById("event-log").appendChild(logItem);
  });
}

// Conectar al cargar la página
window.addEventListener("load", connect);
