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

/**
 * ============================================================================
 * TIPOS ESTRICTOS DE TYPESCRIPT (Para compilación limpia en Vercel Next.js 16)
 * ============================================================================
 */
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

/**
 * ============================================================================
 * INICIALIZACIÓN SEGURA DE FIREBASE (Compatible con SSR de Vercel y Navegador)
 * ============================================================================
 */
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

/**
 * ============================================================================
 * FUNCIONES AUXILIARES CON TIPOS EXPLÍCITOS
 * ============================================================================
 */
const formatPEN = (cents: number): string => {
  const soles = ((cents || 0) / 100).toFixed(2);
  return `S/ ${Number(soles).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const generateEntropyToken = (prefix: string, num: number): string => {
  const randomPart = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  )
    .join("")
    .toUpperCase();
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
      qrToken: generateEntropyToken(prefix, num),
      agreedPriceCents: 1500, // S/ 15.00
      historicalCostCents: 900, // S/ 9.00
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

export default function MiPolladaPage() {
  // ==========================================================================
  // 1. ESTADOS GLOBALES CON TIPADO ESTRICTO
  // ==========================================================================
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

  const notify = (
    msg: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ): void => {
    setToast({ msg, type, id: Date.now() });
  };

  // ==========================================================================
  // 2. DATOS DEL EVENTO ACTUAL
  // ==========================================================================
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

  const [tickets, setTickets] = useState<TicketItem[]>(() =>
    createInitial250Tickets("POL1")
  );
  const [barItems, setBarItems] = useState<BarItem[]>(() =>
    createInitialBarItems()
  );
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([
    { id: "SEL-1", name: "General / Caja", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-2", name: "Vendedor 1", cashInHandCents: 0, settledCents: 0 },
    { id: "SEL-3", name: "Vendedor 2", cashInHandCents: 0, settledCents: 0 },
  ]);

  const [pollosRecibidos, setPollosRecibidos] = useState<number>(250);
  const [fondoInicialCajaCents, setFondoInicialCajaCents] = useState<number>(10000); // S/ 100.00
  const [conteoFisicoRealCents, setConteoFisicoRealCents] = useState<number>(10000);

  // ==========================================================================
  // 3. CONEXIÓN EN TIEMPO REAL CON FIREBASE
  // ==========================================================================
  useEffect(() => {
    const authInstance = firebaseAuth;
    if (!authInstance) {
      setSyncStatus("LOCAL");
      return;
    }

    const initAuth = async (): Promise<void> => {
      try {
        const win = window as unknown as { __initial_auth_token?: string };
        if (typeof win.__initial_auth_token === "string" && win.__initial_auth_token) {
          await signInWithCustomToken(authInstance, win.__initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }
      } catch (err) {
        console.error("Aviso de autenticación Firebase:", err);
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

    const eventsColRef = collection(
      dbInstance,
      "artifacts",
      APP_ID,
      "public",
      "data",
      "pollada_events"
    );

    const unsubList = onSnapshot(
      eventsColRef,
      (snapshot) => {
        const loadedEvents: EventListItem[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as { eventConfig?: EventConfig };
          loadedEvents.push({
            id: docSnap.id,
            name: raw.eventConfig?.name || docSnap.id,
          });
        });
        if (loadedEvents.length > 0) {
          setEventsList(loadedEvents);
        }
      },
      (err) => {
        console.error("Error leyendo lista de eventos:", err);
      }
    );

    const eventDocRef = doc(
      dbInstance,
      "artifacts",
      APP_ID,
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
          const data = docSnap.data() as {
            eventConfig?: EventConfig;
            tickets?: string;
            barItems?: string;
            payments?: string;
            expenses?: string;
            sellers?: string;
            pollosRecibidos?: number;
            fondoInicialCajaCents?: number;
            conteoFisicoRealCents?: number;
          };

          if (data.eventConfig) setEventConfig(data.eventConfig);
          if (data.tickets) setTickets(JSON.parse(data.tickets) as TicketItem[]);
          if (data.barItems) setBarItems(JSON.parse(data.barItems) as BarItem[]);
          if (data.payments) setPayments(JSON.parse(data.payments) as PaymentRecord[]);
          if (data.expenses) setExpenses(JSON.parse(data.expenses) as ExpenseRecord[]);
          if (data.sellers) setSellers(JSON.parse(data.sellers) as SellerRecord[]);
          if (typeof data.pollosRecibidos === "number") {
            setPollosRecibidos(data.pollosRecibidos);
          }
          if (typeof data.fondoInicialCajaCents === "number") {
            setFondoInicialCajaCents(data.fondoInicialCajaCents);
          }
          if (typeof data.conteoFisicoRealCents === "number") {
            setConteoFisicoRealCents(data.conteoFisicoRealCents);
          }
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
      },
      (err) => {
        console.error("Error en sincronización del documento:", err);
        setSyncStatus("LOCAL");
      }
    );

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
      fondoInicialCajaCents:
        overrides.fondoInicialCajaCents ?? fondoInicialCajaCents,
      conteoFisicoRealCents:
        overrides.conteoFisicoRealCents ?? conteoFisicoRealCents,
      updatedAt: Date.now(),
    };

    try {
      const eventDocRef = doc(
        dbInstance,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "pollada_events",
        currentEventId
      );
      await setDoc(eventDocRef, payload);
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
    }
  };

  // ==========================================================================
  // 4. ESTADOS DE LOS FORMULARIOS OPERATIVOS
  // ==========================================================================
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

  // ==========================================================================
  // 5. CÁLCULOS FINANCIEROS Y DE STOCK EN TIEMPO REAL
  // ==========================================================================
  const metrics = useMemo(() => {
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
    const ingresosBarraCents = barItems.reduce(
      (acc, item) => acc + (item.totalRevenueCents || 0),
      0
    );

    const entradasEfectivoCajaCents = payments
      .filter((p) => p.destination === "EFECTIVO_CAJA")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const entradasYapeCents = payments
      .filter((p) => p.destination === "YAPE_EVENTO")
      .reduce((acc, p) => acc + p.amountCents, 0);

    const faltaRendirVendedoresCents = sellers.reduce(
      (acc, s) => acc + Math.max(0, s.cashInHandCents - s.settledCents),
      0
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
    tickets,
    barItems,
    payments,
    expenses,
    sellers,
    pollosRecibidos,
    fondoInicialCajaCents,
    conteoFisicoRealCents,
    eventConfig,
  ]);

  // ==========================================================================
  // 6. ACCIONES OPERATIVAS DEL EVENTO
  // ==========================================================================
  const handleRegistrarTicket = (): void => {
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
      (t) =>
        uniqueNums.includes(t.num) &&
        t.assignmentStatus !== "DISPONIBLE" &&
        !(t.assignmentStatus === "RESERVADO" && quickPayMode !== "SOLO_SEPARAR")
    );

    if (ocupados.length > 0) {
      notify(
        `El ticket N.º ${ocupados[0].code} ya está ocupado (${ocupados[0].buyerName || "Registrado"}).`,
        "error"
      );
      return;
    }

    const totalCobrarCents = uniqueNums.length * eventConfig.unitPriceCents;
    const isSeparar = quickPayMode === "SOLO_SEPARAR";
    const nowTime = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

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
        deliveryStatus:
          !isSeparar && deliverImmediately ? "ENTREGADO" : t.deliveryStatus,
        deliveredAt:
          !isSeparar && deliverImmediately ? nowTime : t.deliveredAt,
        deliveredBy:
          !isSeparar && deliverImmediately ? "Venta Directa" : t.deliveredBy,
      };
    });

    let nextPayments: PaymentRecord[] = [...payments];
    let nextSellers: SellerRecord[] = [...sellers];
    let nextConteo = conteoFisicoRealCents;

    if (!isSeparar) {
      const dest: MoneyDestination =
        quickPayMode === "EFECTIVO_CAJA"
          ? "EFECTIVO_CAJA"
          : quickPayMode === "YAPE"
          ? "YAPE_EVENTO"
          : "VENDEDOR";

      nextPayments = [
        {
          id: `PAY-${Date.now()}`,
          description: `Ticket(s) N.º ${uniqueNums
            .map((n) => String(n).padStart(3, "0"))
            .join(", ")} (${buyerNameInput.trim() || "Cliente"})`,
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
          s.name === sellerNameInput
            ? { ...s, cashInHandCents: s.cashInHandCents + totalCobrarCents }
            : s
        );
      }
    }

    setTickets(nextTickets);
    setPayments(nextPayments);
    setSellers(nextSellers);
    setConteoFisicoRealCents(nextConteo);

    void saveToCloud({
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

  const handleCobrarTicketSeparado = (
    ticketNum: number,
    metodo: "EFECTIVO_CAJA" | "YAPE" = "EFECTIVO_CAJA"
  ): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;

    const nowTime = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const monto = target.agreedPriceCents;

    const nextTickets: TicketItem[] = tickets.map((t): TicketItem =>
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

    const dest: MoneyDestination =
      metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA";

    const nextPayments: PaymentRecord[] = [
      {
        id: `PAY-${Date.now()}`,
        description: `Cobro Ticket N.º ${target.code} (${target.buyerName})`,
        amountCents: monto,
        destination: dest,
        time: nowTime,
      },
      ...payments,
    ];

    const nextConteo =
      metodo === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents + monto
        : conteoFisicoRealCents;

    setTickets(nextTickets);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);

    if (inspectedTicket && inspectedTicket.num === ticketNum) {
      setInspectedTicket({
        ...inspectedTicket,
        assignmentStatus: "CONFIRMADO",
        paymentStatus: "PAGADO",
        paidCents: monto,
        paymentMethod: metodo,
      });
    }

    void saveToCloud({
      tickets: nextTickets,
      payments: nextPayments,
      conteoFisicoRealCents: nextConteo,
    });

    notify(
      `Ticket N.º ${target.code} cobrado (${formatPEN(monto)} en ${
        metodo === "YAPE" ? "Yape" : "Efectivo"
      }).`,
      "success"
    );
  };

  const handleLiberarTicketSeparado = (ticketNum: number): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;

    const nextTickets: TicketItem[] = tickets.map((t): TicketItem =>
      t.num === ticketNum
        ? {
            ...t,
            assignmentStatus: "DISPONIBLE",
            paymentStatus: "PENDIENTE",
            deliveryStatus: "PENDIENTE",
            paidCents: 0,
            paymentMethod: "",
            buyerName: "",
            buyerPhone: "",
            qrToken: generateEntropyToken(eventConfig.prefix, t.num),
          }
        : t
    );

    setTickets(nextTickets);
    setInspectedTicket(null);
    void saveToCloud({ tickets: nextTickets });
    notify(`Ticket N.º ${target.code} liberado y disponible nuevamente.`, "info");
  };

  const handleEntregarPlato = (ticketNum: number): void => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;

    if (target.deliveryStatus === "ENTREGADO") {
      notify(
        `ALERTA: El ticket N.º ${target.code} YA FUE ENTREGADO a las ${target.deliveredAt}.`,
        "error"
      );
      return;
    }
    if (target.paymentStatus !== "PAGADO") {
      notify(
        `El ticket N.º ${target.code} aún FALTA PAGAR (S/ 15.00). Cóbralo primero.`,
        "warning"
      );
      return;
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const nextTickets: TicketItem[] = tickets.map((t): TicketItem =>
      t.num === ticketNum
        ? {
            ...t,
            deliveryStatus: "ENTREGADO",
            deliveredAt: nowTime,
            deliveredBy: "Despacho",
          }
        : t
    );

    setTickets(nextTickets);
    if (inspectedTicket && inspectedTicket.num === ticketNum) {
      setInspectedTicket({
        ...inspectedTicket,
        deliveryStatus: "ENTREGADO",
        deliveredAt: nowTime,
        deliveredBy: "Despacho",
      });
    }
    void saveToCloud({ tickets: nextTickets });
    notify(
      `¡Plato entregado! Ticket N.º ${target.code} (${target.buyerName}) marcado como ENTREGADO.`,
      "success"
    );
  };

  const handleVenderProductoBarra = (
    itemId: string,
    metodo: "EFECTIVO_CAJA" | "YAPE" = "EFECTIVO_CAJA"
  ): void => {
    const target = barItems.find((i) => i.id === itemId);
    if (!target) return;
    if (target.stock <= 0) {
      notify(
        `No queda stock registrado de ${target.name}. Registra una compra en la pestaña «Fiesta y Gastos».`,
        "warning"
      );
      return;
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const nextBar: BarItem[] = barItems.map((i): BarItem =>
      i.id === itemId
        ? {
            ...i,
            stock: i.stock - 1,
            soldQty: i.soldQty + 1,
            totalRevenueCents: i.totalRevenueCents + i.unitPriceCents,
          }
        : i
    );

    const dest: MoneyDestination =
      metodo === "YAPE" ? "YAPE_EVENTO" : "EFECTIVO_CAJA";

    const nextPayments: PaymentRecord[] = [
      {
        id: `BARPAY-${Date.now()}`,
        description: `Venta Barra: 1x ${target.name}`,
        amountCents: target.unitPriceCents,
        destination: dest,
        time: nowTime,
      },
      ...payments,
    ];

    const nextConteo =
      metodo === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents + target.unitPriceCents
        : conteoFisicoRealCents;

    setBarItems(nextBar);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);

    void saveToCloud({
      barItems: nextBar,
      payments: nextPayments,
      conteoFisicoRealCents: nextConteo,
    });

    notify(
      `Vendido 1 ${target.name} (+${formatPEN(target.unitPriceCents)} en ${
        metodo === "YAPE" ? "Yape" : "Caja"
      }).`,
      "success"
    );
  };

  const handleRegistrarCompraOGastoConCaja = (): void => {
    const amountCents = Math.round((parseFloat(expenseAmountSoles) || 0) * 100);
    if (amountCents <= 0) {
      notify("Ingresa un monto válido en soles.", "error");
      return;
    }

    if (
      expensePayOrigin === "EFECTIVO_CAJA" &&
      amountCents > metrics.efectivoDisponibleCajaCents
    ) {
      notify(
        `Atención: En Caja solo hay ${formatPEN(
          metrics.efectivoDisponibleCajaCents
        )} en efectivo disponible.`,
        "warning"
      );
    }

    const nowTime = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    let finalConcept = expenseConcept.trim();
    let nextBar: BarItem[] = [...barItems];

    if (expenseType === "COMPRA_BARRA") {
      const targetBar = barItems.find((b) => b.id === selectedBarProductId);
      const unitsToAdd = parseInt(addedBarUnits, 10) || 0;
      finalConcept =
        finalConcept ||
        `Compra Barra: +${unitsToAdd} und. de ${
          targetBar ? targetBar.name : "Producto"
        }`;
      if (unitsToAdd > 0) {
        nextBar = barItems.map((b): BarItem =>
          b.id === selectedBarProductId
            ? { ...b, stock: b.stock + unitsToAdd }
            : b
        );
      }
    } else if (expenseType === "PAGO_POLLOS") {
      finalConcept = finalConcept || "Pago a proveedor de pollos preparados";
    } else {
      finalConcept = finalConcept || "Gasto de Fiesta / DJ / Local";
    }

    const newExp: ExpenseRecord = {
      id: `EXP-${Date.now()}`,
      type: expenseType,
      concept: finalConcept,
      amountCents,
      payOrigin: expensePayOrigin,
      time: nowTime,
    };

    const nextExpenses: ExpenseRecord[] = [newExp, ...expenses];
    const nextConteo =
      expensePayOrigin === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents - amountCents
        : conteoFisicoRealCents;

    setExpenses(nextExpenses);
    setBarItems(nextBar);
    setConteoFisicoRealCents(nextConteo);
    setExpenseConcept("");
    setExpenseAmountSoles("");

    void saveToCloud({
      expenses: nextExpenses,
      barItems: nextBar,
      conteoFisicoRealCents: nextConteo,
    });

    notify(
      `Registrado: ${finalConcept} por ${formatPEN(amountCents)} (${
        expensePayOrigin === "EFECTIVO_CAJA"
          ? "Descontado del Efectivo de Caja"
          : expensePayOrigin === "YAPE_EVENTO"
          ? "Descontado del Yape"
          : "Anotado por pagar"
      }).`,
      "success"
    );
  };

  const handleAgregarProductoBarra = (): void => {
    if (!newBarItemName.trim()) return;
    const priceCents = Math.round((parseFloat(newBarItemPriceSoles) || 0) * 100);
    if (priceCents <= 0) {
      notify("Ingresa un precio de venta válido para el producto.", "error");
      return;
    }

    const nuevo: BarItem = {
      id: `BAR-${Date.now()}`,
      name: newBarItemName.trim(),
      unitPriceCents: priceCents,
      stock: 0,
      soldQty: 0,
      totalRevenueCents: 0,
    };

    const nextBar = [...barItems, nuevo];
    setBarItems(nextBar);
    setNewBarItemName("");
    setNewBarItemPriceSoles("");
    void saveToCloud({ barItems: nextBar });
    notify(`Producto «${nuevo.name}» añadido a la barra.`, "success");
  };

  const handleCrearNuevoEvento = async (): Promise<void> => {
    if (!newEventTitleInput.trim()) {
      notify("Escribe un nombre para la nueva actividad.", "error");
      return;
    }
    const slug = `pollada-${Date.now()}`;
    const prefix = `P${eventsList.length + 1}`;
    const newConfig: EventConfig = {
      ...eventConfig,
      prefix,
      name: newEventTitleInput.trim(),
      capacity: 250,
    };
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

    if (user && firestoreDb) {
      const eventDocRef = doc(
        firestoreDb,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "pollada_events",
        slug
      );
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
    notify(
      `Nueva actividad «${newConfig.name}» creada con 250 tickets limpios.`,
      "success"
    );
  };

  const generateCSVText = (): string => {
    const header =
      "Nro_Ticket,Comprador,Celular,Vendedor,Estado_Reserva,Estado_Pago,Monto_Pagado_Soles,Medio_Pago,Estado_Entrega,Hora_Entrega\n";
    const rows = tickets
      .map(
        (t) =>
          `${t.code},"${t.buyerName || "Disponible"}","${
            t.buyerPhone || ""
          }","${t.sellerName}",${t.assignmentStatus},${t.paymentStatus},${(
            (t.paidCents || 0) / 100
          ).toFixed(2)},${t.paymentMethod || "-"},${t.deliveryStatus},"${
            t.deliveredAt || "-"
          }"`
      )
      .join("\n");
    return header + rows;
  };

  const handleDescargarCSV = (): void => {
    try {
      const csvContent = "\uFEFF" + generateCSVText();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Reporte_250_Tickets_${eventConfig.name.replace(/\s+/g, "_")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportModal(true);
      notify("Exportación de los 250 tickets lista.", "success");
    } catch {
      setShowExportModal(true);
    }
  };

  const copyToClipboard = (text: string): void => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    notify("Copiado al portapapeles.", "success");
  };

  // ==========================================================================
  // 7. FILTROS DE CUADRÍCULA Y BÚSQUEDA DE DESPACHO
  // ==========================================================================
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (
        gridFilterStatus === "DISPONIBLE" &&
        t.assignmentStatus !== "DISPONIBLE"
      )
        return false;
      if (
        gridFilterStatus === "FALTA_PAGAR" &&
        !(t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO")
      )
        return false;
      if (gridFilterStatus === "PAGADO" && t.paymentStatus !== "PAGADO")
        return false;
      if (
        gridFilterStatus === "FALTA_RECOGER" &&
        !(t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE")
      )
        return false;
      if (gridFilterStatus === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO")
        return false;

      if (
        searchTicketQuery.trim() !== "" &&
        !t.code.includes(searchTicketQuery.trim()) &&
        !(t.buyerName || "")
          .toLowerCase()
          .includes(searchTicketQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, gridFilterStatus, searchTicketQuery]);

  const deliveryList = useMemo(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) {
      return tickets
        .filter(
          (t) =>
            t.assignmentStatus !== "DISPONIBLE" &&
            t.deliveryStatus === "PENDIENTE"
        )
        .slice(0, 10);
    }
    return tickets
      .filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          (t.buyerName && t.buyerName.toLowerCase().includes(q)) ||
          t.qrToken.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [tickets, deliveryQuery]);

  const selectedTicketsCount = Math.max(
    1,
    ticketNumInput.split(",").filter((x) => x.trim() !== "").length
  );

  // ==========================================================================
  // 8. INTERFAZ DE USUARIO (RESPONSIVA PARA CELULAR Y ESCRITORIO)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#FFFBF5] text-stone-900 pb-24 font-sans">
      {/* CABECERA PRINCIPAL */}
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
                  {syncStatus === "EN_VIVO"
                    ? "Firebase Sincronizado en Vivo"
                    : syncStatus === "CONECTANDO"
                    ? "Conectando..."
                    : "Modo Local"}
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

          {/* Selector de Actividad y Exportación CSV */}
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

        {/* SUB-BARRA SUPERIOR */}
        <div className="bg-orange-950/40 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: "FIESTA", label: "Fiesta, Barra y Gastos", icon: Music },
                { id: "CAJA", label: "Arqueo de Caja", icon: Wallet },
                { id: "VENDEDORES", label: "Rendición Vendedores", icon: Users },
                { id: "RECORDATORIOS", label: "WhatsApp", icon: MessageCircle },
                { id: "CONFIG", label: "Datos del Evento", icon: Settings },
              ] as { id: TabId; label: string; icon: React.ElementType }[]
            ).map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? "bg-white text-orange-900 shadow-sm"
                      : "text-orange-100 hover:bg-white/10"
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

      {/* NOTIFICACIÓN RÁPIDA */}
      {toast && (
        <div className="max-w-6xl mx-auto px-4 mt-3">
          <div
            className={`p-3 rounded-xl border flex justify-between items-center shadow-sm ${
              toast.type === "error"
                ? "bg-red-50 border-red-300 text-red-900"
                : toast.type === "warning"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>{toast.msg}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-extrabold underline ml-4"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVA ACTIVIDAD */}
      {newEventNameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-stone-900">
              Crear Nueva Actividad / Pollada
            </h3>
            <p className="text-xs text-stone-600">
              Esta opción guarda tu pollada actual en Firebase y abre una nueva
              actividad con 250 tickets desde cero.
            </p>
            <input
              type="text"
              placeholder="Ej. Pollada Pro Fondos Diciembre"
              value={newEventTitleInput}
              onChange={(e) => setNewEventTitleInput(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-xl text-sm font-bold"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewEventNameModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200 text-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleCrearNuevoEvento()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white"
              >
                Crear Actividad (250 Tickets)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPORTACIÓN CSV DE LOS 250 TICKETS */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900">
                  Exportación de los 250 Tickets ({eventConfig.name})
                </h3>
                <p className="text-xs text-stone-500">
                  Se descargó el archivo CSV. También puedes copiar toda la
                  tabla aquí para pegarla en Excel o Google Sheets.
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard(generateCSVText())}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl"
              >
                <Copy className="w-4 h-4" />
                Copiar los 250 Tickets para Excel
              </button>
            </div>

            <div className="overflow-y-auto border rounded-xl p-3 bg-stone-50 font-mono text-[11px] flex-1">
              <pre className="whitespace-pre-wrap">{generateCSVText()}</pre>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* ===================================================================
            PESTAÑA 1: VENDER (POLLADA Y BARRA DE LA FIESTA)
           =================================================================== */}
        {activeTab === "VENDER" && (
          <div className="grid lg:grid-cols-12 gap-5">
            {/* Venta o separación de Tickets de Pollada */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">
                    1. Vender o Separar Pollada (S/ 15.00)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Quedan <strong>{metrics.disponibles}</strong> tickets libres
                    de 250.
                  </p>
                </div>
                <span className="bg-orange-100 text-orange-900 text-xs font-extrabold px-3 py-1 rounded-full">
                  Total:{" "}
                  {formatPEN(selectedTicketsCount * eventConfig.unitPriceCents)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700">
                    N.º Ticket (1–250)
                  </label>
                  <input
                    type="text"
                    value={ticketNumInput}
                    onChange={(e) => setTicketNumInput(e.target.value)}
                    placeholder="Ej: 15 o 15,16"
                    className="w-full mt-1 p-2.5 border-2 border-orange-400 rounded-xl font-extrabold text-base text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Nombre del Comprador
                  </label>
                  <input
                    type="text"
                    value={buyerNameInput}
                    onChange={(e) => setBuyerNameInput(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700">
                    Celular (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={buyerPhoneInput}
                    onChange={(e) => setBuyerPhoneInput(e.target.value)}
                    placeholder="999 888 777"
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700">
                    Vendedor / Responsable
                  </label>
                  <select
                    value={sellerNameInput}
                    onChange={(e) => setSellerNameInput(e.target.value)}
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl bg-white text-sm font-semibold"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  ¿Cómo paga?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "EFECTIVO_CAJA", label: "Efectivo en Caja" },
                      { id: "YAPE", label: "Yape / Plin" },
                      { id: "EFECTIVO_VENDEDOR", label: "Efectivo Vendedor" },
                      { id: "SOLO_SEPARAR", label: "Solo Separar (Debe)" },
                    ] as { id: QuickPayMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setQuickPayMode(m.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-extrabold border transition ${
                        quickPayMode === m.id
                          ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                          : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {quickPayMode === "EFECTIVO_CAJA" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700">
                      Paga con billete de S/:
                    </span>
                    <input
                      type="number"
                      value={cashBilleteSoles}
                      onChange={(e) => setCashBilleteSoles(e.target.value)}
                      className="w-20 p-1.5 border border-stone-300 rounded-lg font-extrabold text-sm text-center bg-white"
                    />
                  </div>
                  <div>
                    Vuelto a dar:{" "}
                    <strong className="text-sm text-orange-800">
                      {formatPEN(
                        Math.max(
                          0,
                          Math.round((parseFloat(cashBilleteSoles) || 0) * 100) -
                            selectedTicketsCount * eventConfig.unitPriceCents
                        )
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {quickPayMode !== "SOLO_SEPARAR" && (
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliverImmediately}
                    onChange={(e) => setDeliverImmediately(e.target.checked)}
                  />
                  <span>
                    Se lleva el plato ahora mismo (Marcar ENTREGADO de una vez)
                  </span>
                </label>
              )}

              <button
                type="button"
                onClick={handleRegistrarTicket}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-xl shadow text-sm transition"
              >
                {quickPayMode === "SOLO_SEPARAR"
                  ? "Separar Ticket (Falta Pagar)"
                  : "Guardar Venta de Pollada"}
              </button>
            </div>

            {/* Venta Rápida de Barra en la Fiesta */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-orange-600" />
                      2. Venta Rápida en la Fiesta (Barra)
                    </h2>
                    <p className="text-xs text-stone-500">
                      Gaseosa, agua mineral, cigarros y bebidas en el local.
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Vendido: {formatPEN(metrics.ingresosBarraCents)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {barItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex justify-between items-center gap-2"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-stone-900">
                          {item.name} — {formatPEN(item.unitPriceCents)}
                        </div>
                        <div className="text-[11px] text-stone-600">
                          Quedan:{" "}
                          <strong
                            className={
                              item.stock > 0 ? "text-emerald-700" : "text-red-600"
                            }
                          >
                            {item.stock} und.
                          </strong>{" "}
                          | Vendidos: {item.soldQty}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleVenderProductoBarra(item.id, "EFECTIVO_CAJA")
                          }
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-3 py-2 rounded-lg"
                        >
                          +1 Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVenderProductoBarra(item.id, "YAPE")}
                          className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold px-2.5 py-2 rounded-lg"
                        >
                          +1 Yape
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("FIESTA")}
                className="w-full py-2.5 px-3 rounded-xl border border-orange-300 bg-orange-50 text-orange-900 text-xs font-extrabold hover:bg-orange-100"
              >
                ¿Comprar más bebida/cigarros o pagar al DJ con plata de Caja? Ir
                a Fiesta y Gastos →
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 2: PADRÓN DE 250 TICKETS
           =================================================================== */}
        {activeTab === "TICKETS" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="font-extrabold text-lg text-stone-900">
                    Padrón de 250 Tickets (001 al 250)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Toca cualquier número para ver quién lo tiene, cobrarle o
                    entregar su plato.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Buscar N.º o nombre..."
                    value={searchTicketQuery}
                    onChange={(e) => setSearchTicketQuery(e.target.value)}
                    className="text-xs border border-stone-300 rounded-xl px-3 py-2"
                  />
                  <select
                    value={gridFilterStatus}
                    onChange={(e) => setGridFilterStatus(e.target.value)}
                    className="text-xs font-bold border border-stone-300 rounded-xl px-3 py-2 bg-stone-50"
                  >
                    <option value="TODOS">Todos (250)</option>
                    <option value="DISPONIBLE">
                      Libres ({metrics.disponibles})
                    </option>
                    <option value="FALTA_PAGAR">
                      Separados / Falta Pagar ({metrics.reservadosSinPago})
                    </option>
                    <option value="PAGADO">
                      Pagados ({metrics.pagadosCount})
                    </option>
                    <option value="FALTA_RECOGER">
                      Pagados por Recoger ({metrics.pagadosPendientesEntrega})
                    </option>
                    <option value="ENTREGADO">
                      Entregados ({metrics.entregadosCount})
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[440px] overflow-y-auto p-1">
                {filteredTickets.map((t) => {
                  let style = "bg-stone-50 border-stone-300 text-stone-700";
                  let statusLabel = "LIBRE";
                  if (t.deliveryStatus === "ENTREGADO") {
                    style = "bg-stone-900 border-stone-900 text-white";
                    statusLabel = "ENTREGADO ✓";
                  } else if (t.paymentStatus === "PAGADO") {
                    style =
                      "bg-emerald-100 border-emerald-600 text-emerald-950";
                    statusLabel = "PAGADO $";
                  } else if (t.assignmentStatus === "RESERVADO") {
                    style = "bg-amber-100 border-amber-500 text-amber-950";
                    statusLabel = "DEBE ⏳";
                  }

                  return (
                    <button
                      key={t.num}
                      type="button"
                      onClick={() => setInspectedTicket(t)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition hover:scale-105 ${style}`}
                    >
                      <span className="font-extrabold text-xs">{t.code}</span>
                      <span className="text-[9px] font-bold mt-0.5">
                        {statusLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {inspectedTicket && (
              <div className="bg-white p-5 rounded-2xl shadow-md border-2 border-orange-500 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-orange-700">
                      Ticket N.º {inspectedTicket.code}
                    </span>
                    <h3 className="text-lg font-extrabold">
                      {inspectedTicket.buyerName || "Disponible"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedTicket(null)}
                    className="text-xs font-bold bg-stone-200 px-3 py-1.5 rounded-lg"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 items-center">
                  <div className="p-3 bg-stone-50 rounded-xl border flex flex-col items-center">
                    <QrCode className="w-20 h-20 text-stone-900" />
                    <code className="text-[11px] font-mono mt-2">
                      {inspectedTicket.qrToken}
                    </code>
                  </div>
                  <div className="sm:col-span-2 space-y-3 text-xs sm:text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        Pago:{" "}
                        <strong className="text-emerald-700">
                          {inspectedTicket.paymentStatus} (
                          {formatPEN(inspectedTicket.paidCents)})
                        </strong>
                      </div>
                      <div>
                        Entrega: <strong>{inspectedTicket.deliveryStatus}</strong>
                      </div>
                      <div>
                        Vendedor: <strong>{inspectedTicket.sellerName}</strong>
                      </div>
                      <div>
                        Celular:{" "}
                        <strong>{inspectedTicket.buyerPhone || "-"}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {inspectedTicket.assignmentStatus === "DISPONIBLE" && (
                        <button
                          type="button"
                          onClick={() => {
                            setTicketNumInput(String(inspectedTicket.num));
                            setActiveTab("VENDER");
                          }}
                          className="bg-orange-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl"
                        >
                          Vender este Ticket
                        </button>
                      )}
                      {inspectedTicket.assignmentStatus !== "DISPONIBLE" &&
                        inspectedTicket.paymentStatus !== "PAGADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleCobrarTicketSeparado(
                                  inspectedTicket.num,
                                  "EFECTIVO_CAJA"
                                )
                              }
                              className="bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl"
                            >
                              Cobrar S/ 15 (Efectivo)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleCobrarTicketSeparado(
                                  inspectedTicket.num,
                                  "YAPE"
                                )
                              }
                              className="bg-purple-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl"
                            >
                              Cobrar S/ 15 (Yape)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleLiberarTicketSeparado(inspectedTicket.num)
                              }
                              className="bg-red-100 text-red-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Liberar
                            </button>
                          </>
                        )}
                      {inspectedTicket.paymentStatus === "PAGADO" &&
                        inspectedTicket.deliveryStatus === "PENDIENTE" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEntregarPlato(inspectedTicket.num)
                            }
                            className="bg-stone-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl"
                          >
                            Entregar Plato Ahora
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 3: ENTREGAR PLATO
           =================================================================== */}
        {activeTab === "ENTREGAR" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-stone-900">
                  Despacho de Platos
                </h2>
                <p className="text-xs text-stone-500">
                  Platos entregados:{" "}
                  <strong className="text-emerald-700">
                    {metrics.entregadosCount}
                  </strong>{" "}
                  | Quedan físicamente:{" "}
                  <strong className="text-blue-700">
                    {metrics.platosQuedanFisicamente}
                  </strong>
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={deliveryQuery}
                onChange={(e) => setDeliveryQuery(e.target.value)}
                placeholder="Busca por N.º de ticket (ej. 015) o nombre del comprador..."
                className="w-full pl-10 pr-4 py-3 border-2 border-stone-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="space-y-2.5">
              {deliveryList.map((t) => (
                <div
                  key={t.num}
                  className={`p-4 rounded-xl border-2 flex flex-wrap justify-between items-center gap-3 ${
                    t.deliveryStatus === "ENTREGADO"
                      ? "bg-stone-100 border-stone-300"
                      : t.paymentStatus === "PAGADO"
                      ? "bg-emerald-50 border-emerald-500"
                      : "bg-amber-50 border-amber-400"
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-base">
                      Ticket N.º {t.code}
                    </span>
                    <p className="text-sm font-bold text-stone-800">
                      {t.buyerName || "Sin nombre"}
                    </p>
                    <p className="text-xs text-stone-500">
                      Estado de pago: <strong>{t.paymentStatus}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {t.paymentStatus !== "PAGADO" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleCobrarTicketSeparado(t.num, "EFECTIVO_CAJA")
                          }
                          className="bg-amber-600 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl"
                        >
                          Cobrar S/ 15 (Efectivo)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCobrarTicketSeparado(t.num, "YAPE")
                          }
                          className="bg-purple-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl"
                        >
                          Cobrar Yape
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEntregarPlato(t.num)}
                      disabled={t.deliveryStatus === "ENTREGADO"}
                      className={`text-xs font-extrabold px-4 py-2.5 rounded-xl ${
                        t.deliveryStatus === "ENTREGADO"
                          ? "bg-stone-300 text-stone-600"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                    >
                      {t.deliveryStatus === "ENTREGADO"
                        ? `Entregado (${t.deliveredAt || ""})`
                        : "Entregar Plato"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 4: FIESTA, BARRA Y GASTOS (USANDO LA PLATA QUE VA ENTRANDO)
           =================================================================== */}
        {activeTab === "FIESTA" && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-lg font-extrabold text-stone-900">
                  Pagar Compras o Gastos con la Plata del Evento
                </h2>
                <p className="text-xs text-stone-600">
                  Efectivo disponible ahora en Caja:{" "}
                  <strong className="text-emerald-700">
                    {formatPEN(metrics.efectivoDisponibleCajaCents)}
                  </strong>{" "}
                  | Saldo Yape:{" "}
                  <strong className="text-purple-700">
                    {formatPEN(metrics.saldoDisponibleYapeCents)}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: "COMPRA_BARRA",
                      label: "Comprar Gaseosa / Agua / Cigarros",
                    },
                    { id: "GASTO_FIESTA", label: "Pagar DJ / Fiesta / Local" },
                    { id: "PAGO_POLLOS", label: "Pagar Pollos al Proveedor" },
                  ] as { id: ExpenseCategory; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setExpenseType(t.id)}
                    className={`p-2.5 rounded-xl text-xs font-extrabold border ${
                      expenseType === t.id
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-stone-50 text-stone-700 border-stone-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {expenseType === "COMPRA_BARRA" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700">
                      Producto que estás comprando
                    </label>
                    <select
                      value={selectedBarProductId}
                      onChange={(e) => setSelectedBarProductId(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-lg bg-white text-xs font-bold"
                    >
                      {barItems.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700">
                      Unidades que entran a Barra
                    </label>
                    <input
                      type="number"
                      value={addedBarUnits}
                      onChange={(e) => setAddedBarUnits(e.target.value)}
                      placeholder="Ej. 24"
                      className="w-full mt-1 p-2 border rounded-lg text-xs font-extrabold bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700">
                    Detalle / Concepto
                  </label>
                  <input
                    type="text"
                    value={expenseConcept}
                    onChange={(e) => setExpenseConcept(e.target.value)}
                    placeholder={
                      expenseType === "GASTO_FIESTA"
                        ? "Ej. Pago de DJ o Hielo"
                        : "Ej. Paquete de gaseosas / cigarros"
                    }
                    className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700">
                    Monto Total Pagado (S/)
                  </label>
                  <input
                    type="number"
                    value={expenseAmountSoles}
                    onChange={(e) => setExpenseAmountSoles(e.target.value)}
                    placeholder="Ej. 120"
                    className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl text-sm font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  ¿De dónde sale la plata para pagar esto?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: "EFECTIVO_CAJA",
                        label: "Del Efectivo de Caja",
                      },
                      { id: "YAPE_EVENTO", label: "Del Yape del Evento" },
                      { id: "POR_PAGAR", label: "Anotar por Pagar" },
                    ] as { id: ExpenseOrigin; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setExpensePayOrigin(o.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border ${
                        expensePayOrigin === o.id
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-stone-50 text-stone-700 border-stone-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRegistrarCompraOGastoConCaja}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 rounded-xl text-sm shadow"
              >
                Registrar Compra / Gasto
              </button>
            </div>

            {/* Historial de Gastos y Catálogo de Barra */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
                <h3 className="font-extrabold text-sm uppercase text-stone-800">
                  Precios de Venta en la Barra de la Fiesta
                </h3>
                <div className="space-y-2">
                  {barItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 border text-xs"
                    >
                      <div>
                        <span className="font-bold text-stone-900">
                          {item.name}
                        </span>{" "}
                        <span className="text-stone-500">
                          (Stock: {item.stock} | Vendidos: {item.soldQty})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Precio S/:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={(item.unitPriceCents / 100).toFixed(2)}
                          onChange={(e) => {
                            const val = Math.round(
                              (parseFloat(e.target.value) || 0) * 100
                            );
                            const nextBar = barItems.map((b) =>
                              b.id === item.id
                                ? { ...b, unitPriceCents: val }
                                : b
                            );
                            setBarItems(nextBar);
                            void saveToCloud({ barItems: nextBar });
                          }}
                          className="w-16 p-1 border rounded font-bold text-center bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Añadir nuevo producto a la barra */}
                <div className="pt-2 border-t flex gap-2">
                  <input
                    type="text"
                    placeholder="Otro producto (ej. Chicha)"
                    value={newBarItemName}
                    onChange={(e) => setNewBarItemName(e.target.value)}
                    className="flex-1 p-2 border rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Precio S/"
                    value={newBarItemPriceSoles}
                    onChange={(e) => setNewBarItemPriceSoles(e.target.value)}
                    className="w-24 p-2 border rounded-xl text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAgregarProductoBarra}
                    className="bg-stone-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
                <h3 className="font-extrabold text-sm uppercase text-stone-800">
                  Compras y Gastos Realizados (
                  {formatPEN(metrics.gastosTotalesCents)})
                </h3>
                {expenses.length === 0 ? (
                  <p className="text-xs text-stone-500">
                    Aún no has registrado compras ni gastos.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {expenses.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">
                            {e.concept}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {e.time} •{" "}
                            {e.payOrigin === "EFECTIVO_CAJA"
                              ? "Pagado con Efectivo de Caja"
                              : e.payOrigin === "YAPE_EVENTO"
                              ? "Pagado con Yape"
                              : "Pendiente de Pagar"}
                          </div>
                        </div>
                        <strong className="text-red-700 text-sm">
                          - {formatPEN(e.amountCents)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 5: ARQUEO DE CAJA
           =================================================================== */}
        {activeTab === "CAJA" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-5">
            <h2 className="text-lg font-extrabold text-stone-900">
              Control de Efectivo en Caja y Yape
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-stone-50 border space-y-2 text-sm">
                <h3 className="font-extrabold text-xs uppercase text-stone-500">
                  Efectivo Físico en el Cajón
                </h3>
                <div className="flex justify-between">
                  <span>Fondo inicial para vuelto:</span>
                  <strong>{formatPEN(fondoInicialCajaCents)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>+ Entradas en efectivo (Polladas + Barra):</span>
                  <strong className="text-emerald-700">
                    + {formatPEN(metrics.entradasEfectivoCajaCents)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>
                    − Compras y pagos hechos con efectivo de caja:
                  </span>
                  <strong className="text-red-600">
                    - {formatPEN(metrics.salidasEfectivoCajaCents)}
                  </strong>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-extrabold">
                  <span>Efectivo que DEBE haber en Caja:</span>
                  <span className="text-orange-800">
                    {formatPEN(metrics.efectivoDisponibleCajaCents)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border space-y-3">
                <label className="block text-xs font-extrabold uppercase text-stone-700">
                  Billetes y monedas que cuentas físicamente (S/):
                </label>
                <input
                  type="number"
                  value={(conteoFisicoRealCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const val = Math.round(
                      (parseFloat(e.target.value) || 0) * 100
                    );
                    setConteoFisicoRealCents(val);
                    void saveToCloud({ conteoFisicoRealCents: val });
                  }}
                  className="w-full p-2.5 border rounded-xl font-extrabold text-base bg-white"
                />
                <div className="flex justify-between text-sm font-extrabold">
                  <span>Diferencia de caja:</span>
                  <span
                    className={
                      metrics.diferenciaCajaCents === 0
                        ? "text-emerald-700"
                        : "text-red-600"
                    }
                  >
                    {formatPEN(metrics.diferenciaCajaCents)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-purple-900">
                  <span>Saldo disponible en Yape / Plin:</span>
                  <span>{formatPEN(metrics.saldoDisponibleYapeCents)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 6: RESUMEN ECONÓMICO DEL EVENTO
           =================================================================== */}
        {activeTab === "RESUMEN" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-extrabold text-lg text-stone-900">
                  Resumen General — {eventConfig.name}
                </h2>
                <p className="text-xs text-stone-600">
                  Capacidad: 250 Tickets | Polladas más ventas de Barra menos
                  compras y gastos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDescargarCSV}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm"
              >
                <Download className="w-4 h-4" />
                Exportar los 250 Tickets (CSV / Excel)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Tickets Libres
                </span>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">
                  {metrics.disponibles} / 250
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Pagados / Separados
                </span>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {metrics.pagadosCount}{" "}
                  <span className="text-sm text-amber-600">
                    ({metrics.reservadosSinPago} deben)
                  </span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Platos Entregados
                </span>
                <p className="text-2xl font-extrabold text-orange-700 mt-1">
                  {metrics.entregadosCount}{" "}
                  <span className="text-xs text-stone-500">
                    (Quedan {metrics.platosQuedanFisicamente})
                  </span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Ventas de Barra
                </span>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">
                  {formatPEN(metrics.ingresosBarraCents)}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-2.5 text-sm">
                <h3 className="font-extrabold text-sm uppercase text-stone-800 border-b pb-2">
                  1. ¿Dónde está la plata ahora mismo?
                </h3>
                <div className="flex justify-between">
                  <span>Efectivo disponible en Caja (sin vuelto inicial):</span>
                  <strong>
                    {formatPEN(
                      metrics.efectivoDisponibleCajaCents -
                        fondoInicialCajaCents
                    )}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Saldo disponible en Yape / Plin:</span>
                  <strong className="text-purple-800">
                    {formatPEN(metrics.saldoDisponibleYapeCents)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo en mano de vendedores (por rendir):</span>
                  <strong className="text-orange-700">
                    {formatPEN(metrics.faltaRendirVendedoresCents)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Tickets separados pendientes de cobro:</span>
                  <strong className="text-amber-700">
                    {formatPEN(metrics.faltaCobrarSeparadosCents)}
                  </strong>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-2.5 text-sm">
                <h3 className="font-extrabold text-sm uppercase text-emerald-900 border-b pb-2">
                  2. Resultado y Ganancia de la Actividad
                </h3>
                <div className="flex justify-between">
                  <span>+ Cobrado por Polladas ({metrics.pagadosCount}):</span>
                  <strong className="text-emerald-700">
                    + {formatPEN(metrics.cobradoTicketsCents)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>
                    + Cobrado en Barra (Gaseosa, Agua, Cigarros, etc.):
                  </span>
                  <strong className="text-blue-700">
                    + {formatPEN(metrics.ingresosBarraCents)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>− Total Compras y Gastos (Pollos, DJ, Barra):</span>
                  <strong className="text-red-600">
                    - {formatPEN(metrics.gastosTotalesCents)}
                  </strong>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-extrabold">
                  <span>Ganancia Neta Actual:</span>
                  <span
                    className={
                      metrics.gananciaNetaActualCents >= 0
                        ? "text-emerald-700"
                        : "text-red-600"
                    }
                  >
                    {formatPEN(metrics.gananciaNetaActualCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 7: VENDEDORES Y RENDICIONES
           =================================================================== */}
        {activeTab === "VENDEDORES" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">
              Rendición de Vendedores
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre de nuevo vendedor..."
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                className="flex-1 p-2.5 border rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSellerName.trim()) return;
                  const nextSellers: SellerRecord[] = [
                    ...sellers,
                    {
                      id: `SEL-${Date.now()}`,
                      name: newSellerName.trim(),
                      cashInHandCents: 0,
                      settledCents: 0,
                    },
                  ];
                  setSellers(nextSellers);
                  setNewSellerName("");
                  void saveToCloud({ sellers: nextSellers });
                  notify("Vendedor agregado.", "success");
                }}
                className="bg-stone-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl"
              >
                Agregar Vendedor
              </button>
            </div>

            <div className="space-y-2.5">
              {sellers.map((s) => {
                const pendiente = Math.max(
                  0,
                  s.cashInHandCents - s.settledCents
                );
                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border bg-stone-50 flex justify-between items-center text-sm"
                  >
                    <div>
                      <div className="font-extrabold">{s.name}</div>
                      <div className="text-xs text-stone-600">
                        Cobrado en mano: {formatPEN(s.cashInHandCents)} |
                        Entregado a Caja: {formatPEN(s.settledCents)} |{" "}
                        <strong className="text-orange-800">
                          Falta entregar: {formatPEN(pendiente)}
                        </strong>
                      </div>
                    </div>
                    {pendiente > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextSellers: SellerRecord[] = sellers.map(
                            (item) =>
                              item.id === s.id
                                ? { ...item, settledCents: item.cashInHandCents }
                                : item
                          );
                          const nextPayments: PaymentRecord[] = [
                            {
                              id: `REND-${Date.now()}`,
                              description: `Rendición de ${s.name}`,
                              amountCents: pendiente,
                              destination: "EFECTIVO_CAJA",
                              time: new Date().toLocaleTimeString("es-PE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            },
                            ...payments,
                          ];
                          const nextConteo = conteoFisicoRealCents + pendiente;
                          setSellers(nextSellers);
                          setPayments(nextPayments);
                          setConteoFisicoRealCents(nextConteo);
                          void saveToCloud({
                            sellers: nextSellers,
                            payments: nextPayments,
                            conteoFisicoRealCents: nextConteo,
                          });
                          notify(
                            `Recibidos ${formatPEN(pendiente)} de ${
                              s.name
                            } en Caja.`,
                            "success"
                          );
                        }}
                        className="bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl"
                      >
                        Recibir {formatPEN(pendiente)} en Caja
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 8: MENSAJES DE WHATSAPP
           =================================================================== */}
        {activeTab === "RECORDATORIOS" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">
              Enviar Ticket o Recordatorio por WhatsApp
            </h2>
            <div className="space-y-2">
              {tickets.filter((t) => t.assignmentStatus !== "DISPONIBLE")
                .length === 0 ? (
                <p className="text-xs text-stone-500">
                  Aún no hay tickets vendidos o separados.
                </p>
              ) : (
                tickets
                  .filter((t) => t.assignmentStatus !== "DISPONIBLE")
                  .map((t) => {
                    const msg = `Hola ${t.buyerName}, tu ticket de ${eventConfig.name} es el N.º ${t.code} (Estado: ${t.paymentStatus}). Te esperamos en ${eventConfig.address}. Código QR: ${t.qrToken}`;
                    return (
                      <div
                        key={t.num}
                        className="p-3 rounded-xl border bg-stone-50 flex justify-between items-center text-xs"
                      >
                        <div>
                          <strong>
                            Ticket #{t.code} — {t.buyerName}
                          </strong>{" "}
                          ({t.paymentStatus})
                        </div>
                        <a
                          href={`https://wa.me/${(t.buyerPhone || "").replace(
                            /\D/g,
                            ""
                          )}?text=${encodeURIComponent(msg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg"
                        >
                          Enviar WhatsApp
                        </a>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 9: DATOS DEL EVENTO
           =================================================================== */}
        {activeTab === "CONFIG" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-extrabold text-stone-900">
              Datos del Evento
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-700">
                  Nombre de la Actividad
                </label>
                <input
                  type="text"
                  value={eventConfig.name}
                  onChange={(e) => {
                    const next = { ...eventConfig, name: e.target.value };
                    setEventConfig(next);
                    void saveToCloud({ eventConfig: next });
                  }}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700">
                  Dirección / Local
                </label>
                <input
                  type="text"
                  value={eventConfig.address}
                  onChange={(e) => {
                    const next = { ...eventConfig, address: e.target.value };
                    setEventConfig(next);
                    void saveToCloud({ eventConfig: next });
                  }}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700">
                  Platos preparados para entregar (Base: 250)
                </label>
                <input
                  type="number"
                  value={pollosRecibidos}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setPollosRecibidos(val);
                    void saveToCloud({ pollosRecibidos: val });
                  }}
                  className="w-full mt-1 p-2.5 border rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700">
                  Fondo Inicial de Sencillo en Caja (S/)
                </label>
                <input
                  type="number"
                  value={(fondoInicialCajaCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const val = Math.round(
                      (parseFloat(e.target.value) || 0) * 100
                    );
                    setFondoInicialCajaCents(val);
                    void saveToCloud({ fondoInicialCajaCents: val });
                  }}
                  className="w-full mt-1 p-2.5 border rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR FIJA PARA CELULAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-300 shadow-lg z-30">
        <div className="max-w-6xl mx-auto grid grid-cols-5">
          {(
            [
              { id: "VENDER", label: "Vender", icon: Ticket },
              { id: "TICKETS", label: "250 Tickets", icon: QrCode },
              { id: "ENTREGAR", label: "Entregar", icon: Utensils },
              { id: "FIESTA", label: "Fiesta/Gastos", icon: Music },
              { id: "RESUMEN", label: "Resumen", icon: BarChart3 },
            ] as { id: TabId; label: string; icon: React.ElementType }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2.5 text-xs font-extrabold transition ${
                  isActive
                    ? "text-orange-700 bg-orange-50 border-t-4 border-orange-600"
                    : "text-stone-600"
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