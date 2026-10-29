// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
// ... el resto de tu código se queda exactamente igual

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

/**
 * ============================================================================
 * CONFIGURACIÓN FIREBASE (Tus llaves oficiales introducidas directamente)
 * ============================================================================
 */
let app = null;
let auth = null;
let db = null;
const appId = "mi-pollada-peru"; // Nombre de referencia interno

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

// Formateador de céntimos a Soles Peruanos (S/)
const formatPEN = (cents) => {
  const soles = ((cents || 0) / 100).toFixed(2);
  return `S/ ${Number(soles).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Generador de token único para el QR de cada ticket
const generateEntropyToken = (prefix, num) => {
  const randomPart = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("").toUpperCase();
  return `${prefix}-${String(num).padStart(3, "0")}-${randomPart}`;
};

// Creador de los 250 tickets iniciales (001 al 250) limpios
const createInitial250Tickets = (prefix = "POL1") => {
  return Array.from({ length: 250 }, (_, idx) => {
    const num = idx + 1;
    const code = String(num).padStart(3, "0");
    return {
      id: `TKT-${code}`,
      num,
      code,
      qrToken: generateEntropyToken(prefix, num),
      agreedPriceCents: 1500, // S/ 15.00
      historicalCostCents: 900, // S/ 9.00
      presentation: "Pollada Completa",
      assignmentStatus: "DISPONIBLE", // DISPONIBLE | RESERVADO | CONFIRMADO | ANULADO
      paymentStatus: "PENDIENTE", // PENDIENTE | PARCIAL | PAGADO
      deliveryStatus: "PENDIENTE", // PENDIENTE | ENTREGADO
      paidCents: 0,
      paymentMethod: "", // EFECTIVO | YAPE
      sellerName: "General",
      buyerName: "",
      buyerPhone: "",
      deliveredAt: null,
      deliveredBy: null,
    };
  });
};

// Catálogo inicial para la Fiesta / Barra en el local
const createInitialBarItems = () => [
  {
    id: "BAR-GASEOSA",
    name: "Gaseosa",
    unitPriceCents: 400, // S/ 4.00
    stock: 0,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-AGUA",
    name: "Agua Mineral",
    unitPriceCents: 250, // S/ 2.50
    stock: 0,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-CIGARRO",
    name: "Cigarros (Unidad/Cajetilla)",
    unitPriceCents: 200, // S/ 2.00
    stock: 0,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-CERVEZA",
    name: "Bebida / Cerveza",
    unitPriceCents: 1000, // S/ 10.00
    stock: 0,
    soldQty: 0,
    totalRevenueCents: 0,
  },
];

export default function App() {
  // ==========================================================================
  // 1. AUTENTICACIÓN Y SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
  // ==========================================================================
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("CONECTANDO");
  const [eventsList, setEventsList] = useState([
    { id: "evento-actual", name: "Pollada #1 (250 Tickets)" },
  ]);
  const [currentEventId, setCurrentEventId] = useState("evento-actual");
  const [newEventNameModal, setNewEventNameModal] = useState(false);
  const [newEventTitleInput, setNewEventTitleInput] = useState("");

  const [activeTab, setActiveTab] = useState("VENDER");
  const [toast, setToast] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const notify = (msg, type = "info") => {
    setToast({ msg, type, id: Date.now() });
  };

  // ==========================================================================
  // 2. ESTADO OPERATIVO DEL EVENTO
  // ==========================================================================
  const [eventConfig, setEventConfig] = useState({
    prefix: "POL1",
    name: "Pollada Pro Fondos",
    date: "Sábado",
    startTime: "11:00 AM",
    endTime: "06:00 PM",
    address: "Local del Evento",
    capacity: 250,
    unitCostCents: 900,
    unitPriceCents: 1500,
  });

  const [tickets, setTickets] = useState(() => createInitial250Tickets("POL1"));
  const [barItems, setBarItems] = useState(() => createInitialBarItems());
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sellers, setSellers] = useState([
    { id: "SEL-1", name: "General / Caja", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-2", name: "Vendedor 1", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-3", name: "Vendedor 2", cashInHandCents: 0, settledCents: 0 },
  ]);

  const [pollosRecibidos, setPollosRecibidos] = useState(250);
  const [fondoInicialCajaCents, setFondoInicialCajaCents] = useState(10000); // S/ 100 para vuelto
  const [conteoFisicoRealCents, setConteoFisicoRealCents] = useState(10000);

  // Iniciar sesión anónima automáticamente
  useEffect(() => {
    if (!auth) {
      setSyncStatus("LOCAL");
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Error de autenticación:", err);
        setSyncStatus("LOCAL");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Escuchar base de datos en tiempo real
  useEffect(() => {
    if (!user || !db) return;

    const eventsColRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "pollada_events"
    );

    const unsubList = onSnapshot(
      eventsColRef,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.eventConfig?.name || docSnap.id,
          });
        });
        if (list.length > 0) {
          setEventsList(list);
        }
      },
      (err) => console.error("Error leyendo lista de eventos:", err)
    );

    const eventDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "pollada_events",
      currentEventId
    );

    const unsubDoc = onSnapshot(
      eventDocRef,
      (docSnap) => {
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
          // Inicializar por primera vez
          const initialTickets = createInitial250Tickets("POL1");
          const initialBar = createInitialBarItems();
          setDoc(eventDocRef, {
            eventConfig,
            tickets: JSON.stringify(initialTickets),
            barItems: JSON.stringify(initialBar),
            payments: JSON.stringify([]),
            expenses: JSON.stringify([]),
            sellers: JSON.stringify(sellers),
            pollosRecibidos: 250,
            fondoInicialCajaCents: 10000,
            conteoFisicoRealCents: 10000,
            updatedAt: Date.now(),
          }).catch((e) => console.error("Error creando doc inicial:", e));
        }
      },
      (err) => {
        console.error("Error en sincronización:", err);
        setSyncStatus("LOCAL");
      }
    );

    return () => {
      unsubList();
      unsubDoc();
    };
  }, [user, currentEventId]);

  // Guardar en la nube
  const saveToCloud = async (overrides = {}) => {
    const nextState = {
      eventConfig: overrides.eventConfig ?? eventConfig,
      tickets: JSON.stringify(overrides.tickets ?? tickets),
      barItems: JSON.stringify(overrides.barItems ?? barItems),
      payments: JSON.stringify(overrides.payments ?? payments),
      expenses: JSON.stringify(overrides.expenses ?? expenses),
      sellers: JSON.stringify(overrides.sellers ?? sellers),
      pollosRecibidos: overrides.pollosRecibidos ?? pollosRecibidos,
      fondoInicialCajaCents: overrides.fondoInicialCajaCents ?? fondoInicialCajaCents,
      conteoFisicoRealCents: overrides.conteoFisicoRealCents ?? conteoFisicoRealCents,
      updatedAt: Date.now(),
    };

    if (user && db) {
      try {
        const eventDocRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "pollada_events",
          currentEventId
        );
        await setDoc(eventDocRef, nextState);
      } catch (e) {
        console.error("Error guardando en Firebase:", e);
      }
    }
  };

  // ==========================================================================
  // 3. ESTADOS DE LOS FORMULARIOS
  // ==========================================================================
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

  // ==========================================================================
  // 4. CÁLCULOS EN TIEMPO REAL
  // ==========================================================================
  const metrics = useMemo(() => {
    const disponibles = tickets.filter((t) => t.assignmentStatus === "DISPONIBLE").length;
    const reservadosSinPago = tickets.filter(
      (t) => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO"
    ).length;
    const pagadosCount = tickets.filter((t) => t.paymentStatus === "PAGADO").length;
    const entregadosCount = tickets.filter((t) => t.deliveryStatus === "ENTREGADO").length;
    
    const cobradoTicketsCents = tickets.reduce((acc, t) => acc + (t.paidCents || 0), 0);
    const ingresosBarraCents = barItems.reduce((acc, item) => acc + (item.totalRevenueCents || 0), 0);

    const entradasEfectivoCajaCents = payments
      .filter((p) => p.destination === "EFECTIVO_CAJA")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const entradasYapeCents = payments
      .filter((p) => p.destination === "YAPE_EVENTO")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const salidasEfectivoCajaCents = expenses
      .filter((e) => e.payOrigin === "EFECTIVO_CAJA")
      .reduce((acc, e) => acc + e.amountCents, 0);

    const salidasYapeCents = expenses
      .filter((e) => e.payOrigin === "YAPE_EVENTO")
      .reduce((acc, e) => acc + e.amountCents, 0);

    const gastosTotalesCents = expenses.reduce((acc, e) => acc + e.amountCents, 0);

    const efectivoDisponibleCajaCents =
      fondoInicialCajaCents + entradasEfectivoCajaCents - salidasEfectivoCajaCents;

    const saldoDisponibleYapeCents = entradasYapeCents - salidasYapeCents;
    const diferenciaCajaCents = conteoFisicoRealCents - efectivoDisponibleCajaCents;
    const platosQuedanFisicamente = Math.max(0, pollosRecibidos - entregadosCount);

    const ingresosTotalesEventoCents = cobradoTicketsCents + ingresosBarraCents;
    const gananciaNetaActualCents = ingresosTotalesEventoCents - gastosTotalesCents;

    return {
      disponibles,
      reservadosSinPago,
      pagadosCount,
      entregadosCount,
      cobradoTicketsCents,
      ingresosBarraCents,
      ingresosTotalesEventoCents,
      entradasEfectivoCajaCents,
      salidasEfectivoCajaCents,
      efectivoDisponibleCajaCents,
      saldoDisponibleYapeCents,
      gastosTotalesCents,
      diferenciaCajaCents,
      platosQuedanFisicamente,
      gananciaNetaActualCents,
    };
  }, [tickets, barItems, payments, expenses, sellers, pollosRecibidos, fondoInicialCajaCents, conteoFisicoRealCents, eventConfig]);

  // ==========================================================================
  // 5. ACCIONES OPERATIVAS
  // ==========================================================================
  const handleRegistrarTicket = () => {
    const nums = ticketNumInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 250);
    const uniqueNums = Array.from(new Set(nums));
    if (uniqueNums.length === 0) { notify("Ingresa un número válido del 1 al 250.", "error"); return; }

    const ocupados = tickets.filter(
      (t) => uniqueNums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE" &&
        !(t.assignmentStatus === "RESERVADO" && quickPayMode !== "SOLO_SEPARAR")
    );

    if (ocupados.length > 0) { notify(`El ticket N.º ${ocupados[0].code} ya está registrado.`, "error"); return; }

    const totalCobrarCents = uniqueNums.length * eventConfig.unitPriceCents;
    const isSeparar = quickPayMode === "SOLO_SEPARAR";
    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

    const nextTickets = tickets.map((t) => {
      if (!uniqueNums.includes(t.num)) return t;
      return {
        ...t,
        buyerName: buyerNameInput.trim() || "Cliente Local",
        buyerPhone: buyerPhoneInput.trim(),
        sellerName: sellerNameInput,
        assignmentStatus: isSeparar ? "RESERVADO" : "CONFIRMADO",
        paymentStatus: isSeparar ? "PENDIENTE" : "PAGADO",
        paidCents: isSeparar ? 0 : t.agreedPriceCents,
        paymentMethod: isSeparar ? "" : quickPayMode,
        deliveryStatus: !isSeparar && deliverImmediately ? "ENTREGADO" : t.deliveryStatus,
        deliveredAt: !isSeparar && deliverImmediately ? nowTime : t.deliveredAt,
      };
    });

    let nextPayments = [...payments];
    let nextSellers = [...sellers];
    let nextConteo = conteoFisicoRealCents;

    if (!isSeparar) {
      const dest = quickPayMode === "EFECTIVO_CAJA" ? "EFECTIVO_CAJA" : quickPayMode === "YAPE" ? "YAPE_EVENTO" : "VENDEDOR";
      nextPayments = [{
        id: `PAY-${Date.now()}`,
        description: `Ticket N.º ${uniqueNums.join(", ")}`,
        amountCents: totalCobrarCents,
        destination: dest,
        time: nowTime,
      }, ...payments];

      if (dest === "EFECTIVO_CAJA") nextConteo += totalCobrarCents;
      else if (dest === "VENDEDOR") nextSellers = sellers.map((s) => s.name === sellerNameInput ? { ...s, cashInHandCents: s.cashInHandCents + totalCobrarCents } : s);
    }

    setTickets(nextTickets); setPayments(nextPayments); setSellers(nextSellers); setConteoFisicoRealCents(nextConteo);
    saveToCloud({ tickets: nextTickets, payments: nextPayments, sellers: nextSellers, conteoFisicoRealCents: nextConteo });

    const nextFree = nextTickets.find((t) => t.assignmentStatus === "DISPONIBLE");
    if (nextFree) setTicketNumInput(String(nextFree.num));
    setBuyerNameInput(""); setBuyerPhoneInput("");
    notify(isSeparar ? "Ticket separado con éxito." : "Venta registrada con éxito.", "success");
  };

  const handleCobrarTicketSeparado = (ticketNum, metodo = "EFECTIVO_CAJA") => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;
    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const monto = target.agreedPriceCents;

    const nextTickets = tickets.map((t) => t.num === ticketNum ? { ...t, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto, paymentMethod: metodo } : t);
    const nextPayments = [{ id: `PAY-${Date.now()}`, description: `Cobro Ticket N.º ${target.code}`, amountCents: monto, destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA", time: nowTime }, ...payments];
    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + monto : conteoFisicoRealCents;

    setTickets(nextTickets); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
    if (inspectedTicket?.num === ticketNum) setInspectedTicket({ ...inspectedTicket, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto });
    saveToCloud({ tickets: nextTickets, payments: nextPayments, conteoFisicoRealCents: nextConteo });
    notify("Cobro registrado exitosamente.", "success");
  };

  const handleEntregarPlato = (ticketNum) => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.deliveryStatus === "ENTREGADO") return;
    if (target.paymentStatus !== "PAGADO") { notify("FALTA PAGAR.", "warning"); return; }
    
    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const nextTickets = tickets.map((t) => t.num === ticketNum ? { ...t, deliveryStatus: "ENTREGADO", deliveredAt: nowTime } : t);
    
    setTickets(nextTickets);
    saveToCloud({ tickets: nextTickets });
    notify("Plato entregado con éxito.", "success");
  };

  const handleVenderProductoBarra = (itemId, metodo = "EFECTIVO_CAJA") => {
    const target = barItems.find((i) => i.id === itemId);
    if (!target || target.stock <= 0) { notify("Sin stock.", "warning"); return; }
    
    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const nextBar = barItems.map((i) => i.id === itemId ? { ...i, stock: i.stock - 1, soldQty: i.soldQty + 1, totalRevenueCents: i.totalRevenueCents + i.unitPriceCents } : i);
    const nextPayments = [{ id: `BARPAY-${Date.now()}`, description: `Barra: ${target.name}`, amountCents: target.unitPriceCents, destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA", time: nowTime }, ...payments];
    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + target.unitPriceCents : conteoFisicoRealCents;

    setBarItems(nextBar); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
    saveToCloud({ barItems: nextBar, payments: nextPayments, conteoFisicoRealCents: nextConteo });
    notify(`Vendido 1 ${target.name}.`, "success");
  };

  const handleRegistrarCompraOGastoConCaja = () => {
    const amountCents = Math.round((parseFloat(expenseAmountSoles) || 0) * 100);
    if (amountCents <= 0) return;

    let finalConcept = expenseConcept.trim();
    let nextBar = [...barItems];

    if (expenseType === "COMPRA_BARRA") {
      const unitsToAdd = parseInt(addedBarUnits, 10) || 0;
      finalConcept = finalConcept || `Compra Barra`;
      if (unitsToAdd > 0) nextBar = barItems.map((b) => b.id === selectedBarProductId ? { ...b, stock: b.stock + unitsToAdd } : b);
    } else {
      finalConcept = finalConcept || "Gasto Evento";
    }

    const newExp = { id: `EXP-${Date.now()}`, type: expenseType, concept: finalConcept, amountCents, payOrigin: expensePayOrigin, time: new Date().toLocaleTimeString("es-PE") };
    const nextExpenses = [newExp, ...expenses];
    const nextConteo = expensePayOrigin === "EFECTIVO_CAJA" ? conteoFisicoRealCents - amountCents : conteoFisicoRealCents;

    setExpenses(nextExpenses); setBarItems(nextBar); setConteoFisicoRealCents(nextConteo); setExpenseConcept(""); setExpenseAmountSoles("");
    saveToCloud({ expenses: nextExpenses, barItems: nextBar, conteoFisicoRealCents: nextConteo });
    notify("Salida de dinero registrada.", "success");
  };

  const handleCrearNuevoEvento = async () => {
    if (!newEventTitleInput.trim()) return;
    const slug = `pollada-${Date.now()}`;
    const newConfig = { ...eventConfig, name: newEventTitleInput.trim() };
    const freshTickets = createInitial250Tickets("P2");
    
    setCurrentEventId(slug); setEventConfig(newConfig); setTickets(freshTickets); setBarItems(createInitialBarItems());
    setPayments([]); setExpenses([]); setPollosRecibidos(250); setFondoInicialCajaCents(10000); setConteoFisicoRealCents(10000);
    setNewEventNameModal(false); setNewEventTitleInput("");
    notify("Nueva actividad creada.", "success");
  };

  const generateCSVText = () => {
    return "Nro_Ticket,Comprador,Estado\n" + tickets.map((t) => `${t.code},"${t.buyerName}",${t.paymentStatus}`).join("\n");
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (gridFilterStatus === "DISPONIBLE" && t.assignmentStatus !== "DISPONIBLE") return false;
      if (gridFilterStatus === "PAGADO" && t.paymentStatus !== "PAGADO") return false;
      if (searchTicketQuery.trim() !== "" && !t.code.includes(searchTicketQuery.trim())) return false;
      return true;
    });
  }, [tickets, gridFilterStatus, searchTicketQuery]);

  const deliveryList = useMemo(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) return tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE" && t.deliveryStatus === "PENDIENTE").slice(0, 8);
    return tickets.filter((t) => t.code.toLowerCase().includes(q) || t.qrToken.toLowerCase().includes(q)).slice(0, 8);
  }, [tickets, deliveryQuery]);

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-stone-900 pb-24 font-sans">
      <header className="bg-gradient-to-r from-orange-700 via-orange-600 to-red-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl"><Utensils className="w-6 h-6 text-amber-200" /></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-900/90 px-2.5 py-0.5 rounded-full"><Cloud className="w-3 h-3" /> Firebase Sincronizado</span>
              </div>
              <h1 className="text-lg font-extrabold">{eventConfig.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setNewEventNameModal(true)} className="bg-white/20 p-2 rounded-xl"><FolderPlus className="w-4 h-4" /></button>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 bg-white text-orange-900 text-xs font-bold px-3 py-1.5 rounded-xl"><Download className="w-4 h-4"/> CSV</button>
          </div>
        </div>
        <div className="bg-orange-950/40">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
            {[{ id: "FIESTA", label: "Gastos/Fiesta", icon: Music }, { id: "CONFIG", label: "Configurar", icon: Settings }].map((i) => (
              <button key={i.id} onClick={() => setActiveTab(i.id)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${activeTab === i.id ? "bg-white text-orange-900" : "text-white"}`}><i.icon className="w-3.5 h-3.5"/> {i.label}</button>
            ))}
          </div>
        </div>
      </header>

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

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg">
            <div className="flex justify-between border-b pb-2 mb-2"><h3 className="font-bold text-lg">Exportar CSV</h3><button onClick={() => setShowExportModal(false)}><X className="w-5 h-5"/></button></div>
            <textarea className="w-full h-40 text-xs font-mono border p-2 mb-2" readOnly value={generateCSVText()} />
            <button onClick={() => navigator.clipboard.writeText(generateCSVText())} className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Copiar Portapapeles</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {activeTab === "VENDER" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <h2 className="text-lg font-extrabold text-stone-900">1. Vender Pollada</h2>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-bold">N.º (1-250)</label><input type="text" value={ticketNumInput} onChange={(e) => setTicketNumInput(e.target.value)} className="w-full p-2 border rounded text-center font-bold text-lg" /></div>
                <div className="col-span-2"><label className="text-xs font-bold">Comprador</label><input type="text" value={buyerNameInput} onChange={(e) => setBuyerNameInput(e.target.value)} className="w-full p-2.5 border rounded" /></div>
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
                  <span>Vuelto: <strong className="text-orange-800 text-base">{formatPEN(Math.max(0, Math.round((parseFloat(cashBilleteSoles) || 0) * 100) - 1500))}</strong></span>
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
              <h2 className="font-extrabold text-lg">Padrón de 250 Tickets</h2>
              <select value={gridFilterStatus} onChange={(e) => setGridFilterStatus(e.target.value)} className="border p-2 rounded text-xs font-bold bg-stone-50">
                <option value="TODOS">Todos</option>
                <option value="DISPONIBLE">Libres</option>
                <option value="PAGADO">Pagados</option>
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
              <div className="mt-4 p-4 border-2 border-orange-500 rounded bg-white flex justify-between items-center">
                <div><span className="text-xs text-orange-700 font-bold">Ticket N.º {inspectedTicket.code}</span><h3 className="font-extrabold">{inspectedTicket.buyerName || "Disponible"}</h3><p className="text-xs">Pago: {inspectedTicket.paymentStatus}</p></div>
                <div className="flex gap-2">
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
            <h2 className="font-extrabold text-lg mb-4">Gastos</h2>
            <div className="grid gap-3">
              <input type="text" value={expenseConcept} onChange={(e) => setExpenseConcept(e.target.value)} placeholder="Concepto (ej. Pago DJ)" className="p-3 border rounded" />
              <input type="number" value={expenseAmountSoles} onChange={(e) => setExpenseAmountSoles(e.target.value)} placeholder="Monto S/" className="p-3 border rounded font-bold" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setExpensePayOrigin("EFECTIVO_CAJA")} className={`p-2 border rounded ${expensePayOrigin === "EFECTIVO_CAJA" ? "bg-stone-900 text-white" : "bg-stone-50"}`}>De Caja</button>
                <button onClick={() => setExpensePayOrigin("YAPE_EVENTO")} className={`p-2 border rounded ${expensePayOrigin === "YAPE_EVENTO" ? "bg-stone-900 text-white" : "bg-stone-50"}`}>De Yape</button>
              </div>
              <button onClick={handleRegistrarCompraOGastoConCaja} className="bg-orange-600 text-white font-bold py-3 rounded">Registrar Salida</button>
            </div>
          </div>
        )}

        {activeTab === "RESUMEN" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="font-extrabold text-lg mb-4">Caja</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded bg-stone-50">
                <h3 className="font-bold text-xs text-stone-500 uppercase">Efectivo Físico Debe Haber:</h3>
                <p className="text-2xl font-extrabold mt-1">{formatPEN(metrics.efectivoDisponibleCajaCents)}</p>
              </div>
              <div className="p-4 border rounded bg-purple-50 border-purple-200">
                <h3 className="font-bold text-xs text-purple-700 uppercase">Yape Total:</h3>
                <p className="text-2xl font-extrabold text-purple-900 mt-1">{formatPEN(metrics.saldoDisponibleYapeCents)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CONFIG" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="font-extrabold text-lg mb-4">Configurar Evento</h2>
            <input type="text" value={eventConfig.name} onChange={(e) => setEventConfig({ ...eventConfig, name: e.target.value })} className="w-full p-3 border rounded mb-2 font-bold" />
            <input type="text" value={eventConfig.address} onChange={(e) => setEventConfig({ ...eventConfig, address: e.target.value })} className="w-full p-3 border rounded" placeholder="Lugar" />
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