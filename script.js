// Configuración de Iconos SVG
const icons = {
    check: `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    undo: `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" width="14" height="14" style="margin-right:4px; vertical-align:middle; display:inline-block;"><path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

// --- ESTADO Y CACHÉ ---
let debts = [];
let currentFilter = 'all'; // 'all', 'pending', 'paid', 'recurrentes'
let selectedMonthFilter = 'current'; // 'current', 'all', o formato 'YYYY-MM'
let searchQuery = '';
let currentSort = 'recent';
let UI = {}; // DOM Cache
let editingDebtId = null; // Id de deuda en edición

// --- FORMATTERS GLOBALES (Optimizados) ---
const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
});
const monthFormatterCO = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', month: 'long', year: 'numeric'
});
const monthPartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: 'numeric'
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Cachear DOM Elements
    UI = {
        listContainer: document.getElementById('debts-list'),
        emptyState: document.getElementById('empty-state'),
        totalAmountEl: document.getElementById('total-amount'),
        metricPaidAmount: document.getElementById('metric-paid-amount'),
        metricTotalAmount: document.getElementById('metric-total-amount'),
        monthFilterSelect: document.getElementById('month-filter-select'),
        summaryPeriodLabel: document.getElementById('summary-period-label'),
        monthDisplay: document.getElementById('month-display'),
        modalOverlay: document.getElementById('preview-modal'),
        modalDetails: document.getElementById('modal-details'),
        closeModalBtn: document.getElementById('close-modal'),
        badgeOverdue: document.getElementById('badge-overdue'),
        badgeUrgent: document.getElementById('badge-urgent'),
        countOverdue: document.getElementById('count-overdue'),
        countUrgent: document.getElementById('count-urgent'),
        btnToggleNotifications: document.getElementById('btn-toggle-notifications'),
        notifyBtnText: document.getElementById('notify-btn-text'),
        btnTestPush: document.getElementById('btn-test-push'),
        iosInstallBanner: document.getElementById('ios-install-banner'),
        authModal: document.getElementById('auth-modal'),
        authForm: document.getElementById('auth-form'),
        authError: document.getElementById('auth-error'),
        authTitle: document.getElementById('auth-title'),
        authSubtitle: document.getElementById('auth-subtitle'),
        authUsername: document.getElementById('auth-username'),
        authPassword: document.getElementById('auth-password'),
        authConfirmRegPassword: document.getElementById('auth-confirm-reg-password'),
        authCedula: document.getElementById('auth-cedula'),
        authNewPassword: document.getElementById('auth-new-password'),
        authConfirmPassword: document.getElementById('auth-confirm-password'),
        btnAuthSubmit: document.getElementById('btn-auth-submit'),
        authForgotLink: document.getElementById('auth-forgot-link'),
        authBackLink: document.getElementById('auth-back-link'),
        amountInput: document.getElementById('amount'),
        addDebtSection: document.getElementById('add-debt-section'),
        addDebtToggle: document.getElementById('add-debt-toggle'),
        addDebtFab: document.getElementById('add-debt-fab'),
        addDebtOverlay: document.getElementById('add-debt-overlay'),
        addDebtSheetClose: document.getElementById('add-debt-sheet-close'),
        searchInput: document.getElementById('search-input'),
        sortSelect: document.getElementById('sort-select'),
        toastContainer: document.getElementById('toast-container'),
        userName: document.getElementById('user-name'),
        userAvatar: document.getElementById('user-avatar'),
        btnLogout: document.getElementById('btn-logout'),
        btnOpenSettings: document.getElementById('btn-open-settings'),
        settingsModal: document.getElementById('settings-modal'),
        closeSettingsModal: document.getElementById('close-settings-modal'),
        formChangeUsername: document.getElementById('form-change-username'),
        formChangePassword: document.getElementById('form-change-password'),
        formChangeCedula: document.getElementById('form-change-cedula'),
        settingsNewUsername: document.getElementById('settings-new-username'),
        settingsCurrentPass: document.getElementById('settings-current-pass'),
        settingsNewPass: document.getElementById('settings-new-pass'),
        settingsCedula: document.getElementById('settings-cedula'),
        msgUsername: document.getElementById('msg-username'),
        msgPassword: document.getElementById('msg-password'),
        msgCedula: document.getElementById('msg-cedula'),
        settingsBtnTogglePush: document.getElementById('settings-btn-toggle-push'),
        settingsBtnTestPush: document.getElementById('settings-btn-test-push'),
        settingsNotifyLabel: document.getElementById('settings-notify-label'),
        settingsNotifyDesc: document.getElementById('settings-notify-desc')
    };

    setupEventListeners();
    displayCurrentMonth();
    initAuthAndApp();
});

// --- LÓGICA DE ZONA HORARIA (BOGOTÁ) ---
function getCurrentBogotaMonth() {
    const parts = monthPartsFormatter.formatToParts(new Date());

    let year = '', month = '';
    parts.forEach(({ type, value }) => {
        if (type === 'year') year = value;
        if (type === 'month') month = value;
    });

    return `${year}-${month}`;
}

function displayCurrentMonth() {
    const formatted = monthFormatterCO.format(new Date());
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    UI.monthDisplay.textContent = capitalized;
}

// --- FORMULARIO DE NUEVA DEUDA (BOTTOM SHEET EN MOBILE) ---
function isMobileView() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function setAddDebtExpanded(expanded) {
    const section = UI.addDebtSection || document.getElementById('add-debt-section');
    const toggle = UI.addDebtToggle || document.getElementById('add-debt-toggle');
    const overlay = UI.addDebtOverlay || document.getElementById('add-debt-overlay');
    if (!section || !toggle) return;

    const shouldExpand = expanded && isMobileView();

    section.classList.toggle('expanded', shouldExpand);
    toggle.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');

    if (overlay) {
        overlay.classList.toggle('active', shouldExpand);
    }
    document.body.classList.toggle('sheet-open', shouldExpand);
}

// --- MANEJO DE DATOS (BASE DE DATOS SQLITE VÍA API) ---
async function apiRequest(endpoint, options = {}) {
    // Añadir timestamp para evitar caché en cualquier proxy o navegador
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    };
    
    const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && !endpoint.startsWith('/api/auth/')) {
            showAuthModal('login');
        }
        throw new Error(data.error || `Error en servidor: ${response.statusText}`);
    }
    return data;
}

async function loadDebts() {
    try {
        const data = await apiRequest('/api/debts');
        debts = data.debts || [];

        // Migración automática inicial: si la BD está vacía pero había datos previos en localStorage
        const localSaved = localStorage.getItem('finanzas_debts');
        if (debts.length === 0 && localSaved) {
            try {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    await apiRequest('/api/debts/migrate', {
                        method: 'POST',
                        body: JSON.stringify({ debts: parsed })
                    });
                    localStorage.removeItem('finanzas_debts');
                    const refreshed = await apiRequest('/api/debts');
                    debts = refreshed.debts || [];
                }
            } catch (migErr) {
                console.warn('Error al migrar datos anteriores:', migErr);
            }
        }

        await checkMonthlyReset(data.lastMonth);
        updateUI();
    } catch (err) {
        console.error('Error cargando deudas desde la base de datos:', err);
    }
}

async function checkMonthlyReset(lastSavedMonth) {
    const currentMonthStr = getCurrentBogotaMonth();

    if (lastSavedMonth !== currentMonthStr) {
        let changed = false;
        
        for (const debt of debts) {
            // Recurrentes mensuales o quincenales que estaban pagadas se reactivan para el nuevo periodo
            if (debt.type === 'mensual' || debt.type === 'quincenal') {
                if (debt.status === 'pagada' || debt.paidAmount > 0) {
                    debt.status = 'pendiente';
                    debt.paidAmount = 0;

                    // Si tenía fecha de pago en el mes anterior, actualizar automáticamente al mes actual conservando el mismo día
                    if (debt.dueDate) {
                        try {
                            const [prevY, prevM, prevD] = debt.dueDate.split('-');
                            const today = new Date();
                            const curYear = today.getFullYear();
                            const curMonth = String(today.getMonth() + 1).padStart(2, '0');
                            debt.dueDate = `${curYear}-${curMonth}-${prevD}`;
                        } catch (e) {
                            console.warn('Error recalculando fecha para recurrente:', e);
                        }
                    }

                    await apiRequest(`/api/debts/${debt.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(debt)
                    });
                    changed = true;
                }
            }
        }

        await apiRequest('/api/metadata/month', {
            method: 'POST',
            body: JSON.stringify({ month: currentMonthStr })
        });

        if (changed) updateUI();
    }
}

// --- EVENTOS ---
function setupEventListeners() {
    if (UI.addDebtToggle) {
        UI.addDebtToggle.addEventListener('click', () => {
            const isExpanded = !UI.addDebtSection.classList.contains('expanded');
            setAddDebtExpanded(isExpanded);

            if (isExpanded) {
                const descInput = document.getElementById('description');
                if (descInput) {
                    setTimeout(() => descInput.focus({ preventScroll: true }), 320);
                }
            }
        });
    }

    if (UI.addDebtFab) {
        UI.addDebtFab.addEventListener('click', () => {
            setAddDebtExpanded(true);
            const descInput = document.getElementById('description');
            if (descInput) {
                setTimeout(() => descInput.focus({ preventScroll: true }), 320);
            }
        });
    }

    if (UI.addDebtOverlay) {
        UI.addDebtOverlay.addEventListener('click', () => setAddDebtExpanded(false));
    }

    if (UI.addDebtSheetClose) {
        UI.addDebtSheetClose.addEventListener('click', () => setAddDebtExpanded(false));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && UI.addDebtSection && UI.addDebtSection.classList.contains('expanded')) {
            setAddDebtExpanded(false);
        }
    });

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const handleViewportChange = (e) => {
        if (!e.matches) setAddDebtExpanded(false);
    };
    if (mobileQuery.addEventListener) {
        mobileQuery.addEventListener('change', handleViewportChange);
    } else if (mobileQuery.addListener) {
        mobileQuery.addListener(handleViewportChange);
    }

    document.getElementById('debt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const descInput = document.getElementById('description');
        const amountInput = UI.amountInput || document.getElementById('amount');
        const dateInput = document.getElementById('payment-date');
        const typeInput = document.getElementById('debt-type');
        const categoryInput = document.getElementById('debt-category');

        const amountValue = parseAmount(amountInput.value);
        if (!amountValue || amountValue <= 0) {
            alert('Ingresa un monto mayor a cero.');
            amountInput.focus();
            return;
        }

        try {
            if (editingDebtId) {
                const index = debts.findIndex(d => d.id === editingDebtId);
                if (index > -1) {
                    const updatedData = {
                        ...debts[index],
                        description: descInput.value.trim(),
                        amount: amountValue,
                        dueDate: dateInput.value,
                        type: typeInput.value,
                        category: categoryInput.value
                    };
                    
                    if (updatedData.paidAmount > updatedData.amount) {
                        updatedData.paidAmount = updatedData.amount;
                        updatedData.status = 'pagada';
                    } else if (updatedData.paidAmount < updatedData.amount && updatedData.status === 'pagada') {
                        updatedData.status = 'pendiente';
                    }

                    const savedDebt = await apiRequest(`/api/debts/${editingDebtId}`, {
                        method: 'PUT',
                        body: JSON.stringify(updatedData)
                    });

                    debts[index] = savedDebt;
                }
                editingDebtId = null;
                
                const btn = document.querySelector('#debt-form button[type="submit"]');
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Agregar Deuda`;
                btn.style.background = '';
            } else {
                const newDebt = {
                    id: Date.now().toString(),
                    description: descInput.value.trim(),
                    amount: amountValue,
                    dueDate: dateInput.value,
                    type: typeInput.value,
                    category: categoryInput.value,
                    status: 'pendiente',
                    paidAmount: 0
                };

                const createdDebt = await apiRequest('/api/debts', {
                    method: 'POST',
                    body: JSON.stringify(newDebt)
                });

                debts.unshift(createdDebt);
            }

            updateUI();
            e.target.reset();

            if (isMobileView()) {
                setAddDebtExpanded(false);
            } else {
                descInput.focus();
            }
        } catch (error) {
            alert('Error al guardar en la base de datos: ' + error.message);
        }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            updateUI();
        });
    });

    // Búsqueda y orden
    if (UI.searchInput) {
        UI.searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            updateUI();
        });
    }
    if (UI.sortSelect) {
        UI.sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            updateUI();
        });
    }

    // Selector de Mes / Historial
    if (UI.monthFilterSelect) {
        UI.monthFilterSelect.addEventListener('change', (e) => {
            selectedMonthFilter = e.target.value;
            updateUI();
        });
    }

    // Formato de pesos mientras se escribe
    if (UI.amountInput) {
        UI.amountInput.addEventListener('input', () => {
            UI.amountInput.value = formatAmountTyping(UI.amountInput.value);
        });
    }

    // Eventos del Modal
    if(UI.closeModalBtn) {
        UI.closeModalBtn.addEventListener('click', closePreviewModal);
    }
    if(UI.modalOverlay) {
        UI.modalOverlay.addEventListener('click', (e) => {
            if (e.target === UI.modalOverlay) closePreviewModal();
        });
    }

    // Botones de Notificación
    if (UI.btnToggleNotifications) {
        UI.btnToggleNotifications.addEventListener('click', handleNotificationToggle);
    }
    if (UI.btnTestPush) {
        UI.btnTestPush.addEventListener('click', handleTestPush);
    }

    // Autenticación
    if (UI.authForm) {
        UI.authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (UI.btnLogout) {
        UI.btnLogout.addEventListener('click', handleLogout);
    }
    if (UI.authForgotLink) {
        UI.authForgotLink.addEventListener('click', () => switchAuthTab('recover'));
    }
    if (UI.authBackLink) {
        UI.authBackLink.addEventListener('click', () => switchAuthTab('login'));
    }

    // Configuración de Cuenta
    if (UI.btnOpenSettings) {
        UI.btnOpenSettings.addEventListener('click', openSettingsModal);
    }
    if (UI.closeSettingsModal) {
        UI.closeSettingsModal.addEventListener('click', closeSettingsModal);
    }
    if (UI.settingsModal) {
        UI.settingsModal.addEventListener('click', (e) => {
            if (e.target === UI.settingsModal) closeSettingsModal();
        });
    }
    if (UI.formChangeUsername) {
        UI.formChangeUsername.addEventListener('submit', handleChangeUsername);
    }
    if (UI.formChangePassword) {
        UI.formChangePassword.addEventListener('submit', handleChangePassword);
    }
    if (UI.formChangeCedula) {
        UI.formChangeCedula.addEventListener('submit', handleChangeCedula);
    }
    if (UI.settingsBtnTogglePush) {
        UI.settingsBtnTogglePush.addEventListener('click', handleNotificationToggle);
    }
    if (UI.settingsBtnTestPush) {
        UI.settingsBtnTestPush.addEventListener('click', handleTestPush);
    }
}

// --- MÓDULO DE AUTENTICACIÓN (LOGIN & REGISTRO) ---
let currentAuthMode = 'login'; // 'login' | 'register' | 'recover'
let currentUser = null;

function toggleAuthField(groupId, input, visible) {
    const group = document.getElementById(groupId);
    if (group) group.style.display = visible ? 'flex' : 'none';
    if (input) {
        input.disabled = !visible;
        input.required = visible;
    }
}

function clearAuthMessage() {
    if (UI.authError) UI.authError.style.display = 'none';
}

function setAuthMessage(message, type = 'error') {
    if (!UI.authError) return;
    UI.authError.textContent = message;
    UI.authError.className = 'auth-error' + (type === 'success' ? ' auth-success' : '');
    UI.authError.style.display = 'block';
}

window.switchAuthTab = function(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabs = document.querySelector('.auth-tabs');

    clearAuthMessage();

    const isLogin = mode === 'login';
    const isRegister = mode === 'register';
    const isRecover = mode === 'recover';

    if (tabs) tabs.style.display = isRecover ? 'none' : 'flex';
    if (tabLogin && tabRegister) {
        tabLogin.classList.toggle('active', isLogin);
        tabRegister.classList.toggle('active', isRegister);
    }

    toggleAuthField('auth-username-group', UI.authUsername, isLogin || isRegister);
    toggleAuthField('auth-cedula-group', UI.authCedula, isRegister || isRecover);
    toggleAuthField('auth-password-group', UI.authPassword, isLogin || isRegister);
    toggleAuthField('auth-confirm-reg-group', UI.authConfirmRegPassword, isRegister);

    const recoverFields = document.getElementById('auth-recover-fields');
    if (recoverFields) recoverFields.style.display = isRecover ? 'block' : 'none';
    [UI.authNewPassword, UI.authConfirmPassword].forEach(input => {
        if (input) {
            input.disabled = !isRecover;
            input.required = isRecover;
            if (!isRecover) input.value = '';
        }
    });

    if (isLogin) {
        UI.authTitle.textContent = 'Iniciar Sesión';
        UI.authSubtitle.textContent = 'Ingresa tu usuario y contraseña';
        UI.btnAuthSubmit.textContent = 'Iniciar Sesión';
    } else if (isRegister) {
        UI.authTitle.textContent = 'Crear Cuenta';
        UI.authSubtitle.textContent = 'Elige un usuario, tu cédula y una contraseña';
        UI.btnAuthSubmit.textContent = 'Crear mi Cuenta';
    } else {
        UI.authTitle.textContent = 'Recuperar Contraseña';
        UI.authSubtitle.textContent = 'Ingresa tu cédula y define una nueva contraseña';
        UI.btnAuthSubmit.textContent = 'Restablecer Contraseña';
    }

    if (UI.authForgotLink) UI.authForgotLink.style.display = isLogin ? 'block' : 'none';
    if (UI.authBackLink) UI.authBackLink.style.display = isRecover ? 'block' : 'none';

    if (isRecover && UI.authCedula) UI.authCedula.focus();
    else if (UI.authUsername && !UI.authUsername.disabled) UI.authUsername.focus();
};

function showAuthModal(mode = 'login') {
    switchAuthTab(mode);
    if (UI.authModal) {
        UI.authModal.classList.add('active');
    }
}

function hideAuthModal() {
    if (UI.authModal) {
        UI.authModal.classList.remove('active');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    clearAuthMessage();

    const username = UI.authUsername.value.trim();
    const password = UI.authPassword.value;
    const idleText = currentAuthMode === 'login'
        ? 'Iniciar Sesión'
        : currentAuthMode === 'register' ? 'Crear mi Cuenta' : 'Restablecer Contraseña';

    UI.btnAuthSubmit.disabled = true;
    UI.btnAuthSubmit.textContent = 'Procesando...';

    try {
        // Recuperación: únicamente con la cédula
        if (currentAuthMode === 'recover') {
            const cedula = UI.authCedula.value.trim();
            const newPassword = UI.authNewPassword.value;
            const confirmPassword = UI.authConfirmPassword.value;

            if (!newPassword || newPassword.length < 3) {
                setAuthMessage('La nueva contraseña debe tener al menos 3 caracteres.');
                return;
            }
            if (newPassword !== confirmPassword) {
                setAuthMessage('Las contraseñas no coinciden.');
                return;
            }

            const res = await apiRequest('/api/auth/recover', {
                method: 'POST',
                body: JSON.stringify({ cedula, newPassword })
            });

            setAuthMessage(res.message || 'Contraseña restablecida. Ya puedes iniciar sesión.', 'success');
            UI.authForm.reset();
            setTimeout(() => switchAuthTab('login'), 1600);
            return;
        }

        if (currentAuthMode === 'register') {
            const confirmPass = UI.authConfirmRegPassword ? UI.authConfirmRegPassword.value : '';
            if (password !== confirmPass) {
                setAuthMessage('Las contraseñas no coinciden.');
                return;
            }
        }

        const endpoint = currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const body = currentAuthMode === 'login'
            ? { username, password }
            : { username, password, cedula: UI.authCedula.value.trim() };

        const res = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        currentUser = res.user;
        updateUserHeaderUI(currentUser);
        hideAuthModal();
        UI.authForm.reset();

        // Cargar datos y activar servicio PWA
        await loadDebts();
        initPWAAndNotifications();
    } catch (err) {
        setAuthMessage(err.message || 'Error en autenticación');
    } finally {
        UI.btnAuthSubmit.disabled = false;
        UI.btnAuthSubmit.textContent = idleText;
    }
}

function updateUserHeaderUI(user) {
    if (!user) return;
    if (UI.userName) UI.userName.textContent = user.username || 'Usuario';
    if (UI.userAvatar) {
        const initial = (user.username && user.username.charAt(0).toUpperCase()) || '👤';
        UI.userAvatar.textContent = initial;
    }
}

async function handleLogout() {
    if (confirm('¿Deseas cerrar tu sesión?')) {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.warn('Logout error', e);
        }
        currentUser = null;
        debts = [];
        updateUI();
        showAuthModal('login');
    }
}

async function initAuthAndApp() {
    try {
        const check = await apiRequest('/api/auth/me');
        if (check.authenticated && check.user) {
            currentUser = check.user;
            updateUserHeaderUI(currentUser);
            hideAuthModal();
            await loadDebts();
            initPWAAndNotifications();
        } else {
            showAuthModal('login');
        }
    } catch (err) {
        showAuthModal('login');
    }
}

// --- PWA & WEB PUSH NOTIFICATIONS (Soporte iOS 16.4+ y Android) ---
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Detectar si el usuario está en iPhone/iPad y si la app está instalada como PWA
function isIOSDevice() {
    const ua = navigator.userAgent;
    const isIOSUA = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    // iPadOS 13+ se identifica como Mac con pantalla táctil
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOSUA || isIPadOS;
}

function isStandalonePWA() {
    return window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
}

function checkIOSPWAInstall() {
    // Si es iOS y aún no está instalada como app de pantalla de inicio
    if (isIOSDevice() && !isStandalonePWA() && UI.iosInstallBanner) {
        UI.iosInstallBanner.style.display = 'flex';
    }
}

let swRegistration = null;

async function initPWAAndNotifications() {
    checkIOSPWAInstall();

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Este navegador no soporta Push Notifications.');
        if (UI.btnToggleNotifications) {
            UI.btnToggleNotifications.style.display = 'none';
        }
        return;
    }

    try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const subscription = await swRegistration.pushManager.getSubscription();

        if (subscription) {
            updateNotificationBtnUI(true);
            // Comprobación y envío proactivo de recordatorios al iniciar
            try {
                apiRequest('/api/push/check-and-notify', { method: 'POST' });
            } catch (errAlert) {
                console.debug('Verificación de alertas automática:', errAlert);
            }
        } else {
            updateNotificationBtnUI(false);
        }
    } catch (err) {
        console.warn('Error al registrar Service Worker:', err);
        if (UI.btnToggleNotifications) {
            UI.btnToggleNotifications.style.display = 'none';
        }
    }
}

function updateNotificationBtnUI(isSubscribed) {
    if (UI.btnToggleNotifications) {
        if (isSubscribed) {
            UI.btnToggleNotifications.classList.add('active');
            UI.notifyBtnText.textContent = 'Alertas Activas';
            if (UI.btnTestPush) UI.btnTestPush.style.display = 'inline-flex';
        } else {
            UI.btnToggleNotifications.classList.remove('active');
            UI.notifyBtnText.textContent = 'Activar Alertas';
            if (UI.btnTestPush) UI.btnTestPush.style.display = 'none';
        }
    }

    // Actualizar también la sección de notificaciones en el modal de configuración
    if (UI.settingsBtnTogglePush) {
        if (isSubscribed) {
            UI.settingsBtnTogglePush.classList.add('active');
            UI.settingsBtnTogglePush.textContent = 'Desactivar Notificaciones';
            if (UI.settingsBtnTestPush) UI.settingsBtnTestPush.style.display = 'inline-flex';
            if (UI.settingsNotifyLabel) UI.settingsNotifyLabel.textContent = 'Estado: Activas en este dispositivo';
            if (UI.settingsNotifyDesc) UI.settingsNotifyDesc.textContent = 'Recibirás recordatorios automáticos en tu móvil.';
        } else {
            UI.settingsBtnTogglePush.classList.remove('active');
            UI.settingsBtnTogglePush.textContent = 'Activar Notificaciones';
            if (UI.settingsBtnTestPush) UI.settingsBtnTestPush.style.display = 'none';
            if (UI.settingsNotifyLabel) UI.settingsNotifyLabel.textContent = 'Estado: Desactivadas';
            if (UI.settingsNotifyDesc) UI.settingsNotifyDesc.textContent = 'Activa el servicio para recibir avisos en la pantalla de bloqueo.';
        }
    }
}

async function handleNotificationToggle() {
    if (!swRegistration) {
        return alert('El servicio de notificaciones se está iniciando. Por favor, reintenta en un momento.');
    }

    // Las notificaciones push requieren un contexto seguro (HTTPS)
    if (!window.isSecureContext) {
        return alert('Las notificaciones requieren una conexión segura (HTTPS). Abre la app desde una dirección https:// e inténtalo de nuevo.');
    }

    // En iPhone/iPad, Web Push solo funciona con la app instalada en la pantalla de inicio
    if (isIOSDevice() && !isStandalonePWA()) {
        if (UI.iosInstallBanner) UI.iosInstallBanner.style.display = 'flex';
        return alert('En iPhone/iPad primero debes instalar la app: toca Compartir y elige "Agregar al inicio". Luego abre Finanzas desde el ícono instalado y activa las notificaciones allí.');
    }

    console.log('[push] contexto seguro:', window.isSecureContext, '| iOS:', isIOSDevice(), '| standalone:', isStandalonePWA());

    try {
        const existingSub = await swRegistration.pushManager.getSubscription();

        if (existingSub) {
            // Cancelar suscripción
            await existingSub.unsubscribe();
            updateNotificationBtnUI(false);
            alert('Notificaciones desactivadas en este dispositivo.');
            return;
        }

        // Solicitar permiso explícito al usuario (requisito obligatorio de iOS y Android)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return alert('Permiso de notificaciones denegado. Actívalo en la configuración de tu teléfono o navegador.');
        }

        // Obtener VAPID public key desde backend
        const keyData = await apiRequest('/api/push/vapid-public-key');
        const convertedKey = urlBase64ToUint8Array(keyData.publicKey);

        const subscribe = () => swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
        });

        // Suscribir en el Push Service nativo de Apple o Google.
        // Si falla, limpiamos cualquier suscripción previa inválida y reintentamos una vez.
        let newSub;
        try {
            newSub = await subscribe();
        } catch (firstError) {
            console.warn('Primer intento de suscripción falló, reintentando:', firstError);
            const staleSub = await swRegistration.pushManager.getSubscription().catch(() => null);
            if (staleSub) await staleSub.unsubscribe().catch(() => {});
            newSub = await subscribe();
        }

        // Enviar suscripción a nuestro SQLite backend
        await apiRequest('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription: newSub })
        });

        updateNotificationBtnUI(true);

        // Enviar notificación de bienvenida y comprobación
        await apiRequest('/api/push/test', {
            method: 'POST',
            body: JSON.stringify({
                title: '🎉 Notificaciones Activadas',
                body: 'Ahora recibirás recordatorios en este móvil cuando tus deudas estén próximas a vencer.'
            })
        });

    } catch (error) {
        console.error('Error al suscribir notificaciones:', error);
        alert('No se pudo activar la notificación: ' + getPushErrorMessage(error));
    }
}

function getPushErrorMessage(error) {
    const message = (error && error.message) ? error.message : String(error);

    if (/push service error|registration failed/i.test(message)) {
        return 'El servicio de notificaciones del navegador no está disponible en este momento. Verifica tu conexión a internet, que la app se abra por HTTPS y, si usas un navegador como Brave o Chromium, que los servicios de notificaciones estén habilitados. En iPhone, instala la app en la pantalla de inicio.';
    }
    if (/permission/i.test(message)) {
        return 'Permiso de notificaciones denegado. Actívalo en la configuración de tu teléfono o navegador.';
    }
    return message;
}

async function handleTestPush() {
    try {
        const res = await apiRequest('/api/push/test', {
            method: 'POST',
            body: JSON.stringify({
                title: '⚡ Prueba de Notificación',
                body: 'Notificación enviada con éxito a tu dispositivo móvil.'
            })
        });
        if (res.success) {
            alert('¡Notificación enviada! Revisa el panel de notificaciones o la pantalla de bloqueo de tu teléfono.');
        } else {
            alert(res.message);
        }
    } catch (e) {
        alert('Error probando notificación: ' + e.message);
    }
}

// --- MODAL DE CONFIGURACIÓN DE CUENTA ---
window.openSettingsModal = function() {
    if (!UI.settingsModal) return;
    if (UI.settingsNewUsername && currentUser) {
        UI.settingsNewUsername.value = currentUser.username || '';
    }
    if (UI.settingsCedula && currentUser) {
        UI.settingsCedula.value = currentUser.cedula || '';
    }
    if (UI.msgUsername) UI.msgUsername.style.display = 'none';
    if (UI.msgPassword) UI.msgPassword.style.display = 'none';
    if (UI.msgCedula) UI.msgCedula.style.display = 'none';
    if (UI.formChangePassword) UI.formChangePassword.reset();

    // Actualizar estado de notificaciones en el modal
    if (swRegistration) {
        swRegistration.pushManager.getSubscription().then(sub => {
            updateNotificationBtnUI(!!sub);
        }).catch(() => {
            updateNotificationBtnUI(false);
        });
    }

    UI.settingsModal.classList.add('active');
};

window.closeSettingsModal = function() {
    if (UI.settingsModal) {
        UI.settingsModal.classList.remove('active');
    }
};

async function handleChangeUsername(e) {
    e.preventDefault();
    if (UI.msgUsername) UI.msgUsername.style.display = 'none';

    const newUsername = UI.settingsNewUsername.value.trim();
    const btn = UI.formChangeUsername.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await apiRequest('/api/user/username', {
            method: 'PUT',
            body: JSON.stringify({ newUsername })
        });

        if (currentUser) {
            currentUser.username = res.username;
            updateUserHeaderUI(currentUser);
        }

        if (UI.msgUsername) {
            UI.msgUsername.textContent = res.message || 'Usuario actualizado correctamente.';
            UI.msgUsername.className = 'settings-msg success';
            UI.msgUsername.style.display = 'block';
        }
    } catch (err) {
        if (UI.msgUsername) {
            UI.msgUsername.textContent = err.message || 'Error al actualizar usuario.';
            UI.msgUsername.className = 'settings-msg error';
            UI.msgUsername.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Actualizar Usuario';
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    if (UI.msgPassword) UI.msgPassword.style.display = 'none';

    const currentPassword = UI.settingsCurrentPass.value;
    const newPassword = UI.settingsNewPass.value;
    const btn = UI.formChangePassword.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await apiRequest('/api/user/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        UI.formChangePassword.reset();

        if (UI.msgPassword) {
            UI.msgPassword.textContent = res.message || 'Contraseña cambiada con éxito.';
            UI.msgPassword.className = 'settings-msg success';
            UI.msgPassword.style.display = 'block';
        }
    } catch (err) {
        if (UI.msgPassword) {
            UI.msgPassword.textContent = err.message || 'Error al cambiar contraseña.';
            UI.msgPassword.className = 'settings-msg error';
            UI.msgPassword.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cambiar Contraseña';
    }
}

async function handleChangeCedula(e) {
    e.preventDefault();
    if (UI.msgCedula) UI.msgCedula.style.display = 'none';

    const cedula = UI.settingsCedula.value.trim();
    const btn = UI.formChangeCedula.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await apiRequest('/api/user/cedula', {
            method: 'PUT',
            body: JSON.stringify({ cedula })
        });

        if (currentUser) currentUser.cedula = res.cedula;

        if (UI.msgCedula) {
            UI.msgCedula.textContent = res.message || 'Cédula guardada correctamente.';
            UI.msgCedula.className = 'settings-msg success';
            UI.msgCedula.style.display = 'block';
        }
    } catch (err) {
        if (UI.msgCedula) {
            UI.msgCedula.textContent = err.message || 'Error al guardar la cédula.';
            UI.msgCedula.className = 'settings-msg error';
            UI.msgCedula.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Cédula';
    }
}

// --- MODAL DE VISTA PREVIA Y PAGOS ---
window.openPreviewModal = function(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    
    const remaining = debt.amount - debt.paidAmount;
    const progressPercent = Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100));

    // Si ya está pagada por completo
    let partialPayUI = '';
    if (debt.status === 'pendiente') {
        partialPayUI = `
            <div style="margin-top: 1.5rem; background: rgba(0,0,0,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Registrar Abono</label>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    <input type="text" id="abono-input" inputmode="numeric" placeholder="Máx: ${formatCurrency(remaining)}" 
                           style="flex: 1; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; outline: none;">
                    <button onclick="submitPartialPay('${debt.id}')" 
                            style="background: var(--accent-primary); color: white; border: none; padding: 0 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        Abonar
                    </button>
                </div>
            </div>
        `;
    }

    UI.modalDetails.innerHTML = `
        <div class="detail-row">
            <label>Descripción</label>
            <span style="font-size: 1.5rem;">${debt.description}</span>
        </div>
        
        <div class="input-row" style="margin-top: 0.25rem;">
            <div class="detail-row half">
                <label>Categoría</label>
                <span class="badge" style="background:#F1F5F9; color:#475569; border:1px solid #E2E8F0;">${debt.category}</span>
            </div>
            <div class="detail-row half">
                <label>Fecha Límite</label>
                <span style="font-size: 1rem;">${icons.calendar} ${formatDate(debt.dueDate)}</span>
                ${getDebtAlertInfo(debt).html ? `<div style="margin-top: 0.35rem;">${getDebtAlertInfo(debt).html}</div>` : ''}
            </div>
        </div>

        <div style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="detail-row">
                    <label>Saldo Restante</label>
                    <span style="color: var(--status-${debt.status}); font-weight: 800; font-size: 2rem; line-height: 1;">
                        ${formatCurrency(remaining)}
                    </span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Total: ${formatCurrency(debt.amount)}</span>
                </div>
            </div>
            
            <!-- Progress Bar -->
            <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; margin-top: 1rem; overflow: hidden;">
                <div style="width: ${progressPercent}%; height: 100%; background: var(--status-paid); transition: width 0.4s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">
                <span>Abonado: ${formatCurrency(debt.paidAmount)}</span>
                <span>${progressPercent}% Pagado</span>
            </div>
        </div>

        ${partialPayUI}
    `;

    const abonoInput = document.getElementById('abono-input');
    if (abonoInput) {
        abonoInput.addEventListener('input', () => {
            abonoInput.value = formatAmountTyping(abonoInput.value);
        });
    }
    
    UI.modalOverlay.classList.add('active');
};

window.closePreviewModal = function() {
    UI.modalOverlay.classList.remove('active');
};

window.submitPartialPay = async function(id) {
    const input = document.getElementById('abono-input');
    const abono = parseAmount(input.value);
    
    if(isNaN(abono) || abono <= 0) return alert('Ingresa un valor mayor a cero.');

    const index = debts.findIndex(d => d.id === id);
    if(index === -1) return;
    const debt = debts[index];
    const remaining = debt.amount - debt.paidAmount;

    if(abono > remaining) return alert('El abono no puede superar el saldo restante.');

    try {
        const updated = await apiRequest(`/api/debts/${id}/pay`, {
            method: 'POST',
            body: JSON.stringify({ amount: abono })
        });
        debts[index] = updated;
        updateUI();
        openPreviewModal(id);
    } catch (err) {
        alert('Error al registrar abono en la base de datos: ' + err.message);
    }
};

// --- ACCIONES DE DEUDA ---
window.toggleDebtStatus = async function(id) {
    const index = debts.findIndex(d => d.id === id);
    if (index !== -1) {
        try {
            const updated = await apiRequest(`/api/debts/${id}/toggle`, {
                method: 'POST'
            });
            debts[index] = updated;
            updateUI();
        } catch (err) {
            alert('Error al actualizar estado en la base de datos: ' + err.message);
        }
    }
};

window.deleteDebt = async function(id) {
    const index = debts.findIndex(d => d.id === id);
    if (index === -1) return;

    const snapshot = { ...debts[index] };

    try {
        await apiRequest(`/api/debts/${id}`, {
            method: 'DELETE'
        });
        debts = debts.filter(d => d.id !== id);
        updateUI();
        if(editingDebtId === id) {
             document.getElementById('debt-form').reset();
             editingDebtId = null;
             const btn = document.querySelector('#debt-form button[type="submit"]');
             btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Agregar Deuda`;
             btn.style.background = '';
        }

        showUndoToast(`"${snapshot.description}" se eliminó`, async () => {
            try {
                const restored = await apiRequest('/api/debts', {
                    method: 'POST',
                    body: JSON.stringify(snapshot)
                });
                debts.unshift(restored);
                updateUI();
            } catch (err) {
                alert('No se pudo deshacer la eliminación: ' + err.message);
            }
        });
    } catch (err) {
        alert('Error al eliminar de la base de datos: ' + err.message);
    }
};

window.editDebt = function(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    
    editingDebtId = id;
    
    document.getElementById('description').value = debt.description;
    if (UI.amountInput) UI.amountInput.value = formatAmountTyping(String(debt.amount));
    document.getElementById('payment-date').value = debt.dueDate || '';
    document.getElementById('debt-type').value = debt.type;
    document.getElementById('debt-category').value = debt.category;
    
    const btn = document.querySelector('#debt-form button[type="submit"]');
    btn.innerHTML = `${icons.edit} Guardar Cambios`;
    btn.style.background = 'linear-gradient(135deg, #F59E0B, #EF4444)';

    // Asegurar que el formulario esté visible en móvil al editar
    setAddDebtExpanded(true);

    // Scroll arriba suave en móvil para enfocar el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


// --- NOTIFICACIONES DE ACCIÓN (DESHACER) ---
function showUndoToast(message, onUndo, duration = 8000) {
    const container = UI.toastContainer || document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message;

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo';
    undoBtn.textContent = 'Deshacer';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '✕';

    toast.appendChild(text);
    toast.appendChild(undoBtn);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    let done = false;
    let timer = null;

    const removeToast = () => {
        if (timer) clearTimeout(timer);
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 220);
    };

    const finish = async (undo) => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        removeToast();
        if (undo) await onUndo();
    };

    undoBtn.addEventListener('click', () => finish(true));
    closeBtn.addEventListener('click', () => finish(false));
    timer = setTimeout(() => finish(false), duration);
}

// --- FORMATO DE PESOS EN INPUTS ---
function formatAmountTyping(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-CO');
}

function parseAmount(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? Number(digits) : NaN;
}

// --- RENDERIZADO (UI) ---
function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha límite';
    const parts = dateStr.split('-');
    if(parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Analizar vencimientos de deuda
function getDebtAlertInfo(debt) {
    if (debt.status !== 'pendiente' || !debt.dueDate) return { isOverdue: false, isUrgent: false, diffDays: null, html: '' };
    
    // Obtener hoy en zona local a medianoche para cálculo justo
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const [y, m, d] = debt.dueDate.split('-');
    const due = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
    due.setHours(0,0,0,0);
    
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        const days = Math.abs(diffDays);
        return { 
            isOverdue: true, 
            isUrgent: false,
            diffDays,
            html: `<div style="background: rgba(239, 68, 68, 0.15); color: #DC2626; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">🚨 VENCIDA (${days} ${days === 1 ? 'día' : 'días'})</div>`
        };
    } else if (diffDays === 0) {
        return {
            isOverdue: false,
            isUrgent: true,
            diffDays,
            html: `<div style="background: rgba(245, 158, 11, 0.15); color: #D97706; border: 1px solid rgba(245, 158, 11, 0.4); padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">⏰ VENCE HOY</div>`
        };
    } else if (diffDays <= 3) {
        return { 
            isOverdue: false, 
            isUrgent: true,
            diffDays,
            html: `<div style="background: rgba(245, 158, 11, 0.15); color: #D97706; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">⏳ Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}</div>`
        };
    }
    
    return { isOverdue: false, isUrgent: false, diffDays, html: '' };
}

function sortDebts(list) {
    const copy = list.slice();
    const remaining = (d) => d.amount - d.paidAmount;

    switch (currentSort) {
        case 'due-asc':
            return copy.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            });
        case 'due-desc':
            return copy.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return b.dueDate.localeCompare(a.dueDate);
            });
        case 'balance-desc':
            return copy.sort((a, b) => remaining(b) - remaining(a));
        case 'balance-asc':
            return copy.sort((a, b) => remaining(a) - remaining(b));
        case 'recent':
        default:
            return copy;
    }
}

function getDebtMonth(debt) {
    if (debt.dueDate && debt.dueDate.length >= 7) {
        return debt.dueDate.substring(0, 7);
    }
    if (debt.createdAt && debt.createdAt.length >= 7) {
        return debt.createdAt.substring(0, 7);
    }
    return getCurrentBogotaMonth();
}

function updateMonthFilterOptions() {
    if (!UI.monthFilterSelect) return;
    const currentMonth = getCurrentBogotaMonth();
    const monthsSet = new Set();
    monthsSet.add(currentMonth);

    debts.forEach(d => {
        const m = getDebtMonth(d);
        if (m) monthsSet.add(m);
    });

    const sortedMonths = Array.from(monthsSet).sort().reverse();
    const currentSelected = selectedMonthFilter;

    let optionsHTML = '';
    optionsHTML += `<option value="current">Este Mes (${currentMonth})</option>`;
    optionsHTML += `<option value="all">Todo el Historial</option>`;

    sortedMonths.forEach(m => {
        if (m !== currentMonth) {
            // Formatear etiqueta amigable, ej. "2026-10" -> "Octubre 2026"
            try {
                const [y, mon] = m.split('-');
                const dObj = new Date(parseInt(y), parseInt(mon) - 1, 1);
                const str = monthFormatterCO.format(dObj);
                const cap = str.charAt(0).toUpperCase() + str.slice(1);
                optionsHTML += `<option value="${m}">${cap}</option>`;
            } catch (e) {
                optionsHTML += `<option value="${m}">${m}</option>`;
            }
        }
    });

    UI.monthFilterSelect.innerHTML = optionsHTML;
    UI.monthFilterSelect.value = currentSelected;
    // Si la opción seleccionada ya no existe, volver a 'current'
    if (!UI.monthFilterSelect.value) {
        UI.monthFilterSelect.value = 'current';
        selectedMonthFilter = 'current';
    }
}

function updateUI() {
    updateMonthFilterOptions();

    let filteredHTML = '';
    let totalPending = 0;
    let totalPaid = 0;
    let totalOverall = 0;
    let visibleCount = 0;
    let overdueCount = 0;
    let urgentCount = 0;

    const currentMonthStr = getCurrentBogotaMonth();

    // Determinar qué deudas pertenecen al periodo seleccionado en el selector de mes
    const periodDebts = debts.filter(debt => {
        if (selectedMonthFilter === 'all') return true;
        if (selectedMonthFilter === 'current') {
            return getDebtMonth(debt) === currentMonthStr;
        }
        return getDebtMonth(debt) === selectedMonthFilter;
    });

    // Primer pase: conteos de alertas (especialmente relevantes para el periodo)
    periodDebts.forEach(debt => {
        const remaining = Math.max(0, debt.amount - debt.paidAmount);
        totalOverall += debt.amount;
        totalPaid += (debt.status === 'pagada' ? debt.amount : (debt.paidAmount || 0));

        if (debt.status === 'pendiente') {
            totalPending += remaining;
            const alertInfo = getDebtAlertInfo(debt);
            if (alertInfo.isOverdue) overdueCount++;
            if (alertInfo.isUrgent) urgentCount++;
        }
    });

    // Actualizar texto de periodo y submétricas
    if (UI.summaryPeriodLabel) {
        if (selectedMonthFilter === 'all') {
            UI.summaryPeriodLabel.textContent = 'Total Histórico Pendiente';
        } else if (selectedMonthFilter === 'current') {
            UI.summaryPeriodLabel.textContent = 'Pendiente Este Mes';
        } else {
            UI.summaryPeriodLabel.textContent = `Pendiente ${selectedMonthFilter}`;
        }
    }

    if (UI.metricPaidAmount) {
        UI.metricPaidAmount.textContent = `Pagado: ${formatCurrency(totalPaid)}`;
    }
    if (UI.metricTotalAmount) {
        UI.metricTotalAmount.textContent = `Total: ${formatCurrency(totalOverall)}`;
    }

    // Actualizar pills de alerta en la cabecera
    if (UI.badgeOverdue) {
        if (overdueCount > 0) {
            UI.badgeOverdue.style.display = 'inline-flex';
            UI.countOverdue.textContent = `${overdueCount} ${overdueCount === 1 ? 'Vencida' : 'Vencidas'}`;
        } else {
            UI.badgeOverdue.style.display = 'none';
        }
    }

    if (UI.badgeUrgent) {
        if (urgentCount > 0) {
            UI.badgeUrgent.style.display = 'inline-flex';
            UI.countUrgent.textContent = `${urgentCount} Por vencer (≤3d)`;
        } else {
            UI.badgeUrgent.style.display = 'none';
        }
    }

    // Segundo pase: renderizado de cards filtradas y ordenadas
    sortDebts(periodDebts).forEach(debt => {
        const remaining = debt.amount - debt.paidAmount;
        const alertInfo = getDebtAlertInfo(debt);

        let isVisible = false;
        if (currentFilter === 'all') {
            isVisible = true;
        } else if (currentFilter === 'pending') {
            isVisible = debt.status === 'pendiente';
        } else if (currentFilter === 'paid') {
            isVisible = debt.status === 'pagada';
        } else if (currentFilter === 'overdue') {
            isVisible = alertInfo.isOverdue;
        } else if (currentFilter === 'urgent') {
            isVisible = alertInfo.isUrgent;
        } else if (currentFilter === 'recurrentes') {
            isVisible = debt.type === 'mensual' || debt.type === 'quincenal' || debt.type === 'anual';
        }

        if (searchQuery) {
            const haystack = `${debt.description || ''} ${debt.category || ''}`.toLowerCase();
            if (!haystack.includes(searchQuery)) isVisible = false;
        }

        if (isVisible) {
            visibleCount++;
            const isPagada = debt.status === 'pagada';
            
            const toggleIcon = isPagada ? icons.undo : icons.check;
            const toggleTitle = isPagada ? 'Revertir a Pendiente' : 'Marcar Pago Total';
            
            let cardAlertClass = '';
            if (alertInfo.isOverdue) cardAlertClass = 'card-overdue';
            else if (alertInfo.isUrgent) cardAlertClass = 'card-urgent';

            // Mostrar abono previo si es parcial
            let partialHtml = '';
            if (!isPagada && debt.paidAmount > 0) {
                const percent = Math.round((debt.paidAmount / debt.amount) * 100);
                partialHtml = `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; font-weight: 600;">Abonado: ${formatCurrency(debt.paidAmount)} (${percent}%)</div>`;
            }

            filteredHTML += `
            <article class="debt-card status-${debt.status} ${cardAlertClass}" onclick="openPreviewModal('${debt.id}')" style="cursor: pointer;">
                <div class="debt-header">
                    <div class="debt-info">
                        <div style="display:flex; align-items:center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
                            <span style="font-size: 1.15rem;">${debt.category.split(' ')[0]}</span>
                            ${alertInfo.html}
                        </div>
                        <h3 class="debt-title">${debt.description}</h3>
                        <span class="debt-date" style="margin-top: 0.25rem">${icons.calendar} ${formatDate(debt.dueDate)}</span>
                    </div>
                    <div class="debt-badges">
                        <span class="badge badge-status-${debt.status}">${debt.status}</span>
                        <span class="badge badge-tipo-${debt.type}">${debt.type}</span>
                    </div>
                </div>
                <div class="debt-body" style="margin-top: 1rem;">
                    <div>
                        <div class="debt-amount">${formatCurrency(isPagada ? debt.amount : remaining)}</div>
                        ${partialHtml}
                    </div>
                    <div class="debt-actions">
                        <button class="btn-action btn-toggle" title="${toggleTitle}" onclick="event.stopPropagation(); toggleDebtStatus('${debt.id}')">
                            ${toggleIcon}
                        </button>
                        <button class="btn-action btn-edit" title="Editar" onclick="event.stopPropagation(); editDebt('${debt.id}')">
                            ${icons.edit}
                        </button>
                        <button class="btn-action btn-delete" title="Eliminar" onclick="event.stopPropagation(); deleteDebt('${debt.id}')">
                            ${icons.trash}
                        </button>
                    </div>
                </div>
            </article>`;
        }
    });

    UI.totalAmountEl.textContent = formatCurrency(totalPending);

    if (visibleCount === 0) {
        UI.listContainer.innerHTML = '';
        UI.emptyState.style.display = 'flex';
    } else {
        UI.emptyState.style.display = 'none';
        UI.listContainer.innerHTML = filteredHTML;
    }
}

// --- GESTIÓN DE VISIBILIDAD DE CONTRASEÑAS (SHOW / HIDE PASSWORD) ---
document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.btn-toggle-password');
    if (!toggleBtn) return;

    const targetId = toggleBtn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    // Cambiar icono entre ojo abierto y ojo tachado
    if (isPassword) {
        toggleBtn.setAttribute('title', 'Ocultar contraseña');
        toggleBtn.setAttribute('aria-label', 'Ocultar contraseña');
        toggleBtn.innerHTML = `
            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
    } else {
        toggleBtn.setAttribute('title', 'Mostrar contraseña');
        toggleBtn.setAttribute('aria-label', 'Mostrar contraseña');
        toggleBtn.innerHTML = `
            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
});
