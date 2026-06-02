"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
      >
        Connect Wallet
      </button>
    );
  }

  const firstConnector = connectors[0];

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500"
      >
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      onClick={() => firstConnector && connect({ connector: firstConnector })}
      disabled={!firstConnector || isPending}
      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500 disabled:bg-slate-700"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}