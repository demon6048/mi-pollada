"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  Firestore,
} from "firebase/firestore";
import {
  Utensils,
  Ticket,
  QrCode,
  Wallet,
  Users,
  Settings,
  Search,
  Copy,
  Download,
  FolderPlus,
  Cloud,
  X,
  ShoppingBag,
  ShieldAlert,
  Lock,
  Unlock,
  Smartphone,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Trash2,
  Monitor,
  UserPlus,
} from "lucide-react";

/**
 * ============================================================================
 * 1. INTERFACES TYPESCRIPT (100% COMPATIBLES CON VERCEL NEXT.JS 16)
 * ============================================================================
 */
interface EventConfig {
  promoter: string;
  prefix: string;
  name: string;
  address: string;
  capacity: number;
  unitCostCents: number;
  unitPriceCents: number;
}

interface TicketItem {
  id: string;
  num: number;
  code: string;
  qrToken: string;
  agreedPriceCents: number;
  historicalCostCents: number;
  serviceType: string;
  assignmentStatus: string; // DISPONIBLE | RESERVADO | CONFIRMADO
  paymentStatus: string; // PENDIENTE | PAGADO
  deliveryStatus: string; // PENDIENTE | ENTREGADO
  paidCents: number;
  paymentMethod: string;
  paymentRef: string;
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
  time: string;
  description: string;
  amountCents: number;
  destination: string; // EFECTIVO_CAJA | YAPE_EVENTO | EFECTIVO_VENDEDOR
}

interface ExpenseRecord {
  id: string;
  time: string;
  category: string;
  concept: string;
  amountCents: number;
  payOrigin: string; // EFECTIVO_CAJA | YAPE_EVENTO | POR_PAGAR
  operator: string;
}

interface SellerRecord {
  id: string;
  name: string;
  phone?: string;
  cashInHandCents: number;
  settledCents: number;
}

interface AuditLogItem {
  id: string;
  time: string;
  category: string; // VENTA | DESPACHO | GASTO | ALERTA | SISTEMA
  severity: string; // INFO | WARNING | CRITICAL
  operator: string;
  device: string;
  title: string;
  detail: string;
}

interface EventSummaryItem {
  id: string;
  name: string;
}

interface ToastMessage {
  msg: string;
  type: string;
}

/**
 * ============================================================================
 * 2. CONFIGURACIÓN FIREBASE OFICIAL (PROYECTO mi-pollada-2026)
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
  console.error("Error inicializando Firebase:", error);
}

/**
 * ============================================================================
 * 3. FUNCIONES PURAS Y DETERMINISTAS (CERO ERRORES EN VERCEL BUILD)
 * ============================================================================
 */
const formatPEN = (cents: number = 0): string => {
  const soles = ((cents || 0) / 100).toFixed(2);
  return `S/ ${Number(soles).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getPeruTimeStr = (): string => {
  return new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const generateDeterministicToken = (prefix: string, num: number): string => {
  const code = String(num).padStart(3, "0");
  const hash = ((num * 7919 + 104729) % 999999)
    .toString(36)
    .toUpperCase()
    .padStart(4, "X");
  return `${prefix}-${code}-${hash}`;
};

const createInitial250Tickets = (
  prefix: string = "JCR1",
  priceCents: number = 1500,
  costCents: number = 900
): TicketItem[] => {
  return Array.from({ length: 250 }, (_, idx) => {
    const num = idx + 1;
    const code = String(num).padStart(3, "0");
    return {
      id: `TKT-${code}`,
      num,
      code,
      qrToken: generateDeterministicToken(prefix, num),
      agreedPriceCents: priceCents,
      historicalCostCents: costCents,
      serviceType: "MESA_LOCAL",
      assignmentStatus: "DISPONIBLE",
      paymentStatus: "PENDIENTE",
      deliveryStatus: "PENDIENTE",
      paidCents: 0,
      paymentMethod: "",
      paymentRef: "",
      sellerName: "Caja Principal",
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
    name: "Gaseosa Personal",
    unitPriceCents: 400,
    stock: 24,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-CERVEZA",
    name: "Cerveza 600ml",
    unitPriceCents: 1000,
    stock: 36,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-AGUA",
    name: "Agua Mineral",
    unitPriceCents: 250,
    stock: 24,
    soldQty: 0,
    totalRevenueCents: 0,
  },
  {
    id: "BAR-CHICHA",
    name: "Jarra Chicha Morada",
    unitPriceCents: 800,
    stock: 15,
    soldQty: 0,
    totalRevenueCents: 0,
  },
];

const createInitialSellers = (): SellerRecord[] => [
  {
    id: "SEL-1",
    name: "Caja Principal",
    phone: "",
    cashInHandCents: 0,
    settledCents: 0,
  },
  {
    id: "SEL-2",
    name: "Vendedor 1",
    phone: "",
    cashInHandCents: 0,
    settledCents: 0,
  },
  {
    id: "SEL-3",
    name: "Vendedor 2",
    phone: "",
    cashInHandCents: 0,
    settledCents: 0,
  },
  {
    id: "SEL-4",
    name: "Vendedor 3",
    phone: "",
    cashInHandCents: 0,
    settledCents: 0,
  },
];

const createInitialAuditLogs = (): AuditLogItem[] => [
  {
    id: "AUD-INIT-001",
    time: "Activo",
    category: "SISTEMA",
    severity: "INFO",
    operator: "JCR EVENTOS",
    device: "LAPTOP-CENTRAL",
    title: "Sistema JCR EVENTOS Inicializado",
    detail:
      "Base de datos en tiempo real y modo exclusivo para celulares de vendedores listos.",
  },
];

/**
 * ============================================================================
 * 4. COMPONENTE PRINCIPAL — JCR EVENTOS (MODO LAPTOP ADMIN + MODO CELULAR VENDEDOR)
 * ============================================================================
 */
export default function JcrEventosPolladaApp() {
  // Estado de conexión directa a Firebase (No se bloquea aunque Auth Anónimo esté apagado)
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("CONECTANDO");
  const [deviceTag, setDeviceTag] = useState<string>("CEL-JCR");
  const [activeOperator, setActiveOperator] =
    useState<string>("Caja Principal");

  // MODO DE VISTA:
  // "SOLO_VENDEDOR" -> Vista bloqueada para celulares (solo vende tickets y consulta padrón, no toca nada más)
  // "PANEL_COMPLETO" -> Vista completa para tu Laptop (Caja, Gastos, Vendedores, Antifraude, Config)
  const [viewMode, setViewMode] = useState<string>("PANEL_COMPLETO");
  const [lockedSellerByLink, setLockedSellerByLink] = useState<boolean>(false);
  const [sellerMobileSubTab, setSellerMobileSubTab] =
    useState<string>("VENDER_TICKET");

  // Clave Maestra (Candado para proteger tu Panel Completo y acciones críticas)
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(false);
  const [masterPin, setMasterPin] = useState<string>("2026");
  const [showMasterModal, setShowMasterModal] = useState<boolean>(false);
  const [masterPinInput, setMasterPinInput] = useState<string>("");
  const [pendingMasterAction, setPendingMasterAction] = useState<string>("");

  // Eventos / Actividades
  const [eventsList, setEventsList] = useState<EventSummaryItem[]>([
    {
      id: "evento-huanuco-principal",
      name: "JCR EVENTOS - Gran Pollada #1",
    },
  ]);
  const [currentEventId, setCurrentEventId] = useState<string>(
    "evento-huanuco-principal"
  );
  const [showNewEventModal, setShowNewEventModal] = useState<boolean>(false);
  const [newEventTitleInput, setNewEventTitleInput] = useState<string>("");

  // Pestaña activa en el Panel de Control Completo (Laptop)
  const [activeTab, setActiveTab] = useState<string>("VENDER");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<string>("TICKETS");

  const notify = (msg: string, type: string = "info") => {
    setToast({ msg, type });
  };

  // Datos Maestros sincronizados con Firebase
  const [eventConfig, setEventConfig] = useState<EventConfig>({
    promoter: "JCR EVENTOS",
    prefix: "JCR1",
    name: "Gran Pollada Bailable — JCR EVENTOS",
    address: "Huánuco, Perú",
    capacity: 250,
    unitCostCents: 900,
    unitPriceCents: 1500,
  });

  const [tickets, setTickets] = useState<TicketItem[]>(() =>
    createInitial250Tickets("JCR1", 1500, 900)
  );
  const [barItems, setBarItems] = useState<BarItem[]>(() =>
    createInitialBarItems()
  );
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>(() =>
    createInitialSellers()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    createInitialAuditLogs()
  );

  const [pollosRecibidos, setPollosRecibidos] = useState<number>(250);
  const [fondoInicialCajaCents, setFondoInicialCajaCents] =
    useState<number>(10000); // S/ 100.00
  const [conteoFisicoRealCents, setConteoFisicoRealCents] =
    useState<number>(10000);

  // Estados del Formulario POS de Tickets
  const [posTicketNums, setPosTicketNums] = useState<string>("1");
  const [posBuyerName, setPosBuyerName] = useState<string>("");
  const [posBuyerPhone, setPosBuyerPhone] = useState<string>("");
  const [posSellerName, setPosSellerName] = useState<string>("Caja Principal");
  const [posServiceType, setPosServiceType] = useState<string>("MESA_LOCAL");
  const [posPayMode, setPosPayMode] = useState<string>("EFECTIVO_CAJA");
  const [posBilleteSoles, setPosBilleteSoles] = useState<string>("20");
  const [posYapeRef, setPosYapeRef] = useState<string>("");
  const [posDeliverNow, setPosDeliverNow] = useState<boolean>(false);

  // Estados del Padrón 250 Tickets
  const [padronFilter, setPadronFilter] = useState<string>("TODOS");
  const [padronSearch, setPadronSearch] = useState<string>("");
  const [inspectedTicketNum, setInspectedTicketNum] = useState<number | null>(
    null
  );

  // Estados de Cocina y Despacho
  const [despachoSearch, setDespachoSearch] = useState<string>("");

  // Estados de Fiesta, Stock y Gastos
  const [expCategory, setExpCategory] = useState<string>("COMPRA_BARRA");
  const [expConcept, setExpConcept] = useState<string>("");
  const [expAmountSoles, setExpAmountSoles] = useState<string>("");
  const [expOrigin, setExpOrigin] = useState<string>("EFECTIVO_CAJA");
  const [expBarProductId, setExpBarProductId] =
    useState<string>("BAR-GASEOSA");
  const [expBarUnits, setExpBarUnits] = useState<string>("24");
  const [newBarName, setNewBarName] = useState<string>("");
  const [newBarPriceSoles, setNewBarPriceSoles] = useState<string>("");

  // Estados de Vendedores (Agregar Vendedor en Firebase)
  const [newSellerInput, setNewSellerInput] = useState<string>("");
  const [newSellerPhoneInput, setNewSellerPhoneInput] = useState<string>("");

  // Estados de Historial Antifraude
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditFilter, setAuditFilter] = useState<string>("TODOS");

  // Estados de Configuración
  const [newMasterPinInput, setNewMasterPinInput] = useState<string>("");

  // Detectar si abrieron un Link Exclusivo de Vendedor (?modo=vendedor&vendedor=Nombre)
  useEffect(() => {
    const tag = "CEL-" + String(Date.now()).slice(-4);
    setDeviceTag(tag);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modoParam = params.get("modo");
      const vendedorParam = params.get("vendedor");
      const eventoParam = params.get("evento");

      if (eventoParam) {
        setCurrentEventId(eventoParam);
      }

      if (modoParam === "vendedor") {
        setViewMode("SOLO_VENDEDOR");
        setIsMasterUnlocked(false);
        if (vendedorParam) {
          setActiveOperator(vendedorParam);
          setPosSellerName(vendedorParam);
          setLockedSellerByLink(true);
          setPosPayMode("EFECTIVO_VENDEDOR");
        }
      }
    }
  }, []);

  // Inicializar Firebase sin bloquear si Anonymous Auth no está habilitado en consola
  useEffect(() => {
    if (!firestoreDb) {
      setSyncStatus("ERROR_DB");
      return;
    }

    if (!firebaseAuth) {
      setDbReady(true);
      return;
    }

    signInAnonymously(firebaseAuth)
      .then(() => {
        setDbReady(true);
      })
      .catch((err) => {
        console.warn(
          "Aviso Auth Anónimo (operando directo con Firestore):",
          err
        );
        // Igual activamos dbReady para que Firestore lea y guarde sin bloquearse
        setDbReady(true);
      });

    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      setDbReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar cambios en tiempo real desde Firebase (Multi-celular + Laptop)
  useEffect(() => {
    if (!dbReady || !firestoreDb) return;

    const eventsColRef = collection(
      firestoreDb,
      "artifacts",
      APP_ID,
      "public",
      "data",
      "pollada_events"
    );

    const unsubList = onSnapshot(
      eventsColRef,
      (snapshot) => {
        const list: EventSummaryItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.eventConfig?.name || docSnap.id,
          });
        });
        if (list.length > 0) {
          setEventsList(list);
        }
      },
      (err) => console.warn("Aviso leyendo lista de eventos:", err)
    );

    const eventDocRef = doc(
      firestoreDb,
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
          const data = docSnap.data();
          if (data.eventConfig) {
            setEventConfig({
              promoter: data.eventConfig.promoter || "JCR EVENTOS",
              ...data.eventConfig,
            });
          }
          if (data.masterPin) setMasterPin(data.masterPin);
          if (data.tickets) {
            try {
              setTickets(JSON.parse(data.tickets));
            } catch (e) {
              console.error(e);
            }
          }
          if (data.barItems) {
            try {
              setBarItems(JSON.parse(data.barItems));
            } catch (e) {
              console.error(e);
            }
          }
          if (data.payments) {
            try {
              setPayments(JSON.parse(data.payments));
            } catch (e) {
              console.error(e);
            }
          }
          if (data.expenses) {
            try {
              setExpenses(JSON.parse(data.expenses));
            } catch (e) {
              console.error(e);
            }
          }
          if (data.sellers) {
            try {
              const parsedSellers: SellerRecord[] = JSON.parse(data.sellers);
              if (Array.isArray(parsedSellers) && parsedSellers.length > 0) {
                setSellers(parsedSellers);
              }
            } catch (e) {
              console.error(e);
            }
          }
          if (data.auditLogs) {
            try {
              setAuditLogs(JSON.parse(data.auditLogs));
            } catch (e) {
              console.error(e);
            }
          }
          if (typeof data.pollosRecibidos === "number")
            setPollosRecibidos(data.pollosRecibidos);
          if (typeof data.fondoInicialCajaCents === "number")
            setFondoInicialCajaCents(data.fondoInicialCajaCents);
          if (typeof data.conteoFisicoRealCents === "number")
            setConteoFisicoRealCents(data.conteoFisicoRealCents);
        } else {
          // Crear documento inicial en Firebase si aún no existe
          const initT = createInitial250Tickets("JCR1", 1500, 900);
          const initB = createInitialBarItems();
          const initS = createInitialSellers();
          const initA = createInitialAuditLogs();
          setDoc(
            eventDocRef,
            {
              eventConfig,
              masterPin,
              tickets: JSON.stringify(initT),
              barItems: JSON.stringify(initB),
              payments: JSON.stringify([]),
              expenses: JSON.stringify([]),
              sellers: JSON.stringify(initS),
              auditLogs: JSON.stringify(initA),
              pollosRecibidos: 250,
              fondoInicialCajaCents: 10000,
              conteoFisicoRealCents: 10000,
              updatedAt: Date.now(),
            },
            { merge: true }
          ).catch((e) => console.error("Error creando doc inicial:", e));
        }
      },
      (err) => {
        console.error("Error snapshot Firebase:", err);
        setSyncStatus("ERROR_REGLAS");
      }
    );

    return () => {
      unsubList();
      unsubDoc();
    };
  }, [dbReady, currentEventId]);

  // Guardar inmediatamente en Firebase con merge: true (Evita que un celular borre lo de otro)
  const saveToCloud = async (overrides: {
    eventConfig?: EventConfig;
    masterPin?: string;
    tickets?: TicketItem[];
    barItems?: BarItem[];
    payments?: PaymentRecord[];
    expenses?: ExpenseRecord[];
    sellers?: SellerRecord[];
    auditLogs?: AuditLogItem[];
    pollosRecibidos?: number;
    fondoInicialCajaCents?: number;
    conteoFisicoRealCents?: number;
  }) => {
    if (!firestoreDb) return;
    try {
      setSyncStatus("GUARDANDO");
      const eventDocRef = doc(
        firestoreDb,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "pollada_events",
        currentEventId
      );
      await setDoc(
        eventDocRef,
        {
          eventConfig: overrides.eventConfig ?? eventConfig,
          masterPin: overrides.masterPin ?? masterPin,
          tickets: JSON.stringify(overrides.tickets ?? tickets),
          barItems: JSON.stringify(overrides.barItems ?? barItems),
          payments: JSON.stringify(overrides.payments ?? payments),
          expenses: JSON.stringify(overrides.expenses ?? expenses),
          sellers: JSON.stringify(overrides.sellers ?? sellers),
          auditLogs: JSON.stringify(
            (overrides.auditLogs ?? auditLogs).slice(0, 250)
          ),
          pollosRecibidos: overrides.pollosRecibidos ?? pollosRecibidos,
          fondoInicialCajaCents:
            overrides.fondoInicialCajaCents ?? fondoInicialCajaCents,
          conteoFisicoRealCents:
            overrides.conteoFisicoRealCents ?? conteoFisicoRealCents,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setSyncStatus("EN_VIVO");
    } catch (e) {
      console.error("Error guardando en Firebase:", e);
      setSyncStatus("ERROR_GUARDADO");
      notify(
        "Atención: Revisa que las Reglas de Firestore estén en modo público (allow read, write: if true;).",
        "error"
      );
    }
  };

  // Generador de entradas para el Historial Antifraude
  const makeAuditEntry = (
    category: string,
    severity: string,
    title: string,
    detail: string
  ): AuditLogItem => {
    return {
      id: `AUD-${Date.now()}`,
      time: getPeruTimeStr(),
      category,
      severity,
      operator: activeOperator,
      device: deviceTag,
      title,
      detail,
    };
  };

  // Verificación de Clave Maestra
  const requireMasterAuth = (actionName: string): boolean => {
    if (isMasterUnlocked) return true;
    notify(
      `Acción protegida (${actionName}). Ingresa primero la Clave Maestra 🔒.`,
      "warning"
    );
    setPendingMasterAction(actionName);
    setMasterPinInput("");
    setShowMasterModal(true);
    return false;
  };

  const handleVerifyMasterPin = () => {
    if (masterPinInput.trim() === masterPin) {
      setIsMasterUnlocked(true);
      setShowMasterModal(false);
      if (pendingMasterAction === "ABRIR_PANEL_COMPLETO") {
        setViewMode("PANEL_COMPLETO");
        setLockedSellerByLink(false);
      }
      setPendingMasterAction("");
      const nextLogs = [
        makeAuditEntry(
          "ALERTA",
          "WARNING",
          "Clave Maestra Desbloqueada",
          `Acceso de Administrador habilitado por ${activeOperator}.`
        ),
        ...auditLogs,
      ];
      setAuditLogs(nextLogs);
      saveToCloud({ auditLogs: nextLogs });
      notify(
        "¡Clave Maestra verificada! Panel de Control Maestro desbloqueado.",
        "success"
      );
    } else {
      const nextLogs = [
        makeAuditEntry(
          "ALERTA",
          "CRITICAL",
          "🚨 Intento Fallido de Clave Maestra",
          `PIN incorrecto ingresado desde el dispositivo de ${activeOperator}.`
        ),
        ...auditLogs,
      ];
      setAuditLogs(nextLogs);
      saveToCloud({ auditLogs: nextLogs });
      notify(
        "Clave Maestra incorrecta. El intento quedó grabado en el Historial Antifraude.",
        "error"
      );
    }
  };

  /**
   * ==========================================================================
   * 5. CÁLCULO DE MÉTRICAS EN TIEMPO REAL
   * ==========================================================================
   */
  const metrics = useMemo(() => {
    const disponibles = tickets.filter(
      (t) => t.assignmentStatus === "DISPONIBLE"
    ).length;
    const separados = tickets.filter(
      (t) => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO"
    ).length;
    const pagados = tickets.filter((t) => t.paymentStatus === "PAGADO").length;
    const entregados = tickets.filter(
      (t) => t.deliveryStatus === "ENTREGADO"
    ).length;

    const cobradoTicketsCents = tickets.reduce(
      (acc, t) => acc + (t.paidCents || 0),
      0
    );
    const faltaCobrarSeparadosCents = separados * eventConfig.unitPriceCents;
    const ingresosBarraCents = barItems.reduce(
      (acc, b) => acc + (b.totalRevenueCents || 0),
      0
    );

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

    const gastosTotalesCents = expenses.reduce(
      (acc, e) => acc + e.amountCents,
      0
    );

    const efectivoDisponibleCajaCents =
      fondoInicialCajaCents +
      entradasEfectivoCajaCents -
      salidasEfectivoCajaCents;

    const saldoDisponibleYapeCents = entradasYapeCents - salidasYapeCents;
    const diferenciaCajaCents =
      conteoFisicoRealCents - efectivoDisponibleCajaCents;

    const faltaRendirVendedoresCents = sellers.reduce(
      (acc, s) => acc + Math.max(0, s.cashInHandCents - s.settledCents),
      0
    );

    const platosQuedan = Math.max(0, pollosRecibidos - entregados);
    const gananciaNetaCents =
      cobradoTicketsCents + ingresosBarraCents - gastosTotalesCents;

    // Estadísticas exclusivas del vendedor activo en este celular
    const misTicketsVendidos = tickets.filter(
      (t) =>
        t.sellerName === activeOperator && t.assignmentStatus !== "DISPONIBLE"
    );
    const misTicketsPagados = misTicketsVendidos.filter(
      (t) => t.paymentStatus === "PAGADO"
    ).length;
    const misTicketsSeparados = misTicketsVendidos.filter(
      (t) => t.paymentStatus !== "PAGADO"
    ).length;
    const miSellerRecord = sellers.find((s) => s.name === activeOperator);
    const miEfectivoPorRendirCents = miSellerRecord
      ? Math.max(0, miSellerRecord.cashInHandCents - miSellerRecord.settledCents)
      : 0;

    return {
      disponibles,
      separados,
      pagados,
      entregados,
      cobradoTicketsCents,
      faltaCobrarSeparadosCents,
      ingresosBarraCents,
      entradasEfectivoCajaCents,
      salidasEfectivoCajaCents,
      efectivoDisponibleCajaCents,
      saldoDisponibleYapeCents,
      gastosTotalesCents,
      diferenciaCajaCents,
      faltaRendirVendedoresCents,
      platosQuedan,
      gananciaNetaCents,
      misTicketsTotal: misTicketsVendidos.length,
      misTicketsPagados,
      misTicketsSeparados,
      miEfectivoPorRendirCents,
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
    activeOperator,
  ]);

  const parsedPosNums = useMemo(() => {
    return Array.from(
      new Set(
        posTicketNums
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n >= 1 && n <= 250)
      )
    );
  }, [posTicketNums]);

  const posTotalCobrarCents =
    (parsedPosNums.length || 1) * eventConfig.unitPriceCents;
  const posVueltoCents = Math.max(
    0,
    Math.round((parseFloat(posBilleteSoles) || 0) * 100) - posTotalCobrarCents
  );

  /**
   * ==========================================================================
   * 6. OPERACIONES DE NEGOCIO Y SINCRONIZACIÓN CON FIREBASE
   * ==========================================================================
   */
  const handleSellOrReserveTickets = async () => {
    if (parsedPosNums.length === 0) {
      notify("Ingresa un número de ticket válido del 1 al 250.", "error");
      return;
    }

    const occupied = tickets.filter(
      (t) =>
        parsedPosNums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE"
    );
    if (occupied.length > 0) {
      notify(
        `El ticket #${occupied[0].code} ya fue vendido o separado para ${occupied[0].buyerName}. Elige otro número.`,
        "error"
      );
      return;
    }

    const buyer = posBuyerName.trim() || "Cliente Directo";
    const phone = posBuyerPhone.trim();
    // Si está en Modo Exclusivo Vendedor, forzamos que el vendedor sea el operador activo
    const seller =
      viewMode === "SOLO_VENDEDOR"
        ? activeOperator
        : posSellerName || activeOperator;
    const isSeparar = posPayMode === "SOLO_SEPARAR";
    const totalCents = parsedPosNums.length * eventConfig.unitPriceCents;
    const timeStr = getPeruTimeStr();

    const nextTickets = tickets.map((t) => {
      if (!parsedPosNums.includes(t.num)) return t;
      return {
        ...t,
        buyerName: buyer,
        buyerPhone: phone,
        sellerName: seller,
        serviceType: posServiceType,
        assignmentStatus: isSeparar ? "RESERVADO" : "CONFIRMADO",
        paymentStatus: isSeparar ? "PENDIENTE" : "PAGADO",
        paidCents: isSeparar ? 0 : t.agreedPriceCents,
        paymentMethod: isSeparar ? "" : posPayMode,
        paymentRef: posYapeRef.trim(),
        deliveryStatus:
          !isSeparar && posDeliverNow && viewMode === "PANEL_COMPLETO"
            ? "ENTREGADO"
            : "PENDIENTE",
        deliveredAt:
          !isSeparar && posDeliverNow && viewMode === "PANEL_COMPLETO"
            ? timeStr
            : null,
        deliveredBy:
          !isSeparar && posDeliverNow && viewMode === "PANEL_COMPLETO"
            ? activeOperator
            : null,
      };
    });

    let nextPayments = [...payments];
    let nextSellers = [...sellers];
    let nextConteo = conteoFisicoRealCents;

    const codesText = parsedPosNums
      .map((n) => String(n).padStart(3, "0"))
      .join(", ");

    if (!isSeparar) {
      nextPayments = [
        {
          id: `PAY-${Date.now()}`,
          time: timeStr,
          description: `Ticket(s) #${codesText} (${buyer}) - Vend: ${seller}`,
          amountCents: totalCents,
          destination: posPayMode,
        },
        ...payments,
      ];

      if (posPayMode === "EFECTIVO_CAJA") {
        nextConteo += totalCents;
      } else if (posPayMode === "EFECTIVO_VENDEDOR") {
        const sellerExists = sellers.some((s) => s.name === seller);
        if (sellerExists) {
          nextSellers = sellers.map((s) =>
            s.name === seller
              ? { ...s, cashInHandCents: s.cashInHandCents + totalCents }
              : s
          );
        } else {
          nextSellers = [
            ...sellers,
            {
              id: `SEL-${Date.now()}`,
              name: seller,
              phone: "",
              cashInHandCents: totalCents,
              settledCents: 0,
            },
          ];
        }
      }
    }

    const nextLogs = [
      makeAuditEntry(
        "VENTA",
        "INFO",
        isSeparar
          ? `Ticket(s) Separado(s): #${codesText}`
          : `Venta Confirmada: Ticket(s) #${codesText}`,
        `Cliente: ${buyer} | Vendedor: ${seller} | Modalidad: ${posServiceType} | Pago: ${
          isSeparar ? "PENDIENTE" : `${formatPEN(totalCents)} (${posPayMode})`
        } ${posYapeRef ? `| Ref: ${posYapeRef}` : ""}`
      ),
      ...auditLogs,
    ];

    setTickets(nextTickets);
    setPayments(nextPayments);
    setSellers(nextSellers);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);

    await saveToCloud({
      tickets: nextTickets,
      payments: nextPayments,
      sellers: nextSellers,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    const nextFree = nextTickets.find(
      (t) => t.assignmentStatus === "DISPONIBLE"
    );
    if (nextFree) setPosTicketNums(String(nextFree.num));
    setPosBuyerName("");
    setPosBuyerPhone("");
    setPosYapeRef("");
    setPosDeliverNow(false);

    notify(
      isSeparar
        ? `Ticket(s) #${codesText} separado(s) para ${buyer}. Guardado en Firebase.`
        : `¡Venta exitosa! Ticket(s) #${codesText} por ${formatPEN(
            totalCents
          )} sincronizado en vivo.`,
      "success"
    );
  };

  // AGREGAR VENDEDOR Y GUARDAR EN FIREBASE AL INSTANTE
  const handleAddSeller = async () => {
    const cleanName = newSellerInput.trim();
    const cleanPhone = newSellerPhoneInput.trim();
    if (!cleanName) {
      notify("Escribe el nombre del vendedor antes de agregarlo.", "warning");
      return;
    }
    if (sellers.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      notify(`El vendedor «${cleanName}» ya está registrado.`, "warning");
      return;
    }

    const newSellerObj: SellerRecord = {
      id: `SEL-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      cashInHandCents: 0,
      settledCents: 0,
    };

    const nextSellers: SellerRecord[] = [...sellers, newSellerObj];

    const nextLogs = [
      makeAuditEntry(
        "SISTEMA",
        "INFO",
        `Nuevo Vendedor Agregado en Base de Datos: ${cleanName}`,
        `Habilitado por ${activeOperator} para vender desde su celular.`
      ),
      ...auditLogs,
    ];

    // Actualizamos estado local y guardamos inmediatamente en Firebase
    setSellers(nextSellers);
    setAuditLogs(nextLogs);
    setNewSellerInput("");
    setNewSellerPhoneInput("");

    await saveToCloud({ sellers: nextSellers, auditLogs: nextLogs });
    notify(
      `¡Vendedor «${cleanName}» guardado en Firebase! Ya aparece en todos los celulares.`,
      "success"
    );
  };

  // Eliminar vendedor (Protegido con Clave Maestra)
  const handleDeleteSeller = async (sellerId: string) => {
    if (!requireMasterAuth("Eliminar Vendedor")) return;
    const target = sellers.find((s) => s.id === sellerId);
    if (!target) return;
    if (sellers.length <= 1) {
      notify("Debe quedar al menos un operador principal.", "warning");
      return;
    }
    const pending = Math.max(0, target.cashInHandCents - target.settledCents);
    if (pending > 0) {
      notify(
        `No puedes eliminar a ${target.name} porque aún tiene ${formatPEN(
          pending
        )} por rendir a Caja.`,
        "error"
      );
      return;
    }

    const nextSellers = sellers.filter((s) => s.id !== sellerId);
    const nextLogs = [
      makeAuditEntry(
        "ALERTA",
        "WARNING",
        `Vendedor Eliminado: ${target.name}`,
        `Eliminado de la base de datos por ${activeOperator}.`
      ),
      ...auditLogs,
    ];

    setSellers(nextSellers);
    setAuditLogs(nextLogs);
    await saveToCloud({ sellers: nextSellers, auditLogs: nextLogs });
    notify(`Vendedor «${target.name}» eliminado de Firebase.`, "info");
  };

  // Generar enlace exclusivo de venta para el celular de un vendedor
  const getSellerExclusiveUrl = (sellerName: string): string => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : "https://mi-pollada.vercel.app";
    return `${baseUrl}?modo=vendedor&vendedor=${encodeURIComponent(
      sellerName
    )}&evento=${encodeURIComponent(currentEventId)}`;
  };

  const handlePayReservedTicket = async (
    ticketNum: number,
    method: string = "EFECTIVO_CAJA"
  ) => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target || target.paymentStatus === "PAGADO") return;

    const monto = target.agreedPriceCents;
    const timeStr = getPeruTimeStr();

    // Si lo cobra un vendedor en Modo Vendedor y elige Efectivo, suma a la bolsa del vendedor
    const actualDestination =
      viewMode === "SOLO_VENDEDOR" && method === "EFECTIVO_CAJA"
        ? "EFECTIVO_VENDEDOR"
        : method;

    const nextTickets = tickets.map((t) =>
      t.num === ticketNum
        ? {
            ...t,
            assignmentStatus: "CONFIRMADO",
            paymentStatus: "PAGADO",
            paidCents: monto,
            paymentMethod: actualDestination,
          }
        : t
    );

    const nextPayments = [
      {
        id: `PAY-${Date.now()}`,
        time: timeStr,
        description: `Cobro Ticket #${target.code} (${target.buyerName})`,
        amountCents: monto,
        destination: actualDestination,
      },
      ...payments,
    ];

    let nextSellers = [...sellers];
    if (actualDestination === "EFECTIVO_VENDEDOR") {
      nextSellers = sellers.map((s) =>
        s.name === activeOperator
          ? { ...s, cashInHandCents: s.cashInHandCents + monto }
          : s
      );
    }

    const nextConteo =
      actualDestination === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents + monto
        : conteoFisicoRealCents;

    const nextLogs = [
      makeAuditEntry(
        "VENTA",
        "INFO",
        `Cobro de Ticket Separado #${target.code}`,
        `Cliente ${target.buyerName} canceló ${formatPEN(
          monto
        )} vía ${actualDestination} (Operador: ${activeOperator}).`
      ),
      ...auditLogs,
    ];

    setTickets(nextTickets);
    setPayments(nextPayments);
    setSellers(nextSellers);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);

    await saveToCloud({
      tickets: nextTickets,
      payments: nextPayments,
      sellers: nextSellers,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    notify(
      `Ticket #${target.code} cobrado exitosamente (${formatPEN(monto)}).`,
      "success"
    );
  };

  const handleDeliverPlate = async (ticketNum: number) => {
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;

    if (target.deliveryStatus === "ENTREGADO") {
      const nextLogs = [
        makeAuditEntry(
          "ALERTA",
          "CRITICAL",
          `🚨 INTENTO DE DOBLE RECOJO EN TICKET #${target.code}`,
          `El ticket #${target.code} (${target.buyerName}) YA FUE ENTREGADO a las ${target.deliveredAt} por ${target.deliveredBy}.`
        ),
        ...auditLogs,
      ];
      setAuditLogs(nextLogs);
      await saveToCloud({ auditLogs: nextLogs });
      notify(
        `¡ALERTA ANTIFRAUDE! El ticket #${target.code} YA FUE ENTREGADO a las ${target.deliveredAt}.`,
        "error"
      );
      return;
    }

    if (target.paymentStatus !== "PAGADO") {
      notify(
        `El ticket #${target.code} aún FALTA PAGAR (${formatPEN(
          target.agreedPriceCents
        )}). Cóbralo primero antes de despachar.`,
        "warning"
      );
      return;
    }

    const timeStr = getPeruTimeStr();
    const nextTickets = tickets.map((t) =>
      t.num === ticketNum
        ? {
            ...t,
            deliveryStatus: "ENTREGADO",
            deliveredAt: timeStr,
            deliveredBy: activeOperator,
          }
        : t
    );

    const nextLogs = [
      makeAuditEntry(
        "DESPACHO",
        "INFO",
        `Plato Despachado — Ticket #${target.code}`,
        `Entregado a ${target.buyerName} (${target.serviceType}) por ${activeOperator}.`
      ),
      ...auditLogs,
    ];

    setTickets(nextTickets);
    setAuditLogs(nextLogs);
    await saveToCloud({ tickets: nextTickets, auditLogs: nextLogs });

    notify(
      `¡Plato entregado! Ticket #${target.code} marcado como ENTREGADO.`,
      "success"
    );
  };

  const handleVoidTicket = async (ticketNum: number) => {
    if (!requireMasterAuth("Anular Ticket")) return;
    const target = tickets.find((t) => t.num === ticketNum);
    if (!target) return;

    const prevBuyer = target.buyerName;
    const prevPaid = target.paidCents;
    const prevMethod = target.paymentMethod;

    let nextConteo = conteoFisicoRealCents;
    let nextPayments = [...payments];

    if (prevPaid > 0 && prevMethod === "EFECTIVO_CAJA") {
      nextConteo = Math.max(0, conteoFisicoRealCents - prevPaid);
      nextPayments = [
        {
          id: `VOID-${Date.now()}`,
          time: getPeruTimeStr(),
          description: `Reverso por Anulación Ticket #${target.code}`,
          amountCents: -prevPaid,
          destination: "EFECTIVO_CAJA",
        },
        ...payments,
      ];
    }

    const nextTickets = tickets.map((t) =>
      t.num === ticketNum
        ? {
            ...t,
            assignmentStatus: "DISPONIBLE",
            paymentStatus: "PENDIENTE",
            deliveryStatus: "PENDIENTE",
            paidCents: 0,
            paymentMethod: "",
            paymentRef: "",
            buyerName: "",
            buyerPhone: "",
            deliveredAt: null,
            deliveredBy: null,
          }
        : t
    );

    const nextLogs = [
      makeAuditEntry(
        "ALERTA",
        "CRITICAL",
        `🚨 ANULACIÓN DE TICKET #${target.code} (CLAVE MAESTRA)`,
        `Ticket de ${prevBuyer} (${formatPEN(
          prevPaid
        )}) fue anulado y liberado por ${activeOperator}.`
      ),
      ...auditLogs,
    ];

    setTickets(nextTickets);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);
    setInspectedTicketNum(null);

    await saveToCloud({
      tickets: nextTickets,
      payments: nextPayments,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    notify(
      `Ticket #${target.code} anulado y liberado. Movimiento grabado en Auditoría Antifraude.`,
      "warning"
    );
  };

  const handleSellBarItem = async (
    itemId: string,
    method: string = "EFECTIVO_CAJA"
  ) => {
    const target = barItems.find((b) => b.id === itemId);
    if (!target) return;
    if (target.stock <= 0) {
      notify(
        `Sin stock de ${target.name}. Abastece más unidades en la pestaña Fiesta y Gastos.`,
        "warning"
      );
      return;
    }

    const timeStr = getPeruTimeStr();
    const nextBar = barItems.map((b) =>
      b.id === itemId
        ? {
            ...b,
            stock: b.stock - 1,
            soldQty: b.soldQty + 1,
            totalRevenueCents: b.totalRevenueCents + b.unitPriceCents,
          }
        : b
    );

    const nextPayments = [
      {
        id: `BAR-${Date.now()}`,
        time: timeStr,
        description: `Barra: 1x ${target.name}`,
        amountCents: target.unitPriceCents,
        destination: method,
      },
      ...payments,
    ];

    const nextConteo =
      method === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents + target.unitPriceCents
        : conteoFisicoRealCents;

    const nextLogs = [
      makeAuditEntry(
        "GASTO",
        "INFO",
        `Venta Barra: 1x ${target.name}`,
        `Ingreso +${formatPEN(
          target.unitPriceCents
        )} en ${method}. Stock restante: ${target.stock - 1}.`
      ),
      ...auditLogs,
    ];

    setBarItems(nextBar);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);

    await saveToCloud({
      barItems: nextBar,
      payments: nextPayments,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    notify(
      `Vendido 1 ${target.name} (+${formatPEN(target.unitPriceCents)}).`,
      "success"
    );
  };

  const handleRegisterExpense = async () => {
    const amountCents = Math.round((parseFloat(expAmountSoles) || 0) * 100);
    if (amountCents <= 0) {
      notify("Ingresa un monto válido en Soles.", "error");
      return;
    }

    const timeStr = getPeruTimeStr();
    let finalConcept = expConcept.trim();
    let nextBar = [...barItems];

    if (expCategory === "COMPRA_BARRA") {
      const targetBar = barItems.find((b) => b.id === expBarProductId);
      const units = parseInt(expBarUnits || "0", 10) || 0;
      finalConcept =
        finalConcept ||
        `Abastecimiento Barra: +${units} und. de ${
          targetBar ? targetBar.name : "Bebida"
        }`;
      if (units > 0) {
        nextBar = barItems.map((b) =>
          b.id === expBarProductId ? { ...b, stock: b.stock + units } : b
        );
      }
    } else if (expCategory === "PAGO_POLLOS") {
      finalConcept = finalConcept || "Compra de Pollos / Carbón / Insumos";
    } else {
      finalConcept = finalConcept || "Gasto de Fiesta / Sonido / Local";
    }

    const newExp: ExpenseRecord = {
      id: `EXP-${Date.now()}`,
      time: timeStr,
      category: expCategory,
      concept: finalConcept,
      amountCents,
      payOrigin: expOrigin,
      operator: activeOperator,
    };

    const nextExpenses = [newExp, ...expenses];
    const nextConteo =
      expOrigin === "EFECTIVO_CAJA"
        ? conteoFisicoRealCents - amountCents
        : conteoFisicoRealCents;

    const nextLogs = [
      makeAuditEntry(
        "GASTO",
        "WARNING",
        `Salida de Dinero: ${finalConcept}`,
        `Monto: −${formatPEN(amountCents)} pagado con ${expOrigin} por ${activeOperator}.`
      ),
      ...auditLogs,
    ];

    setExpenses(nextExpenses);
    setBarItems(nextBar);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);
    setExpConcept("");
    setExpAmountSoles("");

    await saveToCloud({
      expenses: nextExpenses,
      barItems: nextBar,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    notify(
      `Gasto registrado: ${finalConcept} (${formatPEN(amountCents)}).`,
      "success"
    );
  };

  const handleAddNewBarProduct = async () => {
    if (!requireMasterAuth("Añadir Producto a la Barra")) return;
    const priceCents = Math.round((parseFloat(newBarPriceSoles) || 0) * 100);
    if (!newBarName.trim() || priceCents <= 0) {
      notify("Completa el nombre y el precio del producto.", "error");
      return;
    }

    const newItem: BarItem = {
      id: `BAR-${Date.now()}`,
      name: newBarName.trim(),
      unitPriceCents: priceCents,
      stock: 0,
      soldQty: 0,
      totalRevenueCents: 0,
    };

    const nextBar = [...barItems, newItem];
    const nextLogs = [
      makeAuditEntry(
        "GASTO",
        "INFO",
        `Nuevo Producto en Barra: ${newItem.name}`,
        `Precio configurado: ${formatPEN(priceCents)}.`
      ),
      ...auditLogs,
    ];

    setBarItems(nextBar);
    setAuditLogs(nextLogs);
    setNewBarName("");
    setNewBarPriceSoles("");

    await saveToCloud({ barItems: nextBar, auditLogs: nextLogs });
    notify(`Producto «${newItem.name}» creado en la Barra.`, "success");
  };

  const handleSettleSellerCash = async (sellerId: string) => {
    if (!requireMasterAuth("Recibir Rendición de Vendedor")) return;
    const target = sellers.find((s) => s.id === sellerId);
    if (!target) return;

    const pending = Math.max(0, target.cashInHandCents - target.settledCents);
    if (pending <= 0) return;

    const nextSellers = sellers.map((s) =>
      s.id === sellerId ? { ...s, settledCents: s.cashInHandCents } : s
    );

    const nextPayments = [
      {
        id: `REND-${Date.now()}`,
        time: getPeruTimeStr(),
        description: `Rendición de efectivo de ${target.name}`,
        amountCents: pending,
        destination: "EFECTIVO_CAJA",
      },
      ...payments,
    ];

    const nextConteo = conteoFisicoRealCents + pending;

    const nextLogs = [
      makeAuditEntry(
        "VENTA",
        "WARNING",
        `Rendición Recibida de ${target.name}`,
        `Entregó ${formatPEN(
          pending
        )} en efectivo a Caja Principal (Autorizado con Clave Maestra).`
      ),
      ...auditLogs,
    ];

    setSellers(nextSellers);
    setPayments(nextPayments);
    setConteoFisicoRealCents(nextConteo);
    setAuditLogs(nextLogs);

    await saveToCloud({
      sellers: nextSellers,
      payments: nextPayments,
      conteoFisicoRealCents: nextConteo,
      auditLogs: nextLogs,
    });

    notify(
      `Recibidos ${formatPEN(pending)} de ${target.name} en Caja Principal.`,
      "success"
    );
  };

  const handleCreateNewEvent = async () => {
    if (!requireMasterAuth("Crear Nuevo Evento")) return;
    if (!newEventTitleInput.trim()) return;

    const slug = `jcr-evento-${Date.now()}`;
    const prefix = `JCR${eventsList.length + 1}`;
    const newCfg: EventConfig = {
      ...eventConfig,
      promoter: "JCR EVENTOS",
      prefix,
      name: newEventTitleInput.trim(),
    };

    const freshTickets = createInitial250Tickets(
      prefix,
      newCfg.unitPriceCents,
      newCfg.unitCostCents
    );
    const freshBar = createInitialBarItems();
    const freshLogs = [
      makeAuditEntry(
        "ALERTA",
        "WARNING",
        `Nuevo Evento JCR EVENTOS Creado: ${newCfg.name}`,
        "Padrón limpio de 250 tickets inicializado."
      ),
    ];

    setCurrentEventId(slug);
    setEventConfig(newCfg);
    setTickets(freshTickets);
    setBarItems(freshBar);
    setPayments([]);
    setExpenses([]);
    setAuditLogs(freshLogs);
    setPollosRecibidos(250);
    setFondoInicialCajaCents(10000);
    setConteoFisicoRealCents(10000);
    setShowNewEventModal(false);
    setNewEventTitleInput("");

    if (firestoreDb) {
      const eventDocRef = doc(
        firestoreDb,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "pollada_events",
        slug
      );
      await setDoc(
        eventDocRef,
        {
          eventConfig: newCfg,
          masterPin,
          tickets: JSON.stringify(freshTickets),
          barItems: JSON.stringify(freshBar),
          payments: JSON.stringify([]),
          expenses: JSON.stringify([]),
          sellers: JSON.stringify(sellers),
          auditLogs: JSON.stringify(freshLogs),
          pollosRecibidos: 250,
          fondoInicialCajaCents: 10000,
          conteoFisicoRealCents: 10000,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    notify(`Evento «${newCfg.name}» creado con 250 tickets nuevos.`, "success");
  };

  /**
   * ==========================================================================
   * 7. FILTROS Y EXPORTACIÓN CSV
   * ==========================================================================
   */
  const filteredPadronTickets = useMemo(() => {
    const q = padronSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      if (
        padronFilter === "DISPONIBLE" &&
        t.assignmentStatus !== "DISPONIBLE"
      )
        return false;
      if (
        padronFilter === "FALTA_PAGAR" &&
        !(t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO")
      )
        return false;
      if (padronFilter === "PAGADO" && t.paymentStatus !== "PAGADO")
        return false;
      if (
        padronFilter === "FALTA_ENTREGAR" &&
        !(t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE")
      )
        return false;
      if (padronFilter === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO")
        return false;
      if (padronFilter === "MIS_VENTAS" && t.sellerName !== activeOperator)
        return false;

      if (q) {
        return (
          t.code.toLowerCase().includes(q) ||
          (t.buyerName || "").toLowerCase().includes(q) ||
          (t.sellerName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, padronFilter, padronSearch, activeOperator]);

  const inspectedTicket = useMemo(() => {
    if (inspectedTicketNum === null) return null;
    return tickets.find((t) => t.num === inspectedTicketNum) || null;
  }, [tickets, inspectedTicketNum]);

  const filteredDespachoTickets = useMemo(() => {
    const q = despachoSearch.trim().toLowerCase();
    return tickets
      .filter((t) => {
        if (!q)
          return (
            t.assignmentStatus !== "DISPONIBLE" &&
            t.deliveryStatus === "PENDIENTE"
          );
        return (
          t.code.toLowerCase().includes(q) ||
          (t.buyerName || "").toLowerCase().includes(q) ||
          t.qrToken.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [tickets, despachoSearch]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (auditFilter === "ALERTA" && l.severity === "INFO") return false;
      if (
        auditFilter !== "TODOS" &&
        auditFilter !== "ALERTA" &&
        l.category !== auditFilter
      )
        return false;
      if (q) {
        return (
          l.title.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q) ||
          l.operator.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditSearch, auditFilter]);

  const csvExportContent = useMemo(() => {
    if (exportMode === "AUDIT") {
      const header =
        "Hora,Categoria,Severidad,Operador,Dispositivo,Titulo,Detalle\n";
      const rows = auditLogs
        .map(
          (l) =>
            `"${l.time}",${l.category},${l.severity},"${l.operator}",${
              l.device
            },"${l.title.replace(/"/g, '""')}","${l.detail.replace(
              /"/g,
              '""'
            )}"`
        )
        .join("\n");
      return header + rows;
    }
    const header =
      "Nro_Ticket,Token_QR,Cliente,Celular,Vendedor,Modalidad,Estado_Reserva,Estado_Pago,Pagado_Soles,Medio_Pago,Estado_Entrega,Hora_Entrega\n";
    const rows = tickets
      .map(
        (t) =>
          `${t.code},${t.qrToken},"${t.buyerName || "LIBRE"}","${
            t.buyerPhone || ""
          }","${t.sellerName}",${t.serviceType},${t.assignmentStatus},${
            t.paymentStatus
          },${(t.paidCents / 100).toFixed(2)},${t.paymentMethod || "-"},${
            t.deliveryStatus
          },"${t.deliveredAt || "-"}"`
      )
      .join("\n");
    return header + rows;
  }, [tickets, auditLogs, exportMode]);

  /**
   * ==========================================================================
   * 8. RENDERIZADO DE LA PLATAFORMA (MODO VENDEDOR CELULAR vs PANEL LAPTOP)
   * ==========================================================================
   */
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-900 pb-24 lg:pb-12 font-sans">
      {/* CABECERA OFICIAL JCR EVENTOS */}
      <header className="bg-gradient-to-r from-stone-950 via-red-950 to-orange-950 text-white shadow-xl sticky top-0 z-40 border-b border-orange-500/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Marca JCR EVENTOS */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 p-0.5 shadow-lg shrink-0">
                <div className="w-full h-full bg-stone-950 rounded-[14px] flex flex-col items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span className="text-[8px] font-black tracking-tighter text-amber-300 leading-none">
                    JCR
                  </span>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 shadow-sm">
                    JCR EVENTOS
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      syncStatus === "EN_VIVO"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                        : syncStatus === "GUARDANDO"
                        ? "bg-amber-500/20 text-amber-200 border-amber-400/30"
                        : "bg-red-500/20 text-red-200 border-red-400/30"
                    }`}
                  >
                    <Cloud className="w-3 h-3" />
                    {syncStatus === "EN_VIVO"
                      ? "FIREBASE EN VIVO"
                      : syncStatus === "GUARDANDO"
                      ? "GUARDANDO..."
                      : "CONECTANDO..."}
                  </span>
                </div>
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-white mt-0.5">
                  {eventConfig.name}
                </h1>
              </div>
            </div>

            {/* Controles Superiores: Selector de Vendedor + Conmutador Modo Celular / Modo Laptop */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Identificador de Vendedor */}
              <div className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <span className="block text-[9px] uppercase font-bold text-stone-300 leading-none">
                    {lockedSellerByLink
                      ? "Celular Bloqueado a:"
                      : "Vendedor / Operador:"}
                  </span>
                  {lockedSellerByLink && !isMasterUnlocked ? (
                    <span className="text-xs font-black text-amber-300">
                      {activeOperator} 🔒
                    </span>
                  ) : (
                    <select
                      value={activeOperator}
                      onChange={(e) => {
                        setActiveOperator(e.target.value);
                        setPosSellerName(e.target.value);
                        notify(`Operando como: ${e.target.value}`, "info");
                      }}
                      className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer"
                    >
                      {sellers.map((s) => (
                        <option
                          key={s.id}
                          value={s.name}
                          className="text-stone-900"
                        >
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Botón para cambiar entre MODO CELULAR VENDEDOR (Bloqueado) y PANEL LAPTOP COMPLETO */}
              {viewMode === "PANEL_COMPLETO" ? (
                <button
                  onClick={() => {
                    setViewMode("SOLO_VENDEDOR");
                    setPosSellerName(activeOperator);
                    setPosPayMode("EFECTIVO_VENDEDOR");
                    notify(
                      "Activado Modo Exclusivo Vendedor (Solo Venta de Tickets). Ideal para celulares.",
                      "info"
                    );
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-stone-950 transition shadow-sm"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Modo Celular Vendedor</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isMasterUnlocked) {
                      setViewMode("PANEL_COMPLETO");
                      setLockedSellerByLink(false);
                    } else {
                      setPendingMasterAction("ABRIR_PANEL_COMPLETO");
                      setMasterPinInput("");
                      setShowMasterModal(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-400/40 transition"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Abrir Panel Laptop 🔒</span>
                </button>
              )}

              {/* Controles exclusivos del Panel Completo (Laptop) */}
              {viewMode === "PANEL_COMPLETO" && (
                <>
                  <div className="hidden sm:flex bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 items-center gap-1.5">
                    <select
                      value={currentEventId}
                      onChange={(e) => setCurrentEventId(e.target.value)}
                      className="bg-transparent text-xs font-extrabold text-amber-200 focus:outline-none cursor-pointer"
                    >
                      {eventsList.map((ev) => (
                        <option
                          key={ev.id}
                          value={ev.id}
                          className="text-stone-900"
                        >
                          {ev.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (requireMasterAuth("Crear Nueva Actividad")) {
                          setShowNewEventModal(true);
                        }
                      }}
                      title="Crear Nueva Actividad"
                      className="p-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (isMasterUnlocked) {
                        setIsMasterUnlocked(false);
                        notify("Candado de Clave Maestra cerrado.", "info");
                      } else {
                        setMasterPinInput("");
                        setShowMasterModal(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
                      isMasterUnlocked
                        ? "bg-emerald-600 border-emerald-400 text-white"
                        : "bg-stone-800 border-stone-600 text-amber-300"
                    }`}
                  >
                    {isMasterUnlocked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {isMasterUnlocked ? "Admin Activo" : "Clave Maestra"}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-white text-stone-900 hover:bg-amber-50 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-600" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Menú de 8 Módulos SOLO visible cuando estás en PANEL_COMPLETO (Laptop) */}
          {viewMode === "PANEL_COMPLETO" && (
            <nav className="hidden lg:flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 overflow-x-auto">
              {[
                { id: "VENDER", label: "1. Vender Pollada y Barra", icon: Ticket },
                { id: "PADRON", label: "2. Padrón 250 Tickets", icon: QrCode },
                { id: "DESPACHO", label: "3. Cocina y Despacho", icon: Utensils },
                {
                  id: "GASTOS",
                  label: "4. Fiesta, Barra y Gastos",
                  icon: ShoppingBag,
                },
                {
                  id: "VENDEDORES",
                  label: `5. Vendedores (${sellers.length}) y Links`,
                  icon: Users,
                },
                { id: "CAJA", label: "6. Caja, Yape y Ganancia", icon: Wallet },
                {
                  id: "ANTIFRAUDE",
                  label: `7. Historial Antifraude (${auditLogs.length})`,
                  icon: ShieldAlert,
                },
                { id: "CONFIG", label: "8. Configuración 🔒", icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isAct = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition ${
                      isAct
                        ? "bg-amber-400 text-stone-950 shadow"
                        : "text-stone-200 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* AVISO FLOTANTE (TOAST) */}
      {toast && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-3">
          <div
            className={`p-3.5 rounded-2xl border-2 flex justify-between items-center shadow-md ${
              toast.type === "error"
                ? "bg-red-50 border-red-400 text-red-950"
                : toast.type === "warning"
                ? "bg-amber-50 border-amber-400 text-amber-950"
                : "bg-emerald-50 border-emerald-400 text-emerald-950"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
              {toast.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toast.msg}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-black underline ml-4"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
          VISTA A: MODO EXCLUSIVO VENDEDOR PARA CELULARES / TABLETS (BLOQUEADO)
          Solo permite vender tickets y consultar el padrón sin tocar Caja ni Config
      ======================================================================= */}
      {viewMode === "SOLO_VENDEDOR" && (
        <main className="max-w-xl mx-auto px-3 py-4 space-y-4">
          {/* Resumen limpio del vendedor */}
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-4 shadow-md border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  TERMINAL MÓVIL EXCLUSIVA DE VENTA
                </span>
                <h2 className="text-base font-black">
                  Vendedor: {activeOperator}
                </h2>
              </div>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                🔒 Modo Seguro
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/10 rounded-2xl p-2.5">
                <span className="text-[10px] text-stone-300 font-bold block">
                  Tickets Libres
                </span>
                <strong className="text-xl font-black text-amber-300">
                  {metrics.disponibles}
                </strong>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5">
                <span className="text-[10px] text-stone-300 font-bold block">
                  Mis Ventas
                </span>
                <strong className="text-xl font-black text-white">
                  {metrics.misTicketsTotal}
                </strong>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5">
                <span className="text-[10px] text-stone-300 font-bold block">
                  Por Rendir
                </span>
                <strong className="text-base font-black text-emerald-300">
                  {formatPEN(metrics.miEfectivoPorRendirCents)}
                </strong>
              </div>
            </div>
          </div>

          {/* Selector de 2 pestañas simples para el Vendedor */}
          <div className="grid grid-cols-2 gap-2 bg-stone-200 p-1.5 rounded-2xl">
            <button
              onClick={() => setSellerMobileSubTab("VENDER_TICKET")}
              className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                sellerMobileSubTab === "VENDER_TICKET"
                  ? "bg-orange-600 text-white shadow"
                  : "text-stone-700"
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>1. Vender Ticket</span>
            </button>
            <button
              onClick={() => setSellerMobileSubTab("VER_PADRON")}
              className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                sellerMobileSubTab === "VER_PADRON"
                  ? "bg-stone-900 text-white shadow"
                  : "text-stone-700"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>2. Ver 250 Tickets / WhatsApp</span>
            </button>
          </div>

          {/* SUB-PESTAÑA MÓVIL 1: FORMULARIO DE VENTA DE TICKETS */}
          {sellerMobileSubTab === "VENDER_TICKET" && (
            <div className="bg-white rounded-3xl shadow-md border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-orange-600">
                    JCR EVENTOS • {formatPEN(eventConfig.unitPriceCents)}
                  </span>
                  <h3 className="text-lg font-black text-stone-900">
                    Registrar Venta de Ticket
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const free = tickets.find(
                      (t) => t.assignmentStatus === "DISPONIBLE"
                    );
                    if (free) setPosTicketNums(String(free.num));
                  }}
                  className="text-xs font-black bg-orange-100 text-orange-900 px-3 py-2 rounded-xl"
                >
                  ⚡ N.º Libre
                </button>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <label className="block text-xs font-extrabold text-stone-700 mb-1">
                    N.º Ticket (1-250)
                  </label>
                  <input
                    type="text"
                    value={posTicketNums}
                    onChange={(e) => setPosTicketNums(e.target.value)}
                    placeholder="Ej: 15"
                    className="w-full p-3 border-2 border-orange-500 rounded-2xl font-mono font-black text-2xl text-center bg-orange-50/40"
                  />
                </div>
                <div className="col-span-7">
                  <label className="block text-xs font-extrabold text-stone-700 mb-1">
                    Celular WhatsApp Cliente
                  </label>
                  <input
                    type="tel"
                    value={posBuyerPhone}
                    onChange={(e) => setPosBuyerPhone(e.target.value)}
                    placeholder="Ej. 962123456"
                    className="w-full p-3.5 border border-stone-300 rounded-2xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">
                  Nombre y Apellido del Comprador
                </label>
                <input
                  type="text"
                  value={posBuyerName}
                  onChange={(e) => setPosBuyerName(e.target.value)}
                  placeholder="Ej. Familia Gómez / Carlos Soto"
                  className="w-full p-3.5 border border-stone-300 rounded-2xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">
                  Modalidad de Entrega
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MESA_LOCAL", label: "🍽️ En Local" },
                    { id: "PARA_LLEVAR", label: "🛍️ Para Llevar" },
                    { id: "DELIVERY_HUANUCO", label: "🛵 Delivery" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPosServiceType(st.id)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-black ${
                        posServiceType === st.id
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-stone-50 text-stone-700 border-stone-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1.5">
                  ¿Cómo te está pagando el cliente?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "EFECTIVO_VENDEDOR",
                      title: "💵 Efectivo",
                      sub: "Lo cobro yo",
                    },
                    {
                      id: "YAPE_EVENTO",
                      title: "📱 Yape / Plin",
                      sub: "Cuenta JCR",
                    },
                    {
                      id: "SOLO_SEPARAR",
                      title: "⏳ Separar",
                      sub: "Falta pagar",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPosPayMode(m.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition ${
                        posPayMode === m.id
                          ? "bg-orange-600 text-white border-orange-700 shadow"
                          : "bg-stone-50 text-stone-800 border-stone-200"
                      }`}
                    >
                      <span className="block text-xs font-black">{m.title}</span>
                      <span className="block text-[10px] opacity-85 mt-0.5">
                        {m.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {posPayMode === "YAPE_EVENTO" && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                  <label className="block text-xs font-extrabold text-purple-900 mb-1">
                    N.º Operación o Nombre de quien Yapeó
                  </label>
                  <input
                    type="text"
                    value={posYapeRef}
                    onChange={(e) => setPosYapeRef(e.target.value)}
                    placeholder="Ej. Op. 8492 - Yapeó Rosa"
                    className="w-full p-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSellOrReserveTickets}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-black text-base shadow-lg active:scale-95 transition"
              >
                {posPayMode === "SOLO_SEPARAR"
                  ? `SEPARAR TICKET (${formatPEN(posTotalCobrarCents)})`
                  : `CONFIRMAR VENTA (${formatPEN(posTotalCobrarCents)})`}
              </button>
            </div>
          )}

          {/* SUB-PESTAÑA MÓVIL 2: PADRÓN DE CONSULTA Y ENVÍO DE WHATSAPP */}
          {sellerMobileSubTab === "VER_PADRON" && (
            <div className="bg-white rounded-3xl shadow-md border border-stone-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={padronSearch}
                  onChange={(e) => setPadronSearch(e.target.value)}
                  placeholder="Buscar N.º o cliente..."
                  className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold flex-1"
                />
                <select
                  value={padronFilter}
                  onChange={(e) => setPadronFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-black bg-stone-50"
                >
                  <option value="TODOS">Todos (250)</option>
                  <option value="DISPONIBLE">
                    🟢 Libres ({metrics.disponibles})
                  </option>
                  <option value="MIS_VENTAS">
                    👤 Mis Ventas ({metrics.misTicketsTotal})
                  </option>
                  <option value="FALTA_PAGAR">🟡 Separados</option>
                </select>
              </div>

              {inspectedTicket && (
                <div className="p-4 rounded-2xl border-2 border-orange-500 bg-orange-50/40 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase text-orange-700">
                        Ticket Oficial #{inspectedTicket.code} • JCR EVENTOS
                      </span>
                      <h4 className="text-base font-black text-stone-900">
                        {inspectedTicket.buyerName || "Ticket Libre"}
                      </h4>
                      <p className="text-xs text-stone-600">
                        Vendedor: <strong>{inspectedTicket.sellerName}</strong>{" "}
                        • Estado: <strong>{inspectedTicket.paymentStatus}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setInspectedTicketNum(null)}
                      className="text-xs font-black bg-stone-200 px-2.5 py-1 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {inspectedTicket.assignmentStatus === "DISPONIBLE" && (
                      <button
                        onClick={() => {
                          setPosTicketNums(String(inspectedTicket.num));
                          setSellerMobileSubTab("VENDER_TICKET");
                        }}
                        className="w-full py-2.5 rounded-xl bg-orange-600 text-white text-xs font-black"
                      >
                        🎟️ Vender este Ticket (#{inspectedTicket.code})
                      </button>
                    )}

                    {inspectedTicket.assignmentStatus !== "DISPONIBLE" &&
                      inspectedTicket.paymentStatus !== "PAGADO" && (
                        <>
                          <button
                            onClick={() =>
                              handlePayReservedTicket(
                                inspectedTicket.num,
                                "EFECTIVO_VENDEDOR"
                              )
                            }
                            className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-black"
                          >
                            💵 Cobrar Efectivo
                          </button>
                          <button
                            onClick={() =>
                              handlePayReservedTicket(
                                inspectedTicket.num,
                                "YAPE_EVENTO"
                              )
                            }
                            className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-black"
                          >
                            📱 Cobrar Yape
                          </button>
                        </>
                      )}

                    {inspectedTicket.assignmentStatus !== "DISPONIBLE" && (
                      <a
                        href={`https://wa.me/${(
                          inspectedTicket.buyerPhone || ""
                        ).replace(/\D/g, "")}?text=${encodeURIComponent(
                          `🍗 *JCR EVENTOS - ${eventConfig.name.toUpperCase()}*\n🎟️ Ticket Oficial N.º *${
                            inspectedTicket.code
                          }*\n👤 Cliente: ${
                            inspectedTicket.buyerName
                          }\n💳 Estado: *${
                            inspectedTicket.paymentStatus
                          }*\n🔐 Token QR Antifraude: ${
                            inspectedTicket.qrToken
                          }\n📍 Lugar: ${eventConfig.address}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black text-center"
                      >
                        📲 Enviar Ticket QR por WhatsApp al Cliente
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 max-h-[420px] overflow-y-auto p-1">
                {filteredPadronTickets.map((t) => {
                  let style = "bg-stone-50 border-stone-300 text-stone-700";
                  if (t.deliveryStatus === "ENTREGADO") {
                    style = "bg-stone-900 border-stone-900 text-white";
                  } else if (t.paymentStatus === "PAGADO") {
                    style =
                      "bg-emerald-100 border-emerald-500 text-emerald-950 font-black";
                  } else if (t.assignmentStatus === "RESERVADO") {
                    style =
                      "bg-amber-100 border-amber-500 text-amber-950 font-black";
                  }
                  return (
                    <button
                      key={t.num}
                      onClick={() => setInspectedTicketNum(t.num)}
                      className={`p-2 rounded-xl border-2 text-center flex flex-col items-center ${style}`}
                    >
                      <span className="font-mono font-black text-xs">
                        {t.code}
                      </span>
                      <span className="text-[8px] font-bold truncate max-w-full">
                        {t.buyerName ? t.buyerName.split(" ")[0] : "LIBRE"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ======================================================================
          VISTA B: PANEL DE CONTROL COMPLETO (PARA TU LAPTOP / ADMINISTRADOR)
      ======================================================================= */}
      {viewMode === "PANEL_COMPLETO" && (
        <>
          {/* BARRA DE INDICADORES RÁPIDOS (KPIs) */}
          <section className="bg-white border-b border-stone-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    Tickets Libres
                  </span>
                  <strong className="text-base font-black text-stone-900">
                    {metrics.disponibles}
                  </strong>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                  de 250
                </span>
              </div>

              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">
                    Separados (Debe)
                  </span>
                  <strong className="text-base font-black text-amber-900">
                    {metrics.separados}
                  </strong>
                </div>
                <span className="text-[11px] font-extrabold text-amber-800">
                  {formatPEN(metrics.faltaCobrarSeparadosCents)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    Polladas Pagadas
                  </span>
                  <strong className="text-base font-black text-emerald-900">
                    {metrics.pagados}
                  </strong>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-800">
                  {formatPEN(metrics.cobradoTicketsCents)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-orange-800 block">
                    Platos en Cocina
                  </span>
                  <strong className="text-base font-black text-orange-900">
                    {metrics.platosQuedan}
                  </strong>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-200 text-orange-900">
                  {metrics.entregados} entregados
                </span>
              </div>

              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">
                    Efectivo en Caja
                  </span>
                  <strong className="text-base font-black text-blue-900">
                    {formatPEN(metrics.efectivoDisponibleCajaCents)}
                  </strong>
                </div>
                <span className="text-[10px] font-bold text-blue-700">
                  Físico
                </span>
              </div>

              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-800 block">
                    Saldo Yape / Plin
                  </span>
                  <strong className="text-base font-black text-purple-900">
                    {formatPEN(metrics.saldoDisponibleYapeCents)}
                  </strong>
                </div>
                <span className="text-[10px] font-bold text-purple-700">
                  Digital
                </span>
              </div>
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
            {/* ================================================================
                PESTAÑA 1: VENDER POLLADA Y BARRA
            ================================================================= */}
            {activeTab === "VENDER" && (
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Venta de Pollada (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
                        JCR EVENTOS • Punto de Venta Principal
                      </span>
                      <h2 className="text-xl font-black text-stone-900">
                        1. Vender o Separar Pollada (
                        {formatPEN(eventConfig.unitPriceCents)})
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        const free = tickets.find(
                          (t) => t.assignmentStatus === "DISPONIBLE"
                        );
                        if (free) setPosTicketNums(String(free.num));
                      }}
                      className="text-xs font-black bg-orange-100 hover:bg-orange-200 text-orange-900 px-3 py-2 rounded-xl"
                    >
                      ⚡ Buscar N.º Libre
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        N.º Ticket (1 al 250)
                      </label>
                      <input
                        type="text"
                        value={posTicketNums}
                        onChange={(e) => setPosTicketNums(e.target.value)}
                        placeholder="Ej: 12 o 12,13"
                        className="w-full p-3 border-2 border-orange-500 rounded-2xl font-mono font-black text-xl text-center bg-orange-50/40"
                      />
                    </div>
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Nombre del Cliente / Comprador
                      </label>
                      <input
                        type="text"
                        value={posBuyerName}
                        onChange={(e) => setPosBuyerName(e.target.value)}
                        placeholder="Ej. Familia Rojas / Juan Pérez"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm font-bold"
                      />
                      <span className="block text-[11px] text-stone-500 mt-1">
                        Para varios tickets sepáralos con coma (ej: 15, 16, 17).
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Celular WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={posBuyerPhone}
                        onChange={(e) => setPosBuyerPhone(e.target.value)}
                        placeholder="Ej. 962123456"
                        className="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Vendedor Responsable
                      </label>
                      <select
                        value={posSellerName}
                        onChange={(e) => setPosSellerName(e.target.value)}
                        className="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-bold bg-white"
                      >
                        {sellers.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Modalidad Despacho
                      </label>
                      <select
                        value={posServiceType}
                        onChange={(e) => setPosServiceType(e.target.value)}
                        className="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-bold bg-white"
                      >
                        <option value="MESA_LOCAL">Comer en el Local</option>
                        <option value="PARA_LLEVAR">Para Llevar</option>
                        <option value="DELIVERY_HUANUCO">
                          Delivery Huánuco
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1.5">
                      ¿Cómo se paga esta pollada?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          id: "EFECTIVO_CAJA",
                          title: "💵 Efectivo Caja",
                          sub: "Directo a gaveta",
                        },
                        {
                          id: "YAPE_EVENTO",
                          title: "📱 Yape / Plin",
                          sub: "Cuenta digital",
                        },
                        {
                          id: "EFECTIVO_VENDEDOR",
                          title: "👤 Cobró Vendedor",
                          sub: "Queda por rendir",
                        },
                        {
                          id: "SOLO_SEPARAR",
                          title: "⏳ Solo Separar",
                          sub: "Paga al recoger",
                        },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPosPayMode(m.id)}
                          className={`p-3 rounded-2xl border-2 text-left transition ${
                            posPayMode === m.id
                              ? "bg-stone-900 text-white border-orange-500 shadow"
                              : "bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          <span className="block text-xs font-black">
                            {m.title}
                          </span>
                          <span className="block text-[10px] opacity-80 mt-0.5">
                            {m.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {posPayMode === "EFECTIVO_CAJA" && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-stone-800">
                          Billete recibido S/:
                        </span>
                        <input
                          type="number"
                          value={posBilleteSoles}
                          onChange={(e) => setPosBilleteSoles(e.target.value)}
                          className="w-24 p-2 rounded-xl border border-amber-400 font-black text-center text-base bg-white"
                        />
                        <div className="flex gap-1">
                          {[20, 50, 100].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setPosBilleteSoles(String(b))}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-black"
                            >
                              S/ {b}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-600 block">
                          Total a cobrar:{" "}
                          <strong>{formatPEN(posTotalCobrarCents)}</strong>
                        </span>
                        <span className="text-xs font-extrabold text-orange-900">
                          Vuelto a entregar:{" "}
                          <strong className="text-lg font-black">
                            {formatPEN(posVueltoCents)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {posPayMode === "YAPE_EVENTO" && (
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <label className="block text-xs font-extrabold text-purple-900 mb-1">
                        N.º Operación / Titular Yape (Verificación Antifraude)
                      </label>
                      <input
                        type="text"
                        value={posYapeRef}
                        onChange={(e) => setPosYapeRef(e.target.value)}
                        placeholder="Ej. Op. 394810 - Yapeó María"
                        className="w-full p-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-white"
                      />
                    </div>
                  )}

                  {posPayMode !== "SOLO_SEPARAR" && (
                    <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-stone-100 border border-stone-200 cursor-pointer text-xs sm:text-sm font-extrabold text-stone-800">
                      <input
                        type="checkbox"
                        checked={posDeliverNow}
                        onChange={(e) => setPosDeliverNow(e.target.checked)}
                        className="w-5 h-5 accent-orange-600 rounded"
                      />
                      <span>
                        Entregar el plato en este instante (Descontar de Cocina
                        y marcar ENTREGADO)
                      </span>
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={handleSellOrReserveTickets}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black text-base shadow-lg transition"
                  >
                    {posPayMode === "SOLO_SEPARAR"
                      ? `SEPARAR ${
                          parsedPosNums.length || 1
                        } TICKET(S) — FALTA PAGAR ${formatPEN(
                          posTotalCobrarCents
                        )}`
                      : `GUARDAR VENTA (${
                          parsedPosNums.length || 1
                        } TICKET • ${formatPEN(posTotalCobrarCents)})`}
                  </button>
                </div>

                {/* Venta Rápida de Barra (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                          Cantina / Bebidas JCR EVENTOS
                        </span>
                        <h2 className="text-xl font-black text-stone-900">
                          2. Venta Rápida de Barra
                        </h2>
                      </div>
                      <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl">
                        Barra: {formatPEN(metrics.ingresosBarraCents)}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {barItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-black text-sm text-stone-900">
                              {item.name} —{" "}
                              <span className="text-orange-700">
                                {formatPEN(item.unitPriceCents)}
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 mt-0.5">
                              Stock:{" "}
                              <strong
                                className={
                                  item.stock > 0
                                    ? "text-emerald-700"
                                    : "text-red-600"
                                }
                              >
                                {item.stock} und.
                              </strong>{" "}
                              • Vendidos: <strong>{item.soldQty}</strong>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() =>
                                handleSellBarItem(item.id, "EFECTIVO_CAJA")
                              }
                              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm"
                            >
                              +1 Efectivo
                            </button>
                            <button
                              onClick={() =>
                                handleSellBarItem(item.id, "YAPE_EVENTO")
                              }
                              className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-sm"
                            >
                              +1 Yape
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("GASTOS")}
                    className="w-full py-2.5 px-3 rounded-xl border border-orange-300 bg-orange-50 text-orange-900 text-xs font-black hover:bg-orange-100"
                  >
                    + Abastecer Stock o Registrar Gasto de Fiesta →
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 2: PADRÓN DE 250 TICKETS + DETALLE QR Y ANULACIÓN
            ================================================================= */}
            {activeTab === "PADRON" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-stone-900">
                        Padrón Oficial de 250 Tickets (001 al 250)
                      </h2>
                      <p className="text-xs text-stone-600">
                        Se actualiza en vivo conforme tus vendedores venden
                        desde sus celulares.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={padronSearch}
                        onChange={(e) => setPadronSearch(e.target.value)}
                        placeholder="Buscar N.º, cliente o vendedor..."
                        className="px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold w-56"
                      />
                      <select
                        value={padronFilter}
                        onChange={(e) => setPadronFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-black bg-stone-50"
                      >
                        <option value="TODOS">Todos los 250 Tickets</option>
                        <option value="DISPONIBLE">
                          🟢 Libres ({metrics.disponibles})
                        </option>
                        <option value="FALTA_PAGAR">
                          🟡 Separados - Falta Pagar ({metrics.separados})
                        </option>
                        <option value="PAGADO">
                          💵 Pagados ({metrics.pagados})
                        </option>
                        <option value="FALTA_ENTREGAR">
                          🍗 Pagados por Recoger Plato
                        </option>
                        <option value="ENTREGADO">
                          ⬛ Ya Entregados ({metrics.entregados})
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[500px] overflow-y-auto p-1">
                    {filteredPadronTickets.map((t) => {
                      let style =
                        "bg-stone-50 border-stone-300 text-stone-700 hover:border-orange-500";
                      let tag = "LIBRE";
                      if (t.deliveryStatus === "ENTREGADO") {
                        style = "bg-stone-900 border-stone-900 text-white";
                        tag = "ENTREGADO";
                      } else if (t.paymentStatus === "PAGADO") {
                        style =
                          "bg-emerald-100 border-emerald-500 text-emerald-950 font-black";
                        tag = "PAGADO";
                      } else if (t.assignmentStatus === "RESERVADO") {
                        style =
                          "bg-amber-100 border-amber-500 text-amber-950 font-black";
                        tag = "DEBE";
                      }

                      return (
                        <button
                          key={t.num}
                          onClick={() => setInspectedTicketNum(t.num)}
                          className={`p-2 rounded-xl border-2 text-center flex flex-col items-center justify-center transition transform hover:scale-105 ${style}`}
                        >
                          <span className="font-mono font-black text-xs sm:text-sm">
                            {t.code}
                          </span>
                          <span className="text-[8px] font-black tracking-tighter mt-0.5 truncate max-w-full">
                            {t.buyerName ? t.buyerName.split(" ")[0] : tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {inspectedTicket && (
                  <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-500 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-4 border-b border-stone-200 pb-4">
                      <div>
                        <span className="text-xs font-black uppercase text-orange-600">
                          Inspector Antifraude JCR EVENTOS • Ticket N.º{" "}
                          {inspectedTicket.code}
                        </span>
                        <h3 className="text-2xl font-black text-stone-900 mt-0.5">
                          {inspectedTicket.buyerName ||
                            "Ticket Libre (Disponible)"}
                        </h3>
                        <p className="text-xs text-stone-600 font-semibold">
                          Vendedor: <strong>{inspectedTicket.sellerName}</strong>{" "}
                          • Modalidad:{" "}
                          <strong>{inspectedTicket.serviceType}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => setInspectedTicketNum(null)}
                        className="px-3 py-1.5 rounded-xl bg-stone-200 text-stone-800 text-xs font-black"
                      >
                        Cerrar ✕
                      </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5 items-center">
                      <div className="p-4 rounded-2xl bg-stone-900 text-white text-center space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                          Token Único Antifraude
                        </span>
                        <div className="font-mono font-black text-base tracking-wider bg-white/10 py-2 px-3 rounded-xl border border-white/15">
                          {inspectedTicket.qrToken}
                        </div>
                        <span className="text-[11px] text-stone-300 block">
                          {inspectedTicket.deliveredAt
                            ? `Entregado a las ${inspectedTicket.deliveredAt} por ${inspectedTicket.deliveredBy}`
                            : "Plato aún en cocina"}
                        </span>
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-2.5">
                        {inspectedTicket.assignmentStatus === "DISPONIBLE" && (
                          <button
                            onClick={() => {
                              setPosTicketNums(String(inspectedTicket.num));
                              setActiveTab("VENDER");
                            }}
                            className="px-5 py-3 rounded-2xl bg-orange-600 text-white text-xs font-black shadow"
                          >
                            🎟️ Vender o Separar este Ticket (#
                            {inspectedTicket.code})
                          </button>
                        )}

                        {inspectedTicket.assignmentStatus !== "DISPONIBLE" &&
                          inspectedTicket.paymentStatus !== "PAGADO" && (
                            <>
                              <button
                                onClick={() =>
                                  handlePayReservedTicket(
                                    inspectedTicket.num,
                                    "EFECTIVO_CAJA"
                                  )
                                }
                                className="px-4 py-3 rounded-2xl bg-emerald-700 text-white text-xs font-black shadow"
                              >
                                💵 Cobrar Efectivo (
                                {formatPEN(inspectedTicket.agreedPriceCents)})
                              </button>
                              <button
                                onClick={() =>
                                  handlePayReservedTicket(
                                    inspectedTicket.num,
                                    "YAPE_EVENTO"
                                  )
                                }
                                className="px-4 py-3 rounded-2xl bg-purple-700 text-white text-xs font-black shadow"
                              >
                                📱 Cobrar Yape (
                                {formatPEN(inspectedTicket.agreedPriceCents)})
                              </button>
                            </>
                          )}

                        {inspectedTicket.paymentStatus === "PAGADO" &&
                          inspectedTicket.deliveryStatus !== "ENTREGADO" && (
                            <button
                              onClick={() =>
                                handleDeliverPlate(inspectedTicket.num)
                              }
                              className="px-5 py-3 rounded-2xl bg-stone-900 text-white text-xs font-black shadow"
                            >
                              🍗 Despachar y Entregar Plato Ahora
                            </button>
                          )}

                        {inspectedTicket.assignmentStatus !== "DISPONIBLE" && (
                          <>
                            <a
                              href={`https://wa.me/${(
                                inspectedTicket.buyerPhone || ""
                              ).replace(/\D/g, "")}?text=${encodeURIComponent(
                                `🍗 *JCR EVENTOS - ${eventConfig.name.toUpperCase()}*\n🎟️ Ticket Oficial N.º *${
                                  inspectedTicket.code
                                }*\n👤 Cliente: ${
                                  inspectedTicket.buyerName
                                }\n💳 Estado: *${
                                  inspectedTicket.paymentStatus
                                }*\n🔐 Token QR Antifraude: ${
                                  inspectedTicket.qrToken
                                }\n📍 Dirección: ${eventConfig.address}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow"
                            >
                              📲 Enviar Ticket por WhatsApp
                            </a>
                            <button
                              onClick={() =>
                                handleVoidTicket(inspectedTicket.num)
                              }
                              className="px-4 py-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-black"
                            >
                              🔒 Anular / Liberar Ticket (Clave Maestra)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================
                PESTAÑA 3: COCINA Y DESPACHO DE PLATOS
            ================================================================= */}
            {activeTab === "DESPACHO" && (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
                      Control de Cocina JCR EVENTOS
                    </span>
                    <h2 className="text-xl font-black text-stone-900">
                      Despacho de Platos y Verificador Anti-Doble Entrega
                    </h2>
                    <p className="text-xs text-stone-600">
                      Si alguien intenta recoger dos veces con el mismo ticket,
                      saltará una alerta roja en el Historial Antifraude.
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-orange-800 block">
                      Platos Físicos Disponibles
                    </span>
                    <strong className="text-2xl font-black text-orange-900">
                      {metrics.platosQuedan}
                    </strong>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-5 h-5 text-stone-400 absolute left-4 top-4" />
                  <input
                    type="text"
                    value={despachoSearch}
                    onChange={(e) => setDespachoSearch(e.target.value)}
                    placeholder="Busca por N.º de Ticket (ej. 045), nombre del cliente o token QR..."
                    className="w-full p-4 pl-12 rounded-2xl border-2 border-stone-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base font-extrabold"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {filteredDespachoTickets.map((t) => {
                    const isDelivered = t.deliveryStatus === "ENTREGADO";
                    const isPaid = t.paymentStatus === "PAGADO";
                    return (
                      <div
                        key={t.num}
                        className={`p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-3 ${
                          isDelivered
                            ? "bg-red-50 border-red-400"
                            : isPaid
                            ? "bg-emerald-50 border-emerald-500"
                            : "bg-amber-50 border-amber-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-lg text-stone-900">
                              #{t.code}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isPaid
                                  ? "bg-emerald-200 text-emerald-950"
                                  : "bg-amber-300 text-amber-950"
                              }`}
                            >
                              {t.paymentStatus}
                            </span>
                            <span className="text-[10px] font-bold text-stone-600">
                              {t.serviceType}
                            </span>
                          </div>
                          <p className="font-black text-sm text-stone-900 mt-0.5">
                            {t.buyerName || "Cliente"}
                          </p>
                          <p className="text-[11px] font-mono text-stone-500">
                            {t.qrToken}{" "}
                            {isDelivered
                              ? `• ⚠️ ENTREGADO (${t.deliveredAt})`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!isPaid && (
                            <button
                              onClick={() =>
                                handlePayReservedTicket(t.num, "EFECTIVO_CAJA")
                              }
                              className="px-3 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black"
                            >
                              Cobrar {formatPEN(t.agreedPriceCents)}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeliverPlate(t.num)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black shadow ${
                              isDelivered
                                ? "bg-red-700 text-white"
                                : "bg-stone-900 text-white hover:bg-stone-800"
                            }`}
                          >
                            {isDelivered
                              ? "🚨 Verificar Alerta"
                              : "🍗 Entregar Plato"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 4: FIESTA, STOCK DE BARRA Y GASTOS
            ================================================================= */}
            {activeTab === "GASTOS" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
                  <h2 className="text-xl font-black text-stone-900 border-b pb-3">
                    Registrar Compra de Barra o Gasto del Local
                  </h2>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "COMPRA_BARRA", label: "🍾 Abastecer Barra" },
                      { id: "PAGO_POLLOS", label: "🍗 Pollos / Carbón" },
                      { id: "GASTO_FIESTA", label: "🎵 Orquesta / Local" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setExpCategory(c.id)}
                        className={`p-3 rounded-2xl border text-xs font-black ${
                          expCategory === c.id
                            ? "bg-orange-600 text-white border-orange-600"
                            : "bg-stone-50 text-stone-700 border-stone-300"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {expCategory === "COMPRA_BARRA" && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-emerald-900 mb-1">
                          Producto a recargar
                        </label>
                        <select
                          value={expBarProductId}
                          onChange={(e) => setExpBarProductId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-black"
                        >
                          {barItems.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} (Stock: {b.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-emerald-900 mb-1">
                          Unidades que ingresan (+Stock)
                        </label>
                        <input
                          type="number"
                          value={expBarUnits}
                          onChange={(e) => setExpBarUnits(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-sm font-black text-center"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Concepto / Detalle
                      </label>
                      <input
                        type="text"
                        value={expConcept}
                        onChange={(e) => setExpConcept(e.target.value)}
                        placeholder="Ej. 2 cajas de cerveza / Pago DJ"
                        className="w-full p-3 border border-stone-300 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Monto S/
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        value={expAmountSoles}
                        onChange={(e) => setExpAmountSoles(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 border border-stone-300 rounded-xl text-base font-black text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "EFECTIVO_CAJA", label: "💵 Sale de Caja" },
                      { id: "YAPE_EVENTO", label: "📱 Sale de Yape" },
                      { id: "POR_PAGAR", label: "📝 Por Pagar" },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setExpOrigin(o.id)}
                        className={`p-2.5 rounded-xl border text-xs font-black ${
                          expOrigin === o.id
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-stone-50 text-stone-700 border-stone-300"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleRegisterExpense}
                    className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-sm shadow"
                  >
                    REGISTRAR COMPRA / SALIDA DE DINERO
                  </button>
                </div>

                <div className="lg:col-span-6 space-y-6">
                  <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="font-black text-base text-stone-900">
                        Gastos Registrados
                      </h3>
                      <span className="text-xs font-black bg-red-100 text-red-900 px-3 py-1 rounded-xl">
                        Total: {formatPEN(metrics.gastosTotalesCents)}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {expenses.map((e) => (
                        <div
                          key={e.id}
                          className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-black text-stone-900">
                              {e.concept}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {e.time} • {e.payOrigin} • Por: {e.operator}
                            </div>
                          </div>
                          <strong className="text-red-700 font-black text-sm">
                            − {formatPEN(e.amountCents)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-stone-900">
                        Añadir Producto Nuevo a la Barra
                      </h3>
                      <span className="text-[10px] font-bold bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                        🔒 Clave Maestra
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={newBarName}
                        onChange={(e) => setNewBarName(e.target.value)}
                        placeholder="Nombre bebida"
                        className="p-2.5 border rounded-xl text-xs font-bold"
                      />
                      <input
                        type="number"
                        step="0.50"
                        value={newBarPriceSoles}
                        onChange={(e) => setNewBarPriceSoles(e.target.value)}
                        placeholder="Precio S/"
                        className="p-2.5 border rounded-xl text-xs font-bold"
                      />
                      <button
                        onClick={handleAddNewBarProduct}
                        className="bg-orange-600 text-white font-black text-xs rounded-xl py-2.5 px-3"
                      >
                        + Crear Producto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 5: VENDEDORES, GUARDADO EN FIREBASE Y LINK EXCLUSIVO CELULAR
            ================================================================= */}
            {activeTab === "VENDEDORES" && (
              <div className="space-y-6">
                {/* Panel para Agregar Vendedor a Firebase */}
                <div className="bg-white rounded-3xl shadow-sm border-2 border-orange-500/40 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
                        Sincronizado en Vivo con Firebase
                      </span>
                      <h2 className="text-xl font-black text-stone-900">
                        1. Agregar Vendedor y Generar Link Exclusivo para su
                        Celular
                      </h2>
                      <p className="text-xs text-stone-600">
                        Agrega a tus vendedores aquí y envíales su{" "}
                        <strong>Link Exclusivo de Venta</strong> por WhatsApp.
                        Cuando lo abran en su celular, solo podrán vender
                        tickets sin tocar tu panel de control.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        Nombre del Vendedor / Promotor
                      </label>
                      <input
                        type="text"
                        value={newSellerInput}
                        onChange={(e) => setNewSellerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSeller();
                        }}
                        placeholder="Ej. Carlos Ramírez / Promotora Lucía"
                        className="w-full p-3 border-2 border-stone-300 focus:border-orange-500 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-extrabold text-stone-700 mb-1">
                        WhatsApp del Vendedor (Opcional)
                      </label>
                      <input
                        type="tel"
                        value={newSellerPhoneInput}
                        onChange={(e) => setNewSellerPhoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSeller();
                        }}
                        placeholder="Ej. 962654321"
                        className="w-full p-3 border border-stone-300 rounded-xl text-sm font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleAddSeller}
                        className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 transition"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Agregar a Firebase</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de Vendedores con Botón de Link Exclusivo y Rendición */}
                <div className="grid md:grid-cols-2 gap-4">
                  {sellers.map((s) => {
                    const sold = tickets.filter(
                      (t) =>
                        t.sellerName === s.name &&
                        t.assignmentStatus !== "DISPONIBLE"
                    );
                    const paidCount = sold.filter(
                      (t) => t.paymentStatus === "PAGADO"
                    ).length;
                    const reservedCount = sold.filter(
                      (t) => t.paymentStatus !== "PAGADO"
                    ).length;
                    const pending = Math.max(
                      0,
                      s.cashInHandCents - s.settledCents
                    );
                    const exclusiveLink = getSellerExclusiveUrl(s.name);

                    return (
                      <div
                        key={s.id}
                        className="p-5 rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col justify-between gap-4"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-base text-stone-900">
                                {s.name}
                              </h3>
                              {s.phone && (
                                <span className="text-[11px] font-mono text-stone-500">
                                  ({s.phone})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-600 mt-0.5">
                              Tickets vendidos: <strong>{sold.length}</strong> (
                              {paidCount} pagados • {reservedCount} separados)
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                pending > 0
                                  ? "bg-amber-200 text-amber-950"
                                  : "bg-emerald-100 text-emerald-900"
                              }`}
                            >
                              {pending > 0
                                ? `Debe: ${formatPEN(pending)}`
                                : "Al día ✓"}
                            </span>
                            {s.id !== "SEL-1" && (
                              <button
                                onClick={() => handleDeleteSeller(s.id)}
                                title="Eliminar Vendedor"
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bloque de Link Exclusivo para su Celular */}
                        <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-stone-500 block">
                            📲 Link Exclusivo para su Celular (Solo Venta de
                            Tickets):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(exclusiveLink);
                                notify(
                                  `Link exclusivo de ${s.name} copiado. Envíalo a su WhatsApp.`,
                                  "success"
                                );
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black flex items-center justify-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Link Vendedor</span>
                            </button>

                            <a
                              href={`https://wa.me/${(s.phone || "").replace(
                                /\D/g,
                                ""
                              )}?text=${encodeURIComponent(
                                `🔥 *JCR EVENTOS - ${eventConfig.name}*\nHola *${s.name}*, entra a este enlace desde tu celular para vender tickets en vivo (está configurado solo con tu nombre):\n\n👉 ${exclusiveLink}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Enviar por WhatsApp</span>
                            </a>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-xs">
                          <span>
                            Cobrado en móvil:{" "}
                            <strong>{formatPEN(s.cashInHandCents)}</strong> |
                            Entregado:{" "}
                            <strong>{formatPEN(s.settledCents)}</strong>
                          </span>
                          {pending > 0 && (
                            <button
                              onClick={() => handleSettleSellerCash(s.id)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-black shadow"
                            >
                              🔒 Recibir {formatPEN(pending)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 6: CAJA, YAPE Y GANANCIA NETA
            ================================================================= */}
            {activeTab === "CAJA" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
                  <h2 className="text-xl font-black text-stone-900 border-b pb-3">
                    1. Arqueo Exacto de Efectivo en Caja
                  </h2>
                  <div className="space-y-2.5 text-sm bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <div className="flex justify-between">
                      <span>Fondo Inicial para Vuelto:</span>
                      <strong>{formatPEN(fondoInicialCajaCents)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        + Entradas en Efectivo (Polladas/Barra/Rendiciones):
                      </span>
                      <strong className="text-emerald-700">
                        + {formatPEN(metrics.entradasEfectivoCajaCents)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>− Gastos Pagados con Efectivo de Caja:</span>
                      <strong className="text-red-600">
                        − {formatPEN(metrics.salidasEfectivoCajaCents)}
                      </strong>
                    </div>
                    <div className="border-t pt-2.5 flex justify-between text-base font-black">
                      <span>Efectivo que DEBE HABER en Caja:</span>
                      <span className="text-blue-900">
                        {formatPEN(metrics.efectivoDisponibleCajaCents)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <label className="block text-xs font-extrabold text-stone-800">
                      Dinero físico contado en gaveta ahora mismo (S/):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={(conteoFisicoRealCents / 100).toFixed(2)}
                      onChange={(e) => {
                        const cents = Math.round(
                          (parseFloat(e.target.value) || 0) * 100
                        );
                        setConteoFisicoRealCents(cents);
                        saveToCloud({ conteoFisicoRealCents: cents });
                      }}
                      className="w-full p-3 rounded-xl border border-amber-400 bg-white font-black text-lg text-center"
                    />
                    <div className="flex justify-between items-center text-sm font-black pt-1">
                      <span>Diferencia de Caja:</span>
                      <span
                        className={
                          metrics.diferenciaCajaCents === 0
                            ? "text-emerald-800"
                            : "text-red-700"
                        }
                      >
                        {formatPEN(metrics.diferenciaCajaCents)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
                  <h2 className="text-xl font-black text-stone-900 border-b pb-3">
                    2. Rentabilidad JCR EVENTOS y Dinero Digital (Yape/Plin)
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-[10px] font-black uppercase text-purple-800 block">
                        Saldo Neto en Yape / Plin
                      </span>
                      <strong className="text-2xl font-black text-purple-900 mt-1 block">
                        {formatPEN(metrics.saldoDisponibleYapeCents)}
                      </strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] font-black uppercase text-amber-800 block">
                        Por Rendir Vendedores
                      </span>
                      <strong className="text-2xl font-black text-amber-900 mt-1 block">
                        {formatPEN(metrics.faltaRendirVendedoresCents)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                    <div className="flex justify-between">
                      <span>+ Total Cobrado en Polladas:</span>
                      <strong className="text-emerald-800">
                        {formatPEN(metrics.cobradoTicketsCents)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Total Ventas de Barra:</span>
                      <strong className="text-blue-800">
                        {formatPEN(metrics.ingresosBarraCents)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>− Total Compras y Gastos:</span>
                      <strong className="text-red-700">
                        − {formatPEN(metrics.gastosTotalesCents)}
                      </strong>
                    </div>
                    <div className="border-t border-emerald-300 pt-2.5 flex justify-between text-lg font-black">
                      <span>GANANCIA NETA ACTUAL:</span>
                      <span className="text-emerald-950">
                        {formatPEN(metrics.gananciaNetaCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 7: HISTORIAL ANTIFRAUDE INMUTABLE
            ================================================================= */}
            {activeTab === "ANTIFRAUDE" && (
              <div className="bg-white rounded-3xl shadow-sm border-2 border-stone-800 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-red-100 text-red-800">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-red-700">
                        Auditoría Inmutable JCR EVENTOS
                      </span>
                      <h2 className="text-xl font-black text-stone-900">
                        Historial Antifraude de Todos los Movimientos
                      </h2>
                      <p className="text-xs text-stone-600">
                        Aquí ves en tu laptop cada venta que tus vendedores
                        hacen desde sus celulares en tiempo real.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Buscar vendedor, ticket o cliente..."
                      className="px-3 py-2 border rounded-xl text-xs font-bold"
                    />
                    <select
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      className="px-3 py-2 border rounded-xl text-xs font-black bg-stone-50"
                    >
                      <option value="TODOS">Todos los Movimientos</option>
                      <option value="ALERTA">
                        🚨 Solo Alertas / Anulaciones / Críticos
                      </option>
                      <option value="VENTA">💵 Ventas y Cobros</option>
                      <option value="DESPACHO">🍗 Entregas de Cocina</option>
                      <option value="GASTO">🍾 Barra y Gastos</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 font-mono">
                  {filteredAuditLogs.map((l) => {
                    let boxStyle =
                      "bg-stone-50 border-stone-200 text-stone-800";
                    let badgeStyle = "bg-stone-200 text-stone-800";
                    if (l.severity === "CRITICAL") {
                      boxStyle = "bg-red-50 border-red-400 text-red-950";
                      badgeStyle = "bg-red-700 text-white";
                    } else if (l.severity === "WARNING") {
                      boxStyle = "bg-amber-50 border-amber-400 text-amber-950";
                      badgeStyle = "bg-amber-600 text-white";
                    }

                    return (
                      <div
                        key={l.id}
                        className={`p-3.5 rounded-2xl border ${boxStyle} flex flex-wrap justify-between items-start gap-2 text-xs`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${badgeStyle}`}
                            >
                              {l.category}
                            </span>
                            <strong className="font-black text-sm">
                              {l.title}
                            </strong>
                          </div>
                          <p className="text-xs opacity-90">{l.detail}</p>
                        </div>
                        <div className="text-right text-[11px] font-bold shrink-0">
                          <div>🕒 {l.time}</div>
                          <div className="text-orange-800">
                            👤 {l.operator} ({l.device})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================
                PESTAÑA 8: CONFIGURACIÓN MAESTRA DEL NEGOCIO
            ================================================================= */}
            {activeTab === "CONFIG" && (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-black text-stone-900">
                      Configuración Maestra — JCR EVENTOS (Huánuco)
                    </h2>
                    <p className="text-xs text-stone-600">
                      Protegido con Clave Maestra para que ningún vendedor
                      altere precios ni cantidades.
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      isMasterUnlocked
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    {isMasterUnlocked
                      ? "🔓 MODO ADMINISTRADOR ACTIVO"
                      : "🔒 BLOQUEADO (Toca Clave Maestra arriba)"}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Nombre del Evento (JCR EVENTOS)
                    </label>
                    <input
                      type="text"
                      value={eventConfig.name}
                      onChange={(e) => {
                        if (!requireMasterAuth("Editar Nombre")) return;
                        const next = { ...eventConfig, name: e.target.value };
                        setEventConfig(next);
                        saveToCloud({ eventConfig: next });
                      }}
                      className="w-full p-3 border rounded-xl text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Dirección en Huánuco
                    </label>
                    <input
                      type="text"
                      value={eventConfig.address}
                      onChange={(e) => {
                        if (!requireMasterAuth("Editar Dirección")) return;
                        const next = {
                          ...eventConfig,
                          address: e.target.value,
                        };
                        setEventConfig(next);
                        saveToCloud({ eventConfig: next });
                      }}
                      className="w-full p-3 border rounded-xl text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Precio por Pollada (S/)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={(eventConfig.unitPriceCents / 100).toFixed(2)}
                      onChange={(e) => {
                        if (!requireMasterAuth("Cambiar Precio")) return;
                        const cents = Math.round(
                          (parseFloat(e.target.value) || 15) * 100
                        );
                        const nextCfg = {
                          ...eventConfig,
                          unitPriceCents: cents,
                        };
                        const nextT = tickets.map((t) =>
                          t.assignmentStatus === "DISPONIBLE"
                            ? { ...t, agreedPriceCents: cents }
                            : t
                        );
                        setEventConfig(nextCfg);
                        setTickets(nextT);
                        saveToCloud({ eventConfig: nextCfg, tickets: nextT });
                      }}
                      className="w-full p-3 border rounded-xl text-sm font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Platos / Pollos en Cocina
                    </label>
                    <input
                      type="number"
                      value={pollosRecibidos}
                      onChange={(e) => {
                        if (!requireMasterAuth("Cambiar Stock Cocina")) return;
                        const val =
                          parseInt(e.target.value || "250", 10) || 250;
                        setPollosRecibidos(val);
                        saveToCloud({ pollosRecibidos: val });
                      }}
                      className="w-full p-3 border rounded-xl text-sm font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Fondo Inicial de Caja (S/)
                    </label>
                    <input
                      type="number"
                      value={(fondoInicialCajaCents / 100).toFixed(2)}
                      onChange={(e) => {
                        if (!requireMasterAuth("Cambiar Fondo de Caja")) return;
                        const cents = Math.round(
                          (parseFloat(e.target.value) || 0) * 100
                        );
                        setFondoInicialCajaCents(cents);
                        saveToCloud({ fondoInicialCajaCents: cents });
                      }}
                      className="w-full p-3 border rounded-xl text-sm font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-stone-700 mb-1">
                      Cambiar Clave Maestra (Actual:{" "}
                      {isMasterUnlocked ? masterPin : "••••"})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newMasterPinInput}
                        onChange={(e) => setNewMasterPinInput(e.target.value)}
                        placeholder="Nuevo PIN..."
                        className="w-full p-3 border rounded-xl text-sm font-bold"
                      />
                      <button
                        onClick={() => {
                          if (!requireMasterAuth("Cambiar Clave Maestra"))
                            return;
                          if (newMasterPinInput.trim().length < 4) {
                            notify(
                              "La nueva Clave Maestra debe tener al menos 4 dígitos.",
                              "warning"
                            );
                            return;
                          }
                          const nextPin = newMasterPinInput.trim();
                          setMasterPin(nextPin);
                          setNewMasterPinInput("");
                          saveToCloud({ masterPin: nextPin });
                          notify(
                            "Clave Maestra actualizada con éxito.",
                            "success"
                          );
                        }}
                        className="px-4 rounded-xl bg-stone-900 text-white text-xs font-black"
                      >
                        Guardar PIN
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* NAVEGACIÓN INFERIOR MÓVIL/TABLET (Solo cuando estás en Panel Completo) */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-300 shadow-2xl z-40 grid grid-cols-6">
            {[
              { id: "VENDER", label: "Vender", icon: Ticket },
              { id: "PADRON", label: "250 Tkt", icon: QrCode },
              { id: "DESPACHO", label: "Cocina", icon: Utensils },
              { id: "VENDEDORES", label: "Vendedores", icon: Users },
              { id: "CAJA", label: "Caja", icon: Wallet },
              { id: "ANTIFRAUDE", label: "Auditoría", icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2 text-[10px] font-black transition ${
                    isAct
                      ? "text-orange-700 bg-orange-50 border-t-2 border-orange-600"
                      : "text-stone-500"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* MODAL CLAVE MAESTRA */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border-2 border-amber-400">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-lg text-stone-900">
                  Clave Maestra JCR EVENTOS
                </h3>
              </div>
              <button
                onClick={() => setShowMasterModal(false)}
                className="p-1 rounded-lg bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-600">
              Ingresa el PIN Maestro para abrir el Panel de Control Completo de
              Laptop o autorizar cambios administrativos.{" "}
              <span className="text-stone-400">(PIN inicial: 2026)</span>
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={masterPinInput}
              onChange={(e) => setMasterPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifyMasterPin();
              }}
              placeholder="••••"
              className="w-full p-3.5 border-2 border-stone-300 rounded-2xl text-center font-mono font-black text-2xl tracking-widest"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowMasterModal(false)}
                className="py-3 rounded-xl font-bold text-xs bg-stone-200 text-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyMasterPin}
                className="py-3 rounded-xl font-black text-xs bg-orange-600 text-white"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO EVENTO */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-stone-900">
                Crear Nueva Actividad — JCR EVENTOS
              </h3>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="p-1 rounded-lg bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newEventTitleInput}
              onChange={(e) => setNewEventTitleInput(e.target.value)}
              placeholder="Ej. Gran Pollada JCR EVENTOS - Noviembre"
              className="w-full p-3 border rounded-xl text-sm font-bold"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewEventModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewEvent}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-orange-600 text-white"
              >
                Crear 250 Tickets Nuevos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORTAR CSV / EXCEL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-stone-900">
                Exportar Reportes JCR EVENTOS (Excel / CSV)
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setExportMode("TICKETS")}
                className={`px-4 py-2 rounded-xl text-xs font-black ${
                  exportMode === "TICKETS"
                    ? "bg-emerald-700 text-white"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                Ver Padrón 250 Tickets
              </button>
              <button
                onClick={() => setExportMode("AUDIT")}
                className={`px-4 py-2 rounded-xl text-xs font-black ${
                  exportMode === "AUDIT"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                Ver Historial Antifraude
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(csvExportContent);
                  notify("Datos copiados al portapapeles.", "success");
                }}
                className="px-4 py-2 rounded-xl bg-orange-100 text-orange-900 text-xs font-black flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar para Excel
              </button>
            </div>
            <textarea
              readOnly
              value={csvExportContent}
              className="w-full flex-1 min-h-[240px] p-3 border rounded-xl font-mono text-[11px] bg-stone-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}