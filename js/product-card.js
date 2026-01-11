// ============================================
// COMPONENTE DE TARJETA DE PRODUCTO
// ============================================

class ProductCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.product = null;
    }

    static get observedAttributes() {
        return ['product'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'product' && newValue) {
            this.product = JSON.parse(newValue);
            this.render();
        }
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        if (!this.product) {
            this.shadowRoot.innerHTML = `
                <style>
                    ${this.getStyles()}
                    .loading {
                        text-align: center;
                        padding: 20px;
                    }
                </style>
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            `;
            return;
        }

        const { id, nombre, precio, categoria, imagen, stock } = this.product;
        const outOfStock = stock <= 0;
        const lowStock = stock <= 5 && stock > 0;

        this.shadowRoot.innerHTML = `
            <style>${this.getStyles()}</style>
            
            <div class="product-card ${outOfStock ? 'out-of-stock' : ''}">
                <div class="product-img">
                    <img src="${imagen || '/public/images/default-product.jpg'}" 
                         alt="${nombre}"
                         onerror="this.src='/public/images/default-product.jpg'">
                    
                    ${lowStock ? `
                        <span class="stock-badge">
                            <i class="fas fa-exclamation-circle"></i> Últimas ${stock} unidades
                        </span>
                    ` : ''}
                    
                    ${outOfStock ? `
                        <span class="stock-badge out-of-stock">
                            <i class="fas fa-times-circle"></i> Agotado
                        </span>
                    ` : ''}
                    
                    <button class="quick-view" data-id="${id}">
                        <i class="fas fa-eye"></i> Vista Rápida
                    </button>
                    
                    <button class="wishlist-btn" data-id="${id}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                
                <div class="product-info">
                    <h3 class="product-title">${nombre}</h3>
                    <p class="product-category">${this.formatCategory(categoria)}</p>
                    <p class="product-price">$${parseFloat(precio).toFixed(2)}</p>
                    
                    <div class="product-actions">
                        <button class="add-to-cart" 
                                data-id="${id}"
                                ${outOfStock ? 'disabled' : ''}>
                            ${outOfStock ? 'Agotado' : 'Agregar al Carrito'}
                        </button>
                        
                        <button class="view-details" data-id="${id}">
                            Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
            :host {
                display: block;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Helvetica Neue', 'Arial', sans-serif;
            }
            
            .product-card {
                background: #fff;
                border: 1px solid #e8e8e8;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .product-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-color: #000;
            }
            
            .product-card.out-of-stock {
                opacity: 0.7;
            }
            
            .product-img {
                position: relative;
                width: 100%;
                height: 300px;
                overflow: hidden;
                background-color: #f8f8f8;
            }
            
            .product-img img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.6s ease;
            }
            
            .product-card:hover .product-img img {
                transform: scale(1.05);
            }
            
            .stock-badge {
                position: absolute;
                top: 15px;
                left: 15px;
                background: #000;
                color: #fff;
                padding: 5px 10px;
                font-size: 11px;
                font-weight: 500;
                letter-spacing: 1px;
                text-transform: uppercase;
                z-index: 2;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .stock-badge.out-of-stock {
                background: #ff3b30;
            }
            
            .quick-view {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                background: rgba(0,0,0,0.9);
                color: #fff;
                border: none;
                padding: 12px 20px;
                font-size: 12px;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
                opacity: 0;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 2;
            }
            
            .product-card:hover .quick-view {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            
            .quick-view:hover {
                background: #000;
            }
            
            .wishlist-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: #fff;
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(-10px);
                z-index: 2;
            }
            
            .product-card:hover .wishlist-btn {
                opacity: 1;
                transform: translateY(0);
            }
            
            .wishlist-btn:hover {
                background: #000;
                color: #fff;
            }
            
            .wishlist-btn.active {
                background: #ff3b30;
                color: #fff;
                opacity: 1;
                transform: translateY(0);
            }
            
            .wishlist-btn.active i {
                font-weight: 900;
            }
            
            .product-info {
                padding: 20px;
                text-align: center;
            }
            
            .product-title {
                font-size: 14px;
                font-weight: 400;
                letter-spacing: 1px;
                margin-bottom: 8px;
                text-transform: uppercase;
                line-height: 1.4;
            }
            
            .product-category {
                color: #666;
                font-size: 12px;
                margin-bottom: 15px;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            
            .product-price {
                font-size: 16px;
                font-weight: 400;
                letter-spacing: 1px;
                margin-bottom: 20px;
            }
            
            .product-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .add-to-cart {
                background: #000;
                color: #fff;
                border: 1px solid #000;
                padding: 12px;
                font-size: 12px;
                letter-spacing: 2px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .add-to-cart:hover:not(:disabled) {
                background: transparent;
                color: #000;
            }
            
            .add-to-cart:disabled {
                background: #e8e8e8;
                border-color: #e8e8e8;
                color: #999;
                cursor: not-allowed;
            }
            
            .view-details {
                background: transparent;
                color: #000;
                border: 1px solid #e8e8e8;
                padding: 12px;
                font-size: 12px;
                letter-spacing: 2px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .view-details:hover {
                border-color: #000;
                background: #000;
                color: #fff;
            }
            
            @media (max-width: 768px) {
                .product-img {
                    height: 250px;
                }
                
                .quick-view {
                    padding: 10px 15px;
                    font-size: 11px;
                }
            }
        `;
    }

    formatCategory(category) {
        const categories = {
            'leggings': 'Leggings',
            'tops': 'Tops',
            'sets': 'Sets',
            'shorts': 'Shorts',
            'accesorios': 'Accesorios'
        };
        return categories[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    setupEventListeners() {
        // Event delegation para manejar clics
        this.shadowRoot.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.classList.contains('add-to-cart') || target.closest('.add-to-cart')) {
                this.handleAddToCart(e);
            }
            else if (target.classList.contains('view-details') || target.closest('.view-details')) {
                this.handleViewDetails(e);
            }
            else if (target.classList.contains('quick-view') || target.closest('.quick-view')) {
                this.handleQuickView(e);
            }
            else if (target.classList.contains('wishlist-btn') || target.closest('.wishlist-btn')) {
                this.handleWishlist(e);
            }
        });
    }

    handleAddToCart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.product || this.product.stock <= 0) return;
        
        const productId = this.product.id;
        
        // Disparar evento personalizado
        this.dispatchEvent(new CustomEvent('add-to-cart', {
            detail: { 
                product: this.product,
                quantity: 1 
            },
            bubbles: true,
            composed: true
        }));
        
        // Efecto visual
        const button = this.shadowRoot.querySelector('.add-to-cart');
        if (button) {
            const originalText = button.textContent;
            button.textContent = '¡Agregado!';
            button.style.backgroundColor = '#28a745';
            button.style.borderColor = '#28a745';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.style.borderColor = '';
            }, 1500);
        }
    }

    handleViewDetails(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.product) return;
        
        // Navegar a la página de detalles del producto
        window.location.href = `/product-detail.html?id=${this.product.id}`;
    }

    handleQuickView(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.product) return;
        
        // Disparar evento para mostrar vista rápida
        this.dispatchEvent(new CustomEvent('quick-view', {
            detail: { product: this.product },
            bubbles: true,
            composed: true
        }));
    }

    async handleWishlist(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.product) return;
        
        const button = this.shadowRoot.querySelector('.wishlist-btn');
        if (!button) return;
        
        // Verificar si el usuario está autenticado
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (!data.authenticated) {
                // Redirigir a login si no está autenticado
                window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
                return;
            }
            
            // Alternar estado del botón
            const isActive = button.classList.contains('active');
            
            // Actualizar UI inmediatamente para mejor experiencia de usuario
            if (isActive) {
                button.classList.remove('active');
                button.innerHTML = '<i class="far fa-heart"></i>';
            } else {
                button.classList.add('active');
                button.innerHTML = '<i class="fas fa-heart"></i>';
            }
            
            // Hacer la petición al servidor
            const method = isActive ? 'DELETE' : 'POST';
            const responseWishlist = await fetch(`/api/users/${data.user.id}/wishlist/${this.product.id}`, {
                method: method
            });
            
            if (!responseWishlist.ok) {
                // Revertir cambio si hay error
                if (isActive) {
                    button.classList.add('active');
                    button.innerHTML = '<i class="fas fa-heart"></i>';
                } else {
                    button.classList.remove('active');
                    button.innerHTML = '<i class="far fa-heart"></i>';
                }
                
                throw new Error('Error actualizando wishlist');
            }
            
            // Mostrar notificación
            this.dispatchEvent(new CustomEvent('wishlist-updated', {
                detail: { 
                    product: this.product,
                    added: !isActive 
                },
                bubbles: true,
                composed: true
            }));
            
        } catch (error) {
            console.error('Error actualizando wishlist:', error);
            
            // Disparar evento de error
            this.dispatchEvent(new CustomEvent('wishlist-error', {
                detail: { error: error.message },
                bubbles: true,
                composed: true
            }));
        }
    }

    // Métodos públicos para actualizar el estado
    updateStock(stock) {
        if (this.product) {
            this.product.stock = stock;
            this.render();
        }
    }

    updatePrice(price) {
        if (this.product) {
            this.product.precio = price;
            this.render();
        }
    }

    markAsWishlisted(isWishlisted) {
        const button = this.shadowRoot.querySelector('.wishlist-btn');
        if (button) {
            if (isWishlisted) {
                button.classList.add('active');
                button.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                button.classList.remove('active');
                button.innerHTML = '<i class="far fa-heart"></i>';
            }
        }
    }
}

// Definir el custom element
customElements.define('product-card', ProductCard);

// Exportar funciones de utilidad
window.ProductCard = {
    create: (product, container) => {
        const card = document.createElement('product-card');
        card.setAttribute('product', JSON.stringify(product));
        if (container) {
            container.appendChild(card);
        }
        return card;
    },
    
    createMultiple: (products, container) => {
        return products.map(product => {
            const card = document.createElement('product-card');
            card.setAttribute('product', JSON.stringify(product));
            if (container) {
                container.appendChild(card);
            }
            return card;
        });
    },
    
    // Event listeners globales para componentes product-card
    setupGlobalListeners: () => {
        document.addEventListener('add-to-cart', (e) => {
            const { product, quantity } = e.detail;
            console.log('Agregar al carrito:', product.nombre, quantity);
            
            // Integración con el carrito principal
            if (window.MabelApp && window.MabelApp.addToCart) {
                window.MabelApp.addToCart(product, quantity);
            }
        });
        
        document.addEventListener('quick-view', (e) => {
            const { product } = e.detail;
            console.log('Vista rápida:', product.nombre);
            
            // Mostrar modal de vista rápida
            if (window.ProductQuickView) {
                window.ProductQuickView.show(product);
            }
        });
        
        document.addEventListener('wishlist-updated', (e) => {
            const { product, added } = e.detail;
            console.log(`Producto ${added ? 'agregado a' : 'eliminado de'} wishlist:`, product.nombre);
            
            // Mostrar notificación
            if (window.MabelApp && window.MabelApp.showNotification) {
                window.MabelApp.showNotification(
                    `Producto ${added ? 'agregado a' : 'eliminado de'} tu wishlist`,
                    'success'
                );
            }
        });
    }
};

// Inicializar listeners globales cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.ProductCard.setupGlobalListeners();
});