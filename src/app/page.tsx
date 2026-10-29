// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
getAuth,
signInAnonymously,
onAuthStateChanged,
} from "firebase/auth";
import {
getFirestore,
doc,
setDoc,
onSnapshot,
collection,
} from "firebase/firestore";
import {
Utensils,
Ticket,
QrCode,
BarChart3,
Users,
MessageCircle,
Settings,
Search,
Copy,
Download,
FolderPlus,
Cloud,
X,
Info,
Music,
ShoppingBag
} from "lucide-react";

/

============================================================================

CONFIGURACIÓN FIREBASE (Tus llaves oficiales)

============================================================================
*/
let app = null;
let auth = null;
let db = null;
const appId = "mi-pollada-peru";

try {
const firebaseConfig = {
apiKey: "AIzaSyD2AOxRnm8WE58Exf2jZ3gnYk_8MeGjZUQ",
authDomain: "mi-pollada-2026.firebaseapp.com",
projectId: "mi-pollada-2026",
storageBucket: "mi-pollada-2026.firebasestorage.app",
messagingSenderId: "251967541400",
appId: "1:251967541400:web:d2efc03a656b09975ac0ed"
};

app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);
} catch (e) {
console.error("Error inicializando Firebase:", e);
}

const formatPEN = (cents) => {
const soles = ((cents || 0) / 100).toFixed(2);
return S/ ${Number(soles).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })};
};

const generateEntropyToken = (prefix, num) => {
const randomPart = Array.from({ length: 10 }, () =>
Math.floor(Math.random() * 36).toString(36)
).join("").toUpperCase();
return ${prefix}-${String(num).padStart(3, "0")}-${randomPart};
};

const createInitial250Tickets = (prefix = "POL1") => {
return Array.from({ length: 250 }, (_, idx) => {
const num = idx + 1;
const code = String(num).padStart(3, "0");
return {
id: TKT-${code},
num,
code,
qrToken: generateEntropyToken(prefix, num),
agreedPriceCents: 1500,
historicalCostCents: 900,
presentation: "Pollada Completa",
assignmentStatus: "DISPONIBLE",
paymentStatus: "PENDIENTE",
deliveryStatus: "PENDIENTE",
paidCents: 0,
paymentMethod: "",
sellerName: "General",
buyerName: "",
buyerPhone: "",
deliveredAt: null,
deliveredBy: null,
};
});
};

const createInitialBarItems = () => [
{ id: "BAR-GASEOSA", name: "Gaseosa", unitPriceCents: 400, stock: 0, soldQty: 0, totalRevenueCents: 0 },
{ id: "BAR-AGUA", name: "Agua Mineral", unitPriceCents: 250, stock: 0, soldQty: 0, totalRevenueCents: 0 },
{ id: "BAR-CIGARRO", name: "Cigarros", unitPriceCents: 200, stock: 0, soldQty: 0, totalRevenueCents: 0 },
{ id: "BAR-CERVEZA", name: "Cerveza", unitPriceCents: 1000, stock: 0, soldQty: 0, totalRevenueCents: 0 },
];

export default function App() {
const [user, setUser] = useState(null);
const [syncStatus, setSyncStatus] = useState("CONECTANDO");
const [eventsList, setEventsList] = useState([{ id: "evento-actual", name: "Pollada #1 (250 Tickets)" }]);
const [currentEventId, setCurrentEventId] = useState("evento-actual");
const [newEventNameModal, setNewEventNameModal] = useState(false);
const [newEventTitleInput, setNewEventTitleInput] = useState("");

const [activeTab, setActiveTab] = useState("VENDER");
const [toast, setToast] = useState(null);
const [showExportModal, setShowExportModal] = useState(false);

const notify = (msg, type = "info") => {
setToast({ msg, type, id: Date.now() });
};

const [eventConfig, setEventConfig] = useState({
prefix: "POL1", name: "Pollada Pro Fondos", date: "Sábado", startTime: "11:00 AM", endTime: "06:00 PM", address: "Local del Evento", capacity: 250, unitCostCents: 900, unitPriceCents: 1500,
});

const [tickets, setTickets] = useState(() => createInitial250Tickets("POL1"));
const [barItems, setBarItems] = useState(() => createInitialBarItems());
const [payments, setPayments] = useState([]);
const [expenses, setExpenses] = useState([]);
const [sellers, setSellers] = useState([
{ id: "SEL-1", name: "General / Caja", cashInHandCents: 0, settledCents: 0 },
{ id: "SEL-2", name: "Vendedor 1", cashInHandCents: 0, settledCents: 0 },
]);

const [pollosRecibidos, setPollosRecibidos] = useState(250);
const [fondoInicialCajaCents, setFondoInicialCajaCents] = useState(10000);
const [conteoFisicoRealCents, setConteoFisicoRealCents] = useState(10000);

useEffect(() => {
if (!auth) { setSyncStatus("LOCAL"); return; }
const initAuth = async () => {
try { await signInAnonymously(auth); } catch (err) { setSyncStatus("LOCAL"); }
};
initAuth();

const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); });
return () => unsubscribe();


}, []);

useEffect(() => {
if (!user || !db) return;

const eventsColRef = collection(db, "artifacts", appId, "public", "data", "pollada_events");
const unsubList = onSnapshot(eventsColRef, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => { list.push({ id: docSnap.id, name: docSnap.data().eventConfig?.name || docSnap.id }); });
    if (list.length > 0) setEventsList(list);
});

const eventDocRef = doc(db, "artifacts", appId, "public", "data", "pollada_events", currentEventId);
const unsubDoc = onSnapshot(eventDocRef, (docSnap) => {
    setSyncStatus("EN_VIVO");
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.eventConfig) setEventConfig(data.eventConfig);
      if (data.tickets) setTickets(JSON.parse(data.tickets));
      if (data.barItems) setBarItems(JSON.parse(data.barItems));
      if (data.payments) setPayments(JSON.parse(data.payments));
      if (data.expenses) setExpenses(JSON.parse(data.expenses));
      if (data.sellers) setSellers(JSON.parse(data.sellers));
      if (typeof data.pollosRecibidos === "number") setPollosRecibidos(data.pollosRecibidos);
      if (typeof data.fondoInicialCajaCents === "number") setFondoInicialCajaCents(data.fondoInicialCajaCents);
      if (typeof data.conteoFisicoRealCents === "number") setConteoFisicoRealCents(data.conteoFisicoRealCents);
    } else {
      const initialTickets = createInitial250Tickets("POL1");
      const initialBar = createInitialBarItems();
      setDoc(eventDocRef, {
        eventConfig, tickets: JSON.stringify(initialTickets), barItems: JSON.stringify(initialBar),
        payments: JSON.stringify([]), expenses: JSON.stringify([]), sellers: JSON.stringify(sellers),
        pollosRecibidos: 250, fondoInicialCajaCents: 10000, conteoFisicoRealCents: 10000, updatedAt: Date.now(),
      });
    }
  }
);

return () => { unsubList(); unsubDoc(); };


}, [user, currentEventId]);

const saveToCloud = async (overrides = {}) => {
if (user && db) {
const nextState = {
eventConfig: overrides.eventConfig ?? eventConfig, tickets: JSON.stringify(overrides.tickets ?? tickets),
barItems: JSON.stringify(overrides.barItems ?? barItems), payments: JSON.stringify(overrides.payments ?? payments),
expenses: JSON.stringify(overrides.expenses ?? expenses), sellers: JSON.stringify(overrides.sellers ?? sellers),
pollosRecibidos: overrides.pollosRecibidos ?? pollosRecibidos, fondoInicialCajaCents: overrides.fondoInicialCajaCents ?? fondoInicialCajaCents,
conteoFisicoRealCents: overrides.conteoFisicoRealCents ?? conteoFisicoRealCents, updatedAt: Date.now(),
};
await setDoc(doc(db, "artifacts", appId, "public", "data", "pollada_events", currentEventId), nextState);
}
};

const [ticketNumInput, setTicketNumInput] = useState("1");
const [buyerNameInput, setBuyerNameInput] = useState("");
const [buyerPhoneInput, setBuyerPhoneInput] = useState("");
const [sellerNameInput, setSellerNameInput] = useState("General / Caja");
const [quickPayMode, setQuickPayMode] = useState("EFECTIVO_CAJA");
const [cashBilleteSoles, setCashBilleteSoles] = useState("20");
const [deliverImmediately, setDeliverImmediately] = useState(false);
const [gridFilterStatus, setGridFilterStatus] = useState("TODOS");
const [searchTicketQuery, setSearchTicketQuery] = useState("");
const [inspectedTicket, setInspectedTicket] = useState(null);
const [deliveryQuery, setDeliveryQuery] = useState("");
const [expenseType, setExpenseType] = useState("COMPRA_BARRA");
const [expenseConcept, setExpenseConcept] = useState("");
const [expenseAmountSoles, setExpenseAmountSoles] = useState("");
const [expensePayOrigin, setExpensePayOrigin] = useState("EFECTIVO_CAJA");
const [selectedBarProductId, setSelectedBarProductId] = useState("BAR-GASEOSA");
const [addedBarUnits, setAddedBarUnits] = useState("24");

const metrics = useMemo(() => {
const disponibles = tickets.filter((t) => t.assignmentStatus === "DISPONIBLE").length;
const reservadosSinPago = tickets.filter((t) => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO").length;
const pagadosCount = tickets.filter((t) => t.paymentStatus === "PAGADO").length;
const entregadosCount = tickets.filter((t) => t.deliveryStatus === "ENTREGADO").length;

const cobradoTicketsCents = tickets.reduce((acc, t) => acc + (t.paidCents || 0), 0);
const ingresosBarraCents = barItems.reduce((acc, item) => acc + (item.totalRevenueCents || 0), 0);

const entradasEfectivoCajaCents = payments.filter((p) => p.destination === "EFECTIVO_CAJA").reduce((acc, p) => acc + p.amountCents, 0);
const entradasYapeCents = payments.filter((p) => p.destination === "YAPE_EVENTO").reduce((acc, p) => acc + p.amountCents, 0);
const salidasEfectivoCajaCents = expenses.filter((e) => e.payOrigin === "EFECTIVO_CAJA").reduce((acc, e) => acc + e.amountCents, 0);
const salidasYapeCents = expenses.filter((e) => e.payOrigin === "YAPE_EVENTO").reduce((acc, e) => acc + e.amountCents, 0);
const gastosTotalesCents = expenses.reduce((acc, e) => acc + e.amountCents, 0);

const efectivoDisponibleCajaCents = fondoInicialCajaCents + entradasEfectivoCajaCents - salidasEfectivoCajaCents;
const saldoDisponibleYapeCents = entradasYapeCents - salidasYapeCents;
const diferenciaCajaCents = conteoFisicoRealCents - efectivoDisponibleCajaCents;
const gananciaNetaActualCents = (cobradoTicketsCents + ingresosBarraCents) - gastosTotalesCents;

return {
  disponibles, reservadosSinPago, pagadosCount, entregadosCount, cobradoTicketsCents, ingresosBarraCents,
  entradasEfectivoCajaCents, salidasEfectivoCajaCents, efectivoDisponibleCajaCents, saldoDisponibleYapeCents,
  gastosTotalesCents, diferenciaCajaCents, gananciaNetaActualCents,
};


}, [tickets, barItems, payments, expenses, sellers, pollosRecibidos, fondoInicialCajaCents, conteoFisicoRealCents, eventConfig]);

const handleRegistrarTicket = () => {
const nums = ticketNumInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 250);
if (nums.length === 0) { notify("Ingresa un número válido del 1 al 250.", "error"); return; }

const ocupados = tickets.filter((t) => nums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE" && !(t.assignmentStatus === "RESERVADO" && quickPayMode !== "SOLO_SEPARAR"));
if (ocupados.length > 0) { notify(`El ticket N.º ${ocupados[0].code} ya está registrado.`, "error"); return; }

const totalCents = nums.length * eventConfig.unitPriceCents;
const isSeparar = quickPayMode === "SOLO_SEPARAR";
const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

const nextTickets = tickets.map((t) => {
  if (!nums.includes(t.num)) return t;
  return { ...t, buyerName: buyerNameInput.trim() || "Cliente", buyerPhone: buyerPhoneInput.trim(), sellerName: sellerNameInput,
    assignmentStatus: isSeparar ? "RESERVADO" : "CONFIRMADO", paymentStatus: isSeparar ? "PENDIENTE" : "PAGADO", paidCents: isSeparar ? 0 : t.agreedPriceCents,
    paymentMethod: isSeparar ? "" : quickPayMode, deliveryStatus: !isSeparar && deliverImmediately ? "ENTREGADO" : t.deliveryStatus, deliveredAt: !isSeparar && deliverImmediately ? nowTime : t.deliveredAt };
});

let nextPayments = [...payments], nextSellers = [...sellers], nextConteo = conteoFisicoRealCents;
if (!isSeparar) {
  const dest = quickPayMode === "EFECTIVO_CAJA" ? "EFECTIVO_CAJA" : quickPayMode === "YAPE" ? "YAPE_EVENTO" : "VENDEDOR";
  nextPayments = [{ id: `PAY-${Date.now()}`, description: `Ticket(s) ${nums.join(", ")}`, amountCents: totalCents, destination: dest, time: nowTime }, ...payments];
  if (dest === "EFECTIVO_CAJA") nextConteo += totalCents;
  else if (dest === "VENDEDOR") nextSellers = sellers.map((s) => s.name === sellerNameInput ? { ...s, cashInHandCents: s.cashInHandCents + totalCents } : s);
}

setTickets(nextTickets); setPayments(nextPayments); setSellers(nextSellers); setConteoFisicoRealCents(nextConteo);
saveToCloud({ tickets: nextTickets, payments: nextPayments, sellers: nextSellers, conteoFisicoRealCents: nextConteo });

const nextFree = nextTickets.find((t) => t.assignmentStatus === "DISPONIBLE");
if (nextFree) setTicketNumInput(String(nextFree.num));
setBuyerNameInput(""); setBuyerPhoneInput("");
notify(isSeparar ? "Ticket separado." : "Venta registrada.", "success");


};

const handleCobrarTicketSeparado = (ticketNum, metodo = "EFECTIVO_CAJA") => {
const target = tickets.find((t) => t.num === ticketNum);
if (!target || target.paymentStatus === "PAGADO") return;

const monto = target.agreedPriceCents;
const nextTickets = tickets.map((t) => t.num === ticketNum ? { ...t, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto, paymentMethod: metodo } : t);
const nextPayments = [{ id: `PAY-${Date.now()}`, description: `Cobro Ticket ${target.code}`, amountCents: monto, destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA", time: new Date().toLocaleTimeString("es-PE") }, ...payments];
const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + monto : conteoFisicoRealCents;

setTickets(nextTickets); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
saveToCloud({ tickets: nextTickets, payments: nextPayments, conteoFisicoRealCents: nextConteo });
if (inspectedTicket?.num === ticketNum) setInspectedTicket({ ...inspectedTicket, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto });
notify("Cobro registrado.", "success");


};

const handleEntregarPlato = (ticketNum) => {
const target = tickets.find((t) => t.num === ticketNum);
if (!target || target.deliveryStatus === "ENTREGADO") return;
if (target.paymentStatus !== "PAGADO") { notify("FALTA PAGAR.", "warning"); return; }

const nextTickets = tickets.map((t) => t.num === ticketNum ? { ...t, deliveryStatus: "ENTREGADO", deliveredAt: new Date().toLocaleTimeString("es-PE") } : t);
setTickets(nextTickets); saveToCloud({ tickets: nextTickets }); notify("Plato entregado.", "success");


};

const handleVenderProductoBarra = (itemId, metodo = "EFECTIVO_CAJA") => {
const target = barItems.find((i) => i.id === itemId);
if (!target || target.stock <= 0) { notify("Sin stock.", "warning"); return; }

const nextBar = barItems.map((i) => i.id === itemId ? { ...i, stock: i.stock - 1, soldQty: i.soldQty + 1, totalRevenueCents: i.totalRevenueCents + i.unitPriceCents } : i);
const nextPayments = [{ id: `BAR-${Date.now()}`, description: `Barra: ${target.name}`, amountCents: target.unitPriceCents, destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA", time: new Date().toLocaleTimeString("es-PE") }, ...payments];
const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + target.unitPriceCents : conteoFisicoRealCents;

setBarItems(nextBar); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
saveToCloud({ barItems: nextBar, payments: nextPayments, conteoFisicoRealCents: nextConteo });
notify(`Vendido 1 ${target.name}.`, "success");


};

const handleRegistrarCompraOGastoConCaja = () => {
const amountCents = Math.round((parseFloat(expenseAmountSoles) || 0) * 100);
if (amountCents <= 0) return;

let finalConcept = expenseConcept.trim() || "Gasto Local";
let nextBar = [...barItems];

if (expenseType === "COMPRA_BARRA") {
  const unitsToAdd = parseInt(addedBarUnits, 10) || 0;
  if (unitsToAdd > 0) nextBar = barItems.map((b) => b.id === selectedBarProductId ? { ...b, stock: b.stock + unitsToAdd } : b);
}

const newExp = { id: `EXP-${Date.now()}`, type: expenseType, concept: finalConcept, amountCents, payOrigin: expensePayOrigin, time: new Date().toLocaleTimeString("es-PE") };
const nextExpenses = [newExp, ...expenses];
const nextConteo = expensePayOrigin === "EFECTIVO_CAJA" ? conteoFisicoRealCents - amountCents : conteoFisicoRealCents;

setExpenses(nextExpenses); setBarItems(nextBar); setConteoFisicoRealCents(nextConteo); setExpenseConcept(""); setExpenseAmountSoles("");
saveToCloud({ expenses: nextExpenses, barItems: nextBar, conteoFisicoRealCents: nextConteo });
notify("Salida registrada.", "success");


};

const handleCrearNuevoEvento = async () => {
if (!newEventTitleInput.trim()) return;
const slug = pollada-${Date.now()};
const newConfig = { ...eventConfig, name: newEventTitleInput.trim() };
setCurrentEventId(slug); setEventConfig(newConfig); setTickets(createInitial250Tickets("P2")); setBarItems(createInitialBarItems());
setPayments([]); setExpenses([]); setPollosRecibidos(250); setFondoInicialCajaCents(10000); setConteoFisicoRealCents(10000);
setNewEventNameModal(false); setNewEventTitleInput("");
if (user && db) {
await setDoc(doc(db, "artifacts", appId, "public", "data", "pollada_events", slug), { eventConfig: newConfig, tickets: JSON.stringify(createInitial250Tickets("P2")), barItems: JSON.stringify(createInitialBarItems()), payments: "[]", expenses: "[]", sellers: JSON.stringify(sellers), pollosRecibidos: 250, fondoInicialCajaCents: 10000, conteoFisicoRealCents: 10000, updatedAt: Date.now() });
}
notify("Nueva actividad creada.", "success");
};

const filteredTickets = useMemo(() => {
return tickets.filter((t) => {
if (gridFilterStatus === "DISPONIBLE" && t.assignmentStatus !== "DISPONIBLE") return false;
if (gridFilterStatus === "FALTA_PAGAR" && t.paymentStatus === "PAGADO") return false;
if (gridFilterStatus === "PAGADO" && t.paymentStatus !== "PAGADO") return false;
if (gridFilterStatus === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO") return false;
if (searchTicketQuery && !t.code.includes(searchTicketQuery) && !(t.buyerName || "").toLowerCase().includes(searchTicketQuery.toLowerCase())) return false;
return true;
});
}, [tickets, gridFilterStatus, searchTicketQuery]);

const deliveryList = useMemo(() => {
const q = deliveryQuery.trim().toLowerCase();
if (!q) return tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE" && t.deliveryStatus === "PENDIENTE").slice(0, 8);
return tickets.filter((t) => t.code.toLowerCase().includes(q) || (t.buyerName && t.buyerName.toLowerCase().includes(q))).slice(0, 8);
}, [tickets, deliveryQuery]);

return (






 {syncStatus === "EN_VIVO" ? "En Vivo" : "Local"}
{eventConfig.name}



<select value={currentEventId} onChange={(e) => setCurrentEventId(e.target.value)} className="bg-black/25 text-white text-xs p-2 rounded-xl font-bold border-none outline-none">
{eventsList.map((ev) => {ev.name})}

<button onClick={() => setNewEventNameModal(true)} className="bg-white/20 p-2 rounded-xl">
<button onClick={() => {
const csv = "Nro,Comprador,Estado_Pago,Estado_Entrega\n" + tickets.map(t=>${t.code},"${t.buyerName}",${t.paymentStatus},${t.deliveryStatus}).join("\n");
navigator.clipboard.writeText(csv);
notify("Copiado al portapapeles.", "success");
}} className="flex items-center gap-1.5 bg-white text-orange-900 text-xs font-bold px-3 py-1.5 rounded-xl"> CSV




{[{ id: "FIESTA", label: "Gastos", icon: Music }, { id: "VENDEDORES", label: "Rendición", icon: Users }, { id: "CONFIG", label: "Ajustes", icon: Settings }].map((i) => (
<button key={i.id} onClick={() => setActiveTab(i.id)} className={flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${activeTab === i.id ? "bg-white text-orange-900" : "text-white"}}><i.icon className="w-3.5 h-3.5"/> {i.label}
))}




  {toast && (
    <div className="max-w-6xl mx-auto px-4 mt-3">
      <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-300 flex justify-between items-center text-sm font-bold">
        <div className="flex items-center gap-2"><Info className="w-4 h-4" /> {toast.msg}</div>
        <button onClick={() => setToast(null)} className="underline">OK</button>
      </div>
    </div>
  )}

  {newEventNameModal && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
        <h3 className="font-bold text-lg mb-2">Crear Actividad</h3>
        <input type="text" value={newEventTitleInput} onChange={(e) => setNewEventTitleInput(e.target.value)} className="w-full p-2 border rounded mb-4" placeholder="Nombre" />
        <div className="flex justify-end gap-2">
          <button onClick={() => setNewEventNameModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
          <button onClick={handleCrearNuevoEvento} className="px-4 py-2 bg-orange-600 text-white rounded">Crear</button>
        </div>
      </div>
    </div>
  )}

  <main className="max-w-6xl mx-auto p-4 space-y-6">
    {activeTab === "VENDER" && (
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <h2 className="text-lg font-extrabold text-stone-900">1. Vender Pollada</h2>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-bold">N.º (1-250)</label><input type="text" value={ticketNumInput} onChange={(e) => setTicketNumInput(e.target.value)} className="w-full mt-1 p-2 border rounded text-center font-bold text-lg" /></div>
            <div className="col-span-2"><label className="text-xs font-bold">Comprador</label><input type="text" value={buyerNameInput} onChange={(e) => setBuyerNameInput(e.target.value)} className="w-full mt-1 p-2.5 border rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "EFECTIVO_CAJA", label: "Efectivo" }, { id: "YAPE", label: "Yape" }, { id: "SOLO_SEPARAR", label: "Solo Separar" }].map((m) => (
              <button key={m.id} onClick={() => setQuickPayMode(m.id)} className={`py-2 text-xs font-bold border rounded ${quickPayMode === m.id ? "bg-stone-900 text-white" : "bg-stone-50"}`}>{m.label}</button>
            ))}
          </div>
          {quickPayMode === "EFECTIVO_CAJA" && (
            <div className="p-3 bg-amber-50 rounded flex justify-between items-center text-xs">
              <span>Billete S/:</span>
              <input type="number" value={cashBilleteSoles} onChange={(e) => setCashBilleteSoles(e.target.value)} className="w-20 p-1 border text-center font-bold" />
              <span>Vuelto: <strong className="text-orange-800 text-base">{formatPEN(Math.max(0, Math.round((parseFloat(cashBilleteSoles) || 0) * 100) - ticketNumInput.split(",").filter((x) => x.trim() !== "").length * 1500))}</strong></span>
            </div>
          )}
          <button onClick={handleRegistrarTicket} className="w-full bg-orange-600 text-white font-extrabold py-3 rounded-xl">{quickPayMode === "SOLO_SEPARAR" ? "Separar Ticket" : "Guardar Venta"}</button>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-base font-extrabold flex items-center gap-1.5 mb-4"><ShoppingBag className="w-4 h-4 text-orange-600" /> 2. Venta Barra</h2>
          <div className="space-y-3">
            {barItems.map((item) => (
              <div key={item.id} className="p-3 bg-stone-50 border rounded flex justify-between items-center">
                <div><div className="font-bold">{item.name}</div><div className="text-xs">Stock: {item.stock}</div></div>
                <div className="flex gap-2">
                  <button onClick={() => handleVenderProductoBarra(item.id, "EFECTIVO_CAJA")} className="bg-emerald-700 text-white px-3 py-1.5 rounded font-bold text-xs">+1 Efectivo</button>
                  <button onClick={() => handleVenderProductoBarra(item.id, "YAPE")} className="bg-purple-700 text-white px-3 py-1.5 rounded font-bold text-xs">+1 Yape</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {activeTab === "TICKETS" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-extrabold text-lg">Padrón 250 Tickets</h2>
          <select value={gridFilterStatus} onChange={(e) => setGridFilterStatus(e.target.value)} className="border p-2 rounded text-xs font-bold">
            <option value="TODOS">Todos</option><option value="DISPONIBLE">Libres</option><option value="PAGADO">Pagados</option><option value="FALTA_PAGAR">Falta Pagar</option>
          </select>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 overflow-y-auto max-h-[60vh] p-1">
          {filteredTickets.map((t) => (
            <button key={t.num} onClick={() => setInspectedTicket(t)} className={`p-2 border rounded flex flex-col items-center ${t.deliveryStatus === "ENTREGADO" ? "bg-stone-900 text-white" : t.paymentStatus === "PAGADO" ? "bg-emerald-100" : t.assignmentStatus === "RESERVADO" ? "bg-amber-100" : "bg-stone-50"}`}>
              <span className="font-extrabold text-sm">{t.code}</span>
            </button>
          ))}
        </div>
        {inspectedTicket && (
          <div className="mt-4 p-4 border-2 border-orange-500 rounded flex justify-between items-center">
            <div><span className="text-xs font-bold text-orange-700">Ticket N.º {inspectedTicket.code}</span><h3 className="font-extrabold">{inspectedTicket.buyerName || "Disponible"}</h3></div>
            <div className="flex gap-2">
               {inspectedTicket.paymentStatus !== "PAGADO" && inspectedTicket.assignmentStatus !== "DISPONIBLE" && (
                  <button onClick={() => handleCobrarTicketSeparado(inspectedTicket.num)} className="bg-emerald-700 text-white px-3 py-2 rounded text-xs font-bold">Cobrar</button>
               )}
               <button onClick={() => setInspectedTicket(null)} className="px-3 py-2 bg-gray-200 rounded font-bold text-xs">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    )}

    {activeTab === "ENTREGAR" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="font-extrabold text-lg mb-4">Despacho</h2>
        <input type="text" placeholder="Buscar ticket..." value={deliveryQuery} onChange={(e) => setDeliveryQuery(e.target.value)} className="w-full p-3 border rounded mb-4" />
        <div className="space-y-3">
          {deliveryList.map((t) => (
            <div key={t.num} className="p-4 border rounded flex justify-between items-center bg-stone-50">
              <div><span className="font-bold">N.º {t.code}</span><p className="text-sm">{t.buyerName}</p></div>
              <button onClick={() => handleEntregarPlato(t.num)} className={`px-4 py-2 text-white font-bold rounded ${t.deliveryStatus === "ENTREGADO" ? "bg-gray-400" : "bg-emerald-700"}`}>{t.deliveryStatus === "ENTREGADO" ? "Entregado" : "Entregar"}</button>
            </div>
          ))}
        </div>
      </div>
    )}

    {activeTab === "FIESTA" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="font-extrabold text-lg mb-4">Registrar Gastos o Compras</h2>
        <div className="grid gap-3">
          <div className="flex gap-2">
             <button onClick={() => setExpenseType("COMPRA_BARRA")} className={`flex-1 p-2 border rounded text-xs font-bold ${expenseType==="COMPRA_BARRA"?"bg-orange-600 text-white":""}`}>Comprar Barra</button>
             <button onClick={() => setExpenseType("GASTO_FIESTA")} className={`flex-1 p-2 border rounded text-xs font-bold ${expenseType==="GASTO_FIESTA"?"bg-orange-600 text-white":""}`}>Gasto Local</button>
          </div>
          {expenseType === "COMPRA_BARRA" && (
            <div className="grid grid-cols-2 gap-2">
               <select value={selectedBarProductId} onChange={e=>setSelectedBarProductId(e.target.value)} className="p-2 border rounded">
                 {barItems.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
               <input type="number" placeholder="Cant." value={addedBarUnits} onChange={e=>setAddedBarUnits(e.target.value)} className="p-2 border rounded"/>
            </div>
          )}
          <input type="text" value={expenseConcept} onChange={(e) => setExpenseConcept(e.target.value)} placeholder="Concepto (ej. Pago DJ)" className="p-3 border rounded" />
          <input type="number" value={expenseAmountSoles} onChange={(e) => setExpenseAmountSoles(e.target.value)} placeholder="Monto S/" className="p-3 border rounded font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setExpensePayOrigin("EFECTIVO_CAJA")} className={`p-2 border rounded font-bold ${expensePayOrigin === "EFECTIVO_CAJA" ? "bg-stone-900 text-white" : "bg-stone-50"}`}>Caja Fuerte</button>
            <button onClick={() => setExpensePayOrigin("YAPE_EVENTO")} className={`p-2 border rounded font-bold ${expensePayOrigin === "YAPE_EVENTO" ? "bg-stone-900 text-white" : "bg-stone-50"}`}>Yape</button>
          </div>
          <button onClick={handleRegistrarCompraOGastoConCaja} className="bg-orange-600 text-white font-bold py-3 rounded">Registrar Salida</button>
        </div>
      </div>
    )}

    {activeTab === "RESUMEN" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <h2 className="font-extrabold text-lg">Caja y Resultados</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded bg-stone-50">
            <h3 className="font-bold text-xs text-stone-500 uppercase">Efectivo Físico Debe Haber:</h3>
            <p className="text-2xl font-extrabold mt-1">{formatPEN(metrics.efectivoDisponibleCajaCents)}</p>
            <div className="mt-2 text-xs text-stone-500">
                <input type="number" value={(conteoFisicoRealCents / 100).toFixed(2)} onChange={(e) => setConteoFisicoRealCents(Math.round((parseFloat(e.target.value) || 0) * 100))} className="w-full border p-1 rounded font-bold text-stone-900"/>
                <span className={metrics.diferenciaCajaCents===0?"text-emerald-600":"text-red-600"}>Dif: {formatPEN(metrics.diferenciaCajaCents)}</span>
            </div>
          </div>
          <div className="p-4 border rounded bg-purple-50 border-purple-200">
            <h3 className="font-bold text-xs text-purple-700 uppercase">Yape Total:</h3>
            <p className="text-2xl font-extrabold text-purple-900 mt-1">{formatPEN(metrics.saldoDisponibleYapeCents)}</p>
          </div>
        </div>
        <div className="p-4 border rounded">
            <h3 className="font-bold text-sm uppercase">Ganancia Neta Calculada</h3>
            <p className="text-2xl font-extrabold text-emerald-700">{formatPEN(metrics.gananciaNetaActualCents)}</p>
        </div>
      </div>
    )}
    
    {activeTab === "VENDEDORES" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <h2 className="font-extrabold text-lg">Rendición Vendedores</h2>
        {sellers.map((s) => {
          const pendiente = s.cashInHandCents - s.settledCents;
          return (
            <div key={s.id} className="p-4 border rounded flex justify-between items-center bg-stone-50">
              <div><span className="font-bold">{s.name}</span><p className="text-sm">Falta rendir: <strong className="text-orange-700">{formatPEN(pendiente)}</strong></p></div>
              {pendiente > 0 && <button onClick={()=>{
                  const nextSellers = sellers.map(x=> x.id===s.id ? {...x, settledCents: x.cashInHandCents}:x);
                  const nextPayments = [{ id: `REND-${Date.now()}`, description: `Rendición ${s.name}`, amountCents: pendiente, destination: "EFECTIVO_CAJA", time: new Date().toLocaleTimeString("es-PE") }, ...payments];
                  const nextConteo = conteoFisicoRealCents + pendiente;
                  setSellers(nextSellers); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
                  saveToCloud({sellers: nextSellers, payments: nextPayments, conteoFisicoRealCents: nextConteo});
                  notify("Recibido en caja fuerte.", "success");
              }} className="bg-emerald-700 text-white px-3 py-2 rounded text-xs font-bold">Recibir</button>}
            </div>
          );
        })}
      </div>
    )}
    
    {activeTab === "CONFIG" && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="font-extrabold text-lg mb-4">Ajustes</h2>
        <input type="text" value={eventConfig.name} onChange={(e) => {setEventConfig({ ...eventConfig, name: e.target.value }); saveToCloud({eventConfig: { ...eventConfig, name: e.target.value }})}} className="w-full p-3 border rounded mb-2 font-bold" />
      </div>
    )}
  </main>

  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 pb-4 z-40">
    {[
      { id: "VENDER", label: "Vender", icon: Ticket },
      { id: "TICKETS", label: "Tickets", icon: QrCode },
      { id: "ENTREGAR", label: "Entregar", icon: Utensils },
      { id: "RESUMEN", label: "Caja", icon: BarChart3 }
    ].map((t) => (
      <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold ${activeTab === t.id ? "text-orange-700 bg-orange-50" : "text-stone-500"}`}>
        <t.icon className="w-5 h-5 mb-1" />{t.label}
      </button>
    ))}
  </nav>
</div>


);
}