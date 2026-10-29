"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  type Firestore,
} from "firebase/firestore";
import {
  Utensils,
  Ticket,
  QrCode,
  Wallet,
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
  ShoppingBag,
  Plus,
  RotateCcw,
} from "lucide-react";

type AssignmentStatus = "DISPONIBLE" | "RESERVADO" | "CONFIRMADO";
type PaymentStatus = "PENDIENTE" | "PAGADO";
type DeliveryStatus = "PENDIENTE" | "ENTREGADO";
type QuickPayMode = "EFECTIVO_CAJA" | "YAPE" | "EFECTIVO_VENDEDOR" | "SOLO_SEPARAR";
type MoneyDestination = "EFECTIVO_CAJA" | "YAPE_EVENTO" | "VENDEDOR";
type ExpenseOrigin = "EFECTIVO_CAJA" | "YAPE_EVENTO" | "POR_PAGAR";
type ExpenseCategory = "COMPRA_BARRA" | "GASTO_FIESTA" | "PAGO_POLLOS";
type TabId =
  | "VENDER"
  | "TICKETS"
  | "ENTREGAR"
  | "FIESTA"
  | "CAJA"
  | "RESUMEN"
  | "VENDEDORES"
  | "RECORDATORIOS"
  | "CONFIG";

interface TicketItem {
  id: string;
  num: number;
  code: string;
  qrToken: string;
  agreedPriceCents: number;
  historicalCostCents: number;
  presentation: string;
  assignmentStatus: AssignmentStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paidCents: number;
  paymentMethod: string;
  sellerName: string;
  buyerName: string;
  buyerPhone: string;
  deliveredAt: string | null;
  deliveredBy: string | null;
}

interface BarItem {
  id: string;
  name: string;
  unitPriceCents: number;
  stock: number;
  soldQty: number;
  totalRevenueCents: number;
}

interface PaymentRecord {
  id: string;
  description: string;
  amountCents: number;
  destination: MoneyDestination;
  time: string;
}

interface ExpenseRecord {
  id: string;
  type: ExpenseCategory;
  concept: string;
  amountCents: number;
  payOrigin: ExpenseOrigin;
  time: string;
}

interface SellerRecord {
  id: string;
  name: string;
  cashInHandCents: number;
  settledCents: number;
}

interface EventConfig {
  prefix: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  capacity: number;
  unitCostCents: number;
  unitPriceCents: number;
}

interface EventListItem {
  id: string;
  name: string;
}

interface ToastMessage {
  msg: string;
  type: "info" | "success" | "warning" | "error";
  id: number;
}

interface CloudOverrides {
  eventConfig?: EventConfig;
  tickets?: TicketItem[];
  barItems?: BarItem[];
  payments?: PaymentRecord[];
  expenses?: ExpenseRecord[];
  sellers?: SellerRecord[];
  pollosRecibidos?: number;
  fondoInicialCajaCents?: number;
  conteoFisicoRealCents?: number;
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2AOxRnm8WE58Exf2jZ3gnYk_8MeGjZUQ",
  authDomain: "mi-pollada-2026.firebaseapp.com",
  projectId: "mi-pollada-2026",
  storageBucket: "mi-pollada-2026.firebasestorage.app",
  messagingSenderId: "251967541400",
  appId: "1:251967541400:web:d2efc03a656b09975ac0ed",
};

const APP_ID = "mi-pollada-peru";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

try {
  firebaseApp =
    getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  firebaseAuth = getAuth(firebaseApp);
  firestoreDb = getFirestore(firebaseApp);
} catch (error) {
  console.error("Error al inicializar Firebase:", error);
}

const formatPEN = (cents: number): string => {
  const soles = ((cents || 0) / 100).toFixed(2);
  return `S/ ${Number(soles).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const generateEntropyToken = (prefix: string, num: number): string => {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${String(num).padStart(3, "0")}-${randomPart}`;
};

const createInitial250Tickets = (prefix: string = "POL1"): TicketItem[] => {
  return Array.from({ length: 250 }, (_, idx): TicketItem => {
    const num = idx + 1;
    const code = String(num).padStart(3, "0");
    return {
      id: `TKT-${code}`,
      num,
      code,
      qrToken: `${prefix}-${code}-TOKEN`,
      agreedPriceCents: 1500,
      historicalCostCents: 900,
      presentation: "Pollada Completa",
      assignmentStatus: "DISPONIBLE",
      paymentStatus: "PENDIENTE",
      deliveryStatus: "PENDIENTE",
      paidCents: 0,
      paymentMethod: "",
      sellerName: "General / Caja",
      buyerName: "",
      buyerPhone: "",
      deliveredAt: null,
      deliveredBy: null,
    };
  });
};

const createInitialBarItems = (): BarItem[] => [
  { id: "BAR-GASEOSA", name: "Gaseosa", unitPriceCents: 400, stock: 0, soldQty: 0, totalRevenueCents: 0 },
  { id: "BAR-AGUA", name: "Agua Mineral", unitPriceCents: 250, stock: 0, soldQty: 0, totalRevenueCents: 0 },
  { id: "BAR-CIGARRO", name: "Cigarros (Unidad/Cajetilla)", unitPriceCents: 200, stock: 0, soldQty: 0, totalRevenueCents: 0 },
  { id: "BAR-CERVEZA", name: "Bebida / Cerveza", unitPriceCents: 1000, stock: 0, soldQty: 0, totalRevenueCents: 0 },
];

export default function MiPolladaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<"CONECTANDO" | "EN_VIVO" | "LOCAL">("CONECTANDO");
  const [eventsList, setEventsList] = useState<EventListItem[]>([
    { id: "evento-actual", name: "Pollada #1 (250 Tickets)" },
  ]);
  const [currentEventId, setCurrentEventId] = useState<string>("evento-actual");
  const [newEventNameModal, setNewEventNameModal] = useState<boolean>(false);
  const [newEventTitleInput, setNewEventTitleInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<TabId>("VENDER");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const notify = (msg: string, type: "info" | "success" | "warning" | "error" = "info"): void => {
    setToast({ msg, type, id: Date.now() });
  };

  const [eventConfig, setEventConfig] = useState<EventConfig>({
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

  const [tickets, setTickets] = useState<TicketItem[]>(() => createInitial250Tickets("POL1"));
  const [barItems, setBarItems] = useState<BarItem[]>(() => createInitialBarItems());
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([
    { id: "SEL-1", name: "General / Caja", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-2", name: "Vendedor 1", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-3", name: "Vendedor 2", cashInHandCents: 0, settledCents: 0 },
  ]);

  const [pollosRecibidos, setPollosRecibidos] = useState<number>(250);
  const [fondoInicialCajaCents, setFondoInicialCajaCents] = useState<number>(10000);
  const [conteoFisicoRealCents, setConteoFisicoRealCents] = useState<number>(10000);

  // Asignar tokens QR reales solo en el cliente al montar (evita error de prerender con Math.random)
  useEffect(() => {
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        qrToken: generateEntropyToken(eventConfig.prefix, t.num),
      }))
    );
  }, [eventConfig.prefix]);

  useEffect(() => {
    const authInstance = firebaseAuth;
    if (!authInstance) {
      setSyncStatus("LOCAL");
      return;
    }
    const initAuth = async (): Promise<void> => {
      try {
        await signInAnonymously(authInstance);
      } catch (err) {
        console.error("Auth error:", err);
        setSyncStatus("LOCAL");
      }
    };
    void initAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dbInstance = firestoreDb;
    if (!user || !dbInstance) return;

    const eventsColRef = collection(dbInstance, "artifacts", APP_ID, "public", "data", "pollada_events");
    const unsubList = onSnapshot(eventsColRef, (snapshot) => {
      const loadedEvents: EventListItem[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as { eventConfig?: EventConfig };
        loadedEvents.push({ id: docSnap.id, name: raw.eventConfig?.name || docSnap.id });
      });
      if (loadedEvents.length > 0) setEventsList(loadedEvents);
    });

    const eventDocRef = doc(dbInstance, "artifacts", APP_ID, "public", "data", "pollada_events", currentEventId);
    const unsubDoc = onSnapshot(eventDocRef, (docSnap) => {
      setSyncStatus("EN_VIVO");
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
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
        void setDoc(eventDocRef, {
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
        });
      }
    });

    return () => {
      unsubList();
      unsubDoc();
    };
  }, [user, currentEventId]);

  const saveToCloud = async (overrides: CloudOverrides = {}): Promise<void> => {
    const dbInstance = firestoreDb;
    if (!user || !dbInstance) return;

    const payload = {
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

    try {
      const eventDocRef = doc(dbInstance, "artifacts", APP_ID, "public", "data", "pollada_events", currentEventId);
      await setDoc(eventDocRef, payload);
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
    }
  };

  const [ticketNumInput, setTicketNumInput] = useState<string>("1");
  const [buyerNameInput, setBuyerNameInput] = useState<string>("");
  const [buyerPhoneInput, setBuyerPhoneInput] = useState<string>("");
  const [sellerNameInput, setSellerNameInput] = useState<string>("General / Caja");
  const [quickPayMode, setQuickPayMode] = useState<QuickPayMode>("EFECTIVO_CAJA");
  const [cashBilleteSoles, setCashBilleteSoles] = useState<string>("20");
  const [deliverImmediately, setDeliverImmediately] = useState<boolean>(false);

  const [gridFilterStatus, setGridFilterStatus] = useState<string>("TODOS");
  const [searchTicketQuery, setSearchTicketQuery] = useState<string>("");
  const [inspectedTicket, setInspectedTicket] = useState<TicketItem | null>(null);

  const [deliveryQuery, setDeliveryQuery] = useState<string>("");

  const [expenseType, setExpenseType] = useState<ExpenseCategory>("COMPRA_BARRA");
  const [expenseConcept, setExpenseConcept] = useState<string>("");
  const [expenseAmountSoles, setExpenseAmountSoles] = useState<string>("");
  const [expensePayOrigin, setExpensePayOrigin] = useState<ExpenseOrigin>("EFECTIVO_CAJA");
  const [selectedBarProductId, setSelectedBarProductId] = useState<string>("BAR-GASEOSA");
  const [addedBarUnits, setAddedBarUnits] = useState<string>("24");

  const [newBarItemName, setNewBarItemName] = useState<string>("");
  const [newBarItemPriceSoles, setNewBarItemPriceSoles] = useState<string>("");
  const [newSellerName, setNewSellerName] = useState<string>("");

  const metrics = useMemo(() => {
    const disponibles = tickets.filter((t) => t.assignmentStatus === "DISPONIBLE").length;
    const reservadosSinPago = tickets.filter((t) => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO").length;
    const pagadosCount = tickets.filter((t) => t.paymentStatus === "PAGADO").length;
    const entregadosCount = tickets.filter((t) => t.deliveryStatus === "ENTREGADO").length;
    const pagadosPendientesEntrega = tickets.filter((t) => t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE").length;

    const cobradoTicketsCents = tickets.reduce((acc, t) => acc + (t.paidCents || 0), 0);
    const faltaCobrarSeparadosCents = reservadosSinPago * eventConfig.unitPriceCents;
    const ingresosBarraCents = barItems.reduce((acc, item) => acc + (item.totalRevenueCents || 0), 0);

    const entradasEfectivoCajaCents = payments.filter((p) => p.destination === "EFECTIVO_CAJA").reduce((acc, p) => acc + p.amountCents, 0);
    const entradasYapeCents = payments.filter((p) => p.destination === "YAPE_EVENTO").reduce((acc, p) => acc + p.amountCents, 0);

    const faltaRendirVendedoresCents = sellers.reduce((acc, s) => acc + Math.max(0, s.cashInHandCents - s.settledCents), 0);

    const salidasEfectivoCajaCents = expenses.filter((e) => e.payOrigin === "EFECTIVO_CAJA").reduce((acc, e) => acc + e.amountCents, 0);
    const salidasYapeCents = expenses.filter((e) => e.payOrigin === "YAPE_EVENTO").reduce((acc, e) => acc + e.amountCents, 0);

    const gastosTotalesCents = expenses.reduce((acc, e) => acc + e.amountCents, 0);

    const efectivoDisponibleCajaCents = fondoInicialCajaCents + entradasEfectivoCajaCents - salidasEfectivoCajaCents;
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
      gastosTotalesCents,
      diferenciaCajaCents,
      platosQuedanFisicamente,
      gananciaNetaActualCents,
    };
  }, [tickets, barItems, payments, expenses, sellers, pollosRecibidos, fondoInicialCajaCents, conteoFisicoRealCents, eventConfig]);

  const handleRegistrarTicket = (): void => {
    const nums = ticketNumInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 250);
    const uniqueNums = Array.from(new Set(nums));
    if (uniqueNums.length === 0) { notify("Ingresa un número válido del 1 al 250.", "error"); return; }

    const ocupados = tickets.filter((t) => uniqueNums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE" && !(t.assignmentStatus === "RESERVADO" && quickPayMode !== "SOLO_SEPARAR"));
    if (ocupados.length > 0) { notify(`El ticket N.º ${ocupados[0].code} ya está ocupado.`, "error"); return; }

    const totalCobrarCents = uniqueNums.length * eventConfig.unitPriceCents;
    const isSeparar = quickPayMode === "SOLO_SEPARAR";
    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

    const nextTickets: TicketItem[] = tickets.map((t): TicketItem => {
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

    let nextPayments: PaymentRecord[] = [...payments];
    let nextSellers: SellerRecord[] = [...sellers];
    let nextConteo = conteoFisicoRealCents;

    if (!isSeparar) {
      const dest: MoneyDestination = quickPayMode === "EFECTIVO_CAJA" ? "EFECTIVO_CAJA" : quickPayMode === "YAPE" ? "YAPE_EVENTO" : "VENDEDOR";
      nextPayments = [{
        id: `PAY-${Date.now()}`,
        description: `Ticket(s) N.º ${uniqueNums.map((n) => String(n).padStart(3, "0")).join(", ")}`,
        amountCents: totalCobrarCents,
        destination: dest,
        time: nowTime,
      }, ...payments];

      if (dest === "EFECTIVO_CAJA") nextConteo += totalCobrarCents;
      else if (dest === "VENDEDOR") nextSellers = sellers.map((s) => s.name === sellerNameInput ? { ...s, cashInHandCents: s.cashInHandCents + totalCobrarCents } : s);
    }

    setTickets(nextTickets); setPayments(nextPayments); setSellers(nextSellers); setConteoFisicoRealCents(nextConteo);
    void saveToCloud({ tickets: nextTickets, payments: nextPayments, sellers: nextSellers, conteoFisicoRealCents: nextConteo });

    const nextFree = nextTickets.find((t) => t.assignmentStatus === "DISPONIBLE");
    if (nextFree) setTicketNumInput(String(nextFree.num));
    setBuyerNameInput(""); setBuyerPhoneInput("");
    notify(isSeparar ? "Ticket separado." : "¡Venta registrada con éxito!", "success");
  };

  const handleCobrarTicketSeparado = (ticketNum: number, metodo: "EFECTIVO_CAJA" | "YAPE" = "EFECTIVO_CAJA"): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const monto = target.agreedPriceCents;
    const nextTickets: TicketItem[] = tickets.map((t): TicketItem => t.num === ticketNum ? { ...t, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto, paymentMethod: metodo } : t);
    const dest: MoneyDestination = metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA";
    const nextPayments: PaymentRecord[] = [{ id: `PAY-${Date.now()}`, description: `Cobro Ticket N.º ${target.code}`, amountCents: monto, destination: dest, time: nowTime }, ...payments];
    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + monto : conteoFisicoRealCents;

    setTickets(nextTickets); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
    if (inspectedTicket?.num === ticketNum) setInspectedTicket({ ...inspectedTicket, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto });
    void saveToCloud({ tickets: nextTickets, payments: nextPayments, conteoFisicoRealCents: nextConteo });
    notify("Cobro registrado con éxito.", "success");
  };

  const handleLiberarTicketSeparado = (ticketNum: number): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;
    const nextTickets: TicketItem[] = tickets.map((t): TicketItem => t.num === ticketNum ? { ...t, assignmentStatus: "DISPONIBLE", paymentStatus: "PENDIENTE", deliveryStatus: "PENDIENTE", paidCents: 0, paymentMethod: "", buyerName: "", buyerPhone: "" } : t);
    setTickets(nextTickets); setInspectedTicket(null);
    void saveToCloud({ tickets: nextTickets });
    notify("Ticket liberado.", "info");
  };

  const handleEntregarPlato = (ticketNum: number): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;
    if (target.deliveryStatus === "ENTREGADO") { notify("Este ticket ya fue entregado.", "error"); return; }
    if (target.paymentStatus !== "PAGADO") { notify("Falta pagar.", "warning"); return; }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const nextTickets: TicketItem[] = tickets.map((t): TicketItem => t.num === ticketNum ? { ...t, deliveryStatus: "ENTREGADO", deliveredAt: nowTime, deliveredBy: "Despacho" } : t);

    setTickets(nextTickets);
    if (inspectedTicket?.num === ticketNum) setInspectedTicket({ ...inspectedTicket, deliveryStatus: "ENTREGADO", deliveredAt: nowTime });
    void saveToCloud({ tickets: nextTickets });
    notify("¡Plato entregado con éxito!", "success");
  };

  const handleVenderProductoBarra = (itemId: string, metodo: "EFECTIVO_CAJA" | "YAPE" = "EFECTIVO_CAJA"): void => {
    const target = barItems.find((i) => i.id === itemId);
    if (!target || target.stock <= 0) { notify("Sin stock en barra.", "warning"); return; }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const nextBar: BarItem[] = barItems.map((i): BarItem => i.id === itemId ? { ...i, stock: i.stock - 1, soldQty: i.soldQty + 1, totalRevenueCents: i.totalRevenueCents + i.unitPriceCents } : i);
    const dest: MoneyDestination = metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA";
    const nextPayments: PaymentRecord[] = [{ id: `BARPAY-${Date.now()}`, description: `Barra: ${target.name}`, amountCents: target.unitPriceCents, destination: dest, time: nowTime }, ...payments];
    const nextConteo = metodo === "EFECTIVO_CAJA" ? conteoFisicoRealCents + target.unitPriceCents : conteoFisicoRealCents;

    setBarItems(nextBar); setPayments(nextPayments); setConteoFisicoRealCents(nextConteo);
    void saveToCloud({ barItems: nextBar, payments: nextPayments, conteoFisicoRealCents: nextConteo });
    notify(`Vendido 1 ${target.name}.`, "success");
  };

  const handleRegistrarCompraOGastoConCaja = (): void => {
    const amountCents = Math.round((parseFloat(expenseAmountSoles) || 0) * 100);
    if (amountCents <= 0) { notify("Ingresa un monto válido.", "error"); return; }

    const nowTime = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    let finalConcept = expenseConcept.trim();
    let nextBar: BarItem[] = [...barItems];

    if (expenseType === "COMPRA_BARRA") {
      const unitsToAdd = parseInt(addedBarUnits, 10) || 0;
      finalConcept = finalConcept || `Compra Barra (+${unitsToAdd})`;
      if (unitsToAdd > 0) nextBar = barItems.map((b): BarItem => b.id === selectedBarProductId ? { ...b, stock: b.stock + unitsToAdd } : b);
    } else {
      finalConcept = finalConcept || "Gasto del Evento";
    }

    const newExp: ExpenseRecord = { id: `EXP-${Date.now()}`, type: expenseType, concept: finalConcept, amountCents, payOrigin: expensePayOrigin, time: nowTime };
    const nextExpenses: ExpenseRecord[] = [newExp, ...expenses];
    const nextConteo = expensePayOrigin === "EFECTIVO_CAJA" ? conteoFisicoRealCents - amountCents : conteoFisicoRealCents;

    setExpenses(nextExpenses); setBarItems(nextBar); setConteoFisicoRealCents(nextConteo);
    setExpenseConcept(""); setExpenseAmountSoles("");
    void saveToCloud({ expenses: nextExpenses, barItems: nextBar, conteoFisicoRealCents: nextConteo });
    notify("Salida registrada.", "success");
  };

  const handleAgregarProductoBarra = (): void => {
    if (!newBarItemName.trim()) return;
    const priceCents = Math.round((parseFloat(newBarItemPriceSoles) || 0) * 100);
    if (priceCents <= 0) return;
    const nuevo: BarItem = { id: `BAR-${Date.now()}`, name: newBarItemName.trim(), unitPriceCents: priceCents, stock: 0, soldQty: 0, totalRevenueCents: 0 };
    const nextBar = [...barItems, nuevo];
    setBarItems(nextBar); setNewBarItemName(""); setNewBarItemPriceSoles("");
    void saveToCloud({ barItems: nextBar });
    notify("Producto añadido.", "success");
  };

  const handleCrearNuevoEvento = async (): Promise<void> => {
    if (!newEventTitleInput.trim()) return;
    const slug = `pollada-${Date.now()}`;
    const prefix = `P${eventsList.length + 1}`;
    const newConfig: EventConfig = { ...eventConfig, prefix, name: newEventTitleInput.trim(), capacity: 250 };
    const freshTickets = createInitial250Tickets(prefix);
    const freshBar = createInitialBarItems();

    setCurrentEventId(slug); setEventConfig(newConfig); setTickets(freshTickets); setBarItems(freshBar);
    setPayments([]); setExpenses([]); setPollosRecibidos(250); setFondoInicialCajaCents(10000); setConteoFisicoRealCents(10000);
    setNewEventNameModal(false); setNewEventTitleInput("");

    if (user && firestoreDb) {
      const eventDocRef = doc(firestoreDb, "artifacts", APP_ID, "public", "data", "pollada_events", slug);
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
    notify("Nueva actividad creada.", "success");
  };

  const generateCSVText = (): string => {
    const header = "Nro_Ticket,Comprador,Celular,Vendedor,Estado_Reserva,Estado_Pago,Monto_Pagado_Soles,Medio_Pago,Estado_Entrega\n";
    const rows = tickets.map((t) => `${t.code},"${t.buyerName || "Disponible"}","${t.buyerPhone || ""}","${t.sellerName}",${t.assignmentStatus},${t.paymentStatus},${((t.paidCents || 0) / 100).toFixed(2)},${t.paymentMethod || "-"},${t.deliveryStatus}`).join("\n");
    return header + rows;
  };

  const handleDescargarCSV = (): void => {
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
    } catch {
      setShowExportModal(true);
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    notify("Copiado al portapapeles.", "success");
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (gridFilterStatus === "DISPONIBLE" && t.assignmentStatus !== "DISPONIBLE") return false;
      if (gridFilterStatus === "FALTA_PAGAR" && !(t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO")) return false;
      if (gridFilterStatus === "PAGADO" && t.paymentStatus !== "PAGADO") return false;
      if (gridFilterStatus === "FALTA_RECOGER" && !(t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE")) return false;
      if (gridFilterStatus === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO") return false;
      if (searchTicketQuery.trim() !== "" && !t.code.includes(searchTicketQuery.trim()) && !(t.buyerName || "").toLowerCase().includes(searchTicketQuery.toLowerCase())) return false;
      return true;
    });
  }, [tickets, gridFilterStatus, searchTicketQuery]);

  const deliveryList = useMemo(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) return tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE" && t.deliveryStatus === "PENDIENTE").slice(0, 10);
    return tickets.filter((t) => t.code.toLowerCase().includes(q) || (t.buyerName && t.buyerName.toLowerCase().includes(q))).slice(0, 10);
  }, [tickets, deliveryQuery]);

  const selectedTicketsCount = Math.max(1, ticketNumInput.split(",").filter((x) => x.trim() !== "").length);

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-stone-900 pb-24 font-sans">
      <header className="bg-gradient-to-r from-orange-700 via-orange-600 to-red-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl"><Utensils className="w-6 h-6 text-amber-200" /></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-900/90 text-emerald-100 px-2.5 py-0.5 rounded-full"><Cloud className="w-3 h-3" /> {syncStatus === "EN_VIVO" ? "Sincronizado Firebase" : "Local"}</span>
              </div>
              <h1 className="text-lg font-extrabold mt-0.5">{eventConfig.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-black/25 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-orange-100 mr-1.5">Actividad:</span>
              <select value={currentEventId} onChange={(e) => setCurrentEventId(e.target.value)} className="bg-transparent font-bold text-white focus:outline-none cursor-pointer">
                {eventsList.map((ev) => <option key={ev.id} value={ev.id} className="text-stone-900">{ev.name}</option>)}
              </select>
              <button onClick={() => setNewEventNameModal(true)} className="ml-2 bg-white/20 p-1 rounded-lg"><FolderPlus className="w-3.5 h-3.5 text-white" /></button>
            </div>
            <button onClick={handleDescargarCSV} className="flex items-center gap-1.5 text-xs font-extrabold bg-white text-orange-900 px-3 py-1.5 rounded-xl shadow-sm"><Download className="w-3.5 h-3.5" /> CSV</button>
          </div>
        </div>
        <div className="bg-orange-950/40 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
            {[{ id: "FIESTA", label: "Fiesta y Gastos", icon: Music }, { id: "CAJA", label: "Arqueo de Caja", icon: Wallet }, { id: "VENDEDORES", label: "Vendedores", icon: Users }, { id: "RECORDATORIOS", label: "WhatsApp", icon: MessageCircle }, { id: "CONFIG", label: "Configurar", icon: Settings }].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === item.id ? "bg-white text-orange-900 shadow-sm" : "text-orange-100 hover:bg-white/10"}`}><item.icon className="w-3.5 h-3.5" /> {item.label}</button>
            ))}
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-6xl mx-auto px-4 mt-3">
          <div className={`p-3 rounded-xl border flex justify-between items-center ${toast.type === "error" ? "bg-red-50 border-red-300 text-red-900" : toast.type === "warning" ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-emerald-50 border-emerald-300 text-emerald-900"}`}>
            <span className="text-xs sm:text-sm font-bold">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="text-xs font-extrabold underline ml-4">OK</button>
          </div>
        </div>
      )}

      {newEventNameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg">Crear Nueva Actividad</h3>
            <input type="text" placeholder="Nombre" value={newEventTitleInput} onChange={(e) => setNewEventTitleInput(e.target.value)} className="w-full p-3 border rounded-xl text-sm font-bold" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewEventNameModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200">Cancelar</button>
              <button onClick={() => void handleCrearNuevoEvento()} className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white">Crear</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3"><h3 className="font-extrabold text-lg">Reporte de 250 Tickets</h3><button onClick={() => setShowExportModal(false)}><X className="w-5 h-5"/></button></div>
            <button onClick={() => copyToClipboard(generateCSVText())} className="bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl">Copiar para Excel</button>
            <div className="overflow-y-auto border rounded-xl p-3 bg-stone-50 font-mono text-[11px] flex-1"><pre className="whitespace-pre-wrap">{generateCSVText()}</pre></div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {activeTab === "VENDER" && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-lg font-extrabold">1. Vender Pollada (S/ 15.00)</h2>
                <span className="bg-orange-100 text-orange-900 text-xs font-extrabold px-3 py-1 rounded-full">Libres: {metrics.disponibles}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-bold">N.º (1-250)</label><input type="text" value={ticketNumInput} onChange={(e) => setTicketNumInput(e.target.value)} className="w-full mt-1 p-2.5 border-2 border-orange-400 rounded-xl font-extrabold text-center" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold">Comprador</label><input type="text" value={buyerNameInput} onChange={(e) => setBuyerNameInput(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold">Celular</label><input type="tel" value={buyerPhoneInput} onChange={(e) => setBuyerPhoneInput(e.target.value)} className="w-full mt-1 p-2 border rounded-xl" /></div>
                <div><label className="block text-xs font-bold">Responsable</label><select value={sellerNameInput} onChange={(e) => setSellerNameInput(e.target.value)} className="w-full mt-1 p-2 border rounded-xl bg-white">{sellers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[{ id: "EFECTIVO_CAJA", label: "Efectivo" }, { id: "YAPE", label: "Yape" }, { id: "EFECTIVO_VENDEDOR", label: "Vendedor" }, { id: "SOLO_SEPARAR", label: "Separar" }].map((m) => (
                  <button key={m.id} type="button" onClick={() => setQuickPayMode(m.id as QuickPayMode)} className={`py-2 rounded-xl text-xs font-extrabold border ${quickPayMode === m.id ? "bg-stone-900 text-white" : "bg-stone-50"}`}>{m.label}</button>
                ))}
              </div>
              {quickPayMode === "EFECTIVO_CAJA" && (
                <div className="p-3 bg-amber-50 rounded-xl border flex justify-between items-center text-xs">
                  <span>Billete S/: <input type="number" value={cashBilleteSoles} onChange={(e) => setCashBilleteSoles(e.target.value)} className="w-16 p-1 border rounded text-center font-bold" /></span>
                  <span>Vuelto: <strong className="text-orange-800">{formatPEN(Math.max(0, Math.round((parseFloat(cashBilleteSoles) || 0) * 100) - selectedTicketsCount * 1500))}</strong></span>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input type="checkbox" checked={deliverImmediately} onChange={(e) => setDeliverImmediately(e.target.checked)} /> Entregar plato ahora mismo
              </label>
              <button type="button" onClick={handleRegistrarTicket} className="w-full bg-orange-600 text-white font-extrabold py-3.5 rounded-xl shadow">Guardar Venta</button>
            </div>

            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h2 className="text-base font-extrabold flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-orange-600" /> 2. Venta Barra</h2>
                <div className="space-y-2.5">
                  {barItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center">
                      <div><div className="font-extrabold text-sm">{item.name} ({formatPEN(item.unitPriceCents)})</div><div className="text-[11px]">Stock: <strong className={item.stock > 0 ? "text-emerald-700" : "text-red-600"}>{item.stock}</strong></div></div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => handleVenderProductoBarra(item.id, "EFECTIVO_CAJA")} className="bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-bold">+1 Efectivo</button>
                        <button type="button" onClick={() => handleVenderProductoBarra(item.id, "YAPE")} className="bg-purple-700 text-white text-xs px-2.5 py-2 rounded-lg font-bold">+1 Yape</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setActiveTab("FIESTA")} className="w-full py-2.5 px-3 rounded-xl border border-orange-300 bg-orange-50 text-orange-900 text-xs font-extrabold">Ir a Fiesta y Gastos →</button>
            </div>
          </div>
        )}

        {activeTab === "TICKETS" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="font-extrabold text-lg">Padrón de 250 Tickets</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="Buscar..." value={searchTicketQuery} onChange={(e) => setSearchTicketQuery(e.target.value)} className="text-xs border rounded-xl px-3 py-2" />
                  <select value={gridFilterStatus} onChange={(e) => setGridFilterStatus(e.target.value)} className="text-xs font-bold border rounded-xl px-3 py-2 bg-stone-50">
                    <option value="TODOS">Todos (250)</option>
                    <option value="DISPONIBLE">Libres ({metrics.disponibles})</option>
                    <option value="PAGADO">Pagados ({metrics.pagadosCount})</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[440px] overflow-y-auto p-1">
                {filteredTickets.map((t) => {
                  let style = "bg-stone-50 border-stone-300 text-stone-700";
                  let label = "LIBRE";
                  if (t.deliveryStatus === "ENTREGADO") { style = "bg-stone-900 text-white"; label = "ENTREGADO"; }
                  else if (t.paymentStatus === "PAGADO") { style = "bg-emerald-100 text-emerald-950"; label = "PAGADO"; }
                  else if (t.assignmentStatus === "RESERVADO") { style = "bg-amber-100 text-amber-950"; label = "DEBE"; }
                  return (
                    <button key={t.num} type="button" onClick={() => setInspectedTicket(t)} className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center ${style}`}>
                      <span className="font-extrabold text-xs">{t.code}</span>
                      <span className="text-[9px] font-bold mt-0.5">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {inspectedTicket && (
              <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-orange-500 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div><span className="text-xs font-extrabold text-orange-700">Ticket N.º {inspectedTicket.code}</span><h3 className="text-lg font-extrabold">{inspectedTicket.buyerName || "Disponible"}</h3></div>
                  <button type="button" onClick={() => setInspectedTicket(null)} className="text-xs font-bold bg-stone-200 px-3 py-1.5 rounded-lg">Cerrar</button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {inspectedTicket.assignmentStatus === "DISPONIBLE" && <button type="button" onClick={() => { setTicketNumInput(String(inspectedTicket.num)); setActiveTab("VENDER"); }} className="bg-orange-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Vender Ticket</button>}
                  {inspectedTicket.paymentStatus !== "PAGADO" && inspectedTicket.assignmentStatus !== "DISPONIBLE" && (
                    <>
                      <button type="button" onClick={() => handleCobrarTicketSeparado(inspectedTicket.num, "EFECTIVO_CAJA")} className="bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl">Cobrar S/ 15</button>
                      <button type="button" onClick={() => handleLiberarTicketSeparado(inspectedTicket.num)} className="bg-red-100 text-red-800 text-xs font-bold px-3 py-2 rounded-xl">Liberar</button>
                    </>
                  )}
                  {inspectedTicket.paymentStatus === "PAGADO" && inspectedTicket.deliveryStatus === "PENDIENTE" && (
                    <button type="button" onClick={() => handleEntregarPlato(inspectedTicket.num)} className="bg-stone-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Entregar Plato</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "ENTREGAR" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold">Despacho de Platos (Quedan {metrics.platosQuedanFisicamente})</h2>
            <input type="text" value={deliveryQuery} onChange={(e) => setDeliveryQuery(e.target.value)} placeholder="Buscar N.º o nombre..." className="w-full p-3 border rounded-xl text-sm font-bold" />
            <div className="space-y-2.5">
              {deliveryList.map((t) => (
                <div key={t.num} className="p-4 rounded-xl border flex justify-between items-center bg-stone-50">
                  <div><span className="font-extrabold">Ticket #{t.code}</span><p className="text-sm font-bold">{t.buyerName}</p></div>
                  <button type="button" onClick={() => handleEntregarPlato(t.num)} className="bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl">Entregar Plato</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "FIESTA" && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <h2 className="text-lg font-extrabold">Pagar Compras o Gastos del Local</h2>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "COMPRA_BARRA", label: "Barra" }, { id: "GASTO_FIESTA", label: "DJ/Fiesta" }, { id: "PAGO_POLLOS", label: "Pollos" }].map((t) => (
                  <button key={t.id} type="button" onClick={() => setExpenseType(t.id as ExpenseCategory)} className={`p-2.5 rounded-xl text-xs font-extrabold border ${expenseType === t.id ? "bg-orange-600 text-white" : "bg-stone-50"}`}>{t.label}</button>
                ))}
              </div>
              {expenseType === "COMPRA_BARRA" && (
                <div className="grid grid-cols-2 gap-3">
                  <select value={selectedBarProductId} onChange={(e) => setSelectedBarProductId(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold">{barItems.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                  <input type="number" value={addedBarUnits} onChange={(e) => setAddedBarUnits(e.target.value)} placeholder="Cantidad" className="p-2 border rounded-lg text-xs font-bold" />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="text" value={expenseConcept} onChange={(e) => setExpenseConcept(e.target.value)} placeholder="Concepto" className="p-2.5 border rounded-xl text-sm" />
                <input type="number" value={expenseAmountSoles} onChange={(e) => setExpenseAmountSoles(e.target.value)} placeholder="Monto S/" className="p-2.5 border rounded-xl text-sm font-extrabold" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "EFECTIVO_CAJA", label: "Caja" }, { id: "YAPE_EVENTO", label: "Yape" }, { id: "POR_PAGAR", label: "Crédito" }].map((o) => (
                  <button key={o.id} type="button" onClick={() => setExpensePayOrigin(o.id as ExpenseOrigin)} className={`p-2 rounded-xl text-xs font-bold border ${expensePayOrigin === o.id ? "bg-stone-900 text-white" : "bg-stone-50"}`}>{o.label}</button>
                ))}
              </div>
              <button type="button" onClick={handleRegistrarCompraOGastoConCaja} className="w-full bg-orange-600 text-white font-extrabold py-3 rounded-xl text-sm">Registrar Gasto</button>
            </div>
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
                <h3 className="font-extrabold text-sm uppercase">Catálogo Barra</h3>
                <div className="space-y-2">{barItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 border text-xs">
                    <span>{item.name} (Stock: {item.stock})</span>
                    <input type="number" step="0.5" value={(item.unitPriceCents / 100).toFixed(2)} onChange={(e) => { const val = Math.round((parseFloat(e.target.value) || 0) * 100); setBarItems(barItems.map((b) => b.id === item.id ? { ...b, unitPriceCents: val } : b)); }} className="w-16 p-1 border rounded font-bold text-center" />
                  </div>
                ))}</div>
                <div className="pt-2 border-t flex gap-2">
                  <input type="text" placeholder="Nuevo prod." value={newBarItemName} onChange={(e) => setNewBarItemName(e.target.value)} className="flex-1 p-2 border rounded-xl text-xs" />
                  <input type="number" placeholder="Precio" value={newBarItemPriceSoles} onChange={(e) => setNewBarItemPriceSoles(e.target.value)} className="w-20 p-2 border rounded-xl text-xs font-bold" />
                  <button type="button" onClick={handleAgregarProductoBarra} className="bg-stone-900 text-white text-xs font-bold px-3 py-2 rounded-xl">Añadir</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CAJA" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-5">
            <h2 className="text-lg font-extrabold">Control de Caja y Yape</h2>
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
                <input type="number" value={(conteoFisicoRealCents / 100).toFixed(2)} onChange={(e) => setConteoFisicoRealCents(Math.round((parseFloat(e.target.value) || 0) * 100))} className="w-full p-2.5 border rounded-xl font-extrabold text-base bg-white" />
                <div className="flex justify-between text-sm font-extrabold"><span>Diferencia:</span><span className={metrics.diferenciaCajaCents === 0 ? "text-emerald-700" : "text-red-600"}>{formatPEN(metrics.diferenciaCajaCents)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-purple-900"><span>Yape Total:</span><span>{formatPEN(metrics.saldoDisponibleYapeCents)}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "VENDEDORES" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold">Rendición de Vendedores</h2>
            <div className="flex gap-2">
              <input type="text" placeholder="Nuevo vendedor..." value={newSellerName} onChange={(e) => setNewSellerName(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-sm" />
              <button type="button" onClick={() => { if (!newSellerName.trim()) return; setSellers([...sellers, { id: `SEL-${Date.now()}`, name: newSellerName.trim(), cashInHandCents: 0, settledCents: 0 }]); setNewSellerName(""); notify("Vendedor añadido", "success"); }} className="bg-stone-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl">Agregar</button>
            </div>
            <div className="space-y-2.5">
              {sellers.map((s) => {
                const pendiente = Math.max(0, s.cashInHandCents - s.settledCents);
                return (
                  <div key={s.id} className="p-4 rounded-xl border bg-stone-50 flex justify-between items-center text-sm">
                    <div><div className="font-extrabold">{s.name}</div><div className="text-xs">Cobrado: {formatPEN(s.cashInHandCents)} | <strong className="text-orange-800">Falta entregar: {formatPEN(pendiente)}</strong></div></div>
                    {pendiente > 0 && <button type="button" onClick={() => { setSellers(sellers.map((item) => item.id === s.id ? { ...item, settledCents: item.cashInHandCents } : item)); notify("Rendición recibida", "success"); }} className="bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Recibir</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "RECORDATORIOS" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold">WhatsApp</h2>
            <div className="space-y-2">
              {tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE").map((t) => (
                <div key={t.num} className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center text-xs">
                  <span>Ticket #{t.code} — {t.buyerName}</span>
                  <a href={`https://wa.me/${(t.buyerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${t.buyerName}, tu ticket de ${eventConfig.name} es el N.º ${t.code}.`)}`} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg">WhatsApp</a>
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
            const isActive = activeTab === (tab.id as TabId);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
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