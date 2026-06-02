"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

type SignedActionButtonProps = {
  action: string;
  label: string;
  className?: string;
};

export default function SignedActionButton({
  action,
  label,
  className,
}: SignedActionButtonProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [status, setStatus] = useState("");

  async function handleSign() {
    if (!isConnected || !address) {
      setStatus("Connect wallet first.");
      return;
    }

    try {
      const timestamp = new Date().toISOString();

      const message = `Base Penalty League

Action: ${action}
Wallet: ${address}
Time: ${timestamp}`;

      await signMessageAsync({ message });

      setStatus("Signature confirmed.");
    } catch {
      setStatus("Signature cancelled or failed.");
    }
  }

  return (
    <div>
      <button
        onClick={handleSign}
        disabled={isPending}
        className={
          className ??
          "rounded-2xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-500 disabled:bg-slate-700"
        }
      >
        {isPending ? "Waiting for wallet..." : label}
      </button>

      {status && <p className="mt-2 text-sm text-slate-400">{status}</p>}
    </div>
  );
}
