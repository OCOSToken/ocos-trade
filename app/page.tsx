import React, { useMemo, useState, useEffect, useRef } from "react";
import { WagmiConfig, useAccount, useBalance, useChains, useConfig, useReadContract, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { http, createConfig } from "wagmi";
import { bsc, mainnet, polygon, arbitrum, avalanche, optimism, base, fantom, gnosis, celo, linea, scroll, zkSync, blast, opBNB, manta, mantle, harmonyOne as harmony, moonriver, moonbeam, klaytn } from "wagmi/chains";
import { ConnectButton, getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { formatEther, parseEther, zeroAddress } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Send, RefreshCcw, Wallet, ArrowLeftRight, Globe2, Sun, Moon, ShieldCheck, Landmark, ActivitySquare } from "lucide-react";
import { LiFiWidget } from "@lifi/widget";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "tailwindcss/tailwind.css";

/**
 * OCOS 21 Trade Portal — v2
 * - 🇬🇧/🇦🇿 language switch
 * - ☀️/🌙 theme toggle (Tailwind dark)
 * - 💰 realtime OCOS/BNB + implied OCOS/USD chart (pushes oracle ticks)
 * - 🔐 audit/treasury info panel (fees, treasury, paused, reserves)
 * - Buy/Sell on BSC + 21-chain cross-chain swap
 */

const DEFAULT_OCOS_ADDRESS = (typeof window !== 'undefined' && (window as any).__OCOS_ADDR__) || "0x58B8d54F3aCF8F6384803b63278C45A7ec08aa15"; // user-provided BSC address

// === ABI (expanded) ===
const OCOS_ABI = [
  { inputs: [], name: "buyWithBNB", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "ocosAmount", type: "uint256" }], name: "sellForBNB", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getLatestBNBPrice", outputs: [{ name: "price", type: "uint256" }, { name: "roundID", type: "uint80" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "buyFeePercentage", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "sellFeePercentage", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "treasury", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "staleAfter", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
];

// ==== Wagmi / RainbowKit Config ====
const CHAINS = [
  bsc, mainnet, polygon, arbitrum, avalanche, optimism, base, fantom, gnosis, celo,
  linea, scroll, zkSync, blast, opBNB, manta, mantle, harmony, moonriver, moonbeam, klaytn,
];

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "OCOS 21 Trade Portal",
    projectId: "ocos-21-portal",
    chains: CHAINS,
    transports: CHAINS.reduce((acc: any, c) => { acc[c.id] = http(); return acc; }, {} as Record<number, any>),
  })
);

// === i18n strings ===
const STR = {
  en: {
    overview: "Buy & sell OCOS on BNB Smart Chain using on-chain oracle pricing. Bridge & swap across 21 EVM networks to native coins.",
    buySell: "Buy & Sell OCOS (BSC)", buy: "Buy OCOS", sell: "Sell OCOS", bnbAmount: "BNB Amount",
    ocosAmount: "OCOS Amount", buyBtn: "Buy with BNB", sellBtn: "Sell for BNB", approve: "Approve",
    connected: "Connected", bnbBalance: "BNB Balance (BSC)", oracle: "Oracle BNB/USD",
    note: "Buy/Sell operates on BSC only. Ensure you are connected to BNB Smart Chain.",
    swapTitle: "21-Chain Swap – All Native Coins",
    swapDesc: "Swap OCOS or any token across EVM chains to native coins (ETH, BNB, MATIC, AVAX, OP, ARB, BASE, etc.).",
    security: "Security & Notes",
    secPoints: [
      "Non-custodial; you sign all transactions from your wallet.",
      "On BSC, buy/sell uses buyWithBNB and sellForBNB in the OCOS contract.",
      "Oracle staleness protection applies on-chain; if price is stale, tx reverts.",
      "Cross-chain swaps are routed via LI.FI (bridges + DEXs). Review route details before executing.",
    ],
    chartTitle: "Realtime Price Feed",
    chartLegend: "OCOS/BNB (left) • Implied OCOS/USD=47 (ref)",
    auditTitle: "Audit & Treasury",
    treasury: "Treasury",
    fees: "Fees (buy/sell)", paused: "Paused", stale: "Oracle Stale After", reserves: "Contract BNB Reserves",
    theme: "Theme", language: "Language",
  },
  az: {
    overview: "OCOS-u BNB Smart Chain üzərində on-chain oracle qiymətlərlə al/sat. 21 EVM şəbəkəsi üzrə native coin-lərə swap et.",
    buySell: "Al/Sat OCOS (BSC)", buy: "OCOS Al", sell: "OCOS Sat", bnbAmount: "BNB Miqdarı",
    ocosAmount: "OCOS Miqdarı", buyBtn: "BNB ilə Al", sellBtn: "BNB qarşı Sat", approve: "Təsdiqlə",
    connected: "Qoşulma", bnbBalance: "BNB Balansı (BSC)", oracle: "Oracle BNB/USD",
    note: "Alış/Satış yalnız BSC üzərindədir. Şəbəkənizin BNB Smart Chain olduğuna əmin olun.",
    swapTitle: "21-Şəbəkə Swap — Bütün Native Coin-lər",
    swapDesc: "OCOS və ya istənilən tokeni EVM şəbəkələrində native coin-lərə (ETH, BNB, MATIC, AVAX, OP, ARB, BASE və s.) dəyiş.",
    security: "Təhlükəsizlik və Qeydlər",
    secPoints: [
      "Custody yoxdur; bütün əməliyyatları öz cüzdanınızdan imzalayırsınız.",
      "BSC-də alış/satış kontraktdakı buyWithBNB və sellForBNB funksiyaları ilə icra olunur.",
      "Oracle gecikməsi üçün şərt var; qiymət köhnədirsə əməliyyat ləğv olunur.",
      "Çoxzəncirli swap marşrutları LI.FI vasitəsilə (körpü + DEX) qurulur. İcradan öncə marşrutu yoxlayın.",
    ],
    chartTitle: "Canlı Qiymət Lentləri",
    chartLegend: "OCOS/BNB (sol) • İstinad OCOS/USD=47",
    auditTitle: "Audit və Xəzinə",
    treasury: "Xəzinə Ünvanı",
    fees: "Komissiyalar (alış/satış)", paused: "Pauza", stale: "Oracle üçün gecikmə limiti", reserves: "Kontraktın BNB ehtiyatı",
    theme: "Tema", language: "Dil",
  }
};

function useThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (typeof window !== 'undefined' && (localStorage.getItem('theme') as any)) || 'dark');
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);
  return { theme, setTheme } as const;
}

function Header({ lang, setLang, theme, setTheme }:{ lang:'en'|'az'; setLang:(l:'en'|'az')=>void; theme:'dark'|'light'; setTheme:(t:'dark'|'light')=>void; }) {
  const L = STR[lang];
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
        <span className="text-cyan-300">OCOS</span> <span className="text-white/90 dark:text-white">Trade Portal</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm bg-white/10 dark:bg-white/10 rounded-full px-3 py-1">
          <Globe2 size={16}/> <span className="opacity-80">{L.language}:</span>
          <button className={`px-2 rounded ${lang==='en'?'font-bold underline':''}`} onClick={()=>setLang('en')}>EN</button>
          <span>/</span>
          <button className={`px-2 rounded ${lang==='az'?'font-bold underline':''}`} onClick={()=>setLang('az')}>AZ</button>
        </div>
        <div className="flex items-center gap-2 text-sm bg-white/10 dark:bg-white/10 rounded-full px-3 py-1">
          {theme==='dark'? <Moon size={16}/> : <Sun size={16}/>} <span className="opacity-80">{L.theme}:</span>
          <button className="px-2" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Dark':'Light'}</button>
        </div>
        <ConnectButton showBalance={false} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/10">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-white/5 border-white/10 rounded-2xl shadow-2xl">
      <CardContent className="p-6">
        <h2 className="text-xl md:text-2xl font-semibold text-cyan-300 mb-4">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function BuySellPanel({ lang }:{lang:'en'|'az'}) {
  const L = STR[lang];
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [bnbAmount, setBnbAmount] = useState<string>("0.1");
  const [ocosAmount, setOcosAmount] = useState<string>("100");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [ocosDecimals, setOcosDecimals] = useState<number>(6);

  const { data: bnbBal } = useBalance({ address, chainId: bsc.id });
  const { data: contractBnb } = useBalance({ address: DEFAULT_OCOS_ADDRESS as `0x${string}`, chainId: bsc.id });

  const { data: readDecimals } = useReadContract({
    abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
    functionName: "decimals", chainId: bsc.id,
  });
  useEffect(() => { if (typeof readDecimals === 'number') setOcosDecimals(readDecimals); }, [readDecimals]);

  const { data: priceData } = useReadContract({
    abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
    functionName: "getLatestBNBPrice", chainId: bsc.id,
  }) as any;

  const bnbUsd = useMemo(() => {
    if (!priceData) return undefined;
    const price = priceData[0] as bigint; // 8 decimals
    return Number(price) / 1e8;
  }, [priceData]);

  const ocosPerUsd = 1 / 47; // reference
  const ocosPerBnb = useMemo(() => {
    if (!bnbUsd) return undefined;
    return bnbUsd * ocosPerUsd * Math.pow(10, ocosDecimals);
  }, [bnbUsd, ocosDecimals]);

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { data: allowance } = useReadContract({
    abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
    functionName: "allowance", args: [address ?? zeroAddress, DEFAULT_OCOS_ADDRESS], chainId: bsc.id,
    query: { enabled: !!address && tab === 'sell' },
  }) as any;

  const needsApproval = useMemo(() => {
    if (!allowance || !ocosAmount) return false;
    const want = BigInt(Math.floor(Number(ocosAmount) * Math.pow(10, ocosDecimals)));
    return (allowance as bigint) < want;
  }, [allowance, ocosAmount, ocosDecimals]);

  const doBuy = async () => {
    if (chainId !== bsc.id) { switchChain({ chainId: bsc.id }); return; }
    const value = parseEther(bnbAmount || "0");
    const hash = await writeContractAsync({
      abi: OCOS_ABI,
      address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
      functionName: "buyWithBNB",
      chainId: bsc.id,
      value,
    });
    setTxHash(hash);
  };

  const doApprove = async () => {
    const amount = BigInt(Math.floor(Number(ocosAmount || "0") * Math.pow(10, ocosDecimals)));
    const hash = await writeContractAsync({
      abi: OCOS_ABI,
      address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
      functionName: "approve",
      chainId: bsc.id,
      args: [DEFAULT_OCOS_ADDRESS, amount],
    });
    setTxHash(hash);
  };

  const doSell = async () => {
    if (chainId !== bsc.id) { switchChain({ chainId: bsc.id }); return; }
    const amount = BigInt(Math.floor(Number(ocosAmount || "0") * Math.pow(10, ocosDecimals)));
    const hash = await writeContractAsync({
      abi: OCOS_ABI,
      address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
      functionName: "sellForBNB",
      chainId: bsc.id,
      args: [amount],
    });
    setTxHash(hash);
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  return (
    <Section title={L.buySell}>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label={L.connected} value={<span className="inline-flex items-center gap-2"><Wallet size={16}/> {address ? `${address.slice(0,6)}...${address.slice(-4)}` : '—'}</span>} />
        <Stat label={L.bnbBalance} value={bnbBal ? `${Number(bnbBal.formatted).toFixed(4)} BNB` : '—'} />
        <Stat label={L.oracle} value={bnbUsd ? `$${bnbUsd.toFixed(2)}` : '—'} />
      </div>

      <div className="mt-6">
        <Tabs value={tab} onValueChange={(v:any)=>setTab(v)}>
          <TabsList className="bg-white/10">
            <TabsTrigger value="buy">{L.buy}</TabsTrigger>
            <TabsTrigger value="sell">{L.sell}</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">{L.bnbAmount}</label>
                <Input value={bnbAmount} onChange={(e)=>setBnbAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10"/>
                <p className="text-xs text-gray-400 mt-2">{
                  (()=>{
                    const b = Number(bnbAmount||0);
                    if (!bnbUsd || !b || !ocosPerBnb) return '—';
                    const raw = b * (ocosPerBnb / Math.pow(10, ocosDecimals));
                    return `≈ ${raw.toFixed(2)} OCOS`;
                  })()
                }</p>
              </div>
              <div className="flex items-end">
                <Button onClick={doBuy} className="w-full inline-flex items-center gap-2">
                  <Send size={16}/> {L.buyBtn}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">{L.ocosAmount}</label>
                <Input value={ocosAmount} onChange={(e)=>setOcosAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10"/>
                <p className="text-xs text-gray-400 mt-2">{
                  (()=>{
                    if (!bnbUsd) return '—';
                    const amt = Number(ocosAmount||0);
                    const usd = amt * 47; // ref
                    const bnbOut = usd / bnbUsd;
                    return `≈ ${bnbOut.toFixed(6)} BNB`;
                  })()
                }</p>
              </div>
              <div className="flex items-end gap-3">
                {needsApproval && (
                  <Button variant="secondary" onClick={doApprove} className="inline-flex items-center gap-2"><RefreshCcw size={16}/> {L.approve}</Button>
                )}
                <Button onClick={doSell} className="w-full inline-flex items-center gap-2">
                  <ArrowLeftRight size={16}/> {L.sellBtn}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-100 text-sm flex gap-2">
          <AlertCircle size={18}/> <div>
            <b>Note:</b> {L.note}
          </div>
        </div>
      </div>
    </Section>
  );
}

function RealtimeChart({ lang }:{lang:'en'|'az'}) {
  const L = STR[lang];
  const [data, setData] = useState<{t:string, ocosBnb:number, ocosUsd:number}[]>([]);

  const { data: priceData } = useReadContract({
    abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`,
    functionName: "getLatestBNBPrice", chainId: bsc.id,
  }) as any;

  useEffect(() => {
    const tick = () => {
      if (!priceData) return;
      const price = Number(priceData[0]) / 1e8; // BNB/USD
      const ocosUsd = 47; // reference
      const ocosBnb = ocosUsd / price; // implied OCOS per BNB price
      const now = new Date();
      setData(d => [...d.slice(-59), { t: now.toLocaleTimeString(), ocosBnb, ocosUsd }]);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [priceData]);

  return (
    <Section title={L.chartTitle}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis yAxisId="left" orientation="left" domain={["auto","auto"]} />
            <YAxis yAxisId="right" orientation="right" domain={["auto","auto"]} hide />
            <Tooltip />
            <Line yAxisId="left" type="monotone" dataKey="ocosBnb" dot={false} strokeWidth={2} name="OCOS/BNB" />
            <Line yAxisId="right" type="monotone" dataKey="ocosUsd" dot={false} strokeWidth={1} strokeDasharray="4 4" name="OCOS/USD (ref 47)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2">{L.chartLegend}</p>
    </Section>
  );
}

function AuditTreasuryPanel({ lang }:{lang:'en'|'az'}) {
  const L = STR[lang];
  const { data: buyFee } = useReadContract({ abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`, functionName: 'buyFeePercentage', chainId: bsc.id });
  const { data: sellFee } = useReadContract({ abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`, functionName: 'sellFeePercentage', chainId: bsc.id });
  const { data: treasury } = useReadContract({ abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`, functionName: 'treasury', chainId: bsc.id });
  const { data: paused } = useReadContract({ abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`, functionName: 'paused', chainId: bsc.id });
  const { data: staleAfter } = useReadContract({ abi: OCOS_ABI, address: DEFAULT_OCOS_ADDRESS as `0x${string}`, functionName: 'staleAfter', chainId: bsc.id });
  const { data: contractBnb } = useBalance({ address: DEFAULT_OCOS_ADDRESS as `0x${string}`, chainId: bsc.id });

  return (
    <Section title={L.auditTitle}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={18}/> <b>{L.fees}</b></div>
          <div className="text-sm text-gray-300">Buy: {buyFee ? `${Number(buyFee)/100}%` : '—'} | Sell: {sellFee ? `${Number(sellFee)/100}%` : '—'}</div>
          <div className="mt-3 flex items-center gap-2"><ActivitySquare size={18}/> <b>{L.paused}:</b> <span className="text-sm">{paused===true? 'Yes':'No'}</span></div>
          <div className="text-xs text-gray-400">{L.stale}: {staleAfter ? `${Number(staleAfter)/3600}h` : '—'}</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2"><Landmark size={18}/> <b>{L.treasury}</b></div>
          <div className="text-sm break-all">{treasury as string || '—'}</div>
          <div className="mt-3 text-sm text-gray-300">{L.reserves}: {contractBnb ? `${Number(contractBnb.formatted).toFixed(4)} BNB` : '—'}</div>
          <a className="underline text-xs mt-2 inline-block" href={`https://bscscan.com/address/${DEFAULT_OCOS_ADDRESS}`} target="_blank" rel="noreferrer">View Contract on BscScan</a>
        </div>
      </div>
    </Section>
  );
}

function CrossChainSwap({ lang }:{lang:'en'|'az'}) {
  const L = STR[lang];
  return (
    <Section title={L.swapTitle}>
      <p className="text-sm text-gray-300 mb-4">{L.swapDesc}</p>
      <div className="h-[720px] rounded-2xl overflow-hidden border border-white/10 bg-black/30">
        <LiFiWidget
          integrator="OCOS-21-Portal"
          config={{
            fromChain: bsc.id,
            appearance: { theme: { shape: { borderRadius: 16 } }},
            chains: { allow: CHAINS.map(c => c.id) },
            tokens: { featured: { [bsc.id]: [DEFAULT_OCOS_ADDRESS] } },
          }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      <div className="mt-3 text-xs text-gray-400">
        * Supported EVMs (21): BSC, Ethereum, Polygon, Arbitrum, Avalanche, Optimism, Base, Fantom, Gnosis, Celo, Linea, Scroll, zkSync, Blast, opBNB, Manta, Mantle, Harmony, Moonriver, Moonbeam, Klaytn.
      </div>
    </Section>
  );
}

const wagmiCfg = wagmiConfig;

function App() {
  const [lang, setLang] = useState<'en'|'az'>(() => (typeof window!=='undefined' && (localStorage.getItem('lang') as any)) || 'en');
  const { theme, setTheme } = useThemeToggle();
  useEffect(()=>{ localStorage.setItem('lang', lang); },[lang]);

  const L = STR[lang];

  return (
    <div className="min-h-screen bg-[radial-gradient(60%_60%_at_20%_20%,#0b1020,transparent),radial-gradient(60%_60%_at_80%_0%,#031018,transparent)] text-white dark:text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <Header lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
        <Section title="Overview">
          <p className="text-sm text-gray-300">{L.overview} Contract (BSC): <a className="underline" href={`https://bscscan.com/address/${DEFAULT_OCOS_ADDRESS}`} target="_blank" rel="noreferrer">{DEFAULT_OCOS_ADDRESS}</a>.</p>
        </Section>
        <div className="grid gap-6">
          <BuySellPanel lang={lang} />
          <RealtimeChart lang={lang} />
          <AuditTreasuryPanel lang={lang} />
          <CrossChainSwap lang={lang} />
          <Section title={L.security}>
            <ul className="list-disc pl-6 text-sm text-gray-300">
              {L.secPoints.map((s,i)=>(<li key={i}>{s}</li>))}
            </ul>
          </Section>
        </div>
        <footer className="text-center text-xs text-gray-500 mt-10">© 2025 OCOS — All rights reserved.</footer>
      </div>
    </div>
  );
}

function Root() {
  return (
    <WagmiConfig config={wagmiCfg}>
      <RainbowKitProvider theme={darkTheme({ accentColor: '#00ffd5', borderRadius: 'large' })}>
        <App />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default Root;
