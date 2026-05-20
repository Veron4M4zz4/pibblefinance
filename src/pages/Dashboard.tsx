import { useEffect, useMemo, useState } from "react";

type Wallet = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  walletId: string;
  description: string;
  date: string;
};

export default function Dashboard() {
  const [user, setUser] = useState("");
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("pibblefinance:user") || ""
  );

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    return JSON.parse(localStorage.getItem("pibblefinance:wallets") || "[]");
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return JSON.parse(
      localStorage.getItem("pibblefinance:transactions") || "[]"
    );
  });

  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState("Conta principal");
  const [walletBalance, setWalletBalance] = useState("");

  const [transactionType, setTransactionType] = useState<
    "income" | "expense"
  >("expense");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [walletId, setWalletId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "pibblefinance:wallets",
      JSON.stringify(wallets)
    );
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem(
      "pibblefinance:transactions",
      JSON.stringify(transactions)
    );
  }, [transactions]);

  const totals = useMemo(() => {
    const walletTotal = wallets.reduce(
      (acc, wallet) => acc + wallet.balance,
      0
    );

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + item.amount, 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + item.amount, 0);

    const balance = walletTotal + income - expense;

    let health = "Sem dados suficientes";
    let healthColor = "bg-gray-100 text-gray-700";

    if (income > 0) {
      const expenseRate = expense / income;

      if (balance < 0 || expenseRate > 0.8) {
        health = "Ruim";
        healthColor = "bg-red-100 text-red-700";
      } else if (expenseRate > 0.5) {
        health = "Bom";
        healthColor = "bg-yellow-100 text-yellow-700";
      } else {
        health = "Ótimo";
        healthColor = "bg-green-100 text-green-700";
      }
    }

    return {
      walletTotal,
      income,
      expense,
      balance,
      health,
      healthColor,
    };
  }, [wallets, transactions]);

  function handleLogin() {
    if (!user.trim()) return;

    localStorage.setItem("pibblefinance:user", user);
    setCurrentUser(user);
  }

  function addWallet() {
    if (!walletName || !walletBalance) return;

    const newWallet: Wallet = {
      id: crypto.randomUUID(),
      name: walletName,
      type: walletType,
      balance: Number(walletBalance),
    };

    setWallets([...wallets, newWallet]);

    setWalletName("");
    setWalletBalance("");
  }

  function addTransaction() {
    if (!amount || !category || !walletId) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: transactionType,
      amount: Number(amount),
      category,
      walletId,
      description,
      date: new Date().toISOString(),
    };

    setTransactions([newTransaction, ...transactions]);

    setAmount("");
    setCategory("");
    setDescription("");
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <section className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-slate-900">
            PibbleFinance
          </h1>

          <p className="text-slate-500 mt-2">
            Entre com seu nome para acessar seu controle financeiro.
          </p>

          <input
            className="w-full mt-6 border rounded-xl p-3"
            placeholder="Seu nome"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full mt-4 bg-slate-900 text-white rounded-xl p-3 font-semibold"
          >
            Entrar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          PibbleFinance
        </h1>

        <p className="text-slate-500">
          Olá, {currentUser}. Veja sua saúde financeira.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card
          title="Saldo total"
          value={formatMoney(totals.balance)}
        />

        <Card
          title="Entradas"
          value={formatMoney(totals.income)}
        />

        <Card
          title="Gastos"
          value={formatMoney(totals.expense)}
        />

        <div
          className={`rounded-2xl p-5 shadow ${totals.healthColor}`}
        >
          <p className="text-sm">Saúde financeira</p>

          <strong className="text-2xl">
            {totals.health}
          </strong>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Criar carteira
          </h2>

          <input
            className="w-full border rounded-xl p-3 mb-3"
            placeholder="Nome da carteira"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
          />

          <select
            className="w-full border rounded-xl p-3 mb-3"
            value={walletType}
            onChange={(e) => setWalletType(e.target.value)}
          >
            <option>Conta principal</option>
            <option>Cartão de crédito</option>
            <option>Dinheiro físico</option>
            <option>Reserva</option>
          </select>

          <input
            className="w-full border rounded-xl p-3 mb-3"
            placeholder="Saldo inicial"
            type="number"
            value={walletBalance}
            onChange={(e) => setWalletBalance(e.target.value)}
          />

          <button
            onClick={addWallet}
            className="w-full bg-slate-900 text-white rounded-xl p-3 font-semibold"
          >
            Adicionar carteira
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Registrar movimentação
          </h2>

          <select
            className="w-full border rounded-xl p-3 mb-3"
            value={transactionType}
            onChange={(e) =>
              setTransactionType(
                e.target.value as "income" | "expense"
              )
            }
          >
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>

          <input
            className="w-full border rounded-xl p-3 mb-3"
            placeholder="Valor"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <input
            className="w-full border rounded-xl p-3 mb-3"
            placeholder="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <select
            className="w-full border rounded-xl p-3 mb-3"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            <option value="">
              Selecione uma carteira
            </option>

            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>

          <input
            className="w-full border rounded-xl p-3 mb-3"
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            onClick={addTransaction}
            className="w-full bg-slate-900 text-white rounded-xl p-3 font-semibold"
          >
            Registrar
          </button>
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <strong className="text-2xl text-slate-900">
        {value}
      </strong>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}