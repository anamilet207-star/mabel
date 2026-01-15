// js/admin.js - VERSIÓN COMPLETA CON DATOS REALES EN CLIENTES
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.orders = [];
        this.users = [];
        this.discounts = [];
        this.currentSection = 'dashboard';
        this.currentImages = {
            main: '',
            additional: []
        };
        this.init();
    }

    async init() {
        console.log('🔄 Inicializando panel de administración...');
        
        // Verificar autenticación
        const isAuthenticated = await this.checkAdminAuth();
        if (!isAuthenticated) return;
        
        // Configurar navegación
        this.setupNavigation();
        
        // Cargar sección inicial
        this.loadSection(this.currentSection);
        
        console.log('✅ Panel de administración inicializado');
    }

    async checkAdminAuth() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (!data.authenticated || data.user.rol !== 'admin') {
                window.location.href = '/login';
                return false;
            }
            
            this.currentUser = data.user;
            const adminNameElement = document.getElementById('admin-name');
            if (adminNameElement) {
                adminNameElement.textContent = `${this.currentUser.nombre} ${this.currentUser.apellido}`;
            }
            return true;
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            window.location.href = '/login';
            return false;
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.admin-nav-link');
        
        navLinks.forEach(link => {
            if (link.classList.contains('logout')) return;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Actualizar navegación
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Cambiar sección
                const targetSection = link.dataset.section;
                this.currentSection = targetSection;
                
                // Actualizar título
                const sectionTitle = document.getElementById('section-title');
                if (sectionTitle) {
                    const spanElement = link.querySelector('span');
                    if (spanElement) {
                        sectionTitle.textContent = spanElement.textContent;
                    }
                }
                
                // Cargar sección
                this.loadSection(targetSection);
            });
        });
        
        // Logout
        const logoutBtn = document.querySelector('.logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = '/login';
                } catch (error) {
                    this.showNotification('❌ Error cerrando sesión', 'error');
                }
            });
        }
    }

    async loadSection(section) {
        const contentContainer = document.querySelector('.admin-content');
        if (!contentContainer) return;
        
        try {
            let html = '';
            
            switch (section) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                case 'products':
                    html = this.loadProductsSection();
                    break;
                case 'orders':
                    html = this.loadOrdersSection();
                    break;
                case 'users':
                    html = this.loadUsersSection();
                    break;
                case 'discounts':
                    html = this.loadDiscountsSection();
                    break;
                default:
                    html = await this.loadDashboard();
            }
            
            contentContainer.innerHTML = html;
            
            // Configurar event listeners específicos
            this.setupSectionEventListeners(section);
            
            // Cargar datos
            switch (section) {
                case 'products':
                    await this.loadProducts();
                    break;
                case 'orders':
                    await this.loadOrders();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'discounts':
                    await this.loadDiscounts();
                    break;
            }
            
        } catch (error) {
            console.error(`Error cargando sección ${section}:`, error);
            contentContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando la sección. Intenta nuevamente.</p>
                </div>
            `;
        }
    }
    async loadDashboard() {
        try {
            console.log('📊 Cargando dashboard...');
            
            // Cargar productos (esta ruta sí existe)
            let products = [];
            try {
                const productsRes = await fetch('/api/admin/products');
                if (productsRes.ok) {
                    products = await productsRes.json();
                    console.log(`✅ ${products.length} productos cargados`);
                }
            } catch (error) {
                console.warn('⚠️ Error cargando productos:', error);
            }
            
            // Cargar órdenes (usar datos de ejemplo temporalmente)
            let orders = [];
            try {
                // Temporalmente usar datos de ejemplo hasta que implementes la ruta
                orders = this.getSampleOrders();
                console.log(`✅ ${orders.length} órdenes de ejemplo cargadas`);
                
                // Comentado temporalmente hasta que implementes la ruta real:
                // const ordersRes = await fetch('/api/admin/orders');
                // if (ordersRes.ok) orders = await ordersRes.json();
            } catch (error) {
                console.warn('⚠️ Error cargando órdenes:', error);
            }
            
            // Cargar usuarios (usar datos de ejemplo temporalmente)
            let users = [];
            try {
                // Temporalmente usar datos de ejemplo
                users = this.getSampleUsers();
                console.log(`✅ ${users.length} usuarios de ejemplo cargados`);
                
                // Comentado temporalmente hasta que implementes la ruta real:
                // const usersRes = await fetch('/api/admin/users');
                // if (usersRes.ok) users = await usersRes.json();
            } catch (error) {
                console.warn('⚠️ Error cargando usuarios:', error);
            }
            
            // Calcular estadísticas
            const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
            const pendingOrders = orders.filter(order => order.estado === 'pendiente').length;
            const lowStockProducts = products.filter(p => p.stock < 10 && p.stock > 0).length;
            const outOfStockProducts = products.filter(p => p.stock === 0).length;
            
            return `
                <div class="dashboard-content">
                    <div class="dashboard-grid">
                        <!-- Total Productos -->
                        <div class="dashboard-card">
                            <div class="dashboard-card-header">
                                <div class="dashboard-card-icon">
                                    <i class="fas fa-box"></i>
                                </div>
                            </div>
                            <div class="dashboard-card-value">${products.length}</div>
                            <div class="dashboard-card-label">Productos Totales</div>
                            <div class="dashboard-card-subtext">
                                <span class="low-stock-count">${lowStockProducts} bajo stock</span>
                                <span class="out-stock-count">${outOfStockProducts} agotados</span>
                            </div>
                        </div>
                        
                        <!-- Total Órdenes -->
                        <div class="dashboard-card">
                            <div class="dashboard-card-header">
                                <div class="dashboard-card-icon">
                                    <i class="fas fa-shopping-bag"></i>
                                </div>
                            </div>
                            <div class="dashboard-card-value">${orders.length}</div>
                            <div class="dashboard-card-label">Órdenes Totales</div>
                            <div class="dashboard-card-subtext">
                                <span class="pending-orders">${pendingOrders} pendientes</span>
                            </div>
                        </div>
                        
                        <!-- Usuarios -->
                        <div class="dashboard-card">
                            <div class="dashboard-card-header">
                                <div class="dashboard-card-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                            </div>
                            <div class="dashboard-card-value">${users.length}</div>
                            <div class="dashboard-card-label">Usuarios Registrados</div>
                            <div class="dashboard-card-subtext">
                                <span class="admin-users">${users.filter(u => u.rol === 'admin').length} administradores</span>
                            </div>
                        </div>
                        
                        <!-- Ingresos -->
                        <div class="dashboard-card">
                            <div class="dashboard-card-header">
                                <div class="dashboard-card-icon">
                                    <i class="fas fa-dollar-sign"></i>
                                </div>
                            </div>
                            <div class="dashboard-card-value">RD$ ${totalRevenue.toFixed(2)}</div>
                            <div class="dashboard-card-label">Ingresos Totales</div>
                            <div class="dashboard-card-subtext">
                                <span class="avg-order">Promedio: RD$ ${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Órdenes Recientes -->
                    <div class="admin-table-container" style="margin-top: 40px;">
                        <div class="admin-table-header">
                            <h3 class="admin-table-title">Órdenes Recientes ${orders.length > 0 ? '' : '(Datos de Ejemplo)'}</h3>
                            <a href="#" data-section="orders" class="view-all-link">Ver todas</a>
                        </div>
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Orden #</th>
                                    <th>Cliente</th>
                                    <th>Fecha</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.slice(0, 5).map(order => `
                                    <tr>
                                        <td>#${order.id || 'N/A'}</td>
                                        <td>${order.nombre_cliente || 'Cliente'}</td>
                                        <td>${order.fecha_orden ? new Date(order.fecha_orden).toLocaleDateString() : 'N/A'}</td>
                                        <td>RD$ ${parseFloat(order.total || 0).toFixed(2)}</td>
                                        <td>
                                            <span class="order-status ${order.estado || 'pendiente'}">
                                                ${this.formatOrderStatus(order.estado)}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="action-btn view" onclick="window.adminPanel.viewOrder(${order.id})" 
                                                    ${orders.length === 0 || order.id === undefined ? 'disabled' : ''}>
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${orders.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="empty-cell">
                                            <i class="fas fa-shopping-bag"></i>
                                            <p>No hay órdenes registradas</p>
                                            <small>Implementa la ruta /api/admin/orders en el servidor</small>
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Productos con bajo stock -->
                    <div class="admin-table-container" style="margin-top: 40px;">
                        <div class="admin-table-header">
                            <h3 class="admin-table-title">Productos con Bajo Stock</h3>
                            <a href="#" data-section="products" class="view-all-link">Ver todos</a>
                        </div>
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products
                                    .filter(p => p.stock < 10 && p.stock > 0)
                                    .slice(0, 5)
                                    .map(product => `
                                        <tr>
                                            <td>
                                                <div class="product-info-small">
                                                    ${product.nombre}
                                                </div>
                                            </td>
                                            <td>
                                                <span class="stock-badge low">${product.stock}</span>
                                            </td>
                                            <td>${this.formatCategory(product.categoria)}</td>
                                            <td>RD$ ${parseFloat(product.precio || 0).toFixed(2)}</td>
                                            <td>
                                                <button class="action-btn edit" onclick="window.adminPanel.editProduct(${product.id})">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                ${products.filter(p => p.stock < 10 && p.stock > 0).length === 0 ? `
                                    <tr>
                                        <td colspan="5" class="empty-cell">
                                            <i class="fas fa-check-circle"></i>
                                            <p>Todo el stock está en niveles normales</p>
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Nota sobre datos de ejemplo -->
                    ${orders.length > 0 && orders[0].isSample ? `
                    <div class="info-message" style="margin-top: 20px; padding: 15px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #4a90e2;">
                        <i class="fas fa-info-circle" style="color: #4a90e2; margin-right: 10px;"></i>
                        <span>Mostrando datos de ejemplo. Para ver datos reales, implementa las rutas API en el servidor.</span>
                    </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('❌ Error cargando dashboard:', error);
            return `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando el dashboard. Intenta recargar la página.</p>
                    <p><small>${error.message}</small></p>
                    <button onclick="window.location.reload()" class="btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-redo"></i> Recargar Página
                    </button>
                </div>
            `;
        }
    }
    
    // Agregar estas funciones a la clase AdminPanel (fuera de loadDashboard):
    
    getSampleOrders() {
        return [
            {
                id: 1001,
                nombre_cliente: "María García",
                fecha_orden: new Date(Date.now() - 2 * 86400000).toISOString(),
                total: 3250.00,
                estado: "entregado",
                isSample: true
            },
            {
                id: 1002,
                nombre_cliente: "Carlos Rodríguez",
                fecha_orden: new Date(Date.now() - 1 * 86400000).toISOString(),
                total: 1850.50,
                estado: "procesando",
                isSample: true
            },
            {
                id: 1003,
                nombre_cliente: "Ana Martínez",
                fecha_orden: new Date().toISOString(),
                total: 2750.00,
                estado: "pendiente",
                isSample: true
            },
            {
                id: 1004,
                nombre_cliente: "José Pérez",
                fecha_orden: new Date(Date.now() - 5 * 86400000).toISOString(),
                total: 4200.00,
                estado: "enviado",
                isSample: true
            },
            {
                id: 1005,
                nombre_cliente: "Laura Fernández",
                fecha_orden: new Date(Date.now() - 3 * 86400000).toISOString(),
                total: 1500.00,
                estado: "cancelado",
                isSample: true
            }
        ];
    }
    

    loadProductsSection() {
        return `
            <div class="products-section">
                <div class="section-header">
                    <h2>Gestión de Productos</h2>
                    <div class="admin-table-actions">
                        <button id="add-product-btn" class="btn-primary">
                            <i class="fas fa-plus"></i> Nuevo Producto
                        </button>
                    </div>
                </div>
                
                <!-- Filtros rápidos -->
                <div class="filters-container">
                    <select id="product-category-filter" class="filter-select">
                        <option value="">Todas las categorías</option>
                        <option value="leggings">Leggings</option>
                        <option value="tops">Tops</option>
                        <option value="sets">Sets</option>
                        <option value="shorts">Shorts</option>
                        <option value="accesorios">Accesorios</option>
                    </select>
                    
                    <select id="product-stock-filter" class="filter-select">
                        <option value="">Todos los niveles de stock</option>
                        <option value="in-stock">En stock (>10)</option>
                        <option value="low-stock">Bajo stock (<10)</option>
                        <option value="out-of-stock">Agotado</option>
                    </select>
                    
                    <select id="product-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="discount">Con descuento</option>
                    </select>
                </div>
                
                <!-- Tabla de productos -->
                <div class="admin-table-container">
                    <div class="admin-table-header">
                        <h3 class="admin-table-title">Todos los Productos</h3>
                        <div class="admin-table-actions">
                            <input type="text" id="product-search" placeholder="Buscar productos..." class="search-input">
                            <button id="export-products" class="btn-secondary">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Tallas</th>
                                <th>Colores</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="products-table-body">
                            <tr>
                                <td colspan="10" class="loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando productos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="table-footer">
                        <div class="table-stats" id="products-stats">
                            Cargando estadísticas...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/admin/products');
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            this.products = await response.json();
            this.renderProductsTable();
            this.setupProductFilters();
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.showNotification('❌ Error cargando productos', 'error');
            this.renderProductsTable([]);
        }
    }

    renderProductsTable() {
        const tableBody = document.getElementById('products-table-body');
        const statsElement = document.getElementById('products-stats');
        
        if (!tableBody) return;
        
        if (!this.products || this.products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-cell">
                        <i class="fas fa-box-open"></i>
                        <p>No hay productos registrados</p>
                        <button onclick="window.adminPanel.openProductModal()" class="btn-primary">
                            <i class="fas fa-plus"></i> Crear primer producto
                        </button>
                    </td>
                </tr>
            `;
            
            if (statsElement) {
                statsElement.innerHTML = '0 productos encontrados';
            }
            return;
        }
        
        // Calcular estadísticas
        const totalProducts = this.products.length;
        const activeProducts = this.products.filter(p => p.activo).length;
        const productsWithDiscount = this.products.filter(p => p.descuento_porcentaje > 0 || p.descuento_precio > 0).length;
        const lowStockProducts = this.products.filter(p => p.stock < 10 && p.stock > 0).length;
        const outOfStockProducts = this.products.filter(p => p.stock === 0).length;
        
        if (statsElement) {
            statsElement.innerHTML = `
                ${totalProducts} productos totales • 
                ${activeProducts} activos • 
                ${productsWithDiscount} con descuento • 
                ${lowStockProducts} bajo stock • 
                ${outOfStockProducts} agotados
            `;
        }
        
        tableBody.innerHTML = this.products.map(product => {
            const stockClass = product.stock === 0 ? 'out-of-stock' : 
                             product.stock < 10 ? 'low-stock' : 'in-stock';
            
            const statusClass = product.activo ? 'status-active' : 'status-inactive';
            const statusText = product.activo ? 'Activo' : 'Inactivo';
            
            // Calcular precio final si hay descuento
            let precioDisplay = `$${parseFloat(product.precio || 0).toFixed(2)}`;
            if (product.descuento_porcentaje > 0) {
                const precioFinal = product.precio * (1 - product.descuento_porcentaje / 100);
                precioDisplay = `
                    <div class="price-with-discount">
                        <span class="original-price">$${parseFloat(product.precio).toFixed(2)}</span>
                        <span class="discount-price">$${precioFinal.toFixed(2)}</span>
                        <span class="discount-badge">-${product.descuento_porcentaje}%</span>
                    </div>
                `;
            } else if (product.descuento_precio > 0) {
                precioDisplay = `
                    <div class="price-with-discount">
                        <span class="original-price">$${parseFloat(product.precio).toFixed(2)}</span>
                        <span class="discount-price">$${parseFloat(product.descuento_precio).toFixed(2)}</span>
                    </div>
                `;
            }
            
            // Obtener imágenes adicionales
            const imagenesAdicionales = product.imagenes_adicionales || [];
            const hasAdditionalImages = Array.isArray(imagenesAdicionales) && imagenesAdicionales.length > 0;
            
            return `
                <tr>
                    <td>${product.id}</td>
                    <td>
                        <div style="position: relative; display: inline-block;">
                            <img src="${product.imagen || '/public/images/default-product.jpg'}" 
                                 alt="${product.nombre}" 
                                 class="product-thumbnail"
                                 onerror="this.src='/public/images/default-product.jpg'">
                            ${hasAdditionalImages ? 
                                `<span class="more-images-badge" 
                                      title="${imagenesAdicionales.length} imágenes adicionales">
                                    +${imagenesAdicionales.length}
                                </span>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="product-name-cell">
                            ${product.nombre}
                            ${product.descuento_porcentaje > 0 || product.descuento_precio > 0 ? 
                                '<i class="fas fa-percentage discount-indicator" title="Tiene descuento"></i>' : ''}
                        </div>
                    </td>
                    <td>${this.formatCategory(product.categoria)}</td>
                    <td>${precioDisplay}</td>
                    <td>
                        <span class="stock-badge ${stockClass}">
                            ${product.stock || 0}
                        </span>
                    </td>
                    <td class="array-cell">${this.formatArray(product.tallas)}</td>
                    <td class="array-cell">${this.formatArray(product.colores)}</td>
                    <td>
                        <span class="${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="window.adminPanel.editProduct(${product.id})" 
                                    title="Editar producto">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn discount" onclick="window.adminPanel.openDiscountModal(${product.id})" 
                                    title="Gestionar descuento">
                                <i class="fas fa-percentage"></i>
                            </button>
                            <button class="action-btn delete" onclick="window.adminPanel.deleteProduct(${product.id})" 
                                    title="Eliminar producto">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ================= MÉTODOS PARA MÚLTIPLES IMÁGENES =================

    // Obtener imágenes del producto
    getProductImages(product) {
        const images = [];
        
        // Imagen principal
        if (product.imagen) {
            images.push(product.imagen);
        }
        
        // Imágenes adicionales (si existen)
        if (product.imagenes_adicionales && product.imagenes_adicionales.length > 0) {
            const adicionales = Array.isArray(product.imagenes_adicionales) 
                ? product.imagenes_adicionales 
                : [product.imagenes_adicionales];
            
            adicionales.forEach(img => {
                if (img && img.trim()) images.push(img);
            });
        }
        
        return images.length > 0 ? images : ['/public/images/default-product.jpg'];
    }

    // Manejar subida de imagen principal
    handleMainImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImages.main = e.target.result;
            this.updateMainImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    // Actualizar vista previa de imagen principal
    updateMainImagePreview(imageUrl) {
        const preview = document.getElementById('main-image-preview');
        if (preview) {
            preview.innerHTML = `
                <img src="${imageUrl}" alt="Imagen principal">
                <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeMainImage()">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
    }

    // Remover imagen principal
    removeMainImage() {
        this.currentImages.main = '';
        const preview = document.getElementById('main-image-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="image-placeholder">
                    <i class="fas fa-camera"></i>
                    <span>Click para subir</span>
                </div>
            `;
        }
    }

    // Manejar subida de imágenes adicionales
    handleAdditionalImagesUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImages.additional.push(e.target.result);
                this.updateAdditionalImagesGrid();
            };
            reader.readAsDataURL(file);
        });
        
        // Limpiar input
        event.target.value = '';
    }

    // Actualizar grid de imágenes adicionales
    updateAdditionalImagesGrid() {
        const grid = document.getElementById('additional-images-grid');
        if (!grid) return;
        
        const imagesHTML = this.currentImages.additional.map((img, index) => `
            <div class="additional-image-item" data-index="${index}">
                <img src="${img}" alt="Imagen ${index + 2}">
                <button type="button" class="remove-image-btn" 
                        onclick="window.adminPanel.removeAdditionalImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-actions">
                    ${index > 0 ? `
                        <button type="button" class="btn-move-up" 
                                onclick="window.adminPanel.moveImageUp(${index})">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    ` : ''}
                    ${index < this.currentImages.additional.length - 1 ? `
                        <button type="button" class="btn-move-down" 
                                onclick="window.adminPanel.moveImageDown(${index})">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        grid.innerHTML = imagesHTML + `
            <div class="add-more-image" onclick="document.getElementById('additional-images-input').click()">
                <i class="fas fa-plus"></i>
                <span>Agregar imagen</span>
            </div>
        `;
    }
    

    // Remover imagen adicional
    removeAdditionalImage(index) {
        this.currentImages.additional.splice(index, 1);
        this.updateAdditionalImagesGrid();
    }

    // Mover imagen hacia arriba
    moveImageUp(index) {
        if (index > 0) {
            const temp = this.currentImages.additional[index];
            this.currentImages.additional[index] = this.currentImages.additional[index - 1];
            this.currentImages.additional[index - 1] = temp;
            this.updateAdditionalImagesGrid();
        }
    }

    // Mover imagen hacia abajo
    moveImageDown(index) {
        if (index < this.currentImages.additional.length - 1) {
            const temp = this.currentImages.additional[index];
            this.currentImages.additional[index] = this.currentImages.additional[index + 1];
            this.currentImages.additional[index + 1] = temp;
            this.updateAdditionalImagesGrid();
        }
    }

    setupProductFilters() {
        const categoryFilter = document.getElementById('product-category-filter');
        const stockFilter = document.getElementById('product-stock-filter');
        const statusFilter = document.getElementById('product-status-filter');
        const searchInput = document.getElementById('product-search');
        
        const applyFilters = () => {
            let filtered = [...this.products];
            
            // Filtrar por categoría
            if (categoryFilter && categoryFilter.value) {
                filtered = filtered.filter(product => product.categoria === categoryFilter.value);
            }
            
            // Filtrar por stock
            if (stockFilter && stockFilter.value) {
                switch(stockFilter.value) {
                    case 'in-stock':
                        filtered = filtered.filter(product => product.stock >= 10);
                        break;
                    case 'low-stock':
                        filtered = filtered.filter(product => product.stock < 10 && product.stock > 0);
                        break;
                    case 'out-of-stock':
                        filtered = filtered.filter(product => product.stock === 0);
                        break;
                }
            }
            
            // Filtrar por estado
            if (statusFilter && statusFilter.value) {
                switch(statusFilter.value) {
                    case 'active':
                        filtered = filtered.filter(product => product.activo);
                        break;
                    case 'inactive':
                        filtered = filtered.filter(product => !product.activo);
                        break;
                    case 'discount':
                        filtered = filtered.filter(product => 
                            product.descuento_porcentaje > 0 || product.descuento_precio > 0);
                        break;
                }
            }
            
            // Filtrar por búsqueda
            if (searchInput && searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase();
                filtered = filtered.filter(product => 
                    product.nombre.toLowerCase().includes(searchTerm) ||
                    product.descripcion.toLowerCase().includes(searchTerm) ||
                    product.sku.toLowerCase().includes(searchTerm)
                );
            }
            
            this.renderFilteredProducts(filtered);
        };
        
        if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
        if (stockFilter) stockFilter.addEventListener('change', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') applyFilters();
            });
        }
        
        // Botón exportar
        const exportBtn = document.getElementById('export-products');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProducts());
        }
    }

    renderFilteredProducts(filteredProducts) {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) return;
        
        if (filteredProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-cell">
                        <i class="fas fa-search"></i>
                        <p>No se encontraron productos con los filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Reutilizar el mismo código de renderizado pero con productos filtrados
        const tempProducts = this.products;
        this.products = filteredProducts;
        this.renderProductsTable();
        this.products = tempProducts;
    }

    loadOrdersSection() {
        return `
            <div class="orders-section">
                <div class="section-header">
                    <h2>Gestión de Pedidos</h2>
                </div>
                
                <!-- Filtros -->
                <div class="filters-container">
                    <select id="order-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="procesando">Procesando</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    
                    <select id="order-date-range" class="filter-select">
                        <option value="">Cualquier fecha</option>
                        <option value="today">Hoy</option>
                        <option value="week">Esta semana</option>
                        <option value="month">Este mes</option>
                        <option value="last-month">Mes pasado</option>
                    </select>
                    
                    <input type="date" id="order-date-filter" class="filter-select">
                    
                    <input type="text" id="order-search" placeholder="Buscar por cliente o ID..." class="search-input">
                </div>
                
                <!-- Estadísticas rápidas -->
                <div class="stats-cards" id="orders-stats">
                    <!-- Se cargarán dinámicamente -->
                </div>
                
                <!-- Tabla de órdenes -->
                <div class="admin-table-container">
                    <div class="admin-table-header">
                        <h3 class="admin-table-title">Todas las Órdenes</h3>
                        <div class="admin-table-actions">
                            <button id="export-orders" class="btn-secondary">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Orden #</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Envío</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="orders-table-body">
                            <tr>
                                <td colspan="7" class="loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando órdenes...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/admin/orders');
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            this.orders = await response.json();
            this.renderOrdersTable();
            this.renderOrdersStats();
            this.setupOrderFilters();
        } catch (error) {
            console.error('Error cargando órdenes:', error);
            this.showNotification('❌ Error cargando órdenes', 'error');
            this.renderOrdersTable([]);
        }
    }

    renderOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) return;
        
        if (!this.orders || this.orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        <i class="fas fa-shopping-bag"></i>
                        <p>No hay órdenes registradas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = this.orders.map(order => {
            const statusClass = `order-status ${order.estado || 'pendiente'}`;
            const statusText = this.formatOrderStatus(order.estado);
            
            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>
                        <div class="customer-info">
                            <strong>${order.nombre_cliente || 'Cliente'}</strong>
                            <small>${order.email_cliente || ''}</small>
                            ${order.telefono_contacto ? `<small>${order.telefono_contacto}</small>` : ''}
                        </div>
                    </td>
                    <td>${order.fecha_orden ? new Date(order.fecha_orden).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <strong>$${parseFloat(order.total || 0).toFixed(2)}</strong>
                        ${order.metodo_pago ? `<br><small>${order.metodo_pago}</small>` : ''}
                    </td>
                    <td>
                        <span class="${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="shipping-info">
                            <small>${order.metodo_envio || 'Estándar'}</small>
                            ${order.direccion_envio ? `<br><small>${order.direccion_envio.substring(0, 30)}${order.direccion_envio.length > 30 ? '...' : ''}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn view" onclick="window.adminPanel.viewOrder(${order.id})" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="window.adminPanel.editOrderStatus(${order.id})" title="Cambiar estado">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${order.tracking_number ? `
                                <button class="action-btn track" onclick="window.adminPanel.trackOrder('${order.tracking_number}')" title="Rastrear envío">
                                    <i class="fas fa-truck"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderOrdersStats() {
        const statsContainer = document.getElementById('orders-stats');
        if (!statsContainer || !this.orders) return;
        
        const totalOrders = this.orders.length;
        const pendingOrders = this.orders.filter(o => o.estado === 'pendiente').length;
        const processingOrders = this.orders.filter(o => o.estado === 'procesando').length;
        const shippedOrders = this.orders.filter(o => o.estado === 'enviado').length;
        const deliveredOrders = this.orders.filter(o => o.estado === 'entregado').length;
        const cancelledOrders = this.orders.filter(o => o.estado === 'cancelado').length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        
        statsContainer.innerHTML = `
            <div class="stat-card small">
                <div class="stat-value">${totalOrders}</div>
                <div class="stat-label">Total Órdenes</div>
            </div>
            <div class="stat-card small">
                <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Ingresos Totales</div>
            </div>
            <div class="stat-card small">
                <div class="stat-value">${pendingOrders}</div>
                <div class="stat-label">Pendientes</div>
            </div>
            <div class="stat-card small">
                <div class="stat-value">${deliveredOrders}</div>
                <div class="stat-label">Entregadas</div>
            </div>
        `;
    }

    setupOrderFilters() {
        const statusFilter = document.getElementById('order-status-filter');
        const dateRangeFilter = document.getElementById('order-date-range');
        const dateFilter = document.getElementById('order-date-filter');
        const searchInput = document.getElementById('order-search');
        
        const applyFilters = () => {
            let filtered = [...this.orders];
            
            // Filtrar por estado
            if (statusFilter && statusFilter.value) {
                filtered = filtered.filter(order => order.estado === statusFilter.value);
            }
            
            // Filtrar por rango de fecha
            if (dateRangeFilter && dateRangeFilter.value) {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                switch(dateRangeFilter.value) {
                    case 'today':
                        filtered = filtered.filter(order => {
                            const orderDate = new Date(order.fecha_orden);
                            return orderDate >= startOfDay;
                        });
                        break;
                    case 'week':
                        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                        filtered = filtered.filter(order => {
                            const orderDate = new Date(order.fecha_orden);
                            return orderDate >= startOfWeek;
                        });
                        break;
                    case 'month':
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        filtered = filtered.filter(order => {
                            const orderDate = new Date(order.fecha_orden);
                            return orderDate >= startOfMonth;
                        });
                        break;
                    case 'last-month':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                        filtered = filtered.filter(order => {
                            const orderDate = new Date(order.fecha_orden);
                            return orderDate >= lastMonth && orderDate <= endOfLastMonth;
                        });
                        break;
                }
            }
            
            // Filtrar por fecha específica
            if (dateFilter && dateFilter.value) {
                const filterDate = new Date(dateFilter.value);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.fecha_orden);
                    return orderDate.toDateString() === filterDate.toDateString();
                });
            }
            
            // Filtrar por búsqueda
            if (searchInput && searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase();
                filtered = filtered.filter(order => 
                    order.id.toString().includes(searchTerm) ||
                    (order.nombre_cliente && order.nombre_cliente.toLowerCase().includes(searchTerm)) ||
                    (order.email_cliente && order.email_cliente.toLowerCase().includes(searchTerm))
                );
            }
            
            this.renderFilteredOrders(filtered);
        };
        
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (dateRangeFilter) dateRangeFilter.addEventListener('change', applyFilters);
        if (dateFilter) dateFilter.addEventListener('change', applyFilters);
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') applyFilters();
            });
        }
        
        // Botón exportar
        const exportBtn = document.getElementById('export-orders');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportOrders());
        }
    }

    renderFilteredOrders(filteredOrders) {
        const tableBody = document.getElementById('orders-table-body');
        if (!tableBody) return;
        
        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        <i class="fas fa-search"></i>
                        <p>No se encontraron órdenes con los filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Reutilizar el mismo código de renderizado pero con órdenes filtradas
        const tempOrders = this.orders;
        this.orders = filteredOrders;
        this.renderOrdersTable();
        this.orders = tempOrders;
    }

    async viewOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            const order = await response.json();
            
            if (!order) {
                this.showNotification('❌ Orden no encontrada', 'error');
                return;
            }
            
            this.openOrderModal(order);
        } catch (error) {
            console.error('Error viendo orden:', error);
            this.showNotification('❌ Error cargando orden', 'error');
        }
    }

    openOrderModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal order-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Orden #${order.id} - ${order.nombre_cliente || 'Cliente'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Información del cliente -->
                    <div class="order-section">
                        <h4><i class="fas fa-user"></i> Información del Cliente</h4>
                        <div class="order-info-grid">
                            <div class="info-item">
                                <strong>Nombre:</strong>
                                <span>${order.nombre_cliente || 'No especificado'}</span>
                            </div>
                            <div class="info-item">
                                <strong>Email:</strong>
                                <span>${order.email_cliente || 'No especificado'}</span>
                            </div>
                            <div class="info-item">
                                <strong>Teléfono:</strong>
                                <span>${order.telefono_contacto || 'No especificado'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Información de envío -->
                    <div class="order-section">
                        <h4><i class="fas fa-shipping-fast"></i> Información de Envío</h4>
                        <div class="order-info-grid">
                            <div class="info-item">
                                <strong>Dirección:</strong>
                                <span>${order.direccion_envio || 'No especificada'}</span>
                            </div>
                            <div class="info-item">
                                <strong>Ciudad:</strong>
                                <span>${order.ciudad_envio || 'No especificada'}</span>
                            </div>
                            <div class="info-item">
                                <strong>Método:</strong>
                                <span>${order.metodo_envio || 'Estándar'}</span>
                            </div>
                            ${order.tracking_number ? `
                            <div class="info-item">
                                <strong>Número de Tracking:</strong>
                                <span class="tracking-number">
                                    ${order.tracking_number}
                                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${order.tracking_number}')">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Información de pago -->
                    <div class="order-section">
                        <h4><i class="fas fa-credit-card"></i> Información de Pago</h4>
                        <div class="order-info-grid">
                            <div class="info-item">
                                <strong>Método de Pago:</strong>
                                <span>${order.metodo_pago || 'No especificado'}</span>
                            </div>
                            <div class="info-item">
                                <strong>Estado del Pago:</strong>
                                <span class="payment-status ${order.estado_pago || 'pendiente'}">
                                    ${order.estado_pago || 'Pendiente'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Productos -->
                    <div class="order-section">
                        <h4><i class="fas fa-box"></i> Productos (${order.items ? order.items.length : 0})</h4>
                        <table class="order-items-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Talla</th>
                                    <th>Color</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unitario</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items && order.items.length > 0 ? order.items.map((item, index) => `
                                    <tr>
                                        <td>
                                            <div class="order-item-product">
                                                <img src="${item.imagen || '/public/images/default-product.jpg'}" 
                                                     alt="${item.nombre}"
                                                     onerror="this.src='/public/images/default-product.jpg'">
                                                <div>
                                                    <strong>${item.nombre}</strong>
                                                    ${item.sku ? `<br><small>SKU: ${item.sku}</small>` : ''}
                                                </div>
                                            </div>
                                        </td>
                                        <td>${item.talla || '-'}</td>
                                        <td>${item.color || '-'}</td>
                                        <td>${item.cantidad}</td>
                                        <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                                        <td><strong>$${parseFloat((item.precio_unitario || 0) * item.cantidad).toFixed(2)}</strong></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6">No hay items</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Resumen -->
                    <div class="order-section">
                        <h4><i class="fas fa-file-invoice-dollar"></i> Resumen de la Orden</h4>
                        <div class="order-summary">
                            <div class="summary-row">
                                <span>Subtotal:</span>
                                <span>$${parseFloat(order.subtotal || order.total * 0.85).toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Envío:</span>
                                <span>$${parseFloat(order.shipping_cost || order.total * 0.15).toFixed(2)}</span>
                            </div>
                            ${order.descuento_aplicado ? `
                            <div class="summary-row discount">
                                <span>Descuento:</span>
                                <span>-$${parseFloat(order.descuento_aplicado).toFixed(2)}</span>
                            </div>
                            ` : ''}
                            <div class="summary-row total">
                                <span><strong>Total:</strong></span>
                                <span><strong>$${parseFloat(order.total || 0).toFixed(2)}</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actualizar estado -->
                    <div class="order-section">
                        <h4><i class="fas fa-sync-alt"></i> Actualizar Estado</h4>
                        <div class="status-update-form">
                            <select id="update-order-status" class="form-control">
                                <option value="pendiente" ${order.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="procesando" ${order.estado === 'procesando' ? 'selected' : ''}>Procesando</option>
                                <option value="enviado" ${order.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                                <option value="entregado" ${order.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                                <option value="cancelado" ${order.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                            <button onclick="window.adminPanel.updateOrderStatus(${order.id})" class="btn-primary">
                                <i class="fas fa-save"></i> Actualizar Estado
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    <button class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    async updateOrderStatus(orderId) {
        const statusSelect = document.getElementById('update-order-status');
        if (!statusSelect) return;
        
        const newStatus = statusSelect.value;
        
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newStatus })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Estado actualizado correctamente', 'success');
                await this.loadOrders();
                const modalClose = document.querySelector('.order-modal .modal-close');
                if (modalClose) modalClose.click();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    async editOrderStatus(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            const order = await response.json();
            
            if (!order) {
                this.showNotification('❌ Orden no encontrada', 'error');
                return;
            }
            
            this.openStatusModal(order);
        } catch (error) {
            console.error('Error editando orden:', error);
            this.showNotification('❌ Error cargando orden', 'error');
        }
    }

    openStatusModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal status-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Actualizar Estado - Orden #${order.id}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Estado Actual:</label>
                        <div class="current-status">
                            <span class="order-status ${order.estado || 'pendiente'}">
                                ${this.formatOrderStatus(order.estado)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Nuevo Estado:</label>
                        <select id="new-order-status" class="form-control">
                            <option value="pendiente" ${order.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="procesando" ${order.estado === 'procesando' ? 'selected' : ''}>Procesando</option>
                            <option value="enviado" ${order.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                            <option value="entregado" ${order.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                            <option value="cancelado" ${order.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Notas (opcional):</label>
                        <textarea id="status-notes" class="form-control" rows="3" 
                                  placeholder="Agregar notas sobre el cambio de estado..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="window.adminPanel.saveOrderStatus(${order.id})" class="btn-primary">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Seleccionar estado actual
        const select = modal.querySelector('#new-order-status');
        if (select) {
            select.value = order.estado || 'pendiente';
        }
        
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    async saveOrderStatus(orderId) {
        const select = document.querySelector('#new-order-status');
        const notes = document.querySelector('#status-notes');
        
        if (!select) return;
        
        const newStatus = select.value;
        const statusNotes = notes ? notes.value : '';
        
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    estado: newStatus,
                    notas: statusNotes 
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Estado actualizado correctamente', 'success');
                await this.loadOrders();
                const modalClose = document.querySelector('.status-modal .modal-close');
                if (modalClose) modalClose.click();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    trackOrder(trackingNumber) {
        if (!trackingNumber) {
            this.showNotification('❌ No hay número de tracking disponible', 'warning');
            return;
        }
        
        // Abrir en nueva pestaña el tracking (esto es un ejemplo, puedes ajustar según tu paquetería)
        const trackingUrl = `https://www.google.com/search?q=tracking+${trackingNumber}`;
        window.open(trackingUrl, '_blank');
    }

    loadUsersSection() {
        return `
            <div class="users-section">
                <div class="section-header">
                    <h2>Gestión de Usuarios</h2>
                </div>
                
                <!-- Filtros -->
                <div class="filters-container">
                    <select id="user-role-filter" class="filter-select">
                        <option value="">Todos los roles</option>
                        <option value="admin">Administradores</option>
                        <option value="cliente">Clientes</option>
                    </select>
                    
                    <select id="user-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                    
                    <input type="date" id="user-date-filter" class="filter-select">
                    
                    <input type="text" id="user-search" placeholder="Buscar por nombre o email..." class="search-input">
                </div>
                
                <!-- Tabla de usuarios -->
                <div class="admin-table-container">
                    <div class="admin-table-header">
                        <h3 class="admin-table-title">Todos los Usuarios</h3>
                        <div class="admin-table-actions">
                            <button id="export-users" class="btn-secondary">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Rol</th>
                                <th>Registro</th>
                                <th>Estadísticas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <tr>
                                <td colspan="8" class="loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }
            
            this.users = await response.json();
            console.log(`✅ Cargados ${this.users.length} usuarios reales`);
            this.renderUsersTable();
            this.setupUserFilters();
            
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.showNotification('❌ Error cargando usuarios. Verifica la conexión.', 'error');
            this.renderUsersTable([]);
        }
    }

    renderUsersTable() {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        
        if (!this.users || this.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cell">
                        <i class="fas fa-users"></i>
                        <p>No hay usuarios registrados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = this.users.map(user => {
            const roleClass = user.rol === 'admin' ? 'role-admin' : 'role-client';
            const statusClass = user.activo ? 'status-active' : 'status-inactive';
            const statusText = user.activo ? 'Activo' : 'Inactivo';
            
            // Formatear fecha de registro
            const registerDate = user.fecha_registro ? 
                new Date(user.fecha_registro).toLocaleDateString() : 'N/A';
            const registerTime = user.fecha_registro ? 
                new Date(user.fecha_registro).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            
            // Formatear teléfono
            const phoneDisplay = user.telefono && user.telefono !== '-' ? 
                user.telefono : '-';
            
            return `
                <tr data-user-id="${user.id}" class="${user.activo ? '' : 'user-inactive'}">
                    <td>${user.id}</td>
                    <td>
                        <div class="user-info-cell">
                            <strong>${user.nombre || ''} ${user.apellido || ''}</strong>
                            <div class="user-email">${user.email || ''}</div>
                            <div class="user-status-badge ${statusClass}">${statusText}</div>
                        </div>
                    </td>
                    <td>${user.email || ''}</td>
                    <td>${phoneDisplay}</td>
                    <td>
                        <span class="role-badge ${roleClass}">
                            ${user.rol === 'admin' ? 'Administrador' : 'Cliente'}
                        </span>
                    </td>
                    <td>
                        ${registerDate}
                        ${registerTime ? `<br><small>${registerTime}</small>` : ''}
                    </td>
                    <td>
                        <div class="user-stats-mini">
                            <span class="stat-item" title="Órdenes">
                                <i class="fas fa-shopping-bag"></i> ${user.total_orders || 0}
                            </span>
                            <span class="stat-item" title="Total gastado">
                                <i class="fas fa-dollar-sign"></i> ${(user.total_spent || 0).toFixed(2)}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn view" onclick="window.adminPanel.viewUser(${user.id})" 
                                    title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="window.adminPanel.editUser(${user.id})" 
                                    title="Editar usuario">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${user.id !== this.currentUser?.id ? `
                                <button class="action-btn ${user.activo ? 'delete' : 'activate'}" 
                                        onclick="window.adminPanel.${user.activo ? 'deleteUser' : 'activateUser'}(${user.id})" 
                                        title="${user.activo ? 'Desactivar usuario' : 'Activar usuario'}">
                                    <i class="fas ${user.activo ? 'fa-user-slash' : 'fa-user-check'}"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async viewUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Usuario no encontrado');
                } else if (response.status === 403) {
                    throw new Error('No tienes permisos para ver este usuario');
                }
                throw new Error('Error en la respuesta del servidor');
            }
            
            const user = await response.json();
            
            this.openUserModal(user);
        } catch (error) {
            console.error('❌ Error cargando usuario:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    openUserModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal user-modal active';
        
        // Formatear datos
        const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        const registerDate = user.fecha_registro ? 
            new Date(user.fecha_registro).toLocaleDateString() + ' ' + 
            new Date(user.fecha_registro).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'N/A';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-circle"></i> ${fullName || 'Usuario'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-info-grid">
                        <div class="info-item">
                            <strong><i class="fas fa-envelope"></i> Email:</strong>
                            <span>${user.email || 'No especificado'}</span>
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-phone"></i> Teléfono:</strong>
                            <span>${user.telefono || 'No especificado'}</span>
                        </div>
                        ${user.direccion ? `
                        <div class="info-item">
                            <strong><i class="fas fa-map-marker-alt"></i> Dirección:</strong>
                            <span>${user.direccion}</span>
                        </div>
                        ` : ''}
                        ${user.ciudad ? `
                        <div class="info-item">
                            <strong><i class="fas fa-city"></i> Ciudad:</strong>
                            <span>${user.ciudad}</span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <strong><i class="fas fa-user-tag"></i> Rol:</strong>
                            <span class="role-badge ${user.rol === 'admin' ? 'role-admin' : 'role-client'}">
                                ${user.rol === 'admin' ? 'Administrador' : 'Cliente'}
                            </span>
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-calendar-alt"></i> Fecha de Registro:</strong>
                            <span>${registerDate}</span>
                        </div>
                        <div class="info-item">
                            <strong><i class="fas fa-circle"></i> Estado:</strong>
                            <span class="${user.activo ? 'status-active' : 'status-inactive'}">
                                ${user.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Estadísticas reales del usuario -->
                    <div class="user-stats-section">
                        <h4><i class="fas fa-chart-bar"></i> Estadísticas</h4>
                        <div class="user-stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${user.stats?.total_orders || 0}</div>
                                <div class="stat-label">Órdenes</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">$${parseFloat(user.stats?.total_spent || 0).toFixed(2)}</div>
                                <div class="stat-label">Total Gastado</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${user.stats?.wishlist_items || 0}</div>
                                <div class="stat-label">En Wishlist</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${user.stats?.reviews || 0}</div>
                                <div class="stat-label">Reseñas</div>
                            </div>
                        </div>
                        
                        ${user.stats?.avg_order_value > 0 ? `
                        <div class="user-avg-order">
                            <i class="fas fa-chart-line"></i>
                            <span>Valor promedio por orden: $${parseFloat(user.stats.avg_order_value).toFixed(2)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Últimas órdenes -->
                    ${user.recent_orders && user.recent_orders.length > 0 ? `
                    <div class="recent-orders-section">
                        <h4><i class="fas fa-history"></i> Últimas Órdenes</h4>
                        <div class="recent-orders-list">
                            ${user.recent_orders.map(order => `
                                <div class="recent-order-item">
                                    <div class="order-info">
                                        <strong>Orden #${order.id}</strong>
                                        <span>${new Date(order.date).toLocaleDateString()}</span>
                                    </div>
                                    <div class="order-details">
                                        <span class="order-status ${order.status}">${this.formatOrderStatus(order.status)}</span>
                                        <span class="order-total">$${parseFloat(order.total).toFixed(2)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    ${user.id !== this.currentUser?.id ? `
                        <button class="btn-primary" onclick="window.adminPanel.editUser(${user.id})">
                            <i class="fas fa-edit"></i> Editar Usuario
                        </button>
                        <button class="btn-${user.activo ? 'danger' : 'success'}" 
                                onclick="window.adminPanel.${user.activo ? 'deleteUser' : 'activateUser'}(${user.id})">
                            <i class="fas ${user.activo ? 'fa-user-slash' : 'fa-user-check'}"></i>
                            ${user.activo ? 'Desactivar' : 'Activar'} Usuario
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    setupUserFilters() {
        const roleFilter = document.getElementById('user-role-filter');
        const statusFilter = document.getElementById('user-status-filter');
        const dateFilter = document.getElementById('user-date-filter');
        const searchInput = document.getElementById('user-search');
        
        const applyFilters = () => {
            let filtered = [...this.users];
            
            // Filtrar por rol
            if (roleFilter && roleFilter.value) {
                filtered = filtered.filter(user => user.rol === roleFilter.value);
            }
            
            // Filtrar por estado
            if (statusFilter && statusFilter.value) {
                filtered = filtered.filter(user => 
                    statusFilter.value === 'active' ? user.activo : !user.activo
                );
            }
            
            // Filtrar por fecha
            if (dateFilter && dateFilter.value) {
                const filterDate = new Date(dateFilter.value);
                filtered = filtered.filter(user => {
                    if (!user.fecha_registro) return false;
                    const userDate = new Date(user.fecha_registro);
                    return userDate.toDateString() === filterDate.toDateString();
                });
            }
            
            // Filtrar por búsqueda
            if (searchInput && searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase();
                filtered = filtered.filter(user => 
                    (user.nombre && user.nombre.toLowerCase().includes(searchTerm)) ||
                    (user.apellido && user.apellido.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                    (user.telefono && user.telefono.includes(searchTerm))
                );
            }
            
            this.renderFilteredUsers(filtered);
        };
        
        if (roleFilter) roleFilter.addEventListener('change', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (dateFilter) dateFilter.addEventListener('change', applyFilters);
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') applyFilters();
            });
        }
        
        // Botón exportar
        const exportBtn = document.getElementById('export-users');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUsers());
        }
    }

    renderFilteredUsers(filteredUsers) {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        
        if (filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cell">
                        <i class="fas fa-search"></i>
                        <p>No se encontraron usuarios con los filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Reutilizar el mismo código de renderizado pero con usuarios filtrados
        const tempUsers = this.users;
        this.users = filteredUsers;
        this.renderUsersTable();
        this.users = tempUsers;
    }

    async editUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const user = await response.json();
            
            if (!user) {
                this.showNotification('❌ Usuario no encontrado', 'error');
                return;
            }
            
            this.openEditUserModal(user);
        } catch (error) {
            console.error('Error cargando usuario:', error);
            this.showNotification('❌ Error cargando usuario', 'error');
        }
    }

    openEditUserModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal edit-user-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-edit"></i> Editar Usuario: ${user.nombre || ''} ${user.apellido || ''}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-user-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nombre *</label>
                                <input type="text" id="edit-user-nombre" value="${user.nombre || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Apellido *</label>
                                <input type="text" id="edit-user-apellido" value="${user.apellido || ''}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="edit-user-email" value="${user.email || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="edit-user-telefono" value="${user.telefono || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Rol *</label>
                            <select id="edit-user-rol" required>
                                <option value="cliente" ${user.rol === 'cliente' ? 'selected' : ''}>Cliente</option>
                                <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Estado</label>
                            <div class="form-check">
                                <input type="checkbox" id="edit-user-activo" ${user.activo !== false ? 'checked' : ''}>
                                <label for="edit-user-activo">Usuario activo</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="window.adminPanel.saveUserChanges(${user.id})" class="btn-primary">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    async saveUserChanges(userId) {
        const form = document.getElementById('edit-user-form');
        if (!form || !form.checkValidity()) {
            this.showNotification('⚠️ Completa todos los campos requeridos', 'warning');
            return;
        }
        
        const userData = {
            nombre: document.getElementById('edit-user-nombre').value,
            apellido: document.getElementById('edit-user-apellido').value,
            email: document.getElementById('edit-user-email').value,
            telefono: document.getElementById('edit-user-telefono').value,
            rol: document.getElementById('edit-user-rol').value,
            activo: document.getElementById('edit-user-activo').checked
        };
        
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Usuario actualizado correctamente', 'success');
                await this.loadUsers();
                const modalClose = document.querySelector('.edit-user-modal .modal-close');
                if (modalClose) modalClose.click();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    async deleteUser(userId) {
        if (userId === this.currentUser.id) {
            this.showNotification('❌ No puedes eliminar tu propia cuenta', 'warning');
            return;
        }
        
        if (!confirm('¿Estás seguro de desactivar este usuario? El usuario ya no podrá iniciar sesión.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Usuario desactivado correctamente', 'success');
                await this.loadUsers();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.showNotification('❌ Error desactivando usuario', 'error');
        }
    }

    async activateUser(userId) {
        if (!confirm('¿Estás seguro de reactivar este usuario?')) return;
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/activate`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Usuario reactivado correctamente', 'success');
                await this.loadUsers();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('❌ Error reactivando usuario:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    loadDiscountsSection() {
        return `
            <div class="discounts-section">
                <div class="section-header">
                    <h2>Gestión de Descuentos</h2>
                    <div class="admin-table-actions">
                        <button id="create-discount-btn" class="btn-primary">
                            <i class="fas fa-plus"></i> Crear Descuento
                        </button>
                    </div>
                </div>
                
                <!-- Filtros -->
                <div class="filters-container">
                    <select id="discount-type-filter" class="filter-select">
                        <option value="">Todos los tipos</option>
                        <option value="porcentaje">Porcentaje</option>
                        <option value="monto">Monto Fijo</option>
                        <option value="envio">Envío Gratis</option>
                    </select>
                    
                    <select id="discount-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="expired">Expirados</option>
                    </select>
                    
                    <input type="text" id="discount-search" placeholder="Buscar por código..." class="search-input">
                </div>
                
                <!-- Tabla de descuentos -->
                <div class="admin-table-container">
                    <div class="admin-table-header">
                        <h3 class="admin-table-title">Todos los Descuentos</h3>
                        <div class="admin-table-actions">
                            <button id="check-expired-discounts" class="btn-secondary">
                                <i class="fas fa-trash-alt"></i> Limpiar Expirados
                            </button>
                        </div>
                    </div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Aplicable a</th>
                                <th>Mínimo Compra</th>
                                <th>Usos</th>
                                <th>Expiración</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="discounts-table-body">
                            <tr>
                                <td colspan="9" class="loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando descuentos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadDiscounts() {
        try {
            const response = await fetch('/api/admin/discounts');
            if (response.ok) {
                this.discounts = await response.json();
            } else {
                this.discounts = this.getSampleDiscounts();
            }
            this.renderDiscountsTable();
            this.setupDiscountFilters();
        } catch (error) {
            console.error('Error cargando descuentos:', error);
            this.discounts = this.getSampleDiscounts();
            this.renderDiscountsTable();
        }
    }

    getSampleDiscounts() {
        return [
            {
                id: 1,
                codigo: "VERANO20",
                tipo: "porcentaje",
                valor: 20,
                aplicable_a: "todos",
                minimo_compra: 50,
                usos_totales: 100,
                usos_actuales: 34,
                expiracion: "2024-12-31",
                activo: true
            },
            {
                id: 2,
                codigo: "ENVIOGRATIS",
                tipo: "envio",
                valor: 100,
                aplicable_a: "todos",
                minimo_compra: 30,
                usos_totales: 200,
                usos_actuales: 89,
                expiracion: null,
                activo: true
            },
            {
                id: 3,
                codigo: "LEGGINGS10",
                tipo: "porcentaje",
                valor: 10,
                aplicable_a: "categoria",
                categoria: "leggings",
                minimo_compra: 0,
                usos_totales: 50,
                usos_actuales: 12,
                expiracion: "2024-10-31",
                activo: true
            }
        ];
    }

    renderDiscountsTable() {
        const tableBody = document.getElementById('discounts-table-body');
        if (!tableBody) return;
        
        if (!this.discounts || this.discounts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-cell">
                        <i class="fas fa-percentage"></i>
                        <p>No hay descuentos configurados</p>
                        <button onclick="window.adminPanel.openCreateDiscountModal()" class="btn-primary">
                            <i class="fas fa-plus"></i> Crear primer descuento
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = this.discounts.map(discount => {
            const statusClass = discount.activo ? 'status-active' : 'status-inactive';
            const statusText = discount.activo ? 'Activo' : 'Inactivo';
            const usagePercent = discount.usos_totales > 0 ? 
                Math.round((discount.usos_actuales / discount.usos_totales) * 100) : 0;
            
            let aplicableText = '';
            if (discount.aplicable_a === 'todos') {
                aplicableText = 'Todos los productos';
            } else if (discount.aplicable_a === 'categoria') {
                aplicableText = `Categoría: ${this.formatCategory(discount.categoria || '')}`;
            } else if (discount.aplicable_a === 'producto') {
                aplicableText = 'Producto específico';
            }
            
            // Verificar si el descuento ha expirado
            let isExpired = false;
            if (discount.expiracion) {
                const expirationDate = new Date(discount.expiracion);
                const today = new Date();
                isExpired = expirationDate < today;
            }
            
            return `
                <tr ${isExpired ? 'class="expired-discount"' : ''}>
                    <td>
                        <strong>${discount.codigo}</strong>
                        ${isExpired ? '<span class="expired-badge">Expirado</span>' : ''}
                    </td>
                    <td>
                        <span class="discount-type-badge ${discount.tipo}">
                            ${discount.tipo === 'porcentaje' ? 'Porcentaje' : 
                              discount.tipo === 'monto' ? 'Monto Fijo' : 'Envío Gratis'}
                        </span>
                    </td>
                    <td>
                        ${discount.tipo === 'porcentaje' ? 
                            `<span class="discount-value">${discount.valor}%</span>` : 
                            discount.tipo === 'envio' ? 
                            `<span class="discount-value">Envío Gratis</span>` :
                            `<span class="discount-value">$${discount.valor}</span>`}
                    </td>
                    <td>
                        <small>${aplicableText}</small>
                    </td>
                    <td>
                        ${discount.minimo_compra > 0 ? 
                            `<span class="min-purchase">$${discount.minimo_compra}</span>` : 
                            '<span class="no-min">Sin mínimo</span>'}
                    </td>
                    <td>
                        <div class="usage-container">
                            <div class="usage-bar">
                                <div class="usage-fill" style="width: ${usagePercent}%"></div>
                            </div>
                            <small>${discount.usos_actuales || 0}/${discount.usos_totales || 0}</small>
                        </div>
                    </td>
                    <td>
                        ${discount.expiracion ? 
                            new Date(discount.expiracion).toLocaleDateString() : 
                            '<span class="no-expiration">Sin expiración</span>'}
                    </td>
                    <td>
                        <span class="${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit" onclick="window.adminPanel.editDiscount(${discount.id})" 
                                    title="Editar descuento">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="window.adminPanel.deleteDiscount(${discount.id})" 
                                    title="Eliminar descuento">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupDiscountFilters() {
        const typeFilter = document.getElementById('discount-type-filter');
        const statusFilter = document.getElementById('discount-status-filter');
        const searchInput = document.getElementById('discount-search');
        
        const applyFilters = () => {
            let filtered = [...this.discounts];
            
            // Filtrar por tipo
            if (typeFilter && typeFilter.value) {
                filtered = filtered.filter(discount => discount.tipo === typeFilter.value);
            }
            
            // Filtrar por estado
            if (statusFilter && statusFilter.value) {
                const today = new Date();
                
                switch(statusFilter.value) {
                    case 'active':
                        filtered = filtered.filter(discount => 
                            discount.activo && 
                            (!discount.expiracion || new Date(discount.expiracion) >= today)
                        );
                        break;
                    case 'inactive':
                        filtered = filtered.filter(discount => !discount.activo);
                        break;
                    case 'expired':
                        filtered = filtered.filter(discount => 
                            discount.expiracion && new Date(discount.expiracion) < today
                        );
                        break;
                }
            }
            
            // Filtrar por búsqueda
            if (searchInput && searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase();
                filtered = filtered.filter(discount => 
                    discount.codigo.toLowerCase().includes(searchTerm)
                );
            }
            
            this.renderFilteredDiscounts(filtered);
        };
        
        if (typeFilter) typeFilter.addEventListener('change', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') applyFilters();
            });
        }
        
        // Botón para limpiar descuentos expirados
        const checkExpiredBtn = document.getElementById('check-expired-discounts');
        if (checkExpiredBtn) {
            checkExpiredBtn.addEventListener('click', () => this.checkExpiredDiscounts());
        }
    }

    renderFilteredDiscounts(filteredDiscounts) {
        const tableBody = document.getElementById('discounts-table-body');
        if (!tableBody) return;
        
        if (filteredDiscounts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-cell">
                        <i class="fas fa-search"></i>
                        <p>No se encontraron descuentos con los filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Reutilizar el mismo código de renderizado pero con descuentos filtrados
        const tempDiscounts = this.discounts;
        this.discounts = filteredDiscounts;
        this.renderDiscountsTable();
        this.discounts = tempDiscounts;
    }

    async checkExpiredDiscounts() {
        try {
            const response = await fetch('/api/admin/discounts/check-expired', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                await this.loadDiscounts();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error verificando descuentos expirados:', error);
            this.showNotification('❌ Error verificando descuentos expirados', 'error');
        }
    }

        // ========== FUNCIONES PARA MANEJAR IMÁGENES CON URLS ==========
    
    // Actualizar imagen principal desde URL
    updateMainImageFromUrl(url) {
        if (url && url.trim()) {
            this.currentImages.main = url.trim();
            const preview = document.getElementById('main-image-preview');
            if (preview) {
                preview.innerHTML = `
                    <img src="${url}" alt="Imagen principal">
                    <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeMainImage()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        }
    }

    // Remover imagen principal
    removeMainImage() {
        this.currentImages.main = '';
        const preview = document.getElementById('main-image-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="image-placeholder">
                    <i class="fas fa-camera"></i>
                    <span>URL de imagen principal</span>
                </div>
            `;
        }
        const input = document.getElementById('main-image-url');
        if (input) input.value = '';
    }

    // Actualizar imagen adicional desde URL
    updateAdditionalImageFromUrl(index, url) {
        if (!this.currentImages.additional) {
            this.currentImages.additional = [];
        }
        
        // Asegurar que el array tenga la longitud necesaria
        while (this.currentImages.additional.length <= index) {
            this.currentImages.additional.push('');
        }
        
        this.currentImages.additional[index] = url.trim();
        
        const preview = document.getElementById(`additional-image-preview-${index + 1}`);
        if (preview) {
            if (url.trim()) {
                preview.innerHTML = `
                    <img src="${url}" alt="Imagen ${index + 2}">
                    <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeAdditionalImageByIndex(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                preview.innerHTML = `
                    <div class="image-placeholder-small">
                        <i class="fas fa-image"></i>
                    </div>
                `;
            }
        }
    }

    // Remover imagen adicional por índice
    removeAdditionalImageByIndex(index) {
        if (this.currentImages.additional && this.currentImages.additional[index]) {
            this.currentImages.additional[index] = '';
            this.updateAdditionalImageFromUrl(index, '');
            
            // Limpiar el campo de texto correspondiente
            const input = document.getElementById(`additional-image-url-${index + 1}`);
            if (input) {
                input.value = '';
            }
        }
    }

    // ================= FUNCIONES DE PRODUCTOS =================

    async editProduct(productId) {
        const product = this.products.find(p => p.id == productId);
        if (product) {
            this.openProductModal(product);
        } else {
            this.showNotification('❌ Producto no encontrado', 'error');
        }
    }

    // En la función openProductModal, modifica la sección de imágenes:
    openProductModal(product = null) {
        const modal = document.createElement('div');
        modal.className = 'modal product-modal active';
        
        const isEdit = !!product;
        
        // Obtener imágenes del producto
        const productImages = product ? this.getProductImages(product) : [];
        const mainImage = productImages[0] || '';
        const additionalImages = productImages.slice(1, 6); // Máximo 5 imágenes adicionales
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i> ${isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="product-form">
                        <input type="hidden" id="product-id" value="${product?.id || ''}">
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-tag"></i> Nombre *</label>
                                <input type="text" id="nombre" value="${product?.nombre || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-dollar-sign"></i> Precio *</label>
                                <input type="number" id="precio" value="${product?.precio || ''}" step="0.01" min="0" required>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-folder"></i> Categoría *</label>
                                <select id="categoria" required>
                                    <option value="">Seleccionar</option>
                                    <option value="leggings" ${product?.categoria === 'leggings' ? 'selected' : ''}>Leggings</option>
                                    <option value="tops" ${product?.categoria === 'tops' ? 'selected' : ''}>Tops</option>
                                    <option value="sets" ${product?.categoria === 'sets' ? 'selected' : ''}>Sets</option>
                                    <option value="shorts" ${product?.categoria === 'shorts' ? 'selected' : ''}>Shorts</option>
                                    <option value="accesorios" ${product?.categoria === 'accesorios' ? 'selected' : ''}>Accesorios</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-box"></i> Stock *</label>
                                <input type="number" id="stock" value="${product?.stock || '0'}" min="0" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-align-left"></i> Descripción</label>
                            <textarea id="descripcion" rows="3">${product?.descripcion || ''}</textarea>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-ruler-vertical"></i> Tallas (separadas por comas)</label>
                                <input type="text" id="tallas" 
                                       value="${product?.tallas ? this.arrayToString(product.tallas) : 'XS,S,M,L'}"
                                       placeholder="Ej: XS, S, M, L">
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-palette"></i> Colores (separados por comas)</label>
                                <input type="text" id="colores" 
                                       value="${product?.colores ? this.arrayToString(product.colores) : 'Negro,Blanco,Gris'}"
                                       placeholder="Ej: Negro, Blanco, Gris">
                            </div>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-tshirt"></i> Material</label>
                                <input type="text" id="material" value="${product?.material || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-layer-group"></i> Colección</label>
                                <input type="text" id="coleccion" value="${product?.coleccion || ''}">
                            </div>
                        </div>
                        
                        <!-- Sección para múltiples imágenes con URLs -->
                        <div class="form-group">
                            <label><i class="fas fa-images"></i> Imágenes del Producto *</label>
                            <div class="images-container">
                                
                                <!-- Imagen Principal -->
                                <div class="main-image-section">
                                    <label>Imagen Principal (URL) *</label>
                                    <div class="image-upload-container">
                                        <div class="image-preview" id="main-image-preview">
                                            ${mainImage ? `
                                                <img src="${mainImage}" alt="Imagen principal">
                                                <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeMainImage()">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            ` : `
                                                <div class="image-placeholder">
                                                    <i class="fas fa-camera"></i>
                                                    <span>URL de imagen principal</span>
                                                </div>
                                            `}
                                        </div>
                                        <input type="text" 
                                               id="main-image-url" 
                                               value="${mainImage || ''}"
                                               placeholder="https://ejemplo.com/imagen-principal.jpg"
                                               class="form-control"
                                               onchange="window.adminPanel.updateMainImageFromUrl(this.value)">
                                        <small class="hint">Pega la URL de la imagen principal</small>
                                    </div>
                                </div>
                                
                                <!-- Imágenes Adicionales (5 campos específicos) -->
                                <div class="additional-images-section">
                                    <label>Imágenes Adicionales (Máximo 5)</label>
                                    <div class="additional-images-grid">
                                        ${[1, 2, 3, 4, 5].map(index => {
                                            const imgIndex = index - 1;
                                            const imgUrl = additionalImages[imgIndex] || '';
                                            return `
                                                <div class="additional-image-field">
                                                    <label>Imagen ${index + 1}:</label>
                                                    <div class="image-preview-small" id="additional-image-preview-${index}">
                                                        ${imgUrl ? `
                                                            <img src="${imgUrl}" alt="Imagen ${index + 1}">
                                                            <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeAdditionalImageByIndex(${imgIndex})">
                                                                <i class="fas fa-times"></i>
                                                            </button>
                                                        ` : `
                                                            <div class="image-placeholder-small">
                                                                <i class="fas fa-image"></i>
                                                            </div>
                                                        `}
                                                    </div>
                                                    <input type="text" 
                                                           id="additional-image-url-${index}" 
                                                           value="${imgUrl}"
                                                           placeholder="https://ejemplo.com/imagen-${index + 1}.jpg"
                                                           class="form-control"
                                                           onchange="window.adminPanel.updateAdditionalImageFromUrl(${imgIndex}, this.value)">
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                
                            </div>
                            <small class="hint">Asegúrate de que las URLs de las imágenes sean accesibles públicamente</small>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-barcode"></i> SKU</label>
                            <input type="text" id="sku" value="${product?.sku || `MAB-${Date.now().toString().slice(-6)}`}">
                        </div>
                        
                        <div class="form-group checkbox">
                            <input type="checkbox" id="activo" ${product?.activo !== false ? 'checked' : ''}>
                            <label for="activo"><i class="fas fa-check-circle"></i> Producto activo</label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="window.adminPanel.saveProduct()" class="btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Actualizar Producto' : 'Crear Producto'}
                    </button>
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Inicializar currentImages
        this.currentImages = {
            main: mainImage,
            additional: additionalImages
        };
        
        // Event listeners para cerrar
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    // Función auxiliar para convertir arrays a strings
    arrayToString(arrayData) {
        if (!arrayData) return '';
        if (Array.isArray(arrayData)) return arrayData.join(', ');
        if (typeof arrayData === 'string') {
            try {
                const parsed = JSON.parse(arrayData);
                if (Array.isArray(parsed)) return parsed.join(', ');
            } catch {
                return arrayData;
            }
        }
        return '';
    }

    // Actualizar imagen principal desde URL
    updateMainImageFromUrl(url) {
        if (url && url.trim()) {
            this.currentImages.main = url.trim();
            this.updateMainImagePreview(url.trim());
        }
    }

    // Actualizar imagen adicional desde URL
    updateAdditionalImageFromUrl(index, url) {
        if (!this.currentImages.additional) {
            this.currentImages.additional = [];
        }
        
        // Asegurar que el array tenga la longitud necesaria
        while (this.currentImages.additional.length <= index) {
            this.currentImages.additional.push('');
        }
        
        this.currentImages.additional[index] = url.trim();
        this.updateAdditionalImagePreview(index, url.trim());
    }

    // Actualizar vista previa de imagen adicional específica
    updateAdditionalImagePreview(index, url) {
        const preview = document.getElementById(`additional-image-preview-${index + 1}`);
        if (preview) {
            preview.innerHTML = url ? `
                <img src="${url}" alt="Imagen ${index + 2}">
                <button type="button" class="remove-image-btn" onclick="window.adminPanel.removeAdditionalImageByIndex(${index})">
                    <i class="fas fa-times"></i>
                </button>
            ` : `
                <div class="image-placeholder-small">
                    <i class="fas fa-image"></i>
                </div>
            `;
        }
    }

    // Remover imagen adicional por índice
    removeAdditionalImageByIndex(index) {
        if (this.currentImages.additional && this.currentImages.additional[index]) {
            this.currentImages.additional[index] = '';
            this.updateAdditionalImagePreview(index, '');
            
            // Limpiar el campo de texto
            const input = document.getElementById(`additional-image-url-${index + 1}`);
            if (input) {
                input.value = '';
            }
        }
    }

    // MODIFICAR la función saveProduct para enviar correctamente las imágenes:
    async saveProduct() {
        const form = document.getElementById('product-form');
        if (!form || !form.checkValidity()) {
            this.showNotification('⚠️ Completa todos los campos requeridos', 'warning');
            return;
        }
        
        const productId = document.getElementById('product-id').value;
        const isEdit = !!productId;
        
        // Recopilar URLs de imágenes adicionales (máximo 5)
        const additionalImages = [];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`additional-image-url-${i}`);
            if (input && input.value && input.value.trim() !== '') {
                const imgUrl = input.value.trim();
                // Validar que sea una URL válida
                if (imgUrl.startsWith('http://') || 
                imgUrl.startsWith('https://') || 
                imgUrl.startsWith('file://') ||
                imgUrl.startsWith('data:image/')) {
                additionalImages.push(imgUrl);
            }
            }
        }
        
        const productData = {
            nombre: document.getElementById('nombre').value,
            descripcion: document.getElementById('descripcion').value,
            precio: parseFloat(document.getElementById('precio').value) || 0,
            categoria: document.getElementById('categoria').value,
            stock: parseInt(document.getElementById('stock').value) || 0,
            tallas: document.getElementById('tallas').value,
            colores: document.getElementById('colores').value,
            material: document.getElementById('material').value || '',
            coleccion: document.getElementById('coleccion').value || '',
            sku: document.getElementById('sku').value,
            activo: document.getElementById('activo').checked,
            imagen: document.getElementById('main-image-url').value || '/public/images/default-product.jpg',
            imagenes_adicionales: additionalImages
        };
        
        console.log('📤 Guardando producto:', {
            nombre: productData.nombre,
            imagen: productData.imagen,
            imagenes_adicionales: productData.imagenes_adicionales,
            cantidad: productData.imagenes_adicionales.length
        });
        
        try {
            const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(
                    isEdit ? '✅ Producto actualizado' : '✅ Producto creado', 
                    'success'
                );
                
                // Cerrar modal
                const modalClose = document.querySelector('.product-modal .modal-close');
                if (modalClose) modalClose.click();
                
                // Recargar productos en la tabla
                await this.loadProducts();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error guardando producto');
            }
        } catch (error) {
            console.error('❌ Error guardando producto:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de eliminar este producto? Se marcará como inactivo pero no se eliminará permanentemente.')) return;
        
        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message || '✅ Producto eliminado', 'success');
                await this.loadProducts();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    // ================= FUNCIONES DE DESCUENTOS PARA PRODUCTOS =================

    async openDiscountModal(productId) {
        try {
            // Primero cargar los datos actuales del producto
            const productResponse = await fetch(`/api/products/${productId}`);
            if (!productResponse.ok) throw new Error('Producto no encontrado');
            
            const product = await productResponse.json();
            
            const modal = document.createElement('div');
            modal.className = 'modal discount-modal active';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-percentage"></i> Gestionar Descuento: ${product.nombre}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="product-discount-form">
                            <div class="form-group">
                                <label>Tipo de Descuento *</label>
                                <div class="discount-type-selector">
                                    <label class="form-check">
                                        <input type="radio" name="discountType" value="percent" 
                                               ${!product.descuento_precio ? 'checked' : ''}>
                                        <span>Porcentaje (%)</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" name="discountType" value="fixed"
                                               ${product.descuento_precio ? 'checked' : ''}>
                                        <span>Precio Fijo ($)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-group" id="percent-discount-group" 
                                 style="display: ${!product.descuento_precio ? 'block' : 'none'}">
                                <label>Porcentaje de Descuento *</label>
                                <input type="number" id="discount-percent" 
                                       min="1" max="100" 
                                       value="${product.descuento_porcentaje || 10}" 
                                       class="form-control" required>
                                <small class="hint">Precio actual: $${parseFloat(product.precio).toFixed(2)}</small>
                            </div>
                            
                            <div class="form-group" id="fixed-discount-group" 
                                 style="display: ${product.descuento_precio ? 'block' : 'none'}">
                                <label>Precio con Descuento *</label>
                                <input type="number" id="discount-price" 
                                       min="0" step="0.01" 
                                       value="${product.descuento_precio || product.precio}" 
                                       class="form-control" required>
                                <small class="hint">Precio actual: $${parseFloat(product.precio).toFixed(2)}</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Fecha de Expiración (opcional)</label>
                                <input type="date" id="discount-expires" 
                                       value="${product.descuento_expiracion || ''}" 
                                       class="form-control">
                                <small class="hint">Dejar vacío para sin expiración</small>
                            </div>
                            
                            ${product.tiene_descuento ? `
                            <div class="current-discount-info">
                                <h4><i class="fas fa-info-circle"></i> Descuento Actual:</h4>
                                ${product.descuento_porcentaje ? `
                                    <p>• <strong>${product.descuento_porcentaje}% de descuento</strong></p>
                                ` : ''}
                                ${product.descuento_precio ? `
                                    <p>• <strong>Precio con descuento: $${parseFloat(product.descuento_precio).toFixed(2)}</strong></p>
                                ` : ''}
                                ${product.descuento_expiracion ? `
                                    <p>• <strong>Expira: ${new Date(product.descuento_expiracion).toLocaleDateString()}</strong></p>
                                ` : ''}
                            </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button onclick="window.adminPanel.applyProductDiscount(${productId})" class="btn-primary">
                            <i class="fas fa-save"></i> ${product.tiene_descuento ? 'Actualizar Descuento' : 'Aplicar Descuento'}
                        </button>
                        ${product.tiene_descuento ? `
                        <button onclick="window.adminPanel.removeProductDiscount(${productId})" class="btn-danger">
                            <i class="fas fa-trash"></i> Quitar Descuento
                        </button>
                        ` : ''}
                        <button class="btn-secondary close-modal">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Configurar tipo de descuento según lo que ya tenga el producto
            const discountTypeRadios = modal.querySelectorAll('input[name="discountType"]');
            const percentGroup = modal.querySelector('#percent-discount-group');
            const fixedGroup = modal.querySelector('#fixed-discount-group');
            
            discountTypeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const type = e.target.value;
                    
                    if (percentGroup) percentGroup.style.display = type === 'percent' ? 'block' : 'none';
                    if (fixedGroup) fixedGroup.style.display = type === 'fixed' ? 'block' : 'none';
                    
                    // Actualizar campos requeridos
                    const percentInput = modal.querySelector('#discount-percent');
                    const priceInput = modal.querySelector('#discount-price');
                    
                    if (percentInput) percentInput.required = type === 'percent';
                    if (priceInput) priceInput.required = type === 'fixed';
                });
            });
            
            const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => modal.remove());
            });
            
        } catch (error) {
            console.error('Error cargando datos del producto:', error);
            this.showNotification('❌ Error cargando datos del producto', 'error');
        }
    }

    async applyProductDiscount(productId) {
        const discountType = document.querySelector('input[name="discountType"]:checked');
        if (!discountType) {
            this.showNotification('❌ Selecciona un tipo de descuento', 'warning');
            return;
        }
        
        const discountData = {
            discount_type: discountType.value
        };
        
        if (discountType.value === 'percent') {
            const percentInput = document.getElementById('discount-percent');
            if (!percentInput || !percentInput.value) {
                this.showNotification('❌ Ingresa un porcentaje de descuento', 'warning');
                return;
            }
            
            const discountPercent = parseFloat(percentInput.value);
            if (discountPercent < 1 || discountPercent > 100) {
                this.showNotification('❌ El porcentaje debe estar entre 1% y 100%', 'warning');
                return;
            }
            
            discountData.discount_percent = discountPercent;
            
        } else if (discountType.value === 'fixed') {
            const priceInput = document.getElementById('discount-price');
            if (!priceInput || !priceInput.value) {
                this.showNotification('❌ Ingresa un precio con descuento', 'warning');
                return;
            }
            
            discountData.discount_price = parseFloat(priceInput.value);
        }
        
        const expiresInput = document.getElementById('discount-expires');
        if (expiresInput && expiresInput.value) {
            discountData.discount_expires = expiresInput.value;
        }
        
        try {
            console.log('Enviando datos de descuento:', discountData);
            
            const response = await fetch(`/api/admin/products/${productId}/discount`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(discountData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Respuesta del servidor:', result);
                this.showNotification(result.message || '✅ Descuento aplicado correctamente', 'success');
                
                const modalClose = document.querySelector('.discount-modal .modal-close');
                if (modalClose) modalClose.click();
                await this.loadProducts();
            } else {
                const errorText = await response.text();
                console.error('Error en respuesta:', errorText);
                let errorMessage = 'Error en la respuesta del servidor';
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error aplicando descuento:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    async removeProductDiscount(productId) {
        if (!confirm('¿Estás seguro de quitar el descuento de este producto?')) return;
        
        try {
            const response = await fetch(`/api/admin/products/${productId}/discount`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message || '✅ Descuento eliminado correctamente', 'success');
                
                const modalClose = document.querySelector('.discount-modal .modal-close');
                if (modalClose) modalClose.click();
                await this.loadProducts();
            } else {
                const errorText = await response.text();
                let errorMessage = 'Error en la respuesta del servidor';
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error eliminando descuento:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    openCreateDiscountModal() {
        const modal = document.createElement('div');
        modal.className = 'modal create-discount-modal active';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Crear Nuevo Descuento</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-discount-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-tag"></i> Código del Descuento *</label>
                                <input type="text" id="discount-code" 
                                       placeholder="Ej: VERANO20" 
                                       required 
                                       pattern="[A-Z0-9]{3,20}"
                                       title="Solo mayúsculas y números, 3-20 caracteres">
                                <small class="hint">Los clientes usarán este código al pagar</small>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-percentage"></i> Tipo de Descuento *</label>
                                <select id="discount-type" required>
                                    <option value="">Seleccionar</option>
                                    <option value="porcentaje">Porcentaje (%)</option>
                                    <option value="monto">Monto Fijo ($)</option>
                                    <option value="envio">Envío Gratis</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="discount-value-group">
                                <label><i class="fas fa-dollar-sign"></i> Valor del Descuento *</label>
                                <input type="number" id="discount-value" 
                                       min="1" max="100" 
                                       step="0.01" required>
                                <small id="value-description" class="hint">Porcentaje de descuento</small>
                            </div>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-bullseye"></i> Aplicable a *</label>
                                <select id="discount-applies-to" required>
                                    <option value="todos">Todos los productos</option>
                                    <option value="categoria">Categoría específica</option>
                                    <option value="producto">Producto específico</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="category-select-group" style="display: none;">
                                <label><i class="fas fa-folder"></i> Categoría</label>
                                <select id="discount-category">
                                    <option value="">Seleccionar</option>
                                    <option value="leggings">Leggings</option>
                                    <option value="tops">Tops</option>
                                    <option value="sets">Sets</option>
                                    <option value="shorts">Shorts</option>
                                    <option value="accesorios">Accesorios</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="product-select-group" style="display: none;">
                                <label><i class="fas fa-box"></i> Producto</label>
                                <select id="discount-product">
                                    <option value="">Seleccionar</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-shopping-cart"></i> Mínimo de Compra ($)</label>
                                <input type="number" id="discount-min-purchase" 
                                       min="0" step="0.01" value="0">
                                <small class="hint">Dejar en 0 para sin mínimo</small>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-redo"></i> Usos Totales</label>
                                <input type="number" id="discount-uses-total" 
                                       min="1" value="100">
                                <small class="hint">Cantidad máxima de veces que se puede usar</small>
                            </div>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-calendar-times"></i> Fecha de Expiración</label>
                                <input type="date" id="discount-expiration">
                                <small class="hint">Dejar vacío para sin expiración</small>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-power-off"></i> Estado</label>
                                <div class="form-check">
                                    <input type="checkbox" id="discount-active" checked>
                                    <label for="discount-active">Descuento activo</label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="window.adminPanel.saveNewDiscount()" class="btn-primary">
                        <i class="fas fa-save"></i> Crear Descuento
                    </button>
                    <button class="btn-secondary close-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar dinámicamente
        this.setupCreateDiscountModal(modal);
        
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => modal.remove());
        });
    }

    setupCreateDiscountModal(modal) {
        const discountTypeSelect = modal.querySelector('#discount-type');
        const appliesToSelect = modal.querySelector('#discount-applies-to');
        const categoryGroup = modal.querySelector('#category-select-group');
        const productGroup = modal.querySelector('#product-select-group');
        
        // Cambiar descripción según tipo
        if (discountTypeSelect) {
            discountTypeSelect.addEventListener('change', (e) => {
                const valueInput = modal.querySelector('#discount-value');
                const description = modal.querySelector('#value-description');
                
                if (!valueInput || !description) return;
                
                switch(e.target.value) {
                    case 'porcentaje':
                        valueInput.min = 1;
                        valueInput.max = 100;
                        valueInput.placeholder = "Ej: 20";
                        description.textContent = "Porcentaje de descuento (1-100%)";
                        description.className = "hint";
                        break;
                    case 'monto':
                        valueInput.min = 1;
                        valueInput.max = 999;
                        valueInput.placeholder = "Ej: 15.99";
                        description.textContent = "Monto fijo en dólares";
                        description.className = "hint";
                        break;
                    case 'envio':
                        valueInput.value = 100;
                        valueInput.readOnly = true;
                        description.textContent = "100% de descuento en envío";
                        description.className = "hint";
                        break;
                }
            });
        }
        
        // Mostrar/ocultar selectores según "Aplicable a"
        if (appliesToSelect) {
            appliesToSelect.addEventListener('change', (e) => {
                if (categoryGroup) {
                    categoryGroup.style.display = e.target.value === 'categoria' ? 'block' : 'none';
                }
                if (productGroup) {
                    productGroup.style.display = e.target.value === 'producto' ? 'block' : 'none';
                }
                
                if (e.target.value === 'producto') {
                    this.loadProductsForDiscount(modal);
                }
            });
        }
    }

    async loadProductsForDiscount(modal) {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            
            const select = modal.querySelector('#discount-product');
            if (!select) return;
            
            select.innerHTML = '<option value="">Seleccionar</option>';
            
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.nombre} ($${parseFloat(product.precio || 0).toFixed(2)})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    }

    async saveNewDiscount() {
        const form = document.getElementById('create-discount-form');
        if (!form || !form.checkValidity()) {
            this.showNotification('⚠️ Completa todos los campos requeridos', 'warning');
            return;
        }
        
        const discountData = {
            codigo: document.getElementById('discount-code').value.toUpperCase(),
            tipo: document.getElementById('discount-type').value,
            valor: parseFloat(document.getElementById('discount-value').value),
            aplicable_a: document.getElementById('discount-applies-to').value,
            minimo_compra: parseFloat(document.getElementById('discount-min-purchase').value) || 0,
            usos_totales: parseInt(document.getElementById('discount-uses-total').value) || 100,
            activo: document.getElementById('discount-active').checked
        };
        
        // Agregar campos específicos según el tipo
        const appliesTo = discountData.aplicable_a;
        if (appliesTo === 'categoria') {
            discountData.categoria = document.getElementById('discount-category')?.value || '';
        } else if (appliesTo === 'producto') {
            discountData.producto_id = document.getElementById('discount-product')?.value || '';
        }
        
        const expiration = document.getElementById('discount-expiration')?.value;
        if (expiration) {
            discountData.expiracion = expiration;
        }
        
        try {
            const response = await fetch('/api/admin/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discountData)
            });
            
            if (response.ok) {
                this.showNotification('✅ Descuento creado exitosamente', 'success');
                const modalClose = document.querySelector('.create-discount-modal .modal-close');
                if (modalClose) modalClose.click();
                await this.loadDiscounts();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error creando descuento');
            }
        } catch (error) {
            console.error('Error creando descuento:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        }
    }

    async editDiscount(discountId) {
        const discount = this.discounts.find(d => d.id == discountId);
        if (!discount) {
            this.showNotification('❌ Descuento no encontrado', 'error');
            return;
        }
        
        // Aquí puedes implementar la edición de descuentos
        this.showNotification('⚠️ Función de edición de descuentos en desarrollo', 'warning');
    }

    async deleteDiscount(discountId) {
        if (!confirm('¿Estás seguro de eliminar este descuento?')) return;
        
        try {
            const response = await fetch(`/api/admin/discounts/${discountId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('✅ Descuento eliminado', 'success');
                await this.loadDiscounts();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            this.showNotification('❌ Error eliminando descuento', 'error');
        }
    }

    // ================= FUNCIONES AUXILIARES =================

    arrayToString(arrayData) {
        if (!arrayData) return '';
        if (Array.isArray(arrayData)) return arrayData.join(', ');
        if (typeof arrayData === 'string') {
            try {
                const parsed = JSON.parse(arrayData);
                if (Array.isArray(parsed)) return parsed.join(', ');
            } catch {
                return arrayData;
            }
        }
        return '';
    }

    formatArray(arrayData) {
        if (!arrayData) return '-';
        const str = this.arrayToString(arrayData);
        return str.length > 30 ? str.substring(0, 30) + '...' : str;
    }

    formatCategory(category) {
        const categories = {
            'leggings': 'Leggings',
            'tops': 'Tops',
            'sets': 'Sets',
            'shorts': 'Shorts',
            'accesorios': 'Accesorios'
        };
        return categories[category] || category;
    }

    formatOrderStatus(status) {
        const statusMap = {
            'pendiente': 'Pendiente',
            'procesando': 'Procesando',
            'enviado': 'Enviado',
            'entregado': 'Entregado',
            'cancelado': 'Cancelado'
        };
        return statusMap[status] || status || 'Pendiente';
    }

    setupSectionEventListeners(section) {
        switch (section) {
            case 'products':
                const addProductBtn = document.getElementById('add-product-btn');
                if (addProductBtn) {
                    addProductBtn.addEventListener('click', () => this.openProductModal());
                }
                break;
                
            case 'discounts':
                const createDiscountBtn = document.getElementById('create-discount-btn');
                if (createDiscountBtn) {
                    createDiscountBtn.addEventListener('click', () => this.openCreateDiscountModal());
                }
                break;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                notification.remove();
            };
        }
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    

    // Export functions (puedes implementarlas después)
    exportProducts() {
        this.showNotification('⚠️ Función de exportación en desarrollo', 'warning');
    }

    exportOrders() {
        this.showNotification('⚠️ Función de exportación en desarrollo', 'warning');
    }

    exportUsers() {
        this.showNotification('⚠️ Función de exportación en desarrollo', 'warning');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});