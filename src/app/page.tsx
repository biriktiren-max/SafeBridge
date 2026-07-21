"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// 🛡️ SafeBridge Amoy Test Ağı (Polygon Amoy - Chain ID: 80002 / 0x13882)
const TARGET_CHAIN_ID = "0x13882";
const TARGET_NETWORK_NAME = "Polygon Amoy Testnet";

// 💰 AKILLI SÖZLEŞME ADRESİ (Amoy'da Deploy Edilen Adres)
// ⚠️ Kontratı yeniden deploy ettikten sonra (claimFunds düzeltmesiyle) bu adresi güncelle!
const CONTRACT_ADDRESS = "0x71C95911E9a5D330f4D621842EC243EE1343292e";

const CONTRACT_ABI = [
  "function createBridge(address _receiver, bytes32 _passwordHash, uint256 _hours) external payable",
  "function claimFunds(uint256 _id, string memory _password) external",
  "function cancelAndRefund(uint256 _id) external",
  "function getRemainingTime(uint256 _id) external view returns (uint256)",
  "function escrows(uint256) public view returns (address sender, address receiver, uint256 amount, bytes32 passwordHash, uint256 deadline, bool isClaimed, bool isCancelled)",
  "event BridgeCreated(uint256 id, address indexed sender, address indexed receiver, uint256 amount, uint256 deadline)",
  "event FundsClaimed(uint256 id, address indexed receiver, uint256 amount)",
  "event BridgeCancelled(uint256 id, address indexed sender, uint256 amount)"
];

const LANGUAGES = {
  tr: {
    title: "SafeBridge Global 🦅",
    subtitle: "Merkeziyetsiz, Kriptografik Zırhlı Test Köprüsü (Amoy)",
    vaultTitle: "Merkeziyetsiz Kasa Havuzu",
    vaultDesc: "Amoy test ağında kilitli, parmak izi korumalı varlıklar",
    connectBtn: "🔒 MetaMask Bağla",
    wrongNetwork: "⚠️ YANLIŞ AĞ! Amoy Testnet'e Geçmek İçin Tıkla",
    correctNetwork: "🟢 Polygon Amoy Testnet Aktif",
    statusWrongNet: "⚠️ HATA: Amoy Testnet'te değilsin! Lütfen ağı değiştir.",
    statusCorrectNet: "🟢 Amoy Testnet aktif! Kilitler devrede.",
    statusConnecting: "⏳ Ağ bağlantısı kuruluyor...",
    statusConnected: "🟢 Cüzdan bağlandı, test hattı açık.",
    escrowTitle: "🤝 Güvenli Ticaret (Escrow)",
    escrowSellerLabel: "Alıcı (Fonu Talep Edecek) Cüzdan Adresi",
    escrowAmountLabel: "Miktar (POL)",
    escrowTradeDescLabel: "Ticaret Açıklaması",
    escrowTradeDescPlaceholder: "Örn: Test Kapora Bedeli",
    escrowHoursLabel: "Süre (saat) — dolarsa gönderen iptal edip geri alabilir",
    escrowPasswordLabel: "🔒 KİLİT GİZLİ ŞİFRESİ (Sadece Hash Gider)",
    escrowPasswordPlaceholder: "Kilidi açacak gizli şifre",
    escrowBtn: "🤝 Şifrele ve Kontrata Kilitle",
    escrowListTitle: "📜 Zincirde Kilitli İşlemler",
    escrowListEmpty: "📭 Şu an hafızada kilitli işlem yok.",
    releaseBtn: "🔑 Çöz ve Çek",
    cancelBtn: "↩️ İptal Et (Süre Dolduysa)",
    footer: "SafeBridge Testnet v6.0 🛠️"
  },
  en: {
    title: "SafeBridge Global 🦅",
    subtitle: "Decentralized Cryptographically Armored Test Bridge (Amoy)",
    vaultTitle: "Decentralized Vault Pool",
    vaultDesc: "Autonomous assets secured on Amoy testnet",
    connectBtn: "🔒 Connect MetaMask",
    wrongNetwork: "⚠️ WRONG NETWORK! Switch to Amoy Testnet",
    correctNetwork: "🟢 Polygon Amoy Testnet Active",
    statusWrongNet: "⚠️ ERROR: Not on Amoy Testnet!",
    statusCorrectNet: "🟢 Amoy Testnet active!",
    statusConnecting: "⏳ Connecting...",
    statusConnected: "🟢 Wallet connected.",
    escrowTitle: "🤝 Secure Escrow Trade",
    escrowSellerLabel: "Receiver (Claimant) Address",
    escrowAmountLabel: "Amount (POL)",
    escrowTradeDescLabel: "Description",
    escrowTradeDescPlaceholder: "e.g., Test Payment",
    escrowHoursLabel: "Duration (hours) — refundable after this",
    escrowPasswordLabel: "🔒 SECRET LOCK PASSWORD",
    escrowPasswordPlaceholder: "Set secret password",
    escrowBtn: "🤝 Lock into Contract",
    escrowListTitle: "📜 Locked Transactions",
    escrowListEmpty: "📭 No active escrow.",
    releaseBtn: "🔑 Unlock & Claim",
    cancelBtn: "↩️ Cancel (If Expired)",
    footer: "SafeBridge Testnet v6.0 🛠️"
  }
};

export default function HomePage() {
  const [lang, setLang] = useState("tr");
  const [account, setAccount] = useState("");
  const [vaultBalance, setVaultBalance] = useState("0.0000");
  const [status, setStatus] = useState("");
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const [escrowSeller, setEscrowSeller] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [escrowDesc, setEscrowDesc] = useState("");
  const [escrowPassword, setEscrowPassword] = useState("");
  const [lockHours, setLockHours] = useState("24");
  const [activeEscrows, setActiveEscrows] = useState([]);

  const t = LANGUAGES[lang as keyof typeof LANGUAGES];

  const getProvider = () => new ethers.BrowserProvider(window.ethereum);

  const checkNetwork = useCallback(async (provider) => {
    try {
      const network = await provider.getNetwork();
      const currentChainId = "0x" + network.chainId.toString(16);
      if (currentChainId.toLowerCase() !== TARGET_CHAIN_ID.toLowerCase()) {
        setIsWrongNetwork(true);
        setStatus(t.statusWrongNet);
        return false;
      }
      setIsWrongNetwork(false);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [t.statusWrongNet]);

  const refreshVaultBalance = useCallback(async (provider) => {
    try {
      const contractBal = await provider.getBalance(CONTRACT_ADDRESS);
      setVaultBalance(ethers.formatEther(contractBal));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_CHAIN_ID }]
      });
      setIsWrongNetwork(false);
      setStatus(t.statusCorrectNet);
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: TARGET_CHAIN_ID,
              chainName: TARGET_NETWORK_NAME,
              nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
              rpcUrls: ["https://rpc-amoy.polygon.technology"],
              blockExplorerUrls: ["https://amoy.polygonscan.com/"]
            }]
          });
          setIsWrongNetwork(false);
          setStatus(t.statusCorrectNet);
        } catch (addErr) {
          console.error(addErr);
          setStatus("❌ Amoy ağı MetaMask'e eklenemedi.");
        }
      } else {
        console.error(err);
        setStatus("❌ Ağ değiştirilemedi.");
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask bulunamadı!");
      return;
    }
    try {
      setStatus(t.statusConnecting);
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const isOk = await checkNetwork(provider);
      if (isOk) {
        await refreshVaultBalance(provider);
        setStatus(t.statusConnected);
      }
    } catch (err) {
      console.error(err);
      setStatus("🔴 Bağlantı reddedildi.");
    }
  };

  // Hesap / ağ değişikliklerini dinle + sayfa açılışında zaten bağlıysa algıla
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount("");
        setStatus("🔌 Cüzdan bağlantısı kesildi.");
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    (async () => {
      try {
        const provider = getProvider();
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const isOk = await checkNetwork(provider);
          if (isOk) await refreshVaultBalance(provider);
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [checkNetwork, refreshVaultBalance]);

  const handleCreateEscrow = async () => {
    if (!account) { alert("Önce cüzdan bağlayın!"); return; }
    if (isWrongNetwork) { switchNetwork(); return; }
    if (!escrowSeller || !ethers.isAddress(escrowSeller)) { alert("Geçersiz alıcı adresi!"); return; }
    if (!escrowAmount || Number(escrowAmount) <= 0) { alert("Geçersiz miktar!"); return; }
    if (!escrowDesc) { alert("Açıklama yazın!"); return; }
    if (!escrowPassword) { alert("Şifre belirleyin!"); return; }
    if (!lockHours || Number(lockHours) <= 0) { alert("Geçersiz süre!"); return; }

    try {
      setStatus("⏳ Şifre parmak izi hesaplanıyor ve kontrata kilitleniyor...");
      // Sadece HASH zincire gönderiliyor, düz şifre asla on-chain gitmiyor.
      const passwordHash = ethers.id(escrowPassword);

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.createBridge(
        escrowSeller,
        passwordHash,
        BigInt(lockHours),
        { value: ethers.parseEther(escrowAmount) }
      );
      setStatus("⏳ İşlem ağa iletildi, onay bekleniyor...");
      const receipt = await tx.wait();

      // Gerçek escrow ID'sini rastgele UYDURMAK yerine BridgeCreated event'inden oku.
      let realId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "BridgeCreated") {
            realId = parsed.args.id.toString();
            break;
          }
        } catch (_) { /* bu log kontrata ait değil, atla */ }
      }

      setStatus(`✅ BAŞARILI! ${escrowAmount} POL kasaya kilitlendi. (ID: ${realId})`);
      setActiveEscrows((prev) => [...prev, {
        id: realId,
        seller: escrowSeller.slice(0, 6) + "..." + escrowSeller.slice(-4),
        amount: `${escrowAmount} POL`,
        desc: escrowDesc
      }]);
      setEscrowAmount(""); setEscrowSeller(""); setEscrowDesc(""); setEscrowPassword("");

      await refreshVaultBalance(provider);
    } catch (err) {
      console.error(err);
      setStatus(`❌ Hata: ${err.reason || err.message || "İşlem başarısız veya reddedildi"}`);
    }
  };

  const handleRelease = async (id) => {
    const inputPass = prompt("Kasa Şifresini girin:");
    if (!inputPass) return;

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setStatus("⏳ Şifre kontrata gönderiliyor...");
      // ÖNEMLİ: kontrat düz metin şifreyi bekliyor, kendi içinde hash'liyor.
      // Burada TEKRAR hash almıyoruz — aksi halde "yanlış şifre" hatası kaçınılmaz olur.
      const tx = await contract.claimFunds(id, inputPass);
      await tx.wait();

      alert("🎉 Kilit başarıyla çözüldü, fonlar aktarıldı!");
      setActiveEscrows((prev) => prev.filter((item) => item.id !== id));
      setStatus("✅ Kasa çözüldü.");
      await refreshVaultBalance(provider);
    } catch (err) {
      console.error(err);
      alert("❌ Yanlış şifre veya yetkisiz işlem!");
      setStatus(`❌ Kilit açılamadı: ${err.reason || err.message || ""}`);
    }
  };

  const handleCancel = async (id) => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setStatus("⏳ İptal talebi gönderiliyor...");
      const tx = await contract.cancelAndRefund(id);
      await tx.wait();

      alert("↩️ Escrow iptal edildi, fon iade alındı.");
      setActiveEscrows((prev) => prev.filter((item) => item.id !== id));
      setStatus("✅ İptal tamamlandı.");
      await refreshVaultBalance(provider);
    } catch (err) {
      console.error(err);
      alert("❌ İptal edilemedi (süre henüz dolmamış olabilir).");
      setStatus(`❌ İptal başarısız: ${err.reason || err.message || ""}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-500 bg-clip-text text-transparent">
          {t.title}
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base font-medium">{t.subtitle}</p>
      </div>

      <div className="w-full max-w-6xl bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {t.vaultTitle}
          </span>
          <h2 className="text-4xl font-mono font-black text-white mt-1">
            {Number(vaultBalance).toFixed(4)} <span className="text-lg font-semibold text-gray-500">POL</span>
          </h2>
          <span className="text-[11px] text-gray-400 mt-1 block">{t.vaultDesc}</span>
        </div>

        <div>
          {!account ? (
            <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 font-bold py-3.5 px-8 rounded-2xl shadow-lg cursor-pointer">
              {t.connectBtn}
            </button>
          ) : (
            <div className="text-right">
              {isWrongNetwork ? (
                <button onClick={switchNetwork} className="bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-xl text-xs animate-pulse cursor-pointer">
                  {t.wrongNetwork}
                </button>
              ) : (
                <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-mono block mb-1">
                  {t.correctNetwork}
                </span>
              )}
              <span className="text-[11px] text-gray-400 font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className="w-full max-w-6xl mb-6 p-3 rounded-xl text-center text-xs font-semibold bg-blue-950/50 border border-blue-800 text-blue-300">
          {status}
        </div>
      )}

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>🤝</span> {t.escrowTitle}</h3>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.escrowSellerLabel}</label>
          <input type="text" placeholder="0x..." value={escrowSeller} onChange={(e) => setEscrowSeller(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.escrowAmountLabel}</label>
          <input type="number" placeholder="0.00" value={escrowAmount} onChange={(e) => setEscrowAmount(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-semibold text-white outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.escrowTradeDescLabel}</label>
          <input type="text" placeholder={t.escrowTradeDescPlaceholder} value={escrowDesc} onChange={(e) => setEscrowDesc(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-gray-300 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.escrowHoursLabel}</label>
          <input type="number" placeholder="24" value={lockHours} onChange={(e) => setLockHours(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-gray-300 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">{t.escrowPasswordLabel}</label>
          <input type="password" placeholder={t.escrowPasswordPlaceholder} value={escrowPassword} onChange={(e) => setEscrowPassword(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-emerald-900 rounded-xl text-sm text-white outline-none" />
        </div>
        <button onClick={handleCreateEscrow} className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 rounded-xl font-bold text-white shadow-lg cursor-pointer">
          {t.escrowBtn}
        </button>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t.escrowListTitle}</h4>
          {activeEscrows.length === 0 ? (
            <div className="bg-slate-950 p-6 rounded-xl text-center text-gray-500 text-xs">{t.escrowListEmpty}</div>
          ) : (
            <div className="space-y-2">
              {activeEscrows.map((item) => (
                <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-bold text-white block">{item.desc} <span className="text-gray-500 font-normal">#{item.id}</span></span>
                    <span className="text-[10px] text-gray-500 font-mono">{item.amount}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRelease(item.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                      {t.releaseBtn}
                    </button>
                    <button onClick={() => handleCancel(item.id)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                      {t.cancelBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 text-gray-600 text-xs font-mono text-center">{t.footer}</div>
    </div>
  );
}