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
  Printer,
  Download,
  Terminal,
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
  const [copiedStep, setCopiedStep] = useState(null);

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

  const [newBarItemName, setNewBarItemName] = useState("");
  const [newBarItemPriceSoles, setNewBarItemPriceSoles] = useState("");

  // ==========================================================================
  // 4. CÁLCULOS EN TIEMPO REAL
  // ==========================================================================
  const metrics = useMemo(() => {
    const totalCapacity = tickets.length;
    const disponibles = tickets.filter((t) => t.assignmentStatus === "DISPONIBLE").length;
    const reservadosSinPago = tickets.filter(
      (t) => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO"
    ).length;
    const pagadosCount = tickets.filter((t) => t.paymentStatus === "PAGADO").length;
    const entregadosCount = tickets.filter((t) => t.deliveryStatus === "ENTREGADO").length;
    const pagadosPendientesEntrega = tickets.filter(
      (t) => t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE"
    ).length;

    const cobradoTicketsCents = tickets.reduce((acc, t) => acc + (t.paidCents || 0), 0);
    const faltaCobrarSeparadosCents = reservadosSinPago * eventConfig.unitPriceCents;
    const ingresosBarraCents = barItems.reduce((acc, item) => acc + (item.totalRevenueCents || 0), 0);

    const entradasEfectivoCajaCents = payments
      .filter((p) => p.destination === "EFECTIVO_CAJA")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const entradasYapeCents = payments
      .filter((p) => p.destination === "YAPE_EVENTO")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const faltaRendirVendedoresCents = sellers.reduce(
      (acc, s) => acc + Math.max(0, s.cashInHandCents - s.settledCents), 0
    );

    const salidasEfectivoCajaCents = expenses
      .filter((e) => e.payOrigin === "EFECTIVO_CAJA")
      .reduce((acc, e) => acc + e.amountCents, 0);

    const salidasYapeCents = expenses
      .filter((e) => e.payOrigin === "YAPE_EVENTO")
      .reduce((acc, e) => acc + e.amountCents, 0);

    const gastosPorPagarCents = expenses
      .filter((e) => e.payOrigin === "POR_PAGAR")
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
      totalCapacity,
      disponibles,
      reservadosSinPago,
      pagadosCount,
      entregadosCount,
      pagadosPendientesEntrega,
      cobradoTicketsCents,
      faltaCobrarSeparadosCents,
      ingresosBarraCents,
      ingresosTotalesEventoCents,
      entradasEfectivoCajaCents,
      salidasEfectivoCajaCents,
      efectivoDisponibleCajaCents,
      saldoDisponibleYapeCents,
      faltaRendirVendedoresCents,
      gastosPorPagarCents,
      gastosTotalesCents,
      diferenciaCajaCents,
      platosQuedanFisicamente,
      gananciaNetaActualCents,
    };
  }, [
    tickets, barItems, payments, expenses, sellers,
    pollosRecibidos, fondoInicialCajaCents, conteoFisicoRealCents, eventConfig,
  ]);

  // ==========================================================================
  // 5. ACCIONES OPERATIVAS
  // ==========================================================================
  const handleRegistrarTicket = () => {
    const nums = ticketNumInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 250);

    const uniqueNums = Array.from(new Set(nums));
    if (uniqueNums.length === 0) {
      notify("Ingresa un número de ticket válido del 1 al 250.", "error");
      return;
    }

    const ocupados = tickets.filter(
      (t) => uniqueNums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE" &&
        !(t.assignmentStatus === "RESERVADO" && quickPayMode !== "SOLO_SEPARAR")
    );

    if (ocupados.length > 0) {
      notify(`El ticket N.º ${ocupados[0].code} ya está registrado para ${ocupados[0].buyerName}.`, "error");
      return;
    }

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
        deliveredBy: !isSeparar && deliverImmediately ? "Venta Directa" : t.deliveredBy,
      };
    });

    let nextPayments = [...payments];
    let nextSellers = [...sellers];
    let nextConteo = conteoFisicoRealCents;

    if (!isSeparar) {
      const dest = quickPayMode === "EFECTIVO_CAJA"
          ? "EFECTIVO_CAJA"
          : quickPayMode === "YAPE"
          ? "YAPE_EVENTO"
          : "VENDEDOR";

      nextPayments = [
        {
          id: `PAY-${Date.now()}`,
          description: `Ticket(s) N.º ${uniqueNums.map((n) => String(n).padStart(3, "0")).join(", ")} (${buyerNameInput.trim() || "Cliente"})`,
          amountCents: totalCobrarCents,
          destination: dest,
          time: nowTime,
        },
        ...payments,
      ];

      if (dest === "EFECTIVO_CAJA") {
        nextConteo += totalCobrarCents;
      } else if (dest === "VENDEDOR") {
        nextSellers = sellers.map((s) =>
          s.name === sellerNameInput ? { ...s, cashInHandCents: s.cashInHandCents + totalCobrarCents } : s
        );
      }
    }

    setTickets(nextTickets);
    setPayments(nextPayments);
    setSellers(nextSellers);
    setConteoFisicoRealCents(nextConteo);

    saveToCloud({
      tickets: nextTickets,
      payments: nextPayments,
      sellers: nextSellers,
      conteoFisicoRealCents: nextConteo,
    });

    const nextFree = nextTickets.find((t) => t.assignmentStatus === "DISPONIBLE");
    if (nextFree) setTicketNumInput(String(nextFree.num));
    setBuyerNameInput("");
    setBuyerPhoneInput("");

    notify(
      isSeparar
        ? `Ticket(s) separado(s). Falta pagar ${formatPEN(totalCobrarCents)}.`
        : `¡Venta registrada! +${formatPEN(totalCobrarCents)} (${quickPayMode}).`,
      "success"
    );
  };

  const handleCobrarTicketSeparado = (ticketNum, metodo = "EFECTIVO_CAJA") => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const monto = target.agreedPriceCents;

    const nextTickets = tickets.map((t) =>
      t.num === ticketNum
        ? {
            ...t,
            assignmentStatus: "CONFIRMADO",
            paymentStatus: "PAGADO",
            paidCents: monto,
            paymentMethod: metodo,
          }
        : t
    );

    const nextPayments = [
      {
        id: `PAY-${Date.now()}`,
        description: `Cobro Ticket N.º ${target.code} (${target.buyerName})`,
        amountCents: monto,
        destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA",
        time: nowTime,
      },
      ...payments,
    ];

    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + monto : conteoFisicoRealCents;

    setTickets(nextTickets);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);

    if (inspectedTicket && inspectedTicket.num === ticketNum) {
      setInspectedTicket({ ...inspectedTicket, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto });
    }

    saveToCloud({ tickets: nextTickets, payments: nextPayments, conteoFisicoRealCents: nextConteo });

    notify(`Ticket N.º ${target.code} cobrado (${formatPEN(monto)} en ${metodo === "YAPE" ? "Yape" : "Efectivo"}).`, "success");
  };

  const handleEntregarPlato = (ticketNum) => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;

    if (target.deliveryStatus === "ENTREGADO") {
      notify(`ALERTA: El ticket N.º ${target.code} YA FUE ENTREGADO a las ${target.deliveredAt}.`, "error");
      return;
    }
    if (target.paymentStatus !== "PAGADO") {
      notify(`El ticket N.º ${target.code} aún FALTA PAGAR (S/ 15.00). Cóbralo primero con el botón de al lado.`, "warning");
      return;
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

    const nextTickets = tickets.map((t) =>
      t.num === ticketNum
        ? { ...t, deliveryStatus: "ENTREGADO", deliveredAt: nowTime, deliveredBy: "Despacho" }
        : t
    );

    setTickets(nextTickets);
    saveToCloud({ tickets: nextTickets });
    notify(`¡Plato entregado! Ticket N.º ${target.code} (${target.buyerName}) marcado como ENTREGADO.`, "success");
  };

  const handleVenderProductoBarra = (itemId, metodo = "EFECTIVO_CAJA") => {
    const target = barItems.find((i) => i.id === itemId);
    if (!target) return;
    if (target.stock <= 0) {
      notify(`No queda stock registrado de ${target.name}. Registra una compra en la pestaña «Fiesta y Gastos».`, "warning");
      return;
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

    const nextBar = barItems.map((i) =>
      i.id === itemId
        ? { ...i, stock: i.stock - 1, soldQty: i.soldQty + 1, totalRevenueCents: i.totalRevenueCents + i.unitPriceCents }
        : i
    );

    const nextPayments = [
      {
        id: `BARPAY-${Date.now()}`,
        description: `Venta Barra: 1x ${target.name}`,
        amountCents: target.unitPriceCents,
        destination: metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA",
        time: nowTime,
      },
      ...payments,
    ];

    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + target.unitPriceCents : conteoFisicoRealCents;

    setBarItems(nextBar);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);

    saveToCloud({ barItems: nextBar, payments: nextPayments, conteoFisicoRealCents: nextConteo });

    notify(`Vendido 1 ${target.name} (+${formatPEN(target.unitPriceCents)} en ${metodo === "YAPE" ? "Yape" : "Caja"}).`, "success");
  };

  const handleRegistrarCompraOGastoConCaja = () => {
    const amountCents = Math.round((parseFloat(expenseAmountSoles) || 0) * 100);
    if (amountCents <= 0) {
      notify("Ingresa un monto válido en soles.", "error");
      return;
    }

    if (expensePayOrigin === "EFECTIVO_CAJA" && amountCents > metrics.efectivoDisponibleCajaCents) {
      notify(`Atención: En Caja solo hay ${formatPEN(metrics.efectivoDisponibleCajaCents)} en efectivo disponible.`, "warning");
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    let finalConcept = expenseConcept.trim();
    let nextBar = [...barItems];

    if (expenseType === "COMPRA_BARRA") {
      const targetBar = barItems.find((b) => b.id === selectedBarProductId);
      const unitsToAdd = parseInt(addedBarUnits, 10) || 0;
      finalConcept = finalConcept || `Compra Barra: +${unitsToAdd} und. de ${targetBar ? targetBar.name : "Producto"}`;
      if (unitsToAdd > 0) {
        nextBar = barItems.map((b) =>
          b.id === selectedBarProductId ? { ...b, stock: b.stock + unitsToAdd } : b
        );
      }
    } else if (expenseType === "PAGO_POLLOS") {
      finalConcept = finalConcept || "Pago a proveedor de pollos preparados";
    } else {
      finalConcept = finalConcept || "Gasto de Fiesta / DJ / Local";
    }

    const newExp = {
      id: `EXP-${Date.now()}`,
      type: expenseType,
      concept: finalConcept,
      amountCents,
      payOrigin: expensePayOrigin,
      time: nowTime,
    };

    const nextExpenses = [newExp, ...expenses];
    const nextConteo = expensePayOrigin === "EFECTIVO_CAJA" ? conteoFisicoRealCents - amountCents : conteoFisicoRealCents;

    setExpenses(nextExpenses);
    setBarItems(nextBar);
    setConteoFisicoRealCents(nextConteo);
    setExpenseConcept("");
    setExpenseAmountSoles("");

    saveToCloud({ expenses: nextExpenses, barItems: nextBar, conteoFisicoRealCents: nextConteo });

    notify(
      `Registrado: ${finalConcept} por ${formatPEN(amountCents)} (${
        expensePayOrigin === "EFECTIVO_CAJA" ? "Descontado de Caja"
        : expensePayOrigin === "YAPE_EVENTO" ? "Descontado de Yape"
        : "Anotado por pagar"
      }).`,
      "success"
    );
  };

  const handleCrearNuevoEvento = async () => {
    if (!newEventTitleInput.trim()) {
      notify("Escribe un nombre para la nueva actividad.", "error");
      return;
    }
    const slug = `pollada-${Date.now()}`;
    const prefix = `P${eventsList.length + 1}`;
    const newConfig = { ...eventConfig, prefix, name: newEventTitleInput.trim(), capacity: 250 };
    const freshTickets = createInitial250Tickets(prefix);
    const freshBar = createInitialBarItems();

    setCurrentEventId(slug);
    setEventConfig(newConfig);
    setTickets(freshTickets);
    setBarItems(freshBar);
    setPayments([]);
    setExpenses([]);
    setPollosRecibidos(250);
    setFondoInicialCajaCents(10000);
    setConteoFisicoRealCents(10000);
    setNewEventNameModal(false);
    setNewEventTitleInput("");

    if (user && db) {
      const eventDocRef = doc(db, "artifacts", appId, "public", "data", "pollada_events", slug);
      await setDoc(eventDocRef, {
        eventConfig: newConfig,
        tickets: JSON.stringify(freshTickets),
        barItems: JSON.stringify(freshBar),
        payments: JSON.stringify([]),
        expenses: JSON.stringify([]),
        sellers: JSON.stringify(sellers),
        pollosRecibidos: 250,
        fondoInicialCajaCents: 10000,
        conteoFisicoRealCents: 10000,
        updatedAt: Date.now(),
      });
    }
    notify(`Nueva actividad «${newConfig.name}» creada con 250 tickets limpios.`, "success");
  };

  const generateCSVText = () => {
    const header = "Nro_Ticket,Comprador,Celular,Vendedor,Estado_Reserva,Estado_Pago,Monto_Pagado_Soles,Medio_Pago,Estado_Entrega,Hora_Entrega\n";
    const rows = tickets.map(
      (t) =>
        `${t.code},"${t.buyerName || "Disponible"}","${t.buyerPhone || ""}","${t.sellerName}",${t.assignmentStatus},${t.paymentStatus},${( (t.paidCents || 0) / 100 ).toFixed(2)},${t.paymentMethod || "-"},${t.deliveryStatus},"${t.deliveredAt || "-"}"`
    ).join("\n");
    return header + rows;
  };

  const handleDescargarCSV = () => {
    try {
      const csvContent = "\uFEFF" + generateCSVText();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Reporte_250_Tickets_${eventConfig.name.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportModal(true);
      notify("Exportación de los 250 tickets lista. También puedes copiar la tabla aquí mismo.", "success");
    } catch (e) {
      setShowExportModal(true);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
    notify("Copiado al portapapeles.", "success");
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (gridFilterStatus === "DISPONIBLE" && t.assignmentStatus !== "DISPONIBLE") return false;
      if (gridFilterStatus === "FALTA_PAGAR" && !(t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO")) return false;
      if (gridFilterStatus === "PAGADO" && t.paymentStatus !== "PAGADO") return false;
      if (gridFilterStatus === "FALTA_RECOGER" && !(t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE")) return false;
      if (gridFilterStatus === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO") return false;

      if (searchTicketQuery.trim() !== "" && !t.code.includes(searchTicketQuery.trim()) && !(t.buyerName || "").toLowerCase().includes(searchTicketQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tickets, gridFilterStatus, searchTicketQuery]);

  const deliveryList = useMemo(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) {
      return tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE" && t.deliveryStatus === "PENDIENTE").slice(0, 8);
    }
    return tickets.filter((t) =>
      t.code.toLowerCase().includes(q) ||
      (t.buyerName && t.buyerName.toLowerCase().includes(q)) ||
      t.qrToken.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [tickets, deliveryQuery]);

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-stone-900 pb-24 font-sans">
      <header className="bg-gradient-to-r from-orange-700 via-orange-600 to-red-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl">
              <Utensils className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-900/90 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  <Cloud className="w-3 h-3" />
                  {syncStatus === "EN_VIVO" ? "Firebase Sincronizado en Vivo" : "Conectando..."}
                </span>
                <span className="text-[11px] text-orange-100">
                  250 Tickets (S/ 15) • Costo S/ 9
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                {eventConfig.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-black/25 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-orange-100 mr-1.5">Actividad:</span>
              <select
                value={currentEventId}
                onChange={(e) => setCurrentEventId(e.target.value)}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id} className="text-stone-900">
                    {ev.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setNewEventNameModal(true)}
                title="Crear nueva actividad / pollada"
                className="ml-2 bg-white/20 hover:bg-white/30 p-1 rounded-lg"
              >
                <FolderPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <button
              onClick={handleDescargarCSV}
              className="flex items-center gap-1.5 text-xs font-extrabold bg-white text-orange-900 hover:bg-orange-50 px-3 py-1.5 rounded-xl shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar 250 Tickets
            </button>
          </div>
        </div>

        <div className="bg-orange-950/40 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "FIESTA", label: "Fiesta, Barra y Gastos", icon: Music },
              { id: "VENDEDORES", label: "Rendición Vendedores", icon: Users },
              { id: "RECORDATORIOS", label: "WhatsApp", icon: MessageCircle },
              { id: "CONFIG", label: "Datos del Evento", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    active ? "bg-white text-orange-900 shadow-sm" : "text-orange-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-6xl mx-auto px-4 mt-3">
          <div
            className={`p-3 rounded-xl border flex justify-between items-center shadow-sm ${
              toast.type === "error" ? "bg-red-50 border-red-300 text-red-900"
                : toast.type === "warning" ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>{toast.msg}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-xs font-extrabold underline ml-4">OK</button>
          </div>
        </div>
      )}

      {newEventNameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-stone-900">Crear Nueva Actividad</h3>
            <p className="text-xs text-stone-600">Guarda la actual y abre un nuevo padrón de 250 tickets.</p>
            <input
              type="text"
              placeholder="Ej. Pollada Pro Salud Noviembre"
              value={newEventTitleInput}
              onChange={(e) => setNewEventTitleInput(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-xl text-sm font-bold"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewEventNameModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200">Cancelar</button>
              <button onClick={handleCrearNuevoEvento} className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white">Crear Actividad</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900">Exportación Lista</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded-lg bg-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copyToClipboard(generateCSVText(), "CSV_ALL")} className="flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl">
                <Copy className="w-4 h-4" /> Copiar los 250 Tickets para Excel
              </button>
            </div>
            <div className="overflow-y-auto border rounded-xl p-3 bg-stone-50 font-mono text-[11px] flex-1">
              <pre className="whitespace-pre-wrap">{generateCSVText()}</pre>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {activeTab === "VENDER" && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">1. Vender o Separar Pollada</h2>
                  <p className="text-xs text-stone-500">Quedan <strong>{metrics.disponibles}</strong> tickets libres de 250.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700">N.º Ticket (1–250)</label>
                  <input type="text" value={ticketNumInput} onChange={(e) => setTicketNumInput(e.target.value)} className="w-full mt-1 p-2.5 border-2 border-orange-400 rounded-xl font-extrabold text-base text-center" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700">Comprador</label>
                  <input type="text" value={buyerNameInput} onChange={(e) => setBuyerNameInput(e.target.value)} className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl text-sm font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700">Celular (Opcional)</label>
                  <input type="tel" value={buyerPhoneInput} onChange={(e) => setBuyerPhoneInput(e.target.value)} className="w-full mt-1 p-2 border border-stone-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700">Responsable</label>
                  <select value={sellerNameInput} onChange={(e) => setSellerNameInput(e.target.value)} className="w-full mt-1 p-2 border border-stone-300 rounded-xl bg-white text-sm font-semibold">
                    {sellers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">¿Cómo paga?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[{ id: "EFECTIVO_CAJA", label: "Efectivo Caja" }, { id: "YAPE", label: "Yape / Plin" }, { id: "EFECTIVO_VENDEDOR", label: "Efectivo Vendedor" }, { id: "SOLO_SEPARAR", label: "Solo Separar" }].map((m) => (
                    <button key={m.id} onClick={() => setQuickPayMode(m.id)} className={`py-2.5 px-2 rounded-xl text-xs font-extrabold border transition ${quickPayMode === m.id ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {quickPayMode === "EFECTIVO_CAJA" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700">Billete de S/:</span>
                    <input type="number" value={cashBilleteSoles} onChange={(e) => setCashBilleteSoles(e.target.value)} className="w-20 p-1.5 border border-stone-300 rounded-lg font-extrabold text-sm text-center" />
                  </div>
                  <div>Vuelto: <strong className="text-sm text-orange-800">{formatPEN(Math.max(0, Math.round((parseFloat(cashBilleteSoles) || 0) * 100) - ticketNumInput.split(",").filter((x) => x.trim() !== "").length * eventConfig.unitPriceCents))}</strong></div>
                </div>
              )}

              {quickPayMode !== "SOLO_SEPARAR" && (
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input type="checkbox" checked={deliverImmediately} onChange={(e) => setDeliverImmediately(e.target.checked)} />
                  <span>Se lleva el plato ahora mismo (Marcar ENTREGADO)</span>
                </label>
              )}

              <button onClick={handleRegistrarTicket} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-xl shadow text-sm">
                {quickPayMode === "SOLO_SEPARAR" ? "Separar Ticket (Falta Pagar)" : "Guardar Venta (S/ 15.00)"}
              </button>
            </div>

            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-orange-600" /> 2. Venta Rápida Barra</h2>
                <div className="space-y-2.5">
                  {barItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex justify-between items-center gap-2">
                      <div>
                        <div className="font-extrabold text-sm text-stone-900">{item.name} — {formatPEN(item.unitPriceCents)}</div>
                        <div className="text-[11px] text-stone-600">Stock: <strong className={item.stock > 0 ? "text-emerald-700" : "text-red-600"}>{item.stock} und.</strong></div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleVenderProductoBarra(item.id, "EFECTIVO_CAJA")} className="bg-emerald-700 text-white text-xs font-extrabold px-3 py-2 rounded-lg">+1 Efectivo</button>
                        <button onClick={() => handleVenderProductoBarra(item.id, "YAPE")} className="bg-purple-700 text-white text-xs font-extrabold px-2.5 py-2 rounded-lg">+1 Yape</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setActiveTab("FIESTA")} className="w-full py-2.5 px-3 rounded-xl border border-orange-300 bg-orange-50 text-orange-900 text-xs font-extrabold hover:bg-orange-100">
                Ir a Fiesta y Gastos →
              </button>
            </div>
          </div>
        )}

        {activeTab === "TICKETS" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="font-extrabold text-lg text-stone-900">Padrón de 250 Tickets</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Buscar..." value={searchTicketQuery} onChange={(e) => setSearchTicketQuery(e.target.value)} className="text-xs border border-stone-300 rounded-xl px-3 py-2" />
                  <select value={gridFilterStatus} onChange={(e) => setGridFilterStatus(e.target.value)} className="text-xs font-bold border border-stone-300 rounded-xl px-3 py-2 bg-stone-50">
                    <option value="TODOS">Todos (250)</option>
                    <option value="DISPONIBLE">Libres ({metrics.disponibles})</option>
                    <option value="FALTA_PAGAR">Falta Pagar ({metrics.reservadosSinPago})</option>
                    <option value="PAGADO">Pagados ({metrics.pagadosCount})</option>
                    <option value="ENTREGADO">Entregados ({metrics.entregadosCount})</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[440px] overflow-y-auto p-1">
                {filteredTickets.map((t) => {
                  let style = "bg-stone-50 border-stone-300 text-stone-700";
                  let statusLabel = "LIBRE";
                  if (t.deliveryStatus === "ENTREGADO") { style = "bg-stone-900 border-stone-900 text-white"; statusLabel = "ENTREGADO ✓"; }
                  else if (t.paymentStatus === "PAGADO") { style = "bg-emerald-100 border-emerald-600 text-emerald-950"; statusLabel = "PAGADO $"; }
                  else if (t.assignmentStatus === "RESERVADO") { style = "bg-amber-100 border-amber-500 text-amber-950"; statusLabel = "DEBE ⏳"; }

                  return (
                    <button key={t.num} onClick={() => setInspectedTicket(t)} className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition hover:scale-105 ${style}`}>
                      <span className="font-extrabold text-xs">{t.code}</span>
                      <span className="text-[9px] font-bold mt-0.5">{statusLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {inspectedTicket && (
              <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-orange-500 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-orange-700">Ticket N.º {inspectedTicket.code}</span>
                    <h3 className="text-lg font-extrabold">{inspectedTicket.buyerName || "Disponible"}</h3>
                  </div>
                  <button onClick={() => setInspectedTicket(null)} className="text-xs font-bold bg-stone-200 px-3 py-1.5 rounded-lg">Cerrar</button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 items-center">
                  <div className="p-3 bg-stone-50 rounded-xl border flex flex-col items-center">
                    <QrCode className="w-20 h-20 text-stone-900" />
                    <code className="text-[11px] font-mono mt-2">{inspectedTicket.qrToken}</code>
                  </div>
                  <div className="sm:col-span-2 space-y-3 text-xs sm:text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Pago: <strong className="text-emerald-700">{inspectedTicket.paymentStatus}</strong></div>
                      <div>Entrega: <strong>{inspectedTicket.deliveryStatus}</strong></div>
                      <div>Vendedor: <strong>{inspectedTicket.sellerName}</strong></div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {inspectedTicket.assignmentStatus === "DISPONIBLE" && (
                        <button onClick={() => { setTicketNumInput(String(inspectedTicket.num)); setActiveTab("VENDER"); }} className="bg-orange-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Vender Ticket</button>
                      )}
                      {inspectedTicket.assignmentStatus !== "DISPONIBLE" && inspectedTicket.paymentStatus !== "PAGADO" && (
                        <>
                          <button onClick={() => handleCobrarTicketSeparado(inspectedTicket.num, "EFECTIVO_CAJA")} className="bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl">Cobrar Efectivo</button>
                          <button onClick={() => handleCobrarTicketSeparado(inspectedTicket.num, "YAPE")} className="bg-purple-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl">Cobrar Yape</button>
                        </>
                      )}
                      {inspectedTicket.paymentStatus === "PAGADO" && inspectedTicket.deliveryStatus === "PENDIENTE" && (
                        <button onClick={() => handleEntregarPlato(inspectedTicket.num)} className="bg-stone-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Entregar Plato</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "ENTREGAR" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">Despacho de Platos</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input type="text" value={deliveryQuery} onChange={(e) => setDeliveryQuery(e.target.value)} placeholder="Busca por N.º o nombre..." className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-bold" />
            </div>
            <div className="space-y-2.5">
              {deliveryList.map((t) => (
                <div key={t.num} className={`p-4 rounded-xl border-2 flex flex-wrap justify-between items-center gap-3 ${t.deliveryStatus === "ENTREGADO" ? "bg-stone-100 border-stone-300" : t.paymentStatus === "PAGADO" ? "bg-emerald-50 border-emerald-500" : "bg-amber-50 border-amber-400"}`}>
                  <div>
                    <span className="font-extrabold text-base">Ticket N.º {t.code}</span>
                    <p className="text-sm font-bold text-stone-800">{t.buyerName || "Sin nombre"}</p>
                  </div>
                  <div className="flex gap-2">
                    {t.paymentStatus !== "PAGADO" && (
                      <button onClick={() => handleCobrarTicketSeparado(t.num, "EFECTIVO_CAJA")} className="bg-amber-600 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl">Cobrar S/ 15</button>
                    )}
                    <button onClick={() => handleEntregarPlato(t.num)} disabled={t.deliveryStatus === "ENTREGADO"} className={`text-xs font-extrabold px-4 py-2.5 rounded-xl ${t.deliveryStatus === "ENTREGADO" ? "bg-stone-300 text-stone-600" : "bg-emerald-700 text-white"}`}>
                      {t.deliveryStatus === "ENTREGADO" ? "Entregado" : "Entregar Plato"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "FIESTA" && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <h2 className="text-lg font-extrabold text-stone-900">Pagar Compras o Gastos</h2>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "COMPRA_BARRA", label: "Barra" }, { id: "GASTO_FIESTA", label: "DJ/Fiesta" }, { id: "PAGO_POLLOS", label: "Pollos" }].map((t) => (
                  <button key={t.id} onClick={() => setExpenseType(t.id)} className={`p-2.5 rounded-xl text-xs font-extrabold border ${expenseType === t.id ? "bg-orange-600 text-white border-orange-600" : "bg-stone-50 text-stone-700 border-stone-300"}`}>{t.label}</button>
                ))}
              </div>
              {expenseType === "COMPRA_BARRA" && (
                <div className="grid grid-cols-2 gap-3">
                  <select value={selectedBarProductId} onChange={(e) => setSelectedBarProductId(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold">
                    {barItems.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <input type="number" value={addedBarUnits} onChange={(e) => setAddedBarUnits(e.target.value)} placeholder="Cantidad" className="p-2 border rounded-lg text-xs font-extrabold" />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="text" value={expenseConcept} onChange={(e) => setExpenseConcept(e.target.value)} placeholder="Concepto" className="p-2.5 border rounded-xl text-sm" />
                <input type="number" value={expenseAmountSoles} onChange={(e) => setExpenseAmountSoles(e.target.value)} placeholder="Monto S/" className="p-2.5 border rounded-xl text-sm font-extrabold" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "EFECTIVO_CAJA", label: "Caja" }, { id: "YAPE_EVENTO", label: "Yape" }, { id: "POR_PAGAR", label: "Crédito" }].map((o) => (
                  <button key={o.id} onClick={() => setExpensePayOrigin(o.id)} className={`p-2 rounded-xl text-xs font-bold border ${expensePayOrigin === o.id ? "bg-stone-900 text-white" : "bg-stone-50"}`}>{o.label}</button>
                ))}
              </div>
              <button onClick={handleRegistrarCompraOGastoConCaja} className="w-full bg-orange-600 text-white font-extrabold py-3 rounded-xl text-sm">Registrar Salida</button>
            </div>
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
                <h3 className="font-extrabold text-sm uppercase">Gastos Hechos ({formatPEN(metrics.gastosTotalesCents)})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expenses.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center text-xs">
                      <div><div className="font-bold">{e.concept}</div><div className="text-[11px] text-stone-500">{e.payOrigin}</div></div>
                      <strong className="text-red-700 text-sm">- {formatPEN(e.amountCents)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CAJA" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-5">
            <h2 className="text-lg font-extrabold text-stone-900">Control de Caja y Yape</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-stone-50 border space-y-2 text-sm">
                <h3 className="font-extrabold text-xs uppercase">Efectivo Físico</h3>
                <div className="flex justify-between"><span>Fondo inicial:</span><strong>{formatPEN(fondoInicialCajaCents)}</strong></div>
                <div className="flex justify-between"><span>+ Entradas Caja:</span><strong className="text-emerald-700">+ {formatPEN(metrics.entradasEfectivoCajaCents)}</strong></div>
                <div className="flex justify-between"><span>− Salidas Caja:</span><strong className="text-red-600">- {formatPEN(metrics.salidasEfectivoCajaCents)}</strong></div>
                <div className="flex justify-between border-t pt-2 font-extrabold"><span>DEBE haber:</span><span className="text-orange-800">{formatPEN(metrics.efectivoDisponibleCajaCents)}</span></div>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 border space-y-3">
                <h3 className="font-extrabold text-xs uppercase">Conteo Real</h3>
                <input type="number" value={(conteoFisicoRealCents / 100).toFixed(2)} onChange={(e) => { setConteoFisicoRealCents(Math.round((parseFloat(e.target.value) || 0) * 100)); }} className="w-full p-2.5 border rounded-xl font-extrabold text-base bg-white" />
                <div className="flex justify-between text-sm font-extrabold"><span>Diferencia:</span><span className={metrics.diferenciaCajaCents === 0 ? "text-emerald-700" : "text-red-600"}>{formatPEN(metrics.diferenciaCajaCents)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-purple-900"><span>Yape / Plin:</span><span>{formatPEN(metrics.saldoDisponibleYapeCents)}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "RESUMEN" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200">
              <h2 className="font-extrabold text-lg text-stone-900 mb-4">Resumen General — {eventConfig.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-4 rounded-2xl border"><span className="text-xs font-bold text-stone-500 uppercase">Libres</span><p className="text-2xl font-extrabold">{metrics.disponibles}</p></div>
                <div className="p-4 rounded-2xl border"><span className="text-xs font-bold text-stone-500 uppercase">Pagados</span><p className="text-2xl font-extrabold text-emerald-700">{metrics.pagadosCount}</p></div>
                <div className="p-4 rounded-2xl border"><span className="text-xs font-bold text-stone-500 uppercase">Entregados</span><p className="text-2xl font-extrabold text-orange-700">{metrics.entregadosCount}</p></div>
                <div className="p-4 rounded-2xl border"><span className="text-xs font-bold text-stone-500 uppercase">Barra</span><p className="text-2xl font-extrabold text-blue-700">{formatPEN(metrics.ingresosBarraCents)}</p></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border space-y-2 text-sm">
                  <h3 className="font-extrabold text-sm uppercase border-b pb-2">1. Dinero Actual</h3>
                  <div className="flex justify-between"><span>Efectivo Caja:</span><strong>{formatPEN(metrics.efectivoDisponibleCajaCents - fondoInicialCajaCents)}</strong></div>
                  <div className="flex justify-between"><span>Yape:</span><strong className="text-purple-800">{formatPEN(metrics.saldoDisponibleYapeCents)}</strong></div>
                </div>
                <div className="p-5 rounded-2xl border space-y-2 text-sm">
                  <h3 className="font-extrabold text-sm uppercase text-emerald-900 border-b pb-2">2. Ganancia Neta</h3>
                  <div className="flex justify-between"><span>+ Polladas:</span><strong className="text-emerald-700">+ {formatPEN(metrics.cobradoTicketsCents)}</strong></div>
                  <div className="flex justify-between"><span>+ Barra:</span><strong className="text-blue-700">+ {formatPEN(metrics.ingresosBarraCents)}</strong></div>
                  <div className="flex justify-between"><span>− Gastos:</span><strong className="text-red-600">- {formatPEN(metrics.gastosTotalesCents)}</strong></div>
                  <div className="flex justify-between border-t pt-2 font-extrabold"><span>Ganancia:</span><span className={metrics.gananciaNetaActualCents >= 0 ? "text-emerald-700" : "text-red-600"}>{formatPEN(metrics.gananciaNetaActualCents)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "VENDEDORES" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">Rendición de Vendedores</h2>
            <div className="space-y-2.5">
              {sellers.map((s) => {
                const pendiente = Math.max(0, s.cashInHandCents - s.settledCents);
                return (
                  <div key={s.id} className="p-4 rounded-xl border bg-stone-50 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-extrabold">{s.name}</div>
                      <div className="text-xs text-stone-600">Cobrado: {formatPEN(s.cashInHandCents)} | <strong className="text-orange-800">Falta: {formatPEN(pendiente)}</strong></div>
                    </div>
                    {pendiente > 0 && (
                      <button onClick={() => {
                        const nextSellers = sellers.map((item) => item.id === s.id ? { ...item, settledCents: item.cashInHandCents } : item);
                        const nextPayments = [{ id: `REND-${Date.now()}`, description: `Rendición de ${s.name}`, amountCents: pendiente, destination: "EFECTIVO_CAJA", time: new Date().toLocaleTimeString("es-PE") }, ...payments];
                        const nextConteo = conteoFisicoRealCents + pendiente;
                        setSellers(nextSellers);
                        setPayments(nextPayments);
                        setConteoFisicoRealCents(nextConteo);
                        saveToCloud({ sellers: nextSellers, payments: nextPayments, conteoFisicoRealCents: nextConteo });
                        notify(`Recibidos ${formatPEN(pendiente)} de ${s.name}.`, "success");
                      }} className="bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Recibir {formatPEN(pendiente)}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "RECORDATORIOS" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">WhatsApp a Compradores</h2>
            <div className="space-y-2">
              {tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE").length === 0 ? <p className="text-xs text-stone-500">Aún no hay tickets.</p> : tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE").map((t) => (
                <div key={t.num} className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center text-xs">
                  <div><strong>Ticket #{t.code} — {t.buyerName}</strong> ({t.paymentStatus})</div>
                  <a href={`https://wa.me/${(t.buyerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${t.buyerName}, tu ticket de ${eventConfig.name} es el N.º ${t.code} (Estado: ${t.paymentStatus}). Código QR: ${t.qrToken}`)}`} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg">Enviar WhatsApp</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "CONFIG" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">Datos del Evento</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <input type="text" value={eventConfig.name} onChange={(e) => { const next = { ...eventConfig, name: e.target.value }; setEventConfig(next); saveToCloud({ eventConfig: next }); }} className="p-2.5 border rounded-xl" placeholder="Nombre" />
              <input type="text" value={eventConfig.address} onChange={(e) => { const next = { ...eventConfig, address: e.target.value }; setEventConfig(next); saveToCloud({ eventConfig: next }); }} className="p-2.5 border rounded-xl" placeholder="Dirección" />
              <input type="number" value={pollosRecibidos} onChange={(e) => { const val = parseInt(e.target.value, 10) || 0; setPollosRecibidos(val); saveToCloud({ pollosRecibidos: val }); }} className="p-2.5 border rounded-xl font-bold" placeholder="Platos" />
              <input type="number" value={(fondoInicialCajaCents / 100).toFixed(2)} onChange={(e) => { const val = Math.round((parseFloat(e.target.value) || 0) * 100); setFondoInicialCajaCents(val); saveToCloud({ fondoInicialCajaCents: val }); }} className="p-2.5 border rounded-xl font-bold" placeholder="Fondo Inicial" />
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-300 shadow-lg z-30">
        <div className="max-w-6xl mx-auto grid grid-cols-5">
          {[
            { id: "VENDER", label: "Vender", icon: Ticket },
            { id: "TICKETS", label: "Tickets", icon: QrCode },
            { id: "ENTREGAR", label: "Entregar", icon: Utensils },
            { id: "FIESTA", label: "Fiesta", icon: Music },
            { id: "RESUMEN", label: "Caja", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2.5 text-xs font-extrabold transition ${
                  isActive ? "text-orange-700 bg-orange-50 border-t-4 border-orange-600" : "text-stone-600"
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}