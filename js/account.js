// ============================================
// CUENTA DE USUARIO - VERSIÓN MEJORADA CON DATOS REALES
// ============================================

class AccountManager {
    constructor() {
        this.user = null;
        this.currentSection = 'dashboard';
        this.provinces = [];
        this.addresses = [];
        this.orders = [];
        this.wishlist = [];
        this.init();
    }

    async init() {
        console.log('👤 Inicializando gestión de cuenta...');
        
        try {
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Cargar datos del usuario
            await this.loadUserData();
            
            // Cargar provincias de RD
            await this.loadProvinces();
            
            // Configurar navegación
            this.setupNavigation();
            
            // Cargar sección inicial
            this.loadSection(this.currentSection);
            
            console.log('✅ Gestión de cuenta inicializada');
        } catch (error) {
            console.error('❌ Error inicializando cuenta:', error);
            this.showNotification('Error al cargar la cuenta. Intenta nuevamente.', 'error');
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (!data.authenticated) {
                window.location.href = '/login';
                return false;
            }
            
            this.user = data.user;
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando autenticación:', error);
            window.location.href = '/login';
            return false;
        }
    }

    async loadUserData() {
        try {
            console.log(`📡 Llamando API: /api/users/${this.user.id}`);
            const response = await fetch(`/api/users/${this.user.id}`);
            
            console.log('📡 Respuesta API:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            if (!response.ok) {
                console.warn('⚠️ API de usuario no disponible, usando datos de sesión');
                // Usar datos de sesión si el endpoint falla
                return this.user;
            }
            
            const userData = await response.json();
            this.user = { ...this.user, ...userData };
            
            // Actualizar UI con datos del usuario
            this.updateUserUI();
            
            // Actualizar estadísticas en el header
            this.updateHeaderStats();
            
            console.log('✅ Datos de usuario cargados:', this.user.email);
            return this.user;
            
        } catch (error) {
            console.error('❌ Error cargando datos del usuario:', error);
            // No mostrar notificación si es solo un problema de API
            // Mantener los datos básicos de sesión
            return this.user;
        }
    }

    async loadProvinces() {
        try {
            const response = await fetch('/api/dominican-republic/provinces');
            if (response.ok) {
                this.provinces = await response.json();
            } else {
                // Provincias por defecto si la API falla
                this.provinces = [
                    'Distrito Nacional', 'Santo Domingo', 'Santiago', 'Puerto Plata',
                    'La Vega', 'San Cristóbal', 'La Romana', 'San Pedro de Macorís'
                ];
            }
        } catch (error) {
            console.error('Error cargando provincias:', error);
            this.provinces = ['Distrito Nacional', 'Santo Domingo', 'Santiago'];
        }
    }

    updateUserUI() {
        // Actualizar nombre en sidebar
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = `${this.user.nombre} ${this.user.apellido}`;
        });
        
        // Actualizar email
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(element => {
            element.textContent = this.user.email;
        });
        
        // Actualizar avatar
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            const initials = `${this.user.nombre?.charAt(0) || ''}${this.user.apellido?.charAt(0) || ''}`.toUpperCase();
            userAvatar.textContent = initials || 'U';
        }
    }

    updateHeaderStats() {
        const statsContainer = document.getElementById('account-header-stats');
        if (statsContainer) {
            this.loadStats().then(stats => {
                const statsElements = statsContainer.querySelectorAll('.header-stat');
                
                if (statsElements.length >= 4) {
                    // Actualizar pedidos
                    statsElements[0].querySelector('.number').textContent = stats.totalOrders || 0;
                    
                    // Actualizar favoritos
                    statsElements[1].querySelector('.number').textContent = stats.wishlistItems || 0;
                    
                    // Actualizar puntos (ejemplo)
                    statsElements[2].querySelector('.number').textContent = Math.floor(stats.totalSpent / 100) || 0;
                    
                    // Actualizar pendientes
                    statsElements[3].querySelector('.number').textContent = stats.pendingOrders || 0;
                }
            });
        }
    }

    async loadStats() {
        try {
            console.log(`📊 Llamando API de estadísticas: /api/users/${this.user.id}/stats`);
            const response = await fetch(`/api/users/${this.user.id}/stats`);
            
            if (!response.ok) {
                console.warn('⚠️ API de estadísticas no disponible');
                return this.getSampleStats();
            }
            
            const stats = await response.json();
            console.log('📊 Estadísticas cargadas:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            return this.getSampleStats();
        }
    }

    getSampleStats() {
        return {
            totalOrders: 0,
            wishlistItems: 0,
            reviews: 0,
            pendingOrders: 0,
            totalSpent: 0
        };
    }

    setupNavigation() {
        // Navegación del sidebar
        document.querySelectorAll('.account-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const section = link.getAttribute('href').substring(1);
                this.currentSection = section;
                
                // Actualizar clase active
                document.querySelectorAll('.account-nav a').forEach(a => {
                    a.classList.remove('active');
                });
                link.classList.add('active');
                
                // Cargar sección
                this.loadSection(section);
            });
        });
        
        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async loadSection(section) {
        const contentContainer = document.querySelector('.account-content');
        if (!contentContainer) return;
        
        // Mostrar loading
        contentContainer.innerHTML = `
            <div class="loading" style="text-align: center; padding: 100px;">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Cargando ${section}...</p>
            </div>
        `;
        
        try {
            let html = '';
            
            switch (section) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                case 'orders':
                    html = await this.loadOrders();
                    break;
                case 'profile':
                    html = this.loadProfileForm();
                    break;
                case 'addresses':
                    html = await this.loadAddresses();
                    break;
                case 'wishlist':
                    html = await this.loadWishlist();
                    break;
                case 'settings':
                    html = this.loadSettingsForm();
                    break;
                default:
                    html = await this.loadDashboard();
            }
            
            contentContainer.innerHTML = html;
            this.setupSectionEventListeners(section);
            
        } catch (error) {
            console.error(`❌ Error cargando sección ${section}:`, error);
            contentContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando la sección</h3>
                    <p>Intenta nuevamente o contacta con soporte si el problema persiste.</p>
                    <button onclick="location.reload()" class="btn" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Recargar Página
                    </button>
                </div>
            `;
        }
    }

    async loadDashboard() {
        try {
            // Cargar estadísticas y órdenes recientes
            const [orders, stats] = await Promise.all([
                this.getRecentOrders(5),
                this.loadStats()
            ]);
            
            return `
                <div class="dashboard-content">
                    <div class="dashboard-header">
                        <h1>¡Bienvenido, ${this.user.nombre}!</h1>
                        <p>Tu actividad reciente en Mabel Activewear</p>
                    </div>
                    
                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <i class="fas fa-shopping-bag"></i>
                            <h3>${stats.totalOrders || 0}</h3>
                            <p>Órdenes Totales</p>
                        </div>
                        
                        <div class="stat-card">
                            <i class="fas fa-heart"></i>
                            <h3>${stats.wishlistItems || 0}</h3>
                            <p>En Wishlist</p>
                        </div>
                        
                        <div class="stat-card">
                            <i class="fas fa-star"></i>
                            <h3>${stats.reviews || 0}</h3>
                            <p>Reseñas</p>
                        </div>
                        
                        <div class="stat-card">
                            <i class="fas fa-clock"></i>
                            <h3>${stats.pendingOrders || 0}</h3>
                            <p>Pendientes</p>
                        </div>
                    </div>
                    
                    <div class="recent-orders">
                        <div class="section-header">
                            <h2>Órdenes Recientes</h2>
                            <a href="#orders" class="view-all">Ver todas</a>
                        </div>
                        ${orders.length > 0 ? this.generateOrdersTable(orders, true) : `
                            <div class="empty-state">
                                <i class="fas fa-shopping-bag fa-3x"></i>
                                <h3>No hay órdenes recientes</h3>
                                <p>Realiza tu primera compra para ver tus órdenes aquí</p>
                                <a href="/shop" class="btn">Ir a la Tienda</a>
                            </div>
                        `}
                    </div>
                    
                    <div class="quick-actions">
                        <h2>Acciones Rápidas</h2>
                        <div class="quick-actions-grid">
                            <a href="/shop" class="quick-action-card">
                                <i class="fas fa-store"></i>
                                <span>Continuar Comprando</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                            <a href="#wishlist" class="quick-action-card">
                                <i class="fas fa-heart"></i>
                                <span>Ver Wishlist</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                            <a href="#addresses" class="quick-action-card">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Gestionar Direcciones</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                            <a href="/ofertas" class="quick-action-card">
                                <i class="fas fa-tag"></i>
                                <span>Ver Ofertas</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            return `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando el dashboard</h3>
                    <p>Por favor, intenta nuevamente.</p>
                </div>
            `;
        }
    }

    async getRecentOrders(limit = 5) {
        try {
            console.log(`📦 Llamando API de órdenes recientes: /api/users/${this.user.id}/orders?limit=${limit}`);
            const response = await fetch(`/api/users/${this.user.id}/orders?limit=${limit}`);
            
            if (!response.ok) {
                console.warn('⚠️ API de órdenes no disponible');
                return [];
            }
            
            const orders = await response.json();
            console.log(`✅ ${orders.length} órdenes recientes cargadas`);
            return orders;
            
        } catch (error) {
            console.error('❌ Error cargando órdenes:', error);
            return [];
        }
    }

    generateOrdersTable(orders, isRecent = false) {
        return `
            <div class="table-container">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Orden #</th>
                            <th>Fecha</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>
                                    <span class="order-number">#${order.id}</span>
                                    ${order.items_count ? `<span class="items-count">${order.items_count} item${order.items_count > 1 ? 's' : ''}</span>` : ''}
                                </td>
                                <td>${new Date(order.fecha_orden).toLocaleDateString('es-DO')}</td>
                                <td><strong>RD$ ${parseFloat(order.total).toFixed(2)}</strong></td>
                                <td>
                                    <span class="order-status status-${order.estado}">
                                        <i class="fas ${this.getStatusIcon(order.estado)}"></i>
                                        ${this.formatOrderStatus(order.estado)}
                                    </span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn-view-order" data-order="${order.id}" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                            ${!isRecent ? '<span>Ver</span>' : ''}
                                        </button>
                                        ${order.estado === 'shipped' || order.estado === 'enviado' || order.estado === 'entregado' ? `
                                            <button class="btn-track-order" data-order="${order.id}" title="Rastrear envío">
                                                <i class="fas fa-shipping-fast"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getStatusIcon(status) {
        const icons = {
            'pendiente': 'fa-clock',
            'procesando': 'fa-cogs',
            'enviado': 'fa-shipping-fast',
            'entregado': 'fa-check-circle',
            'cancelado': 'fa-times-circle',
            'pending': 'fa-clock',
            'processing': 'fa-cogs',
            'shipped': 'fa-shipping-fast',
            'delivered': 'fa-check-circle',
            'cancelled': 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    formatOrderStatus(status) {
        const statusMap = {
            'pendiente': 'Pendiente',
            'procesando': 'Procesando',
            'enviado': 'Enviado',
            'entregado': 'Entregado',
            'cancelado': 'Cancelado',
            'pending': 'Pendiente',
            'processing': 'Procesando',
            'shipped': 'Enviado',
            'delivered': 'Entregado',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    async loadOrders() {
        try {
            const orders = await this.getAllOrders();
            
            return `
                <div class="orders-content">
                    <div class="section-header">
                        <h1>Mis Órdenes</h1>
                        <p>Historial de todas tus compras</p>
                    </div>
                    
                    ${orders.length > 0 ? this.generateOrdersTable(orders) : `
                        <div class="empty-state">
                            <i class="fas fa-shopping-bag fa-3x"></i>
                            <h3>No has realizado ninguna compra</h3>
                            <p>Explora nuestra tienda para encontrar productos increíbles</p>
                            <a href="/shop" class="btn">Ver Tienda</a>
                        </div>
                    `}
                    
                    ${orders.length > 0 ? `
                        <div class="orders-summary">
                            <div class="summary-card">
                                <i class="fas fa-receipt"></i>
                                <div>
                                    <h3>${orders.length}</h3>
                                    <p>Pedidos Totales</p>
                                </div>
                            </div>
                            <div class="summary-card">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <h3>RD$ ${orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0).toFixed(2)}</h3>
                                    <p>Total Gastado</p>
                                </div>
                            </div>
                            <div class="summary-card">
                                <i class="fas fa-box-open"></i>
                                <div>
                                    <h3>${orders.filter(o => o.estado === 'entregado' || o.estado === 'delivered').length}</h3>
                                    <p>Entregados</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('Error cargando órdenes:', error);
            return `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando las órdenes</h3>
                    <p>Por favor, intenta nuevamente más tarde.</p>
                </div>
            `;
        }
    }

    async getAllOrders() {
        try {
            console.log(`📦 Llamando API de todas las órdenes: /api/users/${this.user.id}/orders`);
            const response = await fetch(`/api/users/${this.user.id}/orders`);
            
            if (!response.ok) {
                console.warn('⚠️ API de órdenes no disponible');
                return [];
            }
            
            const orders = await response.json();
            console.log(`✅ ${orders.length} órdenes cargadas`);
            return orders;
            
        } catch (error) {
            console.error('❌ Error cargando todas las órdenes:', error);
            return [];
        }
    }

    loadProfileForm() {
        return `
            <div class="profile-content">
                <div class="section-header">
                    <h1>Mi Perfil</h1>
                    <p>Actualiza tu información personal</p>
                </div>
                
                <form id="profile-form" class="account-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nombre">Nombre *</label>
                            <input type="text" id="nombre" value="${this.user.nombre || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="apellido">Apellido *</label>
                            <input type="text" id="apellido" value="${this.user.apellido || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" value="${this.user.email || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="telefono">Teléfono</label>
                        <div class="input-with-prefix">
                            <span class="prefix">+1 (809)</span>
                            <input type="tel" id="telefono" value="${this.user.telefono || ''}" 
                                   placeholder="555-1234" pattern="[0-9]{3}-[0-9]{4}">
                        </div>
                        <small class="hint">Formato: 555-1234 (solo para República Dominicana)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="direccion">Dirección</label>
                        <textarea id="direccion" rows="3" placeholder="Tu dirección completa">${this.user.direccion || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-save">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                        <button type="button" class="btn-cancel" id="cancel-profile">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
                
                <div class="password-section">
                    <h2><i class="fas fa-key"></i> Cambiar Contraseña</h2>
                    <form id="password-form" class="account-form">
                        <div class="form-group">
                            <label for="current_password">Contraseña Actual</label>
                            <input type="password" id="current_password" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="new_password">Nueva Contraseña</label>
                                <input type="password" id="new_password" required minlength="6">
                                <small class="hint">Mínimo 6 caracteres</small>
                            </div>
                            <div class="form-group">
                                <label for="confirm_password">Confirmar Contraseña</label>
                                <input type="password" id="confirm_password" required minlength="6">
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-save">
                                <i class="fas fa-key"></i> Cambiar Contraseña
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async loadAddresses() {
        try {
            this.addresses = await this.getUserAddresses();
            
            return `
                <div class="addresses-content">
                    <div class="section-header">
                        <h1>Mis Direcciones</h1>
                        <p>Gestiona tus direcciones de envío en República Dominicana</p>
                    </div>
                    
                    <div class="addresses-grid">
                        ${this.addresses.map((address, index) => `
                            <div class="address-card ${address.predeterminada ? 'default-address' : ''}">
                                <div class="address-header">
                                    <h3><i class="fas fa-map-marker-alt"></i> ${address.nombre || 'Dirección ' + (index + 1)}</h3>
                                    ${address.predeterminada ? 
                                        '<span class="default-badge"><i class="fas fa-star"></i> Predeterminada</span>' : 
                                        ''
                                    }
                                </div>
                                <div class="address-details">
                                    <p><strong><i class="fas fa-user"></i> ${address.nombre_completo || 'No especificado'}</strong></p>
                                    <p><i class="fas fa-phone"></i> ${address.telefono || 'No especificado'}</p>
                                    ${address.paqueteria_preferida ? 
                                        `<p><i class="fas fa-shipping-fast"></i> <strong>Paquetería:</strong> ${address.paqueteria_preferida}</p>` : 
                                        ''
                                    }
                                    <p><i class="fas fa-map-marker-alt"></i> <strong>Ubicación:</strong> 
                                        ${[address.sector, address.municipio, address.provincia].filter(Boolean).join(', ')}
                                    </p>
                                    ${address.referencia ? 
                                        `<p><i class="fas fa-info-circle"></i> <strong>Referencia:</strong> ${address.referencia}</p>` : 
                                        ''
                                    }
                                    ${address.apartamento ? `<p><i class="fas fa-building"></i> Apartamento: ${address.apartamento}</p>` : ''}
                                    ${address.calle ? `<p><i class="fas fa-road"></i> Calle: ${address.calle} ${address.numero || ''}</p>` : ''}
                                    ${address.codigo_postal ? `<p><i class="fas fa-mail-bulk"></i> Código Postal: ${address.codigo_postal}</p>` : ''}
                                </div>
                                <div class="address-actions">
                                    <button class="edit-address" data-id="${address.id}">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    ${!address.predeterminada ? 
                                        `<button class="set-default" data-id="${address.id}">
                                            <i class="fas fa-star"></i> Predeterminar
                                        </button>` : 
                                        ''
                                    }
                                    ${this.addresses.length > 1 ? 
                                        `<button class="delete-address" data-id="${address.id}">
                                            <i class="fas fa-trash"></i> Eliminar
                                        </button>` : 
                                        ''
                                    }
                                </div>
                            </div>
                        `).join('')}
                        
                        <div class="add-address-card" id="add-address-btn">
                            <div class="add-address-icon">
                                <i class="fas fa-plus-circle fa-3x"></i>
                            </div>
                            <h3>Agregar Nueva Dirección</h3>
                            <p>Agrega una dirección de envío en República Dominicana</p>
                        </div>
                    </div>
                    
                    <div class="address-info-note">
                        <i class="fas fa-info-circle"></i>
                        <div>
                            <p><strong>Información importante:</strong></p>
                            <p>• Solo realizamos envíos dentro de República Dominicana</p>
                            <p>• Puedes seleccionar tu paquetería preferida</p>
                            <p>• Los costos de envío varían según la provincia y paquetería seleccionada</p>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error cargando direcciones:', error);
            return `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando direcciones</h3>
                    <p>Por favor, intenta nuevamente.</p>
                </div>
            `;
        }
    }
    
    async getUserAddresses() {
        try {
            console.log(`🏠 Llamando API de direcciones: /api/users/${this.user.id}/addresses`);
            const response = await fetch(`/api/users/${this.user.id}/addresses`);
            
            if (!response.ok) {
                console.warn('⚠️ API de direcciones no disponible');
                return [];
            }
            
            const addresses = await response.json();
            console.log(`✅ ${addresses.length} direcciones cargadas`);
            return addresses;
            
        } catch (error) {
            console.error('❌ Error cargando direcciones:', error);
            return [];
        }
    }

    async loadWishlist() {
        try {
            this.wishlist = await this.getWishlist();
            
            return `
                <div class="wishlist-content">
                    <div class="section-header">
                        <h1>Mi Wishlist</h1>
                        <p>Productos que te gustan</p>
                    </div>
                    
                    ${this.wishlist.length > 0 ? `
                        <div class="wishlist-grid">
                            ${this.wishlist.map(item => `
                                <div class="wishlist-item" data-product-id="${item.producto_id}">
                                    <button class="remove-wishlist" data-id="${item.producto_id}" title="Eliminar de wishlist">
                                        <i class="fas fa-times"></i>
                                    </button>
                                    <div class="wishlist-img">
                                        <img src="${item.imagen || '/public/images/default-product.jpg'}" 
                                             alt="${item.nombre}" 
                                             onerror="this.src='/public/images/default-product.jpg'">
                                        ${item.tiene_descuento ? `
                                            <span class="discount-badge">
                                                ${item.descuento_porcentaje ? `-${item.descuento_porcentaje}%` : 'Oferta'}
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="wishlist-info">
                                        <h3>${item.nombre}</h3>
                                        <p class="category">${item.categoria || 'Sin categoría'}</p>
                                        <div class="price-container">
                                            ${item.tiene_descuento ? `
                                                <span class="original-price">${item.precio_original_formateado || `RD$ ${parseFloat(item.precio).toFixed(2)}`}</span>
                                                <span class="current-price">${item.precio_formateado || `RD$ ${parseFloat(item.precio_final || item.precio).toFixed(2)}`}</span>
                                            ` : `
                                                <span class="current-price">${item.precio_formateado || `RD$ ${parseFloat(item.precio).toFixed(2)}`}</span>
                                            `}
                                        </div>
                                        ${item.stock > 0 ? 
                                            `<div class="stock-status in-stock">Disponible</div>` : 
                                            `<div class="stock-status out-of-stock">Agotado</div>`
                                        }
                                        ${item.tallas && item.tallas.length > 0 ? `
                                            <div class="sizes">
                                                <strong>Tallas:</strong> ${Array.isArray(item.tallas) ? item.tallas.join(', ') : item.tallas}
                                            </div>
                                        ` : ''}
                                        <div class="wishlist-actions">
                                            ${item.stock > 0 ? `
                                                <button class="add-to-cart-from-wishlist" data-id="${item.producto_id}">
                                                    <i class="fas fa-shopping-cart"></i> Agregar al Carrito
                                                </button>
                                            ` : `
                                                <button class="btn-disabled" disabled>
                                                    <i class="fas fa-times"></i> Agotado
                                                </button>
                                            `}
                                            <a href="/product-detail.html?id=${item.producto_id}" class="view-product">
                                                <i class="fas fa-eye"></i> Ver Producto
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="wishlist-footer">
                            <p>${this.wishlist.length} producto${this.wishlist.length !== 1 ? 's' : ''} en tu wishlist</p>
                            ${this.wishlist.length > 0 ? `
                                <button class="btn-clear-wishlist" id="clear-wishlist">
                                    <i class="fas fa-trash"></i> Limpiar Wishlist
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="empty-wishlist-state">
                            <div class="empty-icon">
                                <i class="fas fa-heart"></i>
                            </div>
                            <h3>Tu wishlist está vacía</h3>
                            <p>Agrega productos que te gusten haciendo clic en el corazón ♡</p>
                            <a href="/shop" class="btn">
                                <i class="fas fa-store"></i> Explorar Productos
                            </a>
                            <div class="empty-tips">
                                <p><strong>Consejos:</strong></p>
                                <ul>
                                    <li><i class="fas fa-check-circle"></i> Guarda productos para comprar más tarde</li>
                                    <li><i class="fas fa-check-circle"></i> Recibe notificaciones cuando bajen de precio</li>
                                    <li><i class="fas fa-check-circle"></i> Comparte tu wishlist con amigos</li>
                                </ul>
                            </div>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            console.error('Error cargando wishlist:', error);
            return `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error cargando la wishlist</h3>
                    <p>Por favor, intenta nuevamente.</p>
                </div>
            `;
        }
    }

    async getWishlist() {
        try {
            console.log(`💖 Llamando API de wishlist: /api/users/${this.user.id}/wishlist`);
            const response = await fetch(`/api/users/${this.user.id}/wishlist`);
            
            if (!response.ok) {
                console.warn('⚠️ API de wishlist no disponible');
                return [];
            }
            
            const wishlist = await response.json();
            console.log(`✅ ${wishlist.length} items en wishlist cargados`);
            return wishlist;
            
        } catch (error) {
            console.error('❌ Error cargando wishlist:', error);
            return [];
        }
    }

    loadSettingsForm() {
        return `
            <div class="settings-content">
                <div class="section-header">
                    <h1>Configuración</h1>
                    <p>Preferencias de tu cuenta</p>
                </div>
                
                <form id="settings-form" class="account-form">
                    <div class="form-section">
                        <h3><i class="fas fa-bell"></i> Notificaciones</h3>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="email_notifications" checked>
                                <span>Recibir notificaciones por email</span>
                                <small class="hint">Actualizaciones de pedidos, ofertas y novedades</small>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="marketing_emails" checked>
                                <span>Recibir ofertas y promociones</span>
                                <small class="hint">Descuentos exclusivos y lanzamientos de colecciones</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-globe"></i> Preferencias Regionales</h3>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="language">Idioma</label>
                                <select id="language">
                                    <option value="es" selected>Español</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="currency">Moneda</label>
                                <select id="currency">
                                    <option value="DOP" selected>DOP (RD$)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-save">
                            <i class="fas fa-save"></i> Guardar Preferencias
                        </button>
                        <button type="button" class="btn-cancel" id="cancel-settings">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
                
                <div class="danger-zone">
                    <h3><i class="fas fa-exclamation-triangle"></i> Zona de Peligro</h3>
                    <p>Estas acciones son irreversibles. Procede con cuidado.</p>
                    
                    <div class="danger-actions">
                        <button id="delete-account" class="btn-danger">
                            <i class="fas fa-trash"></i> Eliminar Mi Cuenta
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupSectionEventListeners(section) {
        switch (section) {
            case 'dashboard':
                this.setupDashboardListeners();
                break;
            case 'orders':
                this.setupOrdersListeners();
                break;
            case 'profile':
                this.setupProfileListeners();
                break;
            case 'addresses':
                this.setupAddressesListeners();
                break;
            case 'wishlist':
                this.setupWishlistListeners();
                break;
            case 'settings':
                this.setupSettingsListeners();
                break;
        }
    }

    setupDashboardListeners() {
        // Botones para ver detalles de órdenes
        document.querySelectorAll('.btn-view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.order;
                this.viewOrderDetails(orderId);
            });
        });
        
        // Botones para rastrear envíos
        document.querySelectorAll('.btn-track-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.order;
                this.trackOrder(orderId);
            });
        });
        
        // Enlaces de acciones rápidas
        document.querySelectorAll('.quick-action-card[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.currentSection = section;
                this.loadSection(section);
                
                // Actualizar navegación
                document.querySelectorAll('.account-nav a').forEach(a => {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === `#${section}`) {
                        a.classList.add('active');
                    }
                });
            });
        });
    }

    setupOrdersListeners() {
        // Botones para ver detalles de órdenes
        document.querySelectorAll('.btn-view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.order;
                this.viewOrderDetails(orderId);
            });
        });
        
        // Botones para rastrear envíos
        document.querySelectorAll('.btn-track-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.order;
                this.trackOrder(orderId);
            });
        });
    }

    async viewOrderDetails(orderId) {
        try {
            console.log(`🔍 Llamando API de detalle de orden: /api/orders/${orderId}`);
            const response = await fetch(`/api/orders/${orderId}`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const order = await response.json();
            this.showOrderModal(order);
            
        } catch (error) {
            console.error('❌ Error cargando detalles de la orden:', error);
            this.showNotification('No se pudieron cargar los detalles de la orden', 'error');
        }
    }

    async trackOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) throw new Error('Orden no encontrada');
            
            const order = await response.json();
            
            if (order.paqueteria && order.tracking_number) {
                this.trackPackage(order.tracking_number, order.paqueteria);
            } else {
                this.showNotification('Esta orden no tiene información de tracking disponible', 'info');
            }
            
        } catch (error) {
            console.error('Error rastreando orden:', error);
            this.showNotification('Error obteniendo información de tracking', 'error');
        }
    }

    showOrderModal(order) {
        // Generar timeline según el estado
        const timelineSteps = this.generateOrderTimeline(order);
        
        const modalHTML = `
            <div class="modal-overlay" id="order-modal">
                <div class="modal-content order-modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-receipt"></i> Orden #${order.id}</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="order-info-grid">
                            <div class="info-card">
                                <h3><i class="fas fa-info-circle"></i> Información del Pedido</h3>
                                <div class="info-row">
                                    <span>Fecha:</span>
                                    <span>${new Date(order.fecha_creacion || order.fecha_orden).toLocaleDateString('es-DO', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</span>
                                </div>
                                <div class="info-row">
                                    <span>Estado:</span>
                                    <span class="order-status status-${order.estado}">
                                        <i class="fas ${this.getStatusIcon(order.estado)}"></i>
                                        ${this.formatOrderStatus(order.estado)}
                                    </span>
                                </div>
                                <div class="info-row">
                                    <span>Total:</span>
                                    <span><strong>RD$ ${parseFloat(order.total || 0).toFixed(2)}</strong></span>
                                </div>
                                ${order.metodo_pago ? `
                                    <div class="info-row">
                                        <span>Método de Pago:</span>
                                        <span>${order.metodo_pago}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="info-card">
                                <h3><i class="fas fa-shipping-fast"></i> Información de Envío</h3>
                                ${order.paqueteria || order.metodo_envio ? `
                                    <div class="info-row">
                                        <span>Paquetería:</span>
                                        <span>${order.paqueteria || order.metodo_envio}</span>
                                    </div>
                                ` : ''}
                                ${order.tracking_number ? `
                                    <div class="info-row">
                                        <span>Número de Tracking:</span>
                                        <span class="tracking-number">
                                            ${order.tracking_number}
                                            <button class="copy-tracking" data-tracking="${order.tracking_number}" title="Copiar">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </span>
                                    </div>
                                ` : ''}
                                ${order.direccion_envio ? `
                                    <div class="info-row">
                                        <span>Dirección:</span>
                                        <span>${order.direccion_envio}</span>
                                    </div>
                                ` : ''}
                                ${order.ciudad_envio ? `
                                    <div class="info-row">
                                        <span>Ciudad:</span>
                                        <span>${order.ciudad_envio}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="order-timeline">
                            <h3><i class="fas fa-history"></i> Progreso del Pedido</h3>
                            ${timelineSteps}
                        </div>
                        
                        <div class="order-items-section">
                            <h3><i class="fas fa-box"></i> Productos (${order.items ? order.items.length : 0})</h3>
                            ${order.items && order.items.length > 0 ? 
                                order.items.map((item, index) => `
                                    <div class="order-item-detail">
                                        <div class="item-number">${index + 1}</div>
                                        <div class="item-image">
                                            <img src="${item.imagen || '/public/images/default-product.jpg'}" 
                                                 alt="${item.nombre}"
                                                 onerror="this.src='/public/images/default-product.jpg'">
                                        </div>
                                        <div class="item-info">
                                            <h4>${item.nombre}</h4>
                                            <div class="item-details">
                                                <span>Cantidad: ${item.cantidad}</span>
                                                ${item.talla ? `<span>Talla: ${item.talla}</span>` : ''}
                                                ${item.color ? `<span>Color: ${item.color}</span>` : ''}
                                            </div>
                                            <p class="item-price">Precio unitario: RD$ ${parseFloat(item.precio || item.precio_unitario || 0).toFixed(2)}</p>
                                        </div>
                                        <div class="item-total">
                                            <strong>RD$ ${(parseInt(item.cantidad) * parseFloat(item.precio || item.precio_unitario || 0)).toFixed(2)}</strong>
                                        </div>
                                    </div>
                                `).join('') : 
                                '<div class="empty-items"><i class="fas fa-box-open"></i><p>No hay información de productos disponible.</p></div>'
                            }
                        </div>
                        
                        <div class="order-summary">
                            <div class="summary-row">
                                <span>Subtotal:</span>
                                <span>RD$ ${parseFloat(order.subtotal || order.total * 0.85).toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Envío:</span>
                                <span>RD$ ${parseFloat(order.shipping_cost || order.total * 0.15).toFixed(2)}</span>
                            </div>
                            <div class="summary-row total">
                                <span><strong>Total:</strong></span>
                                <span><strong>RD$ ${parseFloat(order.total || 0).toFixed(2)}</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn" onclick="window.print()">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        ${order.tracking_number ? `
                            <button class="btn" id="track-package">
                                <i class="fas fa-map-marker-alt"></i> Rastrear Paquete
                            </button>
                        ` : ''}
                        <button class="btn btn-outline close-modal">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al documento
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Configurar event listeners del modal
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('order-modal').remove();
            });
        });
        
        // Botón de tracking
        const trackBtn = document.getElementById('track-package');
        if (trackBtn) {
            trackBtn.addEventListener('click', () => {
                this.trackPackage(order.tracking_number, order.paqueteria || order.metodo_envio);
            });
        }
        
        // Botón copiar tracking
        document.querySelectorAll('.copy-tracking').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackingNumber = e.currentTarget.dataset.tracking;
                navigator.clipboard.writeText(trackingNumber).then(() => {
                    this.showNotification('Número de tracking copiado al portapapeles', 'success');
                });
            });
        });
        
        // Cerrar al hacer clic fuera del modal
        document.getElementById('order-modal').addEventListener('click', (e) => {
            if (e.target.id === 'order-modal') {
                e.target.remove();
            }
        });
    }

    generateOrderTimeline(order) {
        const steps = [
            { 
                status: 'pendiente', 
                label: 'Pedido Recibido', 
                icon: 'fa-shopping-cart',
                description: 'Hemos recibido tu pedido' 
            },
            { 
                status: 'procesando', 
                label: 'Procesando', 
                icon: 'fa-cogs',
                description: 'Preparando tu pedido' 
            },
            { 
                status: 'enviado', 
                label: 'Enviado', 
                icon: 'fa-shipping-fast',
                description: 'Pedido en camino' 
            },
            { 
                status: 'entregado', 
                label: 'Entregado', 
                icon: 'fa-check-circle',
                description: 'Pedido entregado' 
            }
        ];
        
        const currentStatusIndex = steps.findIndex(step => step.status === order.estado);
        
        return `
            <div class="timeline-container">
                ${steps.map((step, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    
                    return `
                        <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                            <div class="timeline-icon">
                                <i class="fas ${step.icon}"></i>
                            </div>
                            <div class="timeline-content">
                                <h4>${step.label}</h4>
                                <p>${step.description}</p>
                                ${isCurrent && (order.estado === 'enviado' || order.estado === 'entregado') && (order.paqueteria || order.metodo_envio) ? 
                                    `<div class="shipping-info">
                                        <i class="fas fa-truck"></i>
                                        <span>Enviado vía ${order.paqueteria || order.metodo_envio}</span>
                                        ${order.tracking_number ? 
                                            `<button class="track-btn" data-tracking="${order.tracking_number}">
                                                <i class="fas fa-external-link-alt"></i> Rastrear
                                            </button>` : 
                                            ''
                                        }
                                    </div>` : 
                                    ''
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    trackPackage(trackingNumber, shippingCompany) {
        // Mapear paqueterías a sus URLs de tracking
        const trackingUrls = {
            'Mundo Cargo': `https://www.mundocargo.com.do/tracking/?tracking=${trackingNumber}`,
            'VIMENPAQ': `https://vimenpaq.com.do/rastrear.php?guia=${trackingNumber}`,
            'MBE (Mail Boxes Etc.)': `https://www.mbe.com.do/seguimiento-pedido/`,
            'Sendpack': `https://sendpack.com.do/tracking/${trackingNumber}`,
            'ViaCourier': `https://www.viacourier.com.do/rastreo.php?guia=${trackingNumber}`,
            'CPS Courier': `https://www.cpscourier.com.do/tracking/`,
            'EPS': `https://eps.com.do/track`
        };
        
        const url = trackingUrls[shippingCompany];
        if (url) {
            window.open(url, '_blank');
        } else {
            this.showNotification(`Para rastrear tu paquete, visita el sitio web de ${shippingCompany} e ingresa el código: ${trackingNumber}`, 'info');
        }
    }

    setupProfileListeners() {
        // Formulario de perfil
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.updateProfile(e));
        }
        
        // Formulario de contraseña
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.changePassword(e));
        }
        
        // Botón cancelar
        const cancelBtn = document.getElementById('cancel-profile');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.loadSection('profile');
            });
        }
    }

    async updateProfile(e) {
        e.preventDefault();
        
        const formData = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value,
            direccion: document.getElementById('direccion').value
        };
        
        // Formatear teléfono
        if (formData.telefono && !formData.telefono.startsWith('809-')) {
            formData.telefono = `809-${formData.telefono.replace(/\D/g, '').slice(0, 7)}`;
        }
        
        try {
            console.log('✏️ Actualizando perfil:', formData);
            const response = await fetch(`/api/users/${this.user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                this.user = { ...this.user, ...updatedUser };
                this.updateUserUI();
                this.showNotification('Perfil actualizado correctamente', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error actualizando perfil', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error actualizando perfil:', error);
            this.showNotification('Error actualizando perfil', 'error');
        }
    }

    async changePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        
        // Validaciones
        if (newPassword !== confirmPassword) {
            this.showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showNotification('La nueva contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        try {
            console.log('🔑 Cambiando contraseña...');
            const response = await fetch(`/api/users/${this.user.id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (response.ok) {
                this.showNotification('Contraseña cambiada correctamente', 'success');
                e.target.reset();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error cambiando contraseña', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error cambiando contraseña:', error);
            this.showNotification('Error cambiando contraseña', 'error');
        }
    }

    setupAddressesListeners() {
        // Botón agregar dirección
        const addBtn = document.getElementById('add-address-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddressForm());
        }
        
        // Botones de acciones de dirección
        setTimeout(() => {
            document.querySelectorAll('.edit-address').forEach(button => {
                button.addEventListener('click', (e) => {
                    const addressId = e.currentTarget.dataset.id;
                    this.editAddress(addressId);
                });
            });
            
            document.querySelectorAll('.set-default').forEach(button => {
                button.addEventListener('click', (e) => {
                    const addressId = e.currentTarget.dataset.id;
                    this.setDefaultAddress(addressId);
                });
            });
            
            document.querySelectorAll('.delete-address').forEach(button => {
                button.addEventListener('click', (e) => {
                    const addressId = e.currentTarget.dataset.id;
                    this.deleteAddress(addressId);
                });
            });
        }, 100);
    }

    async editAddress(addressId) {
        try {
            const address = this.addresses.find(addr => addr.id == addressId);
            if (!address) {
                this.showNotification('Dirección no encontrada', 'error');
                return;
            }
            
            this.showAddressForm(address);
            
        } catch (error) {
            console.error('Error cargando dirección:', error);
            this.showNotification('Error cargando dirección', 'error');
        }
    }

    async setDefaultAddress(addressId) {
        if (!confirm('¿Estás seguro de que deseas establecer esta dirección como predeterminada?')) {
            return;
        }
        
        try {
            console.log(`⭐ Estableciendo dirección predeterminada ID: ${addressId}`);
            const response = await fetch(`/api/users/${this.user.id}/addresses/${addressId}/default`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                this.showNotification('Dirección predeterminada actualizada', 'success');
                this.loadSection('addresses');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error actualizando dirección predeterminada', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error estableciendo dirección predeterminada:', error);
            this.showNotification('Error estableciendo dirección predeterminada', 'error');
        }
    }

    async deleteAddress(addressId) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta dirección? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            console.log(`🗑️ Eliminando dirección ID: ${addressId}`);
            const response = await fetch(`/api/users/${this.user.id}/addresses/${addressId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('Dirección eliminada correctamente', 'success');
                this.loadSection('addresses');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error eliminando dirección', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error eliminando dirección:', error);
            this.showNotification('Error eliminando dirección', 'error');
        }
    }

    showAddressForm(address = null) {
        const isEdit = !!address;
        
        // Lista de paqueterías para RD (obligatorio)
        const shippingCompanies = [
            'Mundo Cargo',
            'VIMENPAQ',
            'MBE (Mail Boxes Etc.)',
            'Sendpack',
            'ViaCourier',
            'CPS Courier',
            'EPS'
        ];
        
        const formHTML = `
            <div class="modal-overlay" id="address-modal">
                <div class="modal-content address-modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-map-marker-alt"></i> ${isEdit ? 'Editar' : 'Agregar'} Dirección</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    
                    <form id="address-form" class="modal-form">
                        <input type="hidden" id="address-id" value="${address?.id || ''}">
                        
                        <div class="form-section">
                            <h3><i class="fas fa-truck"></i> Información de Paquetería (Obligatorio)</h3>
                            
                            <div class="form-group">
                                <label for="address-paqueteria_preferida">
                                    <i class="fas fa-shipping-fast"></i> Servicio de Paquetería *
                                </label>
                                <select id="address-paqueteria_preferida" required>
                                    <option value="">Seleccionar paquetería</option>
                                    ${shippingCompanies.map(company => `
                                        <option value="${company}" 
                                                ${address?.paqueteria_preferida === company ? 'selected' : ''}>
                                            ${company}
                                        </option>
                                    `).join('')}
                                </select>
                                <small class="hint">Selecciona la paquetería donde quieres recibir tu paquete</small>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="fas fa-user"></i> Información de Contacto</h3>
                            
                            <div class="form-group">
                                <label for="address-nombre_completo">
                                    <i class="fas fa-user-circle"></i> Nombre Completo *
                                </label>
                                <input type="text" id="address-nombre_completo" 
                                       value="${address?.nombre_completo || this.user.nombre + ' ' + this.user.apellido || ''}" 
                                       placeholder="Ej: María García López"
                                       required>
                                <small class="hint">Nombre completo del destinatario</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="address-telefono">
                                    <i class="fas fa-phone"></i> Teléfono *
                                </label>
                                <div class="input-with-prefix">
                                    <span class="prefix">+1 (809)</span>
                                    <input type="tel" id="address-telefono" 
                                           value="${address?.telefono || ''}" 
                                           placeholder="555-1234"
                                           pattern="[0-9]{3}-[0-9]{4}"
                                           required>
                                </div>
                                <small class="hint">Número donde podemos contactarte</small>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="fas fa-map"></i> Ubicación de la Paquetería</h3>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="address-provincia">
                                        <i class="fas fa-globe"></i> Provincia *
                                    </label>
                                    <select id="address-provincia" required>
                                        <option value="">Seleccionar provincia</option>
                                        ${this.provinces.map(province => `
                                            <option value="${province}" 
                                                    ${address?.provincia === province ? 'selected' : ''}>
                                                ${province}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="address-municipio">
                                        <i class="fas fa-city"></i> Municipio *
                                    </label>
                                    <input type="text" id="address-municipio" 
                                           value="${address?.municipio || ''}" 
                                           placeholder="Ej: Santo Domingo Este"
                                           required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="address-sector">
                                    <i class="fas fa-map-pin"></i> Sector/Barrio *
                                </label>
                                <input type="text" id="address-sector" 
                                       value="${address?.sector || ''}" 
                                       placeholder="Ej: Naco, Los Prados, Bella Vista"
                                       required>
                            </div>
                            
                            <div class="form-group">
                                <label for="address-referencia">
                                    <i class="fas fa-info-circle"></i> Referencia de la Paquetería *
                                </label>
                                <textarea id="address-referencia" 
                                          rows="3" 
                                          placeholder="Ej: Frente al supermercado, al lado de la farmacia, paquetería Mundo Cargo de la calle principal..."
                                          required>${address?.referencia || ''}</textarea>
                                <small class="hint">Describe cómo llegar a la paquetería o algún punto de referencia importante</small>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="fas fa-home"></i> Dirección Detallada (Opcional)</h3>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="address-calle">Calle</label>
                                    <input type="text" id="address-calle" 
                                           value="${address?.calle || ''}" 
                                           placeholder="Nombre de la calle">
                                </div>
                                <div class="form-group">
                                    <label for="address-numero">Número</label>
                                    <input type="text" id="address-numero" 
                                           value="${address?.numero || ''}" 
                                           placeholder="Número de casa">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="address-apartamento">Apartamento/Oficina</label>
                                <input type="text" id="address-apartamento" 
                                       value="${address?.apartamento || ''}" 
                                       placeholder="Número de apartamento o oficina">
                            </div>
                            
                            <div class="form-group">
                                <label for="address-codigo_postal">Código Postal</label>
                                <input type="text" id="address-codigo_postal" 
                                       value="${address?.codigo_postal || ''}" 
                                       placeholder="10101">
                            </div>
                        </div>
                        
                        <div class="form-group preferences-section">
                            <label class="checkbox-label">
                                <input type="checkbox" id="address-predeterminada" 
                                       ${address?.predeterminada ? 'checked' : ''}>
                                <span><strong>Establecer como dirección predeterminada</strong></span>
                            </label>
                            <small class="hint">Esta será tu dirección principal para todos los envíos</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-save">
                                <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i>
                                ${isEdit ? 'Actualizar' : 'Agregar'} Dirección
                            </button>
                            <button type="button" class="btn-cancel close-modal">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Agregar modal al documento
        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        // Configurar event listeners
        const form = document.getElementById('address-form');
        form.addEventListener('submit', (e) => this.saveAddress(e));
        
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('address-modal').remove();
            });
        });
        
        document.getElementById('address-modal').addEventListener('click', (e) => {
            if (e.target.id === 'address-modal') {
                e.target.remove();
            }
        });
    }

    async saveAddress(e) {
        e.preventDefault();
        
        const addressId = document.getElementById('address-id').value;
        const isEdit = !!addressId;
        
        const addressData = {
            paqueteria_preferida: document.getElementById('address-paqueteria_preferida').value,
            nombre_completo: document.getElementById('address-nombre_completo').value,
            telefono: document.getElementById('address-telefono').value,
            provincia: document.getElementById('address-provincia').value,
            municipio: document.getElementById('address-municipio').value,
            sector: document.getElementById('address-sector').value,
            referencia: document.getElementById('address-referencia').value,
            calle: document.getElementById('address-calle').value,
            numero: document.getElementById('address-numero').value,
            apartamento: document.getElementById('address-apartamento').value,
            codigo_postal: document.getElementById('address-codigo_postal').value,
            predeterminada: document.getElementById('address-predeterminada').checked
        };
        
        // Agregar prefijo al teléfono si no lo tiene
        if (addressData.telefono && !addressData.telefono.startsWith('809-')) {
            addressData.telefono = `809-${addressData.telefono.replace(/\D/g, '').slice(0, 7)}`;
        }
        
        // Validar campos obligatorios
        const requiredFields = [
            'paqueteria_preferida',
            'nombre_completo',
            'telefono',
            'provincia',
            'municipio',
            'sector',
            'referencia'
        ];
        
        for (const field of requiredFields) {
            if (!addressData[field] || addressData[field].trim() === '') {
                this.showNotification(`El campo ${field.replace('_', ' ')} es obligatorio`, 'error');
                return;
            }
        }
        
        try {
            const url = isEdit 
                ? `/api/users/${this.user.id}/addresses/${addressId}`
                : `/api/users/${this.user.id}/addresses`;
            
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log(`💾 ${isEdit ? 'Actualizando' : 'Creando'} dirección:`, addressData);
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addressData)
            });
            
            if (response.ok) {
                this.showNotification(
                    `Dirección ${isEdit ? 'actualizada' : 'agregada'} correctamente`, 
                    'success'
                );
                document.getElementById('address-modal').remove();
                this.loadSection('addresses');
            } else {
                const error = await response.json();
                this.showNotification(error.error || `Error ${isEdit ? 'actualizando' : 'agregando'} dirección`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error guardando dirección:', error);
            this.showNotification('Error guardando dirección', 'error');
        }
    }

    setupWishlistListeners() {
        // Botones para eliminar de wishlist
        setTimeout(() => {
            document.querySelectorAll('.remove-wishlist').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.currentTarget.dataset.id;
                    this.removeFromWishlist(productId);
                });
            });
            
            // Botones para agregar al carrito desde wishlist
            document.querySelectorAll('.add-to-cart-from-wishlist').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.currentTarget.dataset.id;
                    this.addToCartFromWishlist(productId);
                });
            });
            
            // Botón limpiar wishlist
            const clearBtn = document.getElementById('clear-wishlist');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearWishlist());
            }
        }, 100);
    }

    async removeFromWishlist(productId) {
        try {
            console.log(`🗑️ Eliminando producto ${productId} de wishlist`);
            const response = await fetch(`/api/users/${this.user.id}/wishlist/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('Producto eliminado de tu wishlist', 'success');
                this.loadSection('wishlist');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error eliminando de wishlist', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error eliminando de wishlist:', error);
            this.showNotification('Error eliminando de wishlist', 'error');
        }
    }

    async clearWishlist() {
        if (!confirm('¿Estás seguro de que deseas vaciar tu wishlist? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const wishlist = await this.getWishlist();
            const deletePromises = wishlist.map(item => 
                fetch(`/api/users/${this.user.id}/wishlist/${item.producto_id}`, {
                    method: 'DELETE'
                })
            );
            
            await Promise.all(deletePromises);
            this.showNotification('Wishlist vaciada correctamente', 'success');
            this.loadSection('wishlist');
            
        } catch (error) {
            console.error('❌ Error vaciando wishlist:', error);
            this.showNotification('Error vaciando wishlist', 'error');
        }
    }

    async addToCartFromWishlist(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) throw new Error('Producto no encontrado');
            
            const product = await response.json();
            
            // Agregar al carrito usando localStorage
            let cart = JSON.parse(localStorage.getItem('mabel_cart')) || [];
            const existingItem = cart.find(item => item.id == product.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.nombre,
                    price: product.precio_final || product.precio,
                    image: product.imagen || '/public/images/default-product.jpg',
                    quantity: 1
                });
            }
            
            localStorage.setItem('mabel_cart', JSON.stringify(cart));
            
            // Actualizar contador del carrito
            this.updateCartCount();
            
            this.showNotification('Producto agregado al carrito', 'success');
            
        } catch (error) {
            console.error('Error agregando al carrito desde wishlist:', error);
            this.showNotification('Error agregando al carrito', 'error');
        }
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('mabel_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll('.cart-count').forEach(element => {
            if (element) {
                element.textContent = totalItems;
                element.style.display = totalItems > 0 ? 'inline-block' : 'none';
            }
        });
    }

    setupSettingsListeners() {
        // Formulario de configuración
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.updateSettings(e));
        }
        
        // Botón cancelar
        const cancelBtn = document.getElementById('cancel-settings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.loadSection('settings');
            });
        }
        
        // Botón eliminar cuenta
        const deleteBtn = document.getElementById('delete-account');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteAccount());
        }
    }

    async updateSettings(e) {
        e.preventDefault();
        
        const settingsData = {
            email_notifications: document.getElementById('email_notifications').checked,
            marketing_emails: document.getElementById('marketing_emails').checked,
            language: document.getElementById('language').value,
            currency: document.getElementById('currency').value
        };
        
        try {
            // En desarrollo, simular éxito
            this.showNotification('Configuración actualizada correctamente', 'success');
            
        } catch (error) {
            console.error('Error actualizando configuración:', error);
            this.showNotification('Error actualizando configuración', 'error');
        }
    }

    async deleteAccount() {
        if (!confirm('¿Estás SEGURO de que deseas eliminar tu cuenta? Esta acción no se puede deshacer. Se perderán todos tus datos, órdenes e historial.')) {
            return;
        }
        
        const confirmation = prompt('Por seguridad, escribe "ELIMINAR CUENTA" para confirmar:');
        if (confirmation !== 'ELIMINAR CUENTA') {
            this.showNotification('Acción cancelada', 'info');
            return;
        }
        
        try {
            // En desarrollo, simular eliminación
            this.showNotification('Cuenta eliminada correctamente. Serás redirigido a la página principal.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
            
        } catch (error) {
            console.error('Error eliminando cuenta:', error);
            this.showNotification('Error eliminando cuenta', 'error');
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.showNotification('Sesión cerrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            this.showNotification('Error cerrando sesión', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        // Estilos de la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : 
                        type === 'error' ? '#f8d7da' : 
                        type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'error' ? '#721c24' : 
                    type === 'warning' ? '#856404' : '#0c5460'};
            padding: 15px 20px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        // Estilo para el botón de cerrar
        notification.querySelector('.close-notification').style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            color: inherit;
        `;
        
        // Estilo para el icono
        notification.querySelector('i').style.marginRight = '8px';
        
        // Animación de entrada
        document.body.appendChild(notification);
        
        // Auto-eliminar después de 5 segundos
        const autoRemove = setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Botón de cerrar
        notification.querySelector('.close-notification').addEventListener('click', () => {
            clearTimeout(autoRemove);
            notification.remove();
        });
        
        // Animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.account-section')) {
        window.AccountManager = new AccountManager();
    }
});