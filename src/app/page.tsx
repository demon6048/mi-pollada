<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Mi Pollada POS & Control Antifraude — Huánuco, Perú</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #FAF6F0;
      color: #1C1917;
      -webkit-tap-highlight-color: transparent;
    }
    .font-mono-code {
      font-family: 'JetBrains Mono', monospace;
    }
    /* Scrollbar limpio */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #F5EFE6;
    }
    ::-webkit-scrollbar-thumb {
      background: #D6C7B2;
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #B8A386;
    }
    @keyframes pulse-border {
      0%, 100% { border-color: rgba(234, 88, 12, 0.9); }
      50% { border-color: rgba(234, 88, 12, 0.2); }
    }
    .animate-pulse-border {
      animation: pulse-border 2s infinite;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col pb-24 lg:pb-10">

  <!-- ========================================================================
       CABECERA PRINCIPAL AMPLIA (LOGO POLLERÍA HUÁNUCO + OPERADOR + CLAVE MAESTRA)
  ========================================================================= -->
  <header class="bg-gradient-to-r from-stone-900 via-red-950 to-orange-950 text-white shadow-xl sticky top-0 z-40 border-b border-orange-500/30">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        
        <!-- Logo SVG Oficial + Nombre del Negocio en Huánuco -->
        <div class="flex items-center gap-3">
          <div class="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 p-0.5 shadow-lg shrink-0">
            <div class="w-full h-full bg-stone-950/90 rounded-[14px] flex items-center justify-center">
              <!-- Logo Vectorial Pollería / Parrilla -->
              <svg class="w-8 h-8 text-amber-400" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 40C16 28 25 20 36 20C45 20 52 26 52 35C52 43 45 48 34 48H18C16.8954 48 16 47.1046 16 46V40Z" fill="#F97316"/>
                <path d="M12 36C8 36 6 32 8 28C10 24 15 26 17 30" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/>
                <path d="M26 14C26 10 30 8 30 4" stroke="#FCD34D" stroke-width="3" stroke-linecap="round"/>
                <path d="M36 15C36 11 40 9 40 5" stroke="#FCD34D" stroke-width="3" stroke-linecap="round"/>
                <rect x="10" y="50" width="44" height="5" rx="2.5" fill="#FBBF24"/>
                <circle cx="41" cy="32" r="3" fill="#FFFBEB"/>
              </svg>
            </div>
            <span id="syncIndicatorDot" class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-stone-950"></span>
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span id="syncBadgeText" class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                CONECTANDO NUBE...
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-orange-200">
                HUÁNUCO • PERÚ
              </span>
            </div>
            <h1 id="headerEventName" class="text-base sm:text-xl font-black tracking-tight text-white leading-tight mt-0.5">
              Pollería & Eventos Huánuco
            </h1>
            <p id="headerEventSub" class="text-[11px] text-stone-300 font-medium">
              Padrón 250 Tickets • Precio S/ 15.00
            </p>
          </div>
        </div>

        <!-- Controles Superiores: Teléfono Operador + Selector Evento + Clave Maestra -->
        <div class="flex flex-wrap items-center gap-2">
          
          <!-- ¿Quién usa este teléfono? (Trazabilidad Antifraude) -->
          <div class="bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <i data-lucide="smartphone" class="w-4 h-4 text-amber-300 shrink-0"></i>
            <div class="text-left">
              <span class="block text-[9px] uppercase font-bold text-stone-300 leading-none">Operador en este celular</span>
              <select id="activeOperatorSelect" onchange="window.appActions.changeOperator(this.value)" class="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer pr-1">
                <!-- Se llena dinámicamente -->
              </select>
            </div>
          </div>

          <!-- Selector de Evento / Negocio -->
          <div class="bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
            <div class="text-left">
              <span class="block text-[9px] uppercase font-bold text-stone-300 leading-none">Evento Activo</span>
              <select id="eventSelector" onchange="window.appActions.switchEvent(this.value)" class="bg-transparent text-xs font-extrabold text-amber-200 focus:outline-none cursor-pointer">
                <!-- Se llena dinámicamente -->
              </select>
            </div>
            <button onclick="window.appActions.openNewEventModal()" title="Crear Nuevo Evento (Requiere Clave Maestra)" class="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition">
              <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Botón Clave Maestra (Candado Admin vs Vendedor) -->
          <button id="masterKeyBtn" onclick="window.appActions.toggleMasterKeyModal()" class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition shadow-sm bg-stone-800 border-stone-600 text-stone-200 hover:bg-stone-700">
            <i id="masterKeyIcon" data-lucide="lock" class="w-4 h-4 text-amber-400"></i>
            <span id="masterKeyLabel">Clave Maestra</span>
          </button>

          <!-- Botón Exportar Excel/CSV -->
          <button onclick="window.appActions.openExportModal()" class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-white text-stone-900 hover:bg-amber-50 transition shadow-sm">
            <i data-lucide="download" class="w-4 h-4 text-orange-600"></i>
            <span class="hidden sm:inline">Exportar</span>
          </button>
        </div>

      </div>

      <!-- Barra de Navegación Desktop / Tablet Amplia -->
      <nav class="hidden lg:flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 overflow-x-auto">
        <button onclick="window.appActions.setTab('VENDER')" data-tab="VENDER" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="ticket" class="w-4 h-4"></i> 1. Vender Pollada y Barra
        </button>
        <button onclick="window.appActions.setTab('PADRON')" data-tab="PADRON" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="grid" class="w-4 h-4"></i> 2. Padrón 250 Tickets + QR
        </button>
        <button onclick="window.appActions.setTab('DESPACHO')" data-tab="DESPACHO" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="utensils" class="w-4 h-4"></i> 3. Cocina y Despacho
        </button>
        <button onclick="window.appActions.setTab('GASTOS')" data-tab="GASTOS" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="Flame" class="w-4 h-4"></i> 4. Fiesta, Stock y Gastos
        </button>
        <button onclick="window.appActions.setTab('VENDEDORES')" data-tab="VENDEDORES" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="users" class="w-4 h-4"></i> 5. Vendedores y Rendición
        </button>
        <button onclick="window.appActions.setTab('CAJA')" data-tab="CAJA" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="wallet" class="w-4 h-4"></i> 6. Caja, Yape y Ganancia
        </button>
        <button onclick="window.appActions.setTab('ANTIFRAUDE')" data-tab="ANTIFRAUDE" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="shield-alert" class="w-4 h-4"></i> 7. Historial Antifraude
          <span id="auditCountBadge" class="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">0</span>
        </button>
        <button onclick="window.appActions.setTab('CONFIG')" data-tab="CONFIG" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition">
          <i data-lucide="settings" class="w-4 h-4"></i> 8. Configuración 🔒
        </button>
      </nav>
    </div>
  </header>

  <!-- ========================================================================
       BARRA DE RESUMEN EN TIEMPO REAL (KPIs RÁPIDOS SIEMPRE VISIBLES)
  ========================================================================= -->
  <section class="bg-white border-b border-stone-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-stone-500 block">Tickets Libres</span>
          <strong id="kpiLibres" class="text-base font-black text-stone-900">250</strong>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">de 250</span>
      </div>

      <div class="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-amber-800 block">Separados (Falta Pagar)</span>
          <strong id="kpiSeparados" class="text-base font-black text-amber-900">0</strong>
        </div>
        <span id="kpiSeparadosSoles" class="text-[11px] font-extrabold text-amber-800">S/ 0.00</span>
      </div>

      <div class="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-emerald-800 block">Polladas Pagadas</span>
          <strong id="kpiPagados" class="text-base font-black text-emerald-900">0</strong>
        </div>
        <span id="kpiPagadosSoles" class="text-[11px] font-extrabold text-emerald-800">S/ 0.00</span>
      </div>

      <div class="p-2 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-orange-800 block">Platos en Cocina</span>
          <strong id="kpiPlatosQuedan" class="text-base font-black text-orange-900">250</strong>
        </div>
        <span id="kpiEntregados" class="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-200 text-orange-900">0 entregados</span>
      </div>

      <div class="p-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-blue-800 block">Efectivo en Caja</span>
          <strong id="kpiEfectivoCaja" class="text-base font-black text-blue-900">S/ 100.00</strong>
        </div>
        <span class="text-[10px] font-bold text-blue-700">Físico</span>
      </div>

      <div class="p-2 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-purple-800 block">Saldo Yape / Plin</span>
          <strong id="kpiSaldoYape" class="text-base font-black text-purple-900">S/ 0.00</strong>
        </div>
        <span class="text-[10px] font-bold text-purple-700">Digital</span>
      </div>
    </div>
  </section>

  <!-- NOTIFICACIÓN FLOTANTE (TOAST) -->
  <div id="toastContainer" class="fixed top-20 right-4 z-50 max-w-md w-full pointer-events-none hidden">
    <div id="toastBox" class="pointer-events-auto p-4 rounded-2xl shadow-2xl border-2 flex items-start justify-between gap-3 bg-stone-900 text-white border-amber-400">
      <div class="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold">
        <span id="toastIcon">🔔</span>
        <span id="toastMessage">Mensaje del sistema</span>
      </div>
      <button onclick="window.appActions.hideToast()" class="text-xs font-black uppercase px-2 py-1 rounded bg-white/15 hover:bg-white/25">OK</button>
    </div>
  </div>

  <!-- ========================================================================
       CONTENIDO PRINCIPAL POR PESTAÑAS
  ========================================================================= -->
  <main class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 flex-1">

    <!-- ======================================================================
         PESTAÑA 1: VENDER POLLADA Y BARRA (POS RÁPIDO)
    ======================================================================= -->
    <section id="tab-VENDER" class="tab-panel grid lg:grid-cols-12 gap-6">
      
      <!-- Columna Izquierda: Venta o Reserva de Pollada (7 cols) -->
      <div class="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-orange-600">Módulo Punto de Venta</span>
            <h2 class="text-xl font-black text-stone-900">1. Registrar Venta o Separación de Pollada</h2>
          </div>
          <button onclick="window.appActions.pickNextAvailableTicket()" class="text-xs font-extrabold bg-orange-100 hover:bg-orange-200 text-orange-900 px-3 py-2 rounded-xl transition flex items-center gap-1.5">
            ⚡ Buscar N.º Libre
          </button>
        </div>

        <div class="grid sm:grid-cols-12 gap-4">
          <div class="sm:col-span-4">
            <label class="block text-xs font-extrabold text-stone-700 mb-1">N.º Ticket (1 al 250)</label>
            <input id="posTicketNums" type="text" value="1" oninput="window.appActions.updatePosCalculation()" placeholder="Ej: 15 o 15,16,17" class="w-full p-3 border-2 border-orange-500 rounded-2xl font-mono-code font-black text-xl text-center bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <span id="posTicketHint" class="block text-[11px] font-bold text-emerald-700 mt-1 text-center">✓ Ticket disponible</span>
          </div>

          <div class="sm:col-span-8">
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Nombre del Cliente / Comprador</label>
            <input id="posBuyerName" type="text" placeholder="Ej. Familia Rojas / Juan Pérez" class="w-full p-3 border border-stone-300 rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-500" />
            <span class="block text-[11px] text-stone-500 mt-1">Puedes vender varios tickets separando con coma (ej: <code class="font-bold">10, 11, 12</code>)</span>
          </div>
        </div>

        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Celular WhatsApp (Opcional)</label>
            <input id="posBuyerPhone" type="tel" placeholder="Ej. 962123456" class="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-semibold" />
          </div>

          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Vendedor Responsable</label>
            <select id="posSellerSelect" class="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-bold bg-white">
              <!-- Dinámico -->
            </select>
          </div>

          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Modalidad de Despacho</label>
            <select id="posServiceType" class="w-full p-2.5 border border-stone-300 rounded-xl text-sm font-bold bg-white">
              <option value="MESA_LOCAL">Comer en el Local</option>
              <option value="PARA_LLEVAR">Para Llevar</option>
              <option value="DELIVERY_HUANUCO">Delivery Huánuco</option>
            </select>
          </div>
        </div>

        <!-- Selección de Medio de Pago -->
        <div class="space-y-2">
          <label class="block text-xs font-extrabold text-stone-700">¿Cómo se paga esta pollada?</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button type="button" onclick="window.appActions.setPosPayMode('EFECTIVO_CAJA')" id="payBtn-EFECTIVO_CAJA" class="pos-pay-btn p-3 rounded-2xl border-2 text-left transition">
              <span class="block text-xs font-black">💵 Efectivo Caja</span>
              <span class="block text-[10px] opacity-80 mt-0.5">Entra directo a Caja</span>
            </button>
            <button type="button" onclick="window.appActions.setPosPayMode('YAPE_EVENTO')" id="payBtn-YAPE_EVENTO" class="pos-pay-btn p-3 rounded-2xl border-2 text-left transition">
              <span class="block text-xs font-black">📱 Yape / Plin</span>
              <span class="block text-[10px] opacity-80 mt-0.5">Cuenta digital oficial</span>
            </button>
            <button type="button" onclick="window.appActions.setPosPayMode('EFECTIVO_VENDEDOR')" id="payBtn-EFECTIVO_VENDEDOR" class="pos-pay-btn p-3 rounded-2xl border-2 text-left transition">
              <span class="block text-xs font-black">👤 Cobró Vendedor</span>
              <span class="block text-[10px] opacity-80 mt-0.5">Queda por rendir</span>
            </button>
            <button type="button" onclick="window.appActions.setPosPayMode('SOLO_SEPARAR')" id="payBtn-SOLO_SEPARAR" class="pos-pay-btn p-3 rounded-2xl border-2 text-left transition">
              <span class="block text-xs font-black">⏳ Solo Separar</span>
              <span class="block text-[10px] opacity-80 mt-0.5">Pagará al recoger</span>
            </button>
          </div>
        </div>

        <!-- Calculadora de Vuelto (si es Efectivo) o Nro Operación (si es Yape) -->
        <div id="posCashCalculatorBox" class="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-extrabold text-stone-800">Paga con billete S/:</span>
            <input id="posBilleteInput" type="number" value="20" oninput="window.appActions.updatePosCalculation()" class="w-24 p-2 rounded-xl border border-amber-400 font-black text-center text-base bg-white" />
            <div class="flex gap-1">
              <button type="button" onclick="window.appActions.setQuickBillete(20)" class="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-black hover:bg-amber-100">S/ 20</button>
              <button type="button" onclick="window.appActions.setQuickBillete(50)" class="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-black hover:bg-amber-100">S/ 50</button>
              <button type="button" onclick="window.appActions.setQuickBillete(100)" class="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-black hover:bg-amber-100">S/ 100</button>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-stone-600 block">Total a cobrar: <strong id="posTotalCobrarLabel" class="text-stone-900">S/ 15.00</strong></span>
            <span class="text-xs font-extrabold text-orange-900">Vuelto a dar: <strong id="posVueltoLabel" class="text-lg font-black">S/ 5.00</strong></span>
          </div>
        </div>

        <div id="posYapeRefBox" class="hidden p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex-1">
            <label class="block text-xs font-extrabold text-purple-900 mb-1">N.º de Operación / Titular Yape (Seguridad Antifraude)</label>
            <input id="posYapeRefInput" type="text" placeholder="Ej. Op. 482910 - Yapeó María" class="w-full p-2.5 rounded-xl border border-purple-300 text-xs font-bold bg-white" />
          </div>
        </div>

        <!-- Opción de Entrega Inmediata -->
        <div id="posImmediateDeliveryWrap" class="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between">
          <label class="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-extrabold text-stone-800">
            <input id="posDeliverNowCheckbox" type="checkbox" class="w-5 h-5 accent-orange-600 rounded cursor-pointer" />
            <span>Entregar el plato en este instante (Descontar de Cocina y marcar ENTREGADO)</span>
          </label>
        </div>

        <button type="button" onclick="window.appActions.submitTicketSale()" id="posSubmitBtn" class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black text-base shadow-lg transition transform active:scale-[0.99]">
          GUARDAR VENTA (S/ 15.00)
        </button>
      </div>

      <!-- Columna Derecha: Venta Rápida de Barra y Gaseosas (5 cols) -->
      <div class="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 flex flex-col justify-between space-y-5">
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-emerald-700">Cantina / Bebidas</span>
              <h2 class="text-xl font-black text-stone-900">2. Venta Rápida de Barra</h2>
            </div>
            <span id="barTotalRevenueBadge" class="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl">
              Barra: S/ 0.00
            </span>
          </div>

          <p class="text-xs text-stone-600">
            Un toque para vender gaseosas, cerveza, agua o adicionales. Se suma a Caja o Yape y se registra en el <strong>Historial Antifraude</strong>.
          </p>

          <div id="barItemsContainer" class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            <!-- Se llena dinámicamente -->
          </div>
        </div>

        <div class="pt-3 border-t border-stone-200 flex flex-wrap gap-2 justify-between items-center">
          <span class="text-xs text-stone-500 font-semibold">¿Llegaron más cajas de cerveza o gaseosa?</span>
          <button onclick="window.appActions.setTab('GASTOS')" class="text-xs font-black text-orange-700 hover:underline">
            + Abastecer Stock en Fiesta y Gastos →
          </button>
        </div>
      </div>

    </section>

    <!-- ======================================================================
         PESTAÑA 2: PADRÓN DE 250 TICKETS + DETALLE QR Y ANULACIÓN
    ======================================================================= -->
    <section id="tab-PADRON" class="tab-panel hidden space-y-6">
      <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h2 class="text-xl font-black text-stone-900">Padrón Oficial de 250 Tickets (001 al 250)</h2>
            <p class="text-xs text-stone-600">Toca cualquier número para ver su QR antifraude, enviar por WhatsApp, cobrar o despachar.</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input id="padronSearchInput" type="text" oninput="window.appActions.renderPadron()" placeholder="Buscar N.º, cliente o vendedor..." class="px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold w-56" />
            <select id="padronFilterSelect" onchange="window.appActions.renderPadron()" class="px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-black bg-stone-50">
              <option value="TODOS">Todos los 250 Tickets</option>
              <option value="DISPONIBLE">🟢 Libres (Disponibles)</option>
              <option value="FALTA_PAGAR">🟡 Separados (Falta Pagar)</option>
              <option value="PAGADO">💵 Pagados (Confirmados)</option>
              <option value="FALTA_ENTREGAR">🍗 Pagados por Recoger Plato</option>
              <option value="ENTREGADO">⬛ Ya Entregados</option>
            </select>
          </div>
        </div>

        <!-- Leyenda de colores -->
        <div class="flex flex-wrap gap-3 text-xs font-bold">
          <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-300 text-stone-700"><span class="w-2.5 h-2.5 rounded-full bg-stone-400"></span> Libre</span>
          <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-400 text-amber-900"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Separado (Debe S/ 15)</span>
          <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-500 text-emerald-900"><span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Pagado (Listo para recoger)</span>
          <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 text-white"><span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Plato Ya Entregado</span>
        </div>

        <!-- Cuadrícula de los 250 tickets -->
        <div id="padronGridContainer" class="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 lg:grid-cols-10 gap-2 max-h-[520px] overflow-y-auto p-1">
          <!-- Generado dinámicamente -->
        </div>
      </div>

      <!-- Inspector de Ticket Seleccionado -->
      <div id="ticketInspectorBox" class="hidden bg-white rounded-3xl shadow-xl border-2 border-orange-500 p-5 sm:p-6">
        <!-- Se llena al tocar un ticket -->
      </div>
    </section>

    <!-- ======================================================================
         PESTAÑA 3: COCINA Y DESPACHO DE PLATOS (CONTROL ANTI-DOBLE ENTREGA)
    ======================================================================= -->
    <section id="tab-DESPACHO" class="tab-panel hidden space-y-6">
      <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-orange-600">Control de Cocina Huánuco</span>
            <h2 class="text-xl font-black text-stone-900">Despacho de Platos y Verificador Antifraude</h2>
            <p class="text-xs text-stone-600">Evita que recojan dos veces con el mismo ticket o que retiren platos sin haber pagado.</p>
          </div>
          <div class="flex items-center gap-3 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-2xl">
            <div>
              <span class="text-[10px] font-bold uppercase text-orange-800 block">Platos Físicos Disponibles</span>
              <strong id="despachoPlatosCount" class="text-2xl font-black text-orange-900">250</strong>
            </div>
          </div>
        </div>

        <div class="relative">
          <input id="despachoSearchInput" type="text" oninput="window.appActions.renderDespacho()" placeholder="Escribe el N.º de Ticket (ej. 045), nombre del cliente o código QR..." class="w-full p-4 pl-4 rounded-2xl border-2 border-stone-300 focus:border-orange-500 focus:outline-none text-base font-extrabold" />
        </div>

        <div id="despachoListContainer" class="grid md:grid-cols-2 gap-3">
          <!-- Se llena dinámicamente -->
        </div>
      </div>
    </section>

    <!-- ======================================================================
         PESTAÑA 4: FIESTA, STOCK DE BARRA Y GASTOS DE CAJA
    ======================================================================= -->
    <section id="tab-GASTOS" class="tab-panel hidden grid lg:grid-cols-12 gap-6">
      
      <!-- Registrar Salida de Dinero / Abastecer Barra -->
      <div class="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
        <div class="border-b border-stone-200 pb-3">
          <span class="text-[11px] font-black uppercase tracking-wider text-orange-600">Control de Compras e Inventario</span>
          <h2 class="text-xl font-black text-stone-900">Registrar Compra de Barra o Gasto del Local</h2>
          <p class="text-xs text-stone-600">Si pagas con dinero de Caja o Yape, el sistema lo descuenta automáticamente y lo audita.</p>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button type="button" onclick="window.appActions.setExpenseCategory('COMPRA_BARRA')" id="expCat-COMPRA_BARRA" class="exp-cat-btn p-3 rounded-2xl border text-xs font-black">
            🍾 Abastecer Barra (+Stock)
          </button>
          <button type="button" onclick="window.appActions.setExpenseCategory('PAGO_POLLOS')" id="expCat-PAGO_POLLOS" class="exp-cat-btn p-3 rounded-2xl border text-xs font-black">
            🍗 Insumos / Pollos / Carbón
          </button>
          <button type="button" onclick="window.appActions.setExpenseCategory('GASTO_FIESTA')" id="expCat-GASTO_FIESTA" class="exp-cat-btn p-3 rounded-2xl border text-xs font-black">
            🎵 Orquesta / DJ / Local
          </button>
        </div>

        <!-- Sub-bloque si es Compra Barra -->
        <div id="expBarStockBox" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 grid sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-extrabold text-emerald-900 mb-1">Producto que ingresa a Barra</label>
            <select id="expBarProductSelect" class="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-black">
              <!-- Dinámico -->
            </select>
          </div>
          <div>
            <label class="block text-xs font-extrabold text-emerald-900 mb-1">Unidades que ingresan (+Stock)</label>
            <input id="expBarUnitsInput" type="number" value="24" class="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-sm font-black text-center" />
          </div>
        </div>

        <div class="grid sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Concepto / Detalle del Gasto</label>
            <input id="expConceptInput" type="text" placeholder="Ej. 2 cajas de cerveza / Adelanto sonido" class="w-full p-3 border border-stone-300 rounded-xl text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Monto Pagado (S/)</label>
            <input id="expAmountInput" type="number" step="0.50" placeholder="0.00" class="w-full p-3 border border-stone-300 rounded-xl text-base font-black text-center" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-extrabold text-stone-700 mb-1.5">¿De dónde salió el dinero?</label>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" onclick="window.appActions.setExpenseOrigin('EFECTIVO_CAJA')" id="expOrig-EFECTIVO_CAJA" class="exp-orig-btn p-2.5 rounded-xl border text-xs font-black">
              💵 Efectivo de Caja
            </button>
            <button type="button" onclick="window.appActions.setExpenseOrigin('YAPE_EVENTO')" id="expOrig-YAPE_EVENTO" class="exp-orig-btn p-2.5 rounded-xl border text-xs font-black">
              📱 Yape del Evento
            </button>
            <button type="button" onclick="window.appActions.setExpenseOrigin('POR_PAGAR')" id="expOrig-POR_PAGAR" class="exp-orig-btn p-2.5 rounded-xl border text-xs font-black">
              📝 Crédito / Por Pagar
            </button>
          </div>
        </div>

        <button type="button" onclick="window.appActions.submitExpense()" class="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-sm shadow">
          REGISTRAR COMPRA / SALIDA DE DINERO
        </button>
      </div>

      <!-- Historial de Gastos + Agregar Nuevo Producto a la Barra -->
      <div class="lg:col-span-6 space-y-6">
        <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-black text-base text-stone-900">Gastos y Compras Registradas</h3>
            <span id="totalExpensesBadge" class="text-xs font-black bg-red-100 text-red-900 px-3 py-1 rounded-xl">Total: S/ 0.00</span>
          </div>
          <div id="expensesListContainer" class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <!-- Dinámico -->
          </div>
        </div>

        <!-- Crear nuevo producto en Barra (Protegido con Clave Maestra) -->
        <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-sm text-stone-900">Añadir Nuevo Producto a la Carta / Barra</h3>
            <span class="text-[10px] font-bold bg-stone-100 px-2 py-0.5 rounded text-stone-600">🔒 Requiere Clave Maestra</span>
          </div>
          <div class="grid sm:grid-cols-3 gap-2.5">
            <input id="newBarNameInput" type="text" placeholder="Nombre (ej. Jarra Chicha)" class="p-2.5 border rounded-xl text-xs font-bold" />
            <input id="newBarPriceInput" type="number" step="0.50" placeholder="Precio Venta S/" class="p-2.5 border rounded-xl text-xs font-bold" />
            <button onclick="window.appActions.addNewBarProduct()" class="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl py-2.5 px-3">
              + Crear Producto
            </button>
          </div>
        </div>
      </div>

    </section>

    <!-- ======================================================================
         PESTAÑA 5: VENDEDORES Y RENDICIÓN DE CUENTAS DESDE SUS TELÉFONOS
    ======================================================================= -->
    <section id="tab-VENDEDORES" class="tab-panel hidden space-y-6">
      <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-orange-600">Control por Teléfono</span>
            <h2 class="text-xl font-black text-stone-900">Rendición de Vendedores y Control de Cobranza</h2>
            <p class="text-xs text-stone-600">Cada vendedor ve aquí sus tickets vendidos. Para entregar el efectivo a Caja Principal se requiere la <strong>Clave Maestra 🔒</strong>.</p>
          </div>

          <div class="flex gap-2">
            <input id="newSellerNameInput" type="text" placeholder="Nuevo vendedor (ej. Carlos)" class="px-3 py-2 border rounded-xl text-xs font-bold" />
            <button onclick="window.appActions.addNewSeller()" class="bg-stone-900 text-white text-xs font-black px-3.5 py-2 rounded-xl">
              + Agregar Vendedor
            </button>
          </div>
        </div>

        <div id="sellersListContainer" class="grid md:grid-cols-2 gap-4">
          <!-- Dinámico -->
        </div>
      </div>
    </section>

    <!-- ======================================================================
         PESTAÑA 6: CAJA, YAPE Y GANANCIA NETA REAL
    ======================================================================= -->
    <section id="tab-CAJA" class="tab-panel hidden space-y-6">
      <div class="grid lg:grid-cols-12 gap-6">
        
        <!-- Cuadre de Efectivo Físico en Caja -->
        <div class="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
          <div class="border-b pb-3">
            <span class="text-[11px] font-black uppercase tracking-wider text-blue-700">Arqueo de Gaveta / Efectivo</span>
            <h2 class="text-xl font-black text-stone-900">1. Cuadre Exacto de Efectivo en Caja</h2>
          </div>

          <div class="space-y-2.5 text-sm bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div class="flex justify-between">
              <span class="text-stone-600 font-semibold">Fondo Inicial para Vuelto:</span>
              <strong id="cajaFondoInicial" class="font-bold">S/ 100.00</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-600 font-semibold">+ Cobros en Efectivo (Polladas, Barra y Rendiciones):</span>
              <strong id="cajaEntradasEfectivo" class="font-bold text-emerald-700">+ S/ 0.00</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-600 font-semibold">− Gastos Pagados con Efectivo de Caja:</span>
              <strong id="cajaSalidasEfectivo" class="font-bold text-red-600">− S/ 0.00</strong>
            </div>
            <div class="border-t border-stone-300 pt-2.5 flex justify-between text-base font-black">
              <span>Efectivo que DEBE HABER en Caja:</span>
              <span id="cajaEfectivoEsperado" class="text-blue-900">S/ 100.00</span>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
            <label class="block text-xs font-extrabold text-stone-800">Billetes y monedas contados físicamente en este momento (S/):</label>
            <input id="cajaConteoRealInput" type="number" step="0.50" onchange="window.appActions.updatePhysicalCashCount(this.value)" class="w-full p-3 rounded-xl border border-amber-400 bg-white font-black text-lg text-center" />
            <div class="flex justify-between items-center text-sm font-black pt-1">
              <span>Estado del Arqueo:</span>
              <span id="cajaDiferenciaLabel" class="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900">CUADRE EXACTO (S/ 0.00)</span>
            </div>
          </div>
        </div>

        <!-- Estado de Resultados y Ganancia Neta -->
        <div class="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
          <div class="border-b pb-3">
            <span class="text-[11px] font-black uppercase tracking-wider text-emerald-700">Balance del Negocio</span>
            <h2 class="text-xl font-black text-stone-900">2. Rentabilidad y Dinero Digital (Yape/Plin)</h2>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <span class="text-[10px] font-black uppercase text-purple-800 block">Saldo Neto en Yape / Plin</span>
              <strong id="cajaYapeNeto" class="text-2xl font-black text-purple-900 mt-1 block">S/ 0.00</strong>
              <span class="text-[11px] text-purple-700">Entradas − Salidas Yape</span>
            </div>
            <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span class="text-[10px] font-black uppercase text-amber-800 block">Falta Rendir Vendedores</span>
              <strong id="cajaPorRendirVendedores" class="text-2xl font-black text-amber-900 mt-1 block">S/ 0.00</strong>
              <span class="text-[11px] text-amber-800">Efectivo en teléfonos</span>
            </div>
          </div>

          <div class="space-y-2.5 text-sm bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
            <div class="flex justify-between">
              <span class="text-stone-700 font-semibold">+ Total Cobrado en Polladas:</span>
              <strong id="resCobradoTickets" class="font-bold text-emerald-800">S/ 0.00</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-700 font-semibold">+ Total Ventas de Barra / Bebidas:</span>
              <strong id="resCobradoBarra" class="font-bold text-blue-800">S/ 0.00</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-700 font-semibold">− Total Compras y Gastos Registrados:</span>
              <strong id="resGastosTotales" class="font-bold text-red-700">− S/ 0.00</strong>
            </div>
            <div class="border-t border-emerald-300 pt-2.5 flex justify-between text-lg font-black">
              <span>GANANCIA NETA ACTUAL:</span>
              <span id="resGananciaNeta" class="text-emerald-900">S/ 0.00</span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ======================================================================
         PESTAÑA 7: HISTORIAL ANTIFRAUDE INMUTABLE (AUDITORÍA TOTAL)
    ======================================================================= -->
    <section id="tab-ANTIFRAUDE" class="tab-panel hidden space-y-6">
      <div class="bg-white rounded-3xl shadow-sm border-2 border-stone-800 p-5 sm:p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-2xl bg-red-100 text-red-800">
              <i data-lucide="shield-alert" class="w-6 h-6"></i>
            </div>
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-red-700">Bitácora de Seguridad Inmutable</span>
              <h2 class="text-xl font-black text-stone-900">Historial Antifraude de Todos los Movimientos</h2>
              <p class="text-xs text-stone-600">Cada venta, cobro, entrega de plato, gasto, anulación o intento de doble entrega queda grabado con hora exacta y operador.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input id="auditSearchInput" type="text" oninput="window.appActions.renderAuditLogs()" placeholder="Buscar en bitácora..." class="px-3 py-2 border rounded-xl text-xs font-bold" />
            <select id="auditFilterSelect" onchange="window.appActions.renderAuditLogs()" class="px-3 py-2 border rounded-xl text-xs font-black bg-stone-50">
              <option value="TODOS">Todos los Movimientos</option>
              <option value="ALERTA">🚨 Solo Alertas / Anulaciones / Críticos</option>
              <option value="VENTA">💵 Ventas y Cobros</option>
              <option value="DESPACHO">🍗 Entregas de Cocina</option>
              <option value="GASTO">🍾 Gastos y Barra</option>
            </select>
          </div>
        </div>

        <div id="auditLogsContainer" class="space-y-2 max-h-[540px] overflow-y-auto pr-1 font-mono-code">
          <!-- Se llena dinámicamente -->
        </div>
      </div>
    </section>

    <!-- ======================================================================
         PESTAÑA 8: CONFIGURACIÓN DEL NEGOCIO (PROTEGIDA CON CLAVE MAESTRA)
    ======================================================================= -->
    <section id="tab-CONFIG" class="tab-panel hidden space-y-6">
      <div class="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-orange-600">Panel de Administración</span>
            <h2 class="text-xl font-black text-stone-900">Configuración Maestra del Evento / Pollería</h2>
            <p class="text-xs text-stone-600">Solo el administrador con la <strong>Clave Maestra</strong> desbloqueada puede guardar cambios aquí.</p>
          </div>
          <span id="configLockStatusBadge" class="px-3 py-1.5 rounded-xl text-xs font-black bg-red-100 text-red-900">
            🔒 BLOQUEADO (Requiere Clave Maestra)
          </span>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Nombre de la Pollería / Evento</label>
            <input id="cfgEventName" type="text" class="w-full p-3 border rounded-xl text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Dirección / Local en Huánuco</label>
            <input id="cfgEventAddress" type="text" class="w-full p-3 border rounded-xl text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Prefijo QR de Tickets</label>
            <input id="cfgEventPrefix" type="text" class="w-full p-3 border rounded-xl text-sm font-mono-code font-bold uppercase" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Precio por Pollada (S/)</label>
            <input id="cfgTicketPrice" type="number" step="0.50" class="w-full p-3 border rounded-xl text-sm font-black" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Platos / Pollos en Cocina</label>
            <input id="cfgPollosRecibidos" type="number" class="w-full p-3 border rounded-xl text-sm font-black" />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-stone-700 mb-1">Fondo Inicial de Caja (S/)</label>
            <input id="cfgFondoInicial" type="number" step="1" class="w-full p-3 border rounded-xl text-sm font-black" />
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-stone-100 border border-stone-300 grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <label class="block text-xs font-extrabold text-stone-800 mb-1">Cambiar Clave Maestra (PIN de Administrador)</label>
            <input id="cfgNewMasterPin" type="password" placeholder="Deja vacío para mantener la clave actual" class="w-full p-3 border rounded-xl text-sm font-bold bg-white" />
            <span class="text-[11px] text-stone-500">Clave Maestra inicial por defecto: <code class="font-bold">2026</code></span>
          </div>
          <button onclick="window.appActions.saveMasterConfig()" class="py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm shadow">
            GUARDAR CONFIGURACIÓN MAESTRA 🔒
          </button>
        </div>
      </div>
    </section>

  </main>

  <!-- ========================================================================
       MODAL DE CLAVE MAESTRA (CANDADO DE SEGURIDAD PARA VENDEDORES/ADMIN)
  ========================================================================= -->
  <div id="masterKeyModal" class="fixed inset-0 bg-black/70 z-50 hidden items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border-2 border-amber-400">
      <div class="flex justify-between items-center border-b pb-3">
        <div class="flex items-center gap-2">
          <i data-lucide="key-round" class="w-5 h-5 text-orange-600"></i>
          <h3 class="font-black text-lg text-stone-900">Acceso Clave Maestra</h3>
        </div>
        <button onclick="window.appActions.closeMasterKeyModal()" class="p-1 rounded-lg bg-stone-100"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <p class="text-xs text-stone-600">
        Ingresa la <strong>Clave Maestra</strong> del administrador para autorizar cambios sensibles, anulaciones o rendición de dinero. <span class="text-stone-400">(Por defecto: 2026)</span>
      </p>
      <input id="masterPinInput" type="password" inputmode="numeric" placeholder="••••" class="w-full p-3.5 border-2 border-stone-300 rounded-2xl text-center font-mono-code font-black text-2xl tracking-widest focus:border-orange-500 focus:outline-none" />
      <div class="grid grid-cols-2 gap-2">
        <button onclick="window.appActions.closeMasterKeyModal()" class="py-3 rounded-xl font-bold text-xs bg-stone-200 text-stone-800">Cancelar</button>
        <button onclick="window.appActions.verifyMasterKey()" class="py-3 rounded-xl font-black text-xs bg-orange-600 text-white">Desbloquear Admin</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================
       MODAL PARA CREAR NUEVO EVENTO / ACTIVIDAD
  ========================================================================= -->
  <div id="newEventModal" class="fixed inset-0 bg-black/70 z-50 hidden items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b pb-3">
        <h3 class="font-black text-lg text-stone-900">Crear Nueva Actividad / Pollada</h3>
        <button onclick="window.appActions.closeNewEventModal()" class="p-1 rounded-lg bg-stone-100"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <p class="text-xs text-stone-600">Se conservará intacto el evento anterior y se abrirá un nuevo padrón limpio de 250 tickets.</p>
      <input id="newEventNameInput" type="text" placeholder="Ej. Pollada Bailable Fin de Mes - Huánuco" class="w-full p-3 border rounded-xl text-sm font-bold" />
      <div class="flex justify-end gap-2">
        <button onclick="window.appActions.closeNewEventModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-200">Cancelar</button>
        <button onclick="window.appActions.createNewEvent()" class="px-4 py-2.5 rounded-xl text-xs font-black bg-orange-600 text-white">Crear 250 Tickets Nuevos</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================
       MODAL DE EXPORTACIÓN CSV / EXCEL Y GUÍA RÁPIDA VERCEL
  ========================================================================= -->
  <div id="exportModal" class="fixed inset-0 bg-black/70 z-50 hidden items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center border-b pb-3">
        <h3 class="font-black text-lg text-stone-900">Exportar Reportes Oficiales (Excel / CSV)</h3>
        <button onclick="window.appActions.closeExportModal()" class="p-1 rounded-lg bg-stone-100"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="window.appActions.downloadCSV('TICKETS')" class="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-black">
          📥 Descargar Padrón 250 Tickets (.CSV)
        </button>
        <button onclick="window.appActions.downloadCSV('AUDIT')" class="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-black">
          🛡️ Descargar Historial Antifraude (.CSV)
        </button>
        <button onclick="window.appActions.copyExportText()" class="px-4 py-2.5 rounded-xl bg-orange-100 text-orange-900 text-xs font-black">
          📋 Copiar Texto
        </button>
      </div>
      <textarea id="exportTextarea" readonly class="w-full flex-1 min-h-[220px] p-3 border rounded-xl font-mono-code text-[11px] bg-stone-50"></textarea>
    </div>
  </div>

  <!-- ========================================================================
       BARRA DE NAVEGACIÓN INFERIOR PARA TELÉFONOS MÓVILES
  ========================================================================= -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-300 shadow-2xl z-40 grid grid-cols-6">
    <button onclick="window.appActions.setTab('VENDER')" data-tab="VENDER" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="ticket" class="w-4 h-4 mb-0.5"></i><span>Vender</span>
    </button>
    <button onclick="window.appActions.setTab('PADRON')" data-tab="PADRON" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="grid" class="w-4 h-4 mb-0.5"></i><span>250 Tkt</span>
    </button>
    <button onclick="window.appActions.setTab('DESPACHO')" data-tab="DESPACHO" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="utensils" class="w-4 h-4 mb-0.5"></i><span>Cocina</span>
    </button>
    <button onclick="window.appActions.setTab('GASTOS')" data-tab="GASTOS" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="shopping-bag" class="w-4 h-4 mb-0.5"></i><span>Barra</span>
    </button>
    <button onclick="window.appActions.setTab('VENDEDORES')" data-tab="VENDEDORES" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="users" class="w-4 h-4 mb-0.5"></i><span>Equipos</span>
    </button>
    <button onclick="window.appActions.setTab('ANTIFRAUDE')" data-tab="ANTIFRAUDE" class="nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black">
      <i data-lucide="shield-alert" class="w-4 h-4 mb-0.5"></i><span>Auditoría</span>
    </button>
  </nav>

  <!-- ========================================================================
       LÓGICA DEL SISTEMA + FIREBASE EN TIEMPO REAL + MOTOR ANTIFRAUDE
  ========================================================================= -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    // 1. Configuración Firebase (Compatible tanto con el entorno actual como con tu proyecto mi-pollada-2026 en Vercel)
    const FALLBACK_FIREBASE_CONFIG = {
      apiKey: "AIzaSyD2AOxRnm8WE58Exf2jZ3gnYk_8MeGjZUQ",
      authDomain: "mi-pollada-2026.firebaseapp.com",
      projectId: "mi-pollada-2026",
      storageBucket: "mi-pollada-2026.firebasestorage.app",
      messagingSenderId: "251967541400",
      appId: "1:251967541400:web:d2efc03a656b09975ac0ed"
    };

    const firebaseConfig = typeof __firebase_config !== "undefined"
      ? JSON.parse(__firebase_config)
      : FALLBACK_FIREBASE_CONFIG;

    const appId = typeof __app_id !== "undefined" ? __app_id : "mi-pollada-peru";

    let app = null;
    let auth = null;
    let db = null;
    let currentUser = null;
    let unsubscribeEventDoc = null;
    let unsubscribeEventsList = null;

    // Identificador único de este dispositivo/teléfono para el Historial Antifraude
    const DEVICE_TAG = "TEL-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Formateador de Céntimos a Soles Peruanos (S/)
    const formatPEN = (cents = 0) => {
      const soles = (Number(cents || 0) / 100).toFixed(2);
      return `S/ ${Number(soles).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const nowPeruTime = () => {
      return new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const generateDeterministicToken = (prefix, num) => {
      const code = String(num).padStart(3, "0");
      const hash = ((num * 7919 + 104729) % 999999).toString(36).toUpperCase().padStart(4, "X");
      return `${prefix}-${code}-${hash}`;
    };

    const createInitial250Tickets = (prefix = "HUANUCO1", priceCents = 1500, costCents = 900) => {
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
          assignmentStatus: "DISPONIBLE", // DISPONIBLE | RESERVADO | CONFIRMADO
          paymentStatus: "PENDIENTE",     // PENDIENTE | PAGADO
          deliveryStatus: "PENDIENTE",    // PENDIENTE | ENTREGADO
          paidCents: 0,
          paymentMethod: "",
          paymentRef: "",
          sellerName: "Caja Principal",
          buyerName: "",
          buyerPhone: "",
          deliveredAt: null,
          deliveredBy: null
        };
      });
    };

    const createInitialBarItems = () => [
      { id: "BAR-GASEOSA", name: "Gaseosa Personal", unitPriceCents: 400, stock: 24, soldQty: 0, totalRevenueCents: 0 },
      { id: "BAR-CERVEZA", name: "Cerveza 600ml", unitPriceCents: 1000, stock: 36, soldQty: 0, totalRevenueCents: 0 },
      { id: "BAR-AGUA", name: "Agua Mineral", unitPriceCents: 250, stock: 24, soldQty: 0, totalRevenueCents: 0 },
      { id: "BAR-CHICHA", name: "Jarra Chicha Morada", unitPriceCents: 800, stock: 15, soldQty: 0, totalRevenueCents: 0 }
    ];

    const createInitialSellers = () => [
      { id: "SEL-1", name: "Caja Principal", cashInHandCents: 0, settledCents: 0 },
      { id: "SEL-2", name: "Vendedor 1 (Móvil)", cashInHandCents: 0, settledCents: 0 },
      { id: "SEL-3", name: "Vendedor 2 (Móvil)", cashInHandCents: 0, settledCents: 0 },
      { id: "SEL-4", name: "Vendedor 3 (Móvil)", cashInHandCents: 0, settledCents: 0 }
    ];

    // ========================================================================
    // ESTADO CENTRAL DE LA APLICACIÓN
    // ========================================================================
    const state = {
      activeTab: "VENDER",
      currentEventId: "evento-huanuco-principal",
      eventsList: [{ id: "evento-huanuco-principal", name: "Gran Pollada Huánuco #1" }],
      activeOperator: "Caja Principal",
      isMasterUnlocked: false,
      masterPin: "2026",

      eventConfig: {
        prefix: "HCO1",
        name: "Gran Pollada & Parrillada Huánuco",
        address: "Jr. General Prado - Huánuco",
        capacity: 250,
        unitCostCents: 900,
        unitPriceCents: 1500
      },

      tickets: createInitial250Tickets("HCO1", 1500, 900),
      barItems: createInitialBarItems(),
      payments: [],
      expenses: [],
      sellers: createInitialSellers(),
      auditLogs: [
        {
          id: "AUD-INIT",
          time: nowPeruTime(),
          category: "SISTEMA",
          severity: "INFO",
          operator: "Sistema Central",
          device: DEVICE_TAG,
          title: "Sistema POS & Control Antifraude Inicializado",
          detail: "Padrón de 250 tickets verificado y listo para operar."
        }
      ],

      pollosRecibidos: 250,
      fondoInicialCajaCents: 10000, // S/ 100.00
      conteoFisicoRealCents: 10000,

      // UI selections
      posPayMode: "EFECTIVO_CAJA",
      expCategory: "COMPRA_BARRA",
      expOrigin: "EFECTIVO_CAJA",
      inspectedTicketNum: null
    };

    // ========================================================================
    // REGISTRO EN HISTORIAL ANTIFRAUDE
    // ========================================================================
    const createAuditEntry = (category, severity, title, detail) => {
      return {
        id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        time: nowPeruTime(),
        category,   // VENTA | DESPACHO | GASTO | ALERTA
        severity,   // INFO | WARNING | CRITICAL
        operator: state.activeOperator,
        device: DEVICE_TAG,
        title,
        detail
      };
    };

    // ========================================================================
    // CONEXIÓN Y SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
    // ========================================================================
    const initFirebaseSync = async () => {
      try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (user) => {
          currentUser = user;
          if (user) {
            updateSyncIndicator("EN_VIVO");
            subscribeToCurrentEvent();
          }
        });
      } catch (err) {
        console.warn("Operando en modo autónomo local:", err);
        updateSyncIndicator("LOCAL");
      }
    };

    const updateSyncIndicator = (mode) => {
      const dot = document.getElementById("syncIndicatorDot");
      const badge = document.getElementById("syncBadgeText");
      if (mode === "EN_VIVO") {
        dot.className = "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-stone-950";
        badge.className = "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
        badge.textContent = "☁️ EN VIVO • MULTI-TELÉFONO";
      } else {
        dot.className = "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-stone-950";
        badge.className = "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30";
        badge.textContent = "⚡ MODO AUTÓNOMO ACTIVO";
      }
    };

    const subscribeToCurrentEvent = () => {
      if (!currentUser || !db) return;

      if (unsubscribeEventsList) unsubscribeEventsList();
      if (unsubscribeEventDoc) unsubscribeEventDoc();

      const eventsCol = collection(db, "artifacts", appId, "public", "data", "pollada_events");
      unsubscribeEventsList = onSnapshot(
        eventsCol,
        (snap) => {
          const list = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, name: data.eventConfig?.name || d.id });
          });
          if (list.length > 0) {
            state.eventsList = list;
            renderHeaderSelectors();
          }
        },
        (err) => console.warn("Aviso lectura colección:", err)
      );

      const docRef = doc(db, "artifacts", appId, "public", "data", "pollada_events", state.currentEventId);
      unsubscribeEventDoc = onSnapshot(
        docRef,
        (docSnap) => {
          updateSyncIndicator("EN_VIVO");
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.eventConfig) state.eventConfig = data.eventConfig;
            if (data.masterPin) state.masterPin = data.masterPin;
            if (data.tickets) state.tickets = JSON.parse(data.tickets);
            if (data.barItems) state.barItems = JSON.parse(data.barItems);
            if (data.payments) state.payments = JSON.parse(data.payments);
            if (data.expenses) state.expenses = JSON.parse(data.expenses);
            if (data.sellers) state.sellers = JSON.parse(data.sellers);
            if (data.auditLogs) state.auditLogs = JSON.parse(data.auditLogs);
            if (typeof data.pollosRecibidos === "number") state.pollosRecibidos = data.pollosRecibidos;
            if (typeof data.fondoInicialCajaCents === "number") state.fondoInicialCajaCents = data.fondoInicialCajaCents;
            if (typeof data.conteoFisicoRealCents === "number") state.conteoFisicoRealCents = data.conteoFisicoRealCents;
            renderAll();
          } else {
            saveStateToCloud();
          }
        },
        (err) => {
          console.warn("Aviso snapshot documento:", err);
          updateSyncIndicator("LOCAL");
        }
      );
    };

    const saveStateToCloud = async () => {
      renderAll();
      if (!currentUser || !db) return;
      try {
        const docRef = doc(db, "artifacts", appId, "public", "data", "pollada_events", state.currentEventId);
        await setDoc(docRef, {
          eventConfig: state.eventConfig,
          masterPin: state.masterPin,
          tickets: JSON.stringify(state.tickets),
          barItems: JSON.stringify(state.barItems),
          payments: JSON.stringify(state.payments),
          expenses: JSON.stringify(state.expenses),
          sellers: JSON.stringify(state.sellers),
          auditLogs: JSON.stringify(state.auditLogs.slice(0, 250)),
          pollosRecibidos: state.pollosRecibidos,
          fondoInicialCajaCents: state.fondoInicialCajaCents,
          conteoFisicoRealCents: state.conteoFisicoRealCents,
          updatedAt: Date.now()
        });
      } catch (e) {
        console.warn("Error guardando en nube:", e);
      }
    };

    // ========================================================================
    // CÁLCULO DE MÉTRICAS FINANCIERAS Y OPERATIVAS
    // ========================================================================
    const computeMetrics = () => {
      const disponibles = state.tickets.filter(t => t.assignmentStatus === "DISPONIBLE").length;
      const separados = state.tickets.filter(t => t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO").length;
      const pagados = state.tickets.filter(t => t.paymentStatus === "PAGADO").length;
      const entregados = state.tickets.filter(t => t.deliveryStatus === "ENTREGADO").length;

      const cobradoTicketsCents = state.tickets.reduce((acc, t) => acc + (t.paidCents || 0), 0);
      const faltaCobrarSeparadosCents = separados * state.eventConfig.unitPriceCents;
      const ingresosBarraCents = state.barItems.reduce((acc, b) => acc + (b.totalRevenueCents || 0), 0);

      const entradasEfectivoCajaCents = state.payments
        .filter(p => p.destination === "EFECTIVO_CAJA")
        .reduce((acc, p) => acc + p.amountCents, 0);

      const entradasYapeCents = state.payments
        .filter(p => p.destination === "YAPE_EVENTO")
        .reduce((acc, p) => acc + p.amountCents, 0);

      const salidasEfectivoCajaCents = state.expenses
        .filter(e => e.payOrigin === "EFECTIVO_CAJA")
        .reduce((acc, e) => acc + e.amountCents, 0);

      const salidasYapeCents = state.expenses
        .filter(e => e.payOrigin === "YAPE_EVENTO")
        .reduce((acc, e) => acc + e.amountCents, 0);

      const gastosTotalesCents = state.expenses.reduce((acc, e) => acc + e.amountCents, 0);

      const efectivoDisponibleCajaCents = state.fondoInicialCajaCents + entradasEfectivoCajaCents - salidasEfectivoCajaCents;
      const saldoDisponibleYapeCents = entradasYapeCents - salidasYapeCents;
      const diferenciaCajaCents = state.conteoFisicoRealCents - efectivoDisponibleCajaCents;

      const faltaRendirVendedoresCents = state.sellers.reduce(
        (acc, s) => acc + Math.max(0, s.cashInHandCents - s.settledCents),
        0
      );

      const platosQuedan = Math.max(0, state.pollosRecibidos - entregados);
      const gananciaNetaCents = cobradoTicketsCents + ingresosBarraCents - gastosTotalesCents;

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
        gananciaNetaCents
      };
    };

    // ========================================================================
    // RENDERIZADO GENERAL DE LA INTERFAZ
    // ========================================================================
    const renderHeaderSelectors = () => {
      document.getElementById("headerEventName").textContent = state.eventConfig.name;
      document.getElementById("headerEventSub").textContent = `${state.eventConfig.address} • Ticket ${formatPEN(state.eventConfig.unitPriceCents)}`;

      // Operadores (Vendedores + Caja)
      const opSelect = document.getElementById("activeOperatorSelect");
      const sellerSelect = document.getElementById("posSellerSelect");
      const currentOp = state.activeOperator;
      const currentPosSeller = sellerSelect.value || currentOp;

      const optionsHtml = state.sellers
        .map(s => `<option value="${s.name}" class="text-stone-900">${s.name}</option>`)
        .join("");

      opSelect.innerHTML = optionsHtml;
      opSelect.value = state.sellers.some(s => s.name === currentOp) ? currentOp : state.sellers[0].name;

      sellerSelect.innerHTML = optionsHtml;
      sellerSelect.value = state.sellers.some(s => s.name === currentPosSeller) ? currentPosSeller : state.sellers[0].name;

      // Eventos
      const evSelect = document.getElementById("eventSelector");
      evSelect.innerHTML = state.eventsList
        .map(ev => `<option value="${ev.id}" class="text-stone-900">${ev.name}</option>`)
        .join("");
      evSelect.value = state.currentEventId;

      // Estado Clave Maestra
      const mkBtn = document.getElementById("masterKeyBtn");
      const mkLabel = document.getElementById("masterKeyLabel");
      const cfgBadge = document.getElementById("configLockStatusBadge");

      if (state.isMasterUnlocked) {
        mkBtn.className = "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition shadow-sm bg-emerald-600 border-emerald-400 text-white";
        mkLabel.textContent = "🔓 Admin Activo";
        cfgBadge.className = "px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900";
        cfgBadge.textContent = "🔓 DESBLOQUEADO (Modo Administrador Maestro)";
      } else {
        mkBtn.className = "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition shadow-sm bg-stone-800 border-stone-600 text-stone-200 hover:bg-stone-700";
        mkLabel.textContent = "🔒 Clave Maestra";
        cfgBadge.className = "px-3 py-1.5 rounded-xl text-xs font-black bg-red-100 text-red-900";
        cfgBadge.textContent = "🔒 MODO VENDEDOR (Toca Clave Maestra para editar)";
      }
    };

    const renderKPIs = (m) => {
      document.getElementById("kpiLibres").textContent = m.disponibles;
      document.getElementById("kpiSeparados").textContent = m.separados;
      document.getElementById("kpiSeparadosSoles").textContent = formatPEN(m.faltaCobrarSeparadosCents);
      document.getElementById("kpiPagados").textContent = m.pagados;
      document.getElementById("kpiPagadosSoles").textContent = formatPEN(m.cobradoTicketsCents);
      document.getElementById("kpiPlatosQuedan").textContent = m.platosQuedan;
      document.getElementById("kpiEntregados").textContent = `${m.entregados} entregados`;
      document.getElementById("kpiEfectivoCaja").textContent = formatPEN(m.efectivoDisponibleCajaCents);
      document.getElementById("kpiSaldoYape").textContent = formatPEN(m.saldoDisponibleYapeCents);
      document.getElementById("auditCountBadge").textContent = state.auditLogs.length;
    };

    const renderPosAndBar = (m) => {
      // Botones medio de pago
      ["EFECTIVO_CAJA", "YAPE_EVENTO", "EFECTIVO_VENDEDOR", "SOLO_SEPARAR"].forEach(mode => {
        const btn = document.getElementById(`payBtn-${mode}`);
        if (!btn) return;
        if (state.posPayMode === mode) {
          btn.className = "pos-pay-btn p-3 rounded-2xl border-2 text-left transition bg-stone-900 text-white border-orange-500 shadow-md";
        } else {
          btn.className = "pos-pay-btn p-3 rounded-2xl border-2 text-left transition bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100";
        }
      });

      document.getElementById("posCashCalculatorBox").classList.toggle("hidden", state.posPayMode !== "EFECTIVO_CAJA");
      document.getElementById("posYapeRefBox").classList.toggle("hidden", state.posPayMode !== "YAPE_EVENTO");
      document.getElementById("posImmediateDeliveryWrap").classList.toggle("hidden", state.posPayMode === "SOLO_SEPARAR");

      window.appActions.updatePosCalculation();

      // Barra
      document.getElementById("barTotalRevenueBadge").textContent = `Barra: ${formatPEN(m.ingresosBarraCents)}`;
      const barContainer = document.getElementById("barItemsContainer");
      barContainer.innerHTML = state.barItems.map(item => `
        <div class="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="font-black text-sm text-stone-900">${item.name} — <span class="text-orange-700">${formatPEN(item.unitPriceCents)}</span></div>
            <div class="text-xs text-stone-600 mt-0.5">
              Stock: <strong class="${item.stock > 0 ? 'text-emerald-700' : 'text-red-600'}">${item.stock} und.</strong>
              <span class="mx-1">•</span> Vendidos: <strong>${item.soldQty}</strong> (${formatPEN(item.totalRevenueCents)})
            </div>
          </div>
          <div class="flex gap-1.5">
            <button onclick="window.appActions.sellBarItem('${item.id}', 'EFECTIVO_CAJA')" class="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm">
              +1 Efectivo
            </button>
            <button onclick="window.appActions.sellBarItem('${item.id}', 'YAPE_EVENTO')" class="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-sm">
              +1 Yape
            </button>
          </div>
        </div>
      `).join("");
    };

    const renderPadron = () => {
      const query = (document.getElementById("padronSearchInput")?.value || "").trim().toLowerCase();
      const filter = document.getElementById("padronFilterSelect")?.value || "TODOS";

      const filtered = state.tickets.filter(t => {
        if (filter === "DISPONIBLE" && t.assignmentStatus !== "DISPONIBLE") return false;
        if (filter === "FALTA_PAGAR" && !(t.assignmentStatus === "RESERVADO" && t.paymentStatus !== "PAGADO")) return false;
        if (filter === "PAGADO" && t.paymentStatus !== "PAGADO") return false;
        if (filter === "FALTA_ENTREGAR" && !(t.paymentStatus === "PAGADO" && t.deliveryStatus === "PENDIENTE")) return false;
        if (filter === "ENTREGADO" && t.deliveryStatus !== "ENTREGADO") return false;

        if (query) {
          const matchCode = t.code.toLowerCase().includes(query);
          const matchBuyer = (t.buyerName || "").toLowerCase().includes(query);
          const matchSeller = (t.sellerName || "").toLowerCase().includes(query);
          return matchCode || matchBuyer || matchSeller;
        }
        return true;
      });

      const grid = document.getElementById("padronGridContainer");
      grid.innerHTML = filtered.map(t => {
        let classes = "bg-stone-50 border-stone-300 text-stone-700 hover:border-orange-500";
        let tag = "LIBRE";
        if (t.deliveryStatus === "ENTREGADO") {
          classes = "bg-stone-900 border-stone-900 text-white";
          tag = "ENTREGADO";
        } else if (t.paymentStatus === "PAGADO") {
          classes = "bg-emerald-100 border-emerald-500 text-emerald-950 font-black";
          tag = "PAGADO";
        } else if (t.assignmentStatus === "RESERVADO") {
          classes = "bg-amber-100 border-amber-500 text-amber-950 font-black";
          tag = "DEBE";
        }

        return `
          <button onclick="window.appActions.inspectTicket(${t.num})" class="p-2 rounded-xl border-2 text-center flex flex-col items-center justify-center transition transform hover:scale-105 ${classes}">
            <span class="font-mono-code font-black text-xs sm:text-sm">${t.code}</span>
            <span class="text-[8px] font-black tracking-tighter mt-0.5 truncate max-w-full">${t.buyerName ? t.buyerName.split(" ")[0] : tag}</span>
          </button>
        `;
      }).join("");

      renderTicketInspector();
    };

    const renderTicketInspector = () => {
      const box = document.getElementById("ticketInspectorBox");
      if (!state.inspectedTicketNum) {
        box.classList.add("hidden");
        return;
      }
      const t = state.tickets.find(x => x.num === state.inspectedTicketNum);
      if (!t) return;

      box.classList.remove("hidden");
      const waText = encodeURIComponent(
        `🍗 *${state.eventConfig.name.toUpperCase()} - HUÁNUCO*\n` +
        `🎟️ *Ticket Oficial N.º ${t.code}*\n` +
        `👤 Cliente: ${t.buyerName || "Al portador"}\n` +
        `💳 Estado de Pago: *${t.paymentStatus}* (${formatPEN(t.paidCents)})\n` +
        `🍽️ Estado de Plato: *${t.deliveryStatus}*\n` +
        `🔐 Código Antifraude QR: ${t.qrToken}\n` +
        `📍 Lugar: ${state.eventConfig.address}`
      );
      const cleanPhone = (t.buyerPhone || "").replace(/\D/g, "");
      const waUrl = `https://wa.me/${cleanPhone ? (cleanPhone.startsWith("51") ? cleanPhone : "51" + cleanPhone) : ""}?text=${waText}`;

      box.innerHTML = `
        <div class="flex flex-wrap justify-between items-start gap-4 border-b border-stone-200 pb-4">
          <div>
            <span class="text-xs font-black uppercase text-orange-600">Inspector Antifraude • Ticket N.º ${t.code}</span>
            <h3 class="text-2xl font-black text-stone-900 mt-0.5">${t.buyerName || "Ticket Libre (Disponible)"}</h3>
            <p class="text-xs text-stone-600 font-semibold">Vendedor: <strong>${t.sellerName}</strong> • Modalidad: <strong>${t.serviceType}</strong> ${t.paymentRef ? `• Ref: ${t.paymentRef}` : ""}</p>
          </div>
          <button onclick="window.appActions.inspectTicket(null)" class="px-3 py-1.5 rounded-xl bg-stone-200 text-stone-800 text-xs font-black">Cerrar ✕</button>
        </div>

        <div class="grid md:grid-cols-3 gap-5 pt-4 items-center">
          <div class="p-4 rounded-2xl bg-stone-900 text-white text-center space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Token Único Antifraude</span>
            <div class="font-mono-code font-black text-base tracking-wider bg-white/10 py-2 px-3 rounded-xl border border-white/15">${t.qrToken}</div>
            <span class="text-[11px] text-stone-300 block">Entrega: ${t.deliveredAt ? `Entregado a las ${t.deliveredAt} por ${t.deliveredBy}` : "Aún en cocina"}</span>
          </div>

          <div class="md:col-span-2 flex flex-wrap gap-2.5">
            ${t.assignmentStatus === "DISPONIBLE" ? `
              <button onclick="window.appActions.jumpToSellTicket(${t.num})" class="px-5 py-3 rounded-2xl bg-orange-600 text-white text-xs font-black shadow">
                🎟️ Vender o Separar este Ticket (#${t.code})
              </button>
            ` : ""}

            ${t.assignmentStatus !== "DISPONIBLE" && t.paymentStatus !== "PAGADO" ? `
              <button onclick="window.appActions.payReservedTicket(${t.num}, 'EFECTIVO_CAJA')" class="px-4 py-3 rounded-2xl bg-emerald-700 text-white text-xs font-black shadow">
                💵 Cobrar Ahora en Efectivo (${formatPEN(t.agreedPriceCents)})
              </button>
              <button onclick="window.appActions.payReservedTicket(${t.num}, 'YAPE_EVENTO')" class="px-4 py-3 rounded-2xl bg-purple-700 text-white text-xs font-black shadow">
                📱 Cobrar Ahora por Yape (${formatPEN(t.agreedPriceCents)})
              </button>
            ` : ""}

            ${t.paymentStatus === "PAGADO" && t.deliveryStatus !== "ENTREGADO" ? `
              <button onclick="window.appActions.deliverTicketPlate(${t.num})" class="px-5 py-3 rounded-2xl bg-stone-900 text-white text-xs font-black shadow">
                🍗 Despachar y Entregar Plato Ahora
              </button>
            ` : ""}

            ${t.assignmentStatus !== "DISPONIBLE" ? `
              <a href="${waUrl}" target="_blank" rel="noreferrer" class="px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow flex items-center gap-1.5">
                📲 Enviar Comprobante por WhatsApp
              </a>
              <button onclick="window.appActions.voidTicket(${t.num})" class="px-4 py-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-black">
                🔒 Anular / Liberar Ticket (Clave Maestra)
              </button>
            ` : ""}
          </div>
        </div>
      `;
    };

    const renderDespacho = (m) => {
      document.getElementById("despachoPlatosCount").textContent = m.platosQuedan;
      const q = (document.getElementById("despachoSearchInput")?.value || "").trim().toLowerCase();

      const list = state.tickets.filter(t => {
        if (!q) return t.assignmentStatus !== "DISPONIBLE" && t.deliveryStatus === "PENDIENTE";
        return t.code.toLowerCase().includes(q) ||
               (t.buyerName || "").toLowerCase().includes(q) ||
               t.qrToken.toLowerCase().includes(q);
      }).slice(0, 12);

      const container = document.getElementById("despachoListContainer");
      if (list.length === 0) {
        container.innerHTML = `<div class="col-span-2 p-8 text-center text-stone-500 font-bold text-sm bg-stone-50 rounded-2xl border">No hay tickets pendientes que coincidan con la búsqueda.</div>`;
        return;
      }

      container.innerHTML = list.map(t => {
        const isDelivered = t.deliveryStatus === "ENTREGADO";
        const isPaid = t.paymentStatus === "PAGADO";
        return `
          <div class="p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-3 ${isDelivered ? 'bg-red-50 border-red-400' : isPaid ? 'bg-emerald-50 border-emerald-500' : 'bg-amber-50 border-amber-400'}">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono-code font-black text-lg text-stone-900">#${t.code}</span>
                <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded ${isPaid ? 'bg-emerald-200 text-emerald-950' : 'bg-amber-300 text-amber-950'}">${t.paymentStatus}</span>
                <span class="text-[10px] font-bold text-stone-600">${t.serviceType}</span>
              </div>
              <p class="font-black text-sm text-stone-900 mt-0.5">${t.buyerName || "Cliente"}</p>
              <p class="text-[11px] font-mono-code text-stone-500">${t.qrToken} ${isDelivered ? `• ⚠️ YA ENTREGADO (${t.deliveredAt})` : ''}</p>
            </div>
            <div class="flex gap-2">
              ${!isPaid ? `
                <button onclick="window.appActions.payReservedTicket(${t.num}, 'EFECTIVO_CAJA')" class="px-3 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black">
                  Cobrar ${formatPEN(t.agreedPriceCents)}
                </button>
              ` : ""}
              <button onclick="window.appActions.deliverTicketPlate(${t.num})" class="px-4 py-2.5 rounded-xl text-xs font-black shadow ${isDelivered ? 'bg-red-700 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'}">
                ${isDelivered ? '🚨 Verificar Alerta' : '🍗 Entregar Plato'}
              </button>
            </div>
          </div>
        `;
      }).join("");
    };

    const renderExpensesAndBarConfig = (m) => {
      ["COMPRA_BARRA", "PAGO_POLLOS", "GASTO_FIESTA"].forEach(cat => {
        const btn = document.getElementById(`expCat-${cat}`);
        if (!btn) return;
        btn.className = state.expCategory === cat
          ? "exp-cat-btn p-3 rounded-2xl border-2 text-xs font-black bg-orange-600 text-white border-orange-600 shadow"
          : "exp-cat-btn p-3 rounded-2xl border text-xs font-black bg-stone-50 text-stone-700 border-stone-300";
      });

      ["EFECTIVO_CAJA", "YAPE_EVENTO", "POR_PAGAR"].forEach(orig => {
        const btn = document.getElementById(`expOrig-${orig}`);
        if (!btn) return;
        btn.className = state.expOrigin === orig
          ? "exp-orig-btn p-2.5 rounded-xl border-2 text-xs font-black bg-stone-900 text-white border-stone-900"
          : "exp-orig-btn p-2.5 rounded-xl border text-xs font-black bg-stone-50 text-stone-700 border-stone-300";
      });

      document.getElementById("expBarStockBox").classList.toggle("hidden", state.expCategory !== "COMPRA_BARRA");

      const prodSelect = document.getElementById("expBarProductSelect");
      const currentVal = prodSelect.value;
      prodSelect.innerHTML = state.barItems.map(b => `<option value="${b.id}">${b.name} (Stock actual: ${b.stock})</option>`).join("");
      if (currentVal && state.barItems.some(b => b.id === currentVal)) prodSelect.value = currentVal;

      document.getElementById("totalExpensesBadge").textContent = `Total: ${formatPEN(m.gastosTotalesCents)}`;
      const expContainer = document.getElementById("expensesListContainer");
      if (state.expenses.length === 0) {
        expContainer.innerHTML = `<p class="text-xs text-stone-500 py-4 text-center">Aún no se han registrado compras ni salidas de dinero.</p>`;
      } else {
        expContainer.innerHTML = state.expenses.map(e => `
          <div class="p-3 rounded-xl border border-stone-200 bg-stone-50 flex justify-between items-center text-xs">
            <div>
              <div class="font-black text-stone-900">${e.concept}</div>
              <div class="text-[11px] text-stone-500">${e.time} • Pagado con: <strong>${e.payOrigin}</strong> • Por: ${e.operator || "Caja"}</div>
            </div>
            <strong class="text-red-700 font-black text-sm">− ${formatPEN(e.amountCents)}</strong>
          </div>
        `).join("");
      }
    };

    const renderSellers = () => {
      const container = document.getElementById("sellersListContainer");
      container.innerHTML = state.sellers.map(s => {
        const soldTickets = state.tickets.filter(t => t.sellerName === s.name && t.assignmentStatus !== "DISPONIBLE");
        const paidCount = soldTickets.filter(t => t.paymentStatus === "PAGADO").length;
        const unpaidCount = soldTickets.filter(t => t.paymentStatus !== "PAGADO").length;
        const pendingCash = Math.max(0, s.cashInHandCents - s.settledCents);

        return `
          <div class="p-5 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col justify-between gap-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-black text-base text-stone-900">${s.name}</h3>
                <p class="text-xs text-stone-600 mt-0.5">
                  Tickets asignados: <strong>${soldTickets.length}</strong> (${paidCount} pagados • ${unpaidCount} por cobrar)
                </p>
              </div>
              <span class="px-2.5 py-1 rounded-lg text-xs font-black ${pendingCash > 0 ? 'bg-amber-200 text-amber-950' : 'bg-emerald-100 text-emerald-900'}">
                ${pendingCash > 0 ? `Por rendir: ${formatPEN(pendingCash)}` : 'Al día ✓'}
              </span>
            </div>

            <div class="flex justify-between items-center pt-3 border-t border-stone-200 text-xs">
              <span>Cobrado en su teléfono: <strong>${formatPEN(s.cashInHandCents)}</strong> | Entregado a Caja: <strong>${formatPEN(s.settledCents)}</strong></span>
              ${pendingCash > 0 ? `
                <button onclick="window.appActions.settleSellerCash('${s.id}')" class="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow">
                  🔒 Recibir ${formatPEN(pendingCash)} en Caja
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }).join("");
    };

    const renderCaja = (m) => {
      document.getElementById("cajaFondoInicial").textContent = formatPEN(state.fondoInicialCajaCents);
      document.getElementById("cajaEntradasEfectivo").textContent = `+ ${formatPEN(m.entradasEfectivoCajaCents)}`;
      document.getElementById("cajaSalidasEfectivo").textContent = `− ${formatPEN(m.salidasEfectivoCajaCents)}`;
      document.getElementById("cajaEfectivoEsperado").textContent = formatPEN(m.efectivoDisponibleCajaCents);

      const conteoInput = document.getElementById("cajaConteoRealInput");
      if (document.activeElement !== conteoInput) {
        conteoInput.value = (state.conteoFisicoRealCents / 100).toFixed(2);
      }

      const diffLabel = document.getElementById("cajaDiferenciaLabel");
      if (m.diferenciaCajaCents === 0) {
        diffLabel.className = "px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black";
        diffLabel.textContent = "CUADRE EXACTO (S/ 0.00)";
      } else if (m.diferenciaCajaCents > 0) {
        diffLabel.className = "px-3 py-1 rounded-lg bg-blue-100 text-blue-900 font-black";
        diffLabel.textContent = `SOBRANTE EN CAJA (+ ${formatPEN(m.diferenciaCajaCents)})`;
      } else {
        diffLabel.className = "px-3 py-1 rounded-lg bg-red-100 text-red-900 font-black";
        diffLabel.textContent = `FALTANTE EN CAJA (${formatPEN(m.diferenciaCajaCents)})`;
      }

      document.getElementById("cajaYapeNeto").textContent = formatPEN(m.saldoDisponibleYapeCents);
      document.getElementById("cajaPorRendirVendedores").textContent = formatPEN(m.faltaRendirVendedoresCents);
      document.getElementById("resCobradoTickets").textContent = formatPEN(m.cobradoTicketsCents);
      document.getElementById("resCobradoBarra").textContent = formatPEN(m.ingresosBarraCents);
      document.getElementById("resGastosTotales").textContent = `− ${formatPEN(m.gastosTotalesCents)}`;
      document.getElementById("resGananciaNeta").textContent = formatPEN(m.gananciaNetaCents);
    };

    const renderAuditLogs = () => {
      const q = (document.getElementById("auditSearchInput")?.value || "").trim().toLowerCase();
      const filter = document.getElementById("auditFilterSelect")?.value || "TODOS";

      const logs = state.auditLogs.filter(l => {
        if (filter === "ALERTA" && l.severity === "INFO") return false;
        if (filter !== "TODOS" && filter !== "ALERTA" && l.category !== filter) return false;
        if (q) {
          return l.title.toLowerCase().includes(q) ||
                 l.detail.toLowerCase().includes(q) ||
                 l.operator.toLowerCase().includes(q);
        }
        return true;
      });

      const container = document.getElementById("auditLogsContainer");
      container.innerHTML = logs.map(l => {
        let style = "bg-stone-50 border-stone-200 text-stone-800";
        let badge = "bg-stone-200 text-stone-800";
        if (l.severity === "CRITICAL") {
          style = "bg-red-50 border-red-400 text-red-950";
          badge = "bg-red-700 text-white";
        } else if (l.severity === "WARNING") {
          style = "bg-amber-50 border-amber-400 text-amber-950";
          badge = "bg-amber-600 text-white";
        }

        return `
          <div class="p-3.5 rounded-2xl border ${style} flex flex-wrap justify-between items-start gap-2 text-xs">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 rounded font-black text-[10px] uppercase ${badge}">${l.category}</span>
                <strong class="font-black text-sm">${l.title}</strong>
              </div>
              <p class="text-xs opacity-90">${l.detail}</p>
            </div>
            <div class="text-right text-[11px] font-bold shrink-0">
              <div>🕒 ${l.time}</div>
              <div class="text-orange-800">👤 ${l.operator} (${l.device})</div>
            </div>
          </div>
        `;
      }).join("");
    };

    const renderConfigInputs = () => {
      const nameIn = document.getElementById("cfgEventName");
      if (document.activeElement !== nameIn) nameIn.value = state.eventConfig.name;

      const addrIn = document.getElementById("cfgEventAddress");
      if (document.activeElement !== addrIn) addrIn.value = state.eventConfig.address;

      const prefIn = document.getElementById("cfgEventPrefix");
      if (document.activeElement !== prefIn) prefIn.value = state.eventConfig.prefix;

      const priceIn = document.getElementById("cfgTicketPrice");
      if (document.activeElement !== priceIn) priceIn.value = (state.eventConfig.unitPriceCents / 100).toFixed(2);

      const pollosIn = document.getElementById("cfgPollosRecibidos");
      if (document.activeElement !== pollosIn) pollosIn.value = state.pollosRecibidos;

      const fondoIn = document.getElementById("cfgFondoInicial");
      if (document.activeElement !== fondoIn) fondoIn.value = (state.fondoInicialCajaCents / 100).toFixed(2);
    };

    const renderTabsVisibility = () => {
      document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.toggle("hidden", panel.id !== `tab-${state.activeTab}`);
      });

      document.querySelectorAll(".nav-btn").forEach(btn => {
        const isAct = btn.getAttribute("data-tab") === state.activeTab;
        if (btn.parentElement.tagName === "NAV" && btn.parentElement.classList.contains("lg:hidden")) {
          btn.className = `nav-btn flex flex-col items-center justify-center py-2 text-[10px] font-black transition ${
            isAct ? "text-orange-700 bg-orange-50 border-t-2 border-orange-600" : "text-stone-500"
          }`;
        } else {
          btn.className = `nav-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            isAct ? "bg-amber-400 text-stone-950 shadow" : "text-stone-200 hover:bg-white/10"
          }`;
        }
      });
    };

    const renderAll = () => {
      const m = computeMetrics();
      renderHeaderSelectors();
      renderKPIs(m);
      renderTabsVisibility();
      renderPosAndBar(m);
      renderPadron();
      renderDespacho(m);
      renderExpensesAndBarConfig(m);
      renderSellers();
      renderCaja(m);
      renderAuditLogs();
      renderConfigInputs();
    };

    // ========================================================================
    // ACCIONES PÚBLICAS DEL USUARIO (window.appActions)
    // ========================================================================
    window.appActions = {
      showToast: (msg, icon = "✅") => {
        const container = document.getElementById("toastContainer");
        document.getElementById("toastIcon").textContent = icon;
        document.getElementById("toastMessage").textContent = msg;
        container.classList.remove("hidden");
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => container.classList.add("hidden"), 4500);
      },

      hideToast: () => {
        document.getElementById("toastContainer").classList.add("hidden");
      },

      setTab: (tabId) => {
        state.activeTab = tabId;
        renderAll();
      },

      changeOperator: (opName) => {
        state.activeOperator = opName;
        document.getElementById("posSellerSelect").value = opName;
        window.appActions.showToast(`Operando este teléfono como: ${opName}`, "📱");
        renderAll();
      },

      // Clave Maestra
      toggleMasterKeyModal: () => {
        if (state.isMasterUnlocked) {
          state.isMasterUnlocked = false;
          state.auditLogs.unshift(createAuditEntry("ALERTA", "INFO", "Candado Maestro Cerrado", "Se volvió al Modo Vendedor estándar."));
          saveStateToCloud();
          window.appActions.showToast("Modo Administrador bloqueado. Ahora estás en Modo Vendedor.", "🔒");
        } else {
          document.getElementById("masterPinInput").value = "";
          document.getElementById("masterKeyModal").classList.remove("hidden");
          document.getElementById("masterKeyModal").classList.add("flex");
        }
      },

      closeMasterKeyModal: () => {
        document.getElementById("masterKeyModal").classList.add("hidden");
        document.getElementById("masterKeyModal").classList.remove("flex");
      },

      verifyMasterKey: () => {
        const pin = document.getElementById("masterPinInput").value.trim();
        if (pin === state.masterPin) {
          state.isMasterUnlocked = true;
          window.appActions.closeMasterKeyModal();
          state.auditLogs.unshift(createAuditEntry("ALERTA", "WARNING", "Clave Maestra Desbloqueada", `Autorización concedida en el teléfono de ${state.activeOperator}.`));
          saveStateToCloud();
          window.appActions.showToast("¡Clave Maestra correcta! Modo Administrador activado.", "🔓");
        } else {
          state.auditLogs.unshift(createAuditEntry("ALERTA", "CRITICAL", "Intento Fallido de Clave Maestra", `Se ingresó un PIN incorrecto desde el teléfono de ${state.activeOperator}.`));
          saveStateToCloud();
          window.appActions.showToast("Clave Maestra incorrecta. Intento registrado en el Historial Antifraude.", "🚨");
        }
      },

      requireMasterKey: (actionDescription) => {
        if (state.isMasterUnlocked) return true;
        window.appActions.showToast(`Acción protegida (${actionDescription}). Desbloquea primero la Clave Maestra 🔒 arriba.`, "🔒");
        window.appActions.toggleMasterKeyModal();
        return false;
      },

      // Venta POS Pollada
      setPosPayMode: (mode) => {
        state.posPayMode = mode;
        renderAll();
      },

      setQuickBillete: (val) => {
        document.getElementById("posBilleteInput").value = val;
        window.appActions.updatePosCalculation();
      },

      pickNextAvailableTicket: () => {
        const free = state.tickets.find(t => t.assignmentStatus === "DISPONIBLE");
        if (free) {
          document.getElementById("posTicketNums").value = String(free.num);
          window.appActions.updatePosCalculation();
        } else {
          window.appActions.showToast("¡Los 250 tickets ya están vendidos o separados!", "🎉");
        }
      },

      updatePosCalculation: () => {
        const raw = document.getElementById("posTicketNums")?.value || "";
        const nums = Array.from(new Set(
          raw.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 250)
        ));

        const hint = document.getElementById("posTicketHint");
        const submitBtn = document.getElementById("posSubmitBtn");
        const totalCobrar = nums.length * state.eventConfig.unitPriceCents;

        document.getElementById("posTotalCobrarLabel").textContent = formatPEN(totalCobrar);

        const billeteCents = Math.round((parseFloat(document.getElementById("posBilleteInput")?.value || "0") || 0) * 100);
        const vueltoCents = Math.max(0, billeteCents - totalCobrar);
        document.getElementById("posVueltoLabel").textContent = formatPEN(vueltoCents);

        const occupied = state.tickets.filter(t => nums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE");
        if (nums.length === 0) {
          hint.textContent = "Escribe un número del 1 al 250";
          hint.className = "block text-[11px] font-bold text-stone-500 mt-1 text-center";
        } else if (occupied.length > 0) {
          hint.textContent = `⚠️ Ticket #${occupied[0].code} ya está ocupado (${occupied[0].buyerName})`;
          hint.className = "block text-[11px] font-bold text-red-600 mt-1 text-center";
        } else {
          hint.textContent = `✓ ${nums.length} ticket(s) libre(s) listo(s)`;
          hint.className = "block text-[11px] font-bold text-emerald-700 mt-1 text-center";
        }

        if (state.posPayMode === "SOLO_SEPARAR") {
          submitBtn.textContent = `SEPARAR ${nums.length || 1} TICKET(S) — FALTA PAGAR ${formatPEN(totalCobrar || state.eventConfig.unitPriceCents)}`;
        } else {
          submitBtn.textContent = `GUARDAR VENTA (${nums.length || 1} TICKET • ${formatPEN(totalCobrar || state.eventConfig.unitPriceCents)})`;
        }
      },

      submitTicketSale: () => {
        const raw = document.getElementById("posTicketNums").value;
        const nums = Array.from(new Set(
          raw.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 250)
        ));

        if (nums.length === 0) {
          window.appActions.showToast("Ingresa al menos un número de ticket válido del 1 al 250.", "⚠️");
          return;
        }

        const occupied = state.tickets.filter(t => nums.includes(t.num) && t.assignmentStatus !== "DISPONIBLE");
        if (occupied.length > 0) {
          window.appActions.showToast(`El ticket N.º ${occupied[0].code} ya está registrado para ${occupied[0].buyerName}.`, "🚨");
          return;
        }

        const buyer = document.getElementById("posBuyerName").value.trim() || "Cliente Directo";
        const phone = document.getElementById("posBuyerPhone").value.trim();
        const seller = document.getElementById("posSellerSelect").value || state.activeOperator;
        const serviceType = document.getElementById("posServiceType").value;
        const yapeRef = document.getElementById("posYapeRefInput").value.trim();
        const deliverNow = document.getElementById("posDeliverNowCheckbox").checked;
        const isSeparar = state.posPayMode === "SOLO_SEPARAR";
        const totalCents = nums.length * state.eventConfig.unitPriceCents;
        const timeStr = nowPeruTime();

        state.tickets = state.tickets.map(t => {
          if (!nums.includes(t.num)) return t;
          return {
            ...t,
            buyerName: buyer,
            buyerPhone: phone,
            sellerName: seller,
            serviceType,
            assignmentStatus: isSeparar ? "RESERVADO" : "CONFIRMADO",
            paymentStatus: isSeparar ? "PENDIENTE" : "PAGADO",
            paidCents: isSeparar ? 0 : t.agreedPriceCents,
            paymentMethod: isSeparar ? "" : state.posPayMode,
            paymentRef: yapeRef,
            deliveryStatus: (!isSeparar && deliverNow) ? "ENTREGADO" : "PENDIENTE",
            deliveredAt: (!isSeparar && deliverNow) ? timeStr : null,
            deliveredBy: (!isSeparar && deliverNow) ? state.activeOperator : null
          };
        });

        if (!isSeparar) {
          state.payments.unshift({
            id: `PAY-${Date.now()}`,
            time: timeStr,
            description: `Ticket(s) #${nums.map(n => String(n).padStart(3, "0")).join(", ")} - ${buyer}`,
            amountCents: totalCents,
            destination: state.posPayMode
          });

          if (state.posPayMode === "EFECTIVO_CAJA") {
            state.conteoFisicoRealCents += totalCents;
          } else if (state.posPayMode === "EFECTIVO_VENDEDOR") {
            state.sellers = state.sellers.map(s =>
              s.name === seller ? { ...s, cashInHandCents: s.cashInHandCents + totalCents } : s
            );
          }
        }

        const codesFormatted = nums.map(n => String(n).padStart(3, "0")).join(", ");
        state.auditLogs.unshift(createAuditEntry(
          "VENTA",
          "INFO",
          isSeparar ? `Ticket(s) Separado(s): #${codesFormatted}` : `Venta Pollada Confirmada: #${codesFormatted}`,
          `Cliente: ${buyer} | Vendedor: ${seller} | Monto: ${isSeparar ? "PENDIENTE" : formatPEN(totalCents)} (${state.posPayMode}) ${deliverNow && !isSeparar ? "| Plato entregado en el acto" : ""}`
        ));

        document.getElementById("posBuyerName").value = "";
        document.getElementById("posBuyerPhone").value = "";
        document.getElementById("posYapeRefInput").value = "";
        document.getElementById("posDeliverNowCheckbox").checked = false;

        const nextFree = state.tickets.find(t => t.assignmentStatus === "DISPONIBLE");
        if (nextFree) document.getElementById("posTicketNums").value = String(nextFree.num);

        saveStateToCloud();
        window.appActions.showToast(
          isSeparar
            ? `Ticket #${codesFormatted} separado para ${buyer}.`
            : `¡Venta exitosa! Ticket #${codesFormatted} (${formatPEN(totalCents)})`,
          "✅"
        );
      },

      // Inspector y Acciones de Ticket
      inspectTicket: (num) => {
        state.inspectedTicketNum = num;
        renderTicketInspector();
      },

      jumpToSellTicket: (num) => {
        document.getElementById("posTicketNums").value = String(num);
        state.activeTab = "VENDER";
        renderAll();
      },

      payReservedTicket: (num, payMethod = "EFECTIVO_CAJA") => {
        const t = state.tickets.find(x => x.num === num);
        if (!t || t.paymentStatus === "PAGADO") return;

        const monto = t.agreedPriceCents;
        const timeStr = nowPeruTime();

        state.tickets = state.tickets.map(x =>
          x.num === num
            ? { ...x, assignmentStatus: "CONFIRMADO", paymentStatus: "PAGADO", paidCents: monto, paymentMethod: payMethod }
            : x
        );

        state.payments.unshift({
          id: `PAY-${Date.now()}`,
          time: timeStr,
          description: `Cobro Ticket Reservado #${t.code} (${t.buyerName})`,
          amountCents: monto,
          destination: payMethod
        });

        if (payMethod === "EFECTIVO_CAJA") {
          state.conteoFisicoRealCents += monto;
        }

        state.auditLogs.unshift(createAuditEntry(
          "VENTA",
          "INFO",
          `Cobro de Ticket Separado #${t.code}`,
          `Cliente: ${t.buyerName} pagó ${formatPEN(monto)} vía ${payMethod}.`
        ));

        saveStateToCloud();
        window.appActions.showToast(`Ticket #${t.code} cobrado correctamente (${formatPEN(monto)}).`, "💵");
      },

      deliverTicketPlate: (num) => {
        const t = state.tickets.find(x => x.num === num);
        if (!t) return;

        if (t.deliveryStatus === "ENTREGADO") {
          state.auditLogs.unshift(createAuditEntry(
            "ALERTA",
            "CRITICAL",
            `🚨 INTENTO DE DOBLE RECOJO EN TICKET #${t.code}`,
            `El ticket #${t.code} (${t.buyerName}) YA HABÍA SIDO ENTREGADO a las ${t.deliveredAt} por ${t.deliveredBy}.`
          ));
          saveStateToCloud();
          window.appActions.showToast(`¡ALERTA ANTIFRAUDE! El ticket #${t.code} YA FUE ENTREGADO a las ${t.deliveredAt}.`, "🚨");
          return;
        }

        if (t.paymentStatus !== "PAGADO") {
          window.appActions.showToast(`El ticket #${t.code} AÚN NO ESTÁ PAGADO. Cóbralo primero antes de entregar el plato.`, "⚠️");
          return;
        }

        const timeStr = nowPeruTime();
        state.tickets = state.tickets.map(x =>
          x.num === num
            ? { ...x, deliveryStatus: "ENTREGADO", deliveredAt: timeStr, deliveredBy: state.activeOperator }
            : x
        );

        state.auditLogs.unshift(createAuditEntry(
          "DESPACHO",
          "INFO",
          `Plato Entregado — Ticket #${t.code}`,
          `Entregado a ${t.buyerName} (${t.serviceType}) por ${state.activeOperator}.`
        ));

        saveStateToCloud();
        window.appActions.showToast(`¡Plato despachado! Ticket #${t.code} marcado como ENTREGADO.`, "🍗");
      },

      voidTicket: (num) => {
        if (!window.appActions.requireMasterKey("Anular Ticket")) return;
        const t = state.tickets.find(x => x.num === num);
        if (!t) return;

        const prevBuyer = t.buyerName;
        const prevPaid = t.paidCents;
        const prevMethod = t.paymentMethod;

        if (prevPaid > 0 && prevMethod === "EFECTIVO_CAJA") {
          state.conteoFisicoRealCents = Math.max(0, state.conteoFisicoRealCents - prevPaid);
          state.payments.unshift({
            id: `VOID-${Date.now()}`,
            time: nowPeruTime(),
            description: `Anulación Ticket #${t.code} (${prevBuyer})`,
            amountCents: -prevPaid,
            destination: "EFECTIVO_CAJA"
          });
        }

        state.tickets = state.tickets.map(x =>
          x.num === num
            ? {
                ...x,
                assignmentStatus: "DISPONIBLE",
                paymentStatus: "PENDIENTE",
                deliveryStatus: "PENDIENTE",
                paidCents: 0,
                paymentMethod: "",
                paymentRef: "",
                buyerName: "",
                buyerPhone: "",
                deliveredAt: null,
                deliveredBy: null
              }
            : x
        );

        state.auditLogs.unshift(createAuditEntry(
          "ALERTA",
          "CRITICAL",
          `ANULACIÓN DE TICKET #${t.code} (CLAVE MAESTRA)`,
          `El ticket #${t.code} de ${prevBuyer} (${formatPEN(prevPaid)}) fue anulado y liberado por ${state.activeOperator}.`
        ));

        state.inspectedTicketNum = null;
        saveStateToCloud();
        window.appActions.showToast(`Ticket #${t.code} anulado y devuelto a estado LIBRE. Registrado en Auditoría.`, "🛡️");
      },

      // Venta de Barra
      sellBarItem: (itemId, method = "EFECTIVO_CAJA") => {
        const item = state.barItems.find(b => b.id === itemId);
        if (!item) return;
        if (item.stock <= 0) {
          window.appActions.showToast(`Sin stock de ${item.name}. Registra el ingreso de más unidades en la pestaña Fiesta y Gastos.`, "⚠️");
          return;
        }

        const timeStr = nowPeruTime();
        state.barItems = state.barItems.map(b =>
          b.id === itemId
            ? { ...b, stock: b.stock - 1, soldQty: b.soldQty + 1, totalRevenueCents: b.totalRevenueCents + b.unitPriceCents }
            : b
        );

        state.payments.unshift({
          id: `BAR-${Date.now()}`,
          time: timeStr,
          description: `Barra: 1x ${item.name}`,
          amountCents: item.unitPriceCents,
          destination: method
        });

        if (method === "EFECTIVO_CAJA") {
          state.conteoFisicoRealCents += item.unitPriceCents;
        }

        state.auditLogs.unshift(createAuditEntry(
          "GASTO",
          "INFO",
          `Venta Barra: 1x ${item.name}`,
          `Ingreso +${formatPEN(item.unitPriceCents)} en ${method === "YAPE_EVENTO" ? "Yape" : "Efectivo Caja"}. Stock restante: ${item.stock - 1}.`
        ));

        saveStateToCloud();
        window.appActions.showToast(`Vendido 1 ${item.name} (+${formatPEN(item.unitPriceCents)})`, "🍻");
      },

      // Compras y Gastos
      setExpenseCategory: (cat) => {
        state.expCategory = cat;
        renderAll();
      },

      setExpenseOrigin: (orig) => {
        state.expOrigin = orig;
        renderAll();
      },

      submitExpense: () => {
        const amountSoles = parseFloat(document.getElementById("expAmountInput").value || "0");
        const amountCents = Math.round(amountSoles * 100);
        if (amountCents <= 0) {
          window.appActions.showToast("Ingresa un monto válido en Soles para registrar el gasto.", "⚠️");
          return;
        }

        const rawConcept = document.getElementById("expConceptInput").value.trim();
        let finalConcept = rawConcept;

        if (state.expCategory === "COMPRA_BARRA") {
          const prodId = document.getElementById("expBarProductSelect").value;
          const units = parseInt(document.getElementById("expBarUnitsInput").value || "0", 10) || 0;
          const targetProd = state.barItems.find(b => b.id === prodId);
          finalConcept = rawConcept || `Compra Barra: +${units} und. de ${targetProd ? targetProd.name : "Bebida"}`;
          if (units > 0) {
            state.barItems = state.barItems.map(b =>
              b.id === prodId ? { ...b, stock: b.stock + units } : b
            );
          }
        } else if (state.expCategory === "PAGO_POLLOS") {
          finalConcept = rawConcept || "Pago de Pollos / Carbón / Insumos";
        } else {
          finalConcept = rawConcept || "Gasto de Orquesta / Sonido / Local";
        }

        const timeStr = nowPeruTime();
        state.expenses.unshift({
          id: `EXP-${Date.now()}`,
          time: timeStr,
          category: state.expCategory,
          concept: finalConcept,
          amountCents,
          payOrigin: state.expOrigin,
          operator: state.activeOperator
        });

        if (state.expOrigin === "EFECTIVO_CAJA") {
          state.conteoFisicoRealCents -= amountCents;
        }

        state.auditLogs.unshift(createAuditEntry(
          "GASTO",
          "WARNING",
          `Salida de Dinero: ${finalConcept}`,
          `Monto: −${formatPEN(amountCents)} pagado desde ${state.expOrigin} por ${state.activeOperator}.`
        ));

        document.getElementById("expConceptInput").value = "";
        document.getElementById("expAmountInput").value = "";
        saveStateToCloud();
        window.appActions.showToast(`Gasto registrado: ${finalConcept} (${formatPEN(amountCents)})`, "📝");
      },

      addNewBarProduct: () => {
        if (!window.appActions.requireMasterKey("Crear Producto en Barra")) return;
        const name = document.getElementById("newBarNameInput").value.trim();
        const priceCents = Math.round((parseFloat(document.getElementById("newBarPriceInput").value || "0") || 0) * 100);
        if (!name || priceCents <= 0) {
          window.appActions.showToast("Escribe el nombre y el precio del nuevo producto.", "⚠️");
          return;
        }

        state.barItems.push({
          id: `BAR-${Date.now()}`,
          name,
          unitPriceCents: priceCents,
          stock: 0,
          soldQty: 0,
          totalRevenueCents: 0
        });

        state.auditLogs.unshift(createAuditEntry(
          "GASTO",
          "INFO",
          `Nuevo Producto Creado en Barra: ${name}`,
          `Precio unitario configurado en ${formatPEN(priceCents)}.`
        ));

        document.getElementById("newBarNameInput").value = "";
        document.getElementById("newBarPriceInput").value = "";
        saveStateToCloud();
        window.appActions.showToast(`Producto «${name}» agregado a la Barra.`, "🍾");
      },

      // Vendedores y Rendición
      addNewSeller: () => {
        const name = document.getElementById("newSellerNameInput").value.trim();
        if (!name) return;
        if (state.sellers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          window.appActions.showToast("Ese vendedor ya está en la lista.", "⚠️");
          return;
        }
        state.sellers.push({
          id: `SEL-${Date.now()}`,
          name,
          cashInHandCents: 0,
          settledCents: 0
        });
        state.auditLogs.unshift(createAuditEntry("VENTA", "INFO", `Nuevo Vendedor Registrado: ${name}`, `Agregado por ${state.activeOperator}.`));
        document.getElementById("newSellerNameInput").value = "";
        saveStateToCloud();
        window.appActions.showToast(`Vendedor ${name} habilitado para operar desde su teléfono.`, "👤");
      },

      settleSellerCash: (sellerId) => {
        if (!window.appActions.requireMasterKey("Recibir Rendición de Vendedor")) return;
        const s = state.sellers.find(x => x.id === sellerId);
        if (!s) return;
        const pending = Math.max(0, s.cashInHandCents - s.settledCents);
        if (pending <= 0) return;

        state.sellers = state.sellers.map(x =>
          x.id === sellerId ? { ...x, settledCents: x.cashInHandCents } : x
        );

        state.payments.unshift({
          id: `REND-${Date.now()}`,
          time: nowPeruTime(),
          description: `Rendición de efectivo de ${s.name}`,
          amountCents: pending,
          destination: "EFECTIVO_CAJA"
        });

        state.conteoFisicoRealCents += pending;

        state.auditLogs.unshift(createAuditEntry(
          "VENTA",
          "WARNING",
          `Rendición de Dinero Recibida: ${s.name}`,
          `Entregó ${formatPEN(pending)} en efectivo a Caja Principal (Autorizado con Clave Maestra).`
        ));

        saveStateToCloud();
        window.appActions.showToast(`Recibidos ${formatPEN(pending)} de ${s.name} en Caja Principal.`, "💵");
      },

      updatePhysicalCashCount: (valSoles) => {
        const cents = Math.round((parseFloat(valSoles) || 0) * 100);
        state.conteoFisicoRealCents = cents;
        saveStateToCloud();
      },

      // Configuración Maestra
      saveMasterConfig: () => {
        if (!window.appActions.requireMasterKey("Guardar Configuración del Negocio")) return;

        const name = document.getElementById("cfgEventName").value.trim() || state.eventConfig.name;
        const address = document.getElementById("cfgEventAddress").value.trim() || state.eventConfig.address;
        const prefix = (document.getElementById("cfgEventPrefix").value.trim() || "HCO1").toUpperCase();
        const priceCents = Math.round((parseFloat(document.getElementById("cfgTicketPrice").value || "15") || 15) * 100);
        const pollos = parseInt(document.getElementById("cfgPollosRecibidos").value || "250", 10) || 250;
        const fondoCents = Math.round((parseFloat(document.getElementById("cfgFondoInicial").value || "100") || 0) * 100);
        const newPin = document.getElementById("cfgNewMasterPin").value.trim();

        state.eventConfig = {
          ...state.eventConfig,
          name,
          address,
          prefix,
          unitPriceCents: priceCents
        };
        state.pollosRecibidos = pollos;
        state.fondoInicialCajaCents = fondoCents;

        // Actualizar precio en tickets aún disponibles
        state.tickets = state.tickets.map(t =>
          t.assignmentStatus === "DISPONIBLE" ? { ...t, agreedPriceCents: priceCents } : t
        );

        if (newPin.length >= 4) {
          state.masterPin = newPin;
          document.getElementById("cfgNewMasterPin").value = "";
        }

        state.auditLogs.unshift(createAuditEntry(
          "ALERTA",
          "WARNING",
          "Configuración Maestra Actualizada",
          `Evento: ${name} | Precio Ticket: ${formatPEN(priceCents)} | Platos: ${pollos} | Fondo Caja: ${formatPEN(fondoCents)}`
        ));

        saveStateToCloud();
        window.appActions.showToast("Configuración guardada y sincronizada en todos los teléfonos.", "✅");
      },

      // Multi-Evento
      switchEvent: (eventId) => {
        state.currentEventId = eventId;
        subscribeToCurrentEvent();
        window.appActions.showToast("Cambiando a evento seleccionado...", "📂");
      },

      openNewEventModal: () => {
        if (!window.appActions.requireMasterKey("Crear Nuevo Evento")) return;
        document.getElementById("newEventNameInput").value = "";
        document.getElementById("newEventModal").classList.remove("hidden");
        document.getElementById("newEventModal").classList.add("flex");
      },

      closeNewEventModal: () => {
        document.getElementById("newEventModal").classList.add("hidden");
        document.getElementById("newEventModal").classList.remove("flex");
      },

      createNewEvent: async () => {
        const title = document.getElementById("newEventNameInput").value.trim();
        if (!title) return;
        const slug = `pollada-huanuco-${Date.now()}`;
        const prefix = `HCO${state.eventsList.length + 1}`;

        state.currentEventId = slug;
        state.eventConfig = {
          prefix,
          name: title,
          address: "Huánuco, Perú",
          capacity: 250,
          unitCostCents: 900,
          unitPriceCents: 1500
        };
        state.tickets = createInitial250Tickets(prefix, 1500, 900);
        state.barItems = createInitialBarItems();
        state.payments = [];
        state.expenses = [];
        state.pollosRecibidos = 250;
        state.fondoInicialCajaCents = 10000;
        state.conteoFisicoRealCents = 10000;
        state.auditLogs = [
          createAuditEntry("ALERTA", "WARNING", `Nuevo Evento Creado: ${title}`, "Se generó un padrón nuevo de 250 tickets limpios.")
        ];

        window.appActions.closeNewEventModal();
        await saveStateToCloud();
        subscribeToCurrentEvent();
        window.appActions.showToast(`Evento «${title}» creado con 250 tickets nuevos.`, "🎉");
      },

      // Exportación CSV / Excel
      openExportModal: () => {
        const csv = window.appActions.buildTicketsCSV();
        document.getElementById("exportTextarea").value = csv;
        document.getElementById("exportModal").classList.remove("hidden");
        document.getElementById("exportModal").classList.add("flex");
      },

      closeExportModal: () => {
        document.getElementById("exportModal").classList.add("hidden");
        document.getElementById("exportModal").classList.remove("flex");
      },

      buildTicketsCSV: () => {
        const header = "Nro_Ticket,Token_QR,Cliente,Celular,Vendedor,Modalidad,Estado_Reserva,Estado_Pago,Monto_Pagado_Soles,Medio_Pago,Estado_Entrega,Hora_Entrega\n";
        const rows = state.tickets.map(t =>
          `${t.code},${t.qrToken},"${t.buyerName || "LIBRE"}","${t.buyerPhone || ""}","${t.sellerName}",${t.serviceType},${t.assignmentStatus},${t.paymentStatus},${(t.paidCents / 100).toFixed(2)},${t.paymentMethod || "-"},${t.deliveryStatus},"${t.deliveredAt || "-"}"`
        ).join("\n");
        return header + rows;
      },

      buildAuditCSV: () => {
        const header = "Hora,Categoria,Severidad,Operador,Dispositivo,Evento,Detalle\n";
        const rows = state.auditLogs.map(l =>
          `"${l.time}",${l.category},${l.severity},"${l.operator}",${l.device},"${l.title.replace(/"/g, '""')}","${l.detail.replace(/"/g, '""')}"`
        ).join("\n");
        return header + rows;
      },

      downloadCSV: (type) => {
        const content = "\uFEFF" + (type === "AUDIT" ? window.appActions.buildAuditCSV() : window.appActions.buildTicketsCSV());
        document.getElementById("exportTextarea").value = content;
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = type === "AUDIT" ? `Historial_Antifraude_Huanuco.csv` : `Padron_250_Tickets_Huanuco.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.appActions.showToast("Archivo Excel (.CSV) descargado correctamente.", "📥");
      },

      copyExportText: () => {
        const textarea = document.getElementById("exportTextarea");
        textarea.select();
        document.execCommand("copy");
        window.appActions.showToast("Datos copiados al portapapeles.", "📋");
      }
    };

    // Inicializar íconos, renderizar vista inicial y conectar a Firebase
    window.addEventListener("DOMContentLoaded", () => {
      if (window.lucide) window.lucide.createIcons();
      renderAll();
      initFirebaseSync();
    });
  </script>
</body>
</html>