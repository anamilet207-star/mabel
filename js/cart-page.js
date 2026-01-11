// ============================================
// SCRIPT PARA PÁGINA DE CARRITO
// ============================================

class CartPage {
    constructor() {
        this.cart = [];
        this.init();
    }
    
    async init() {
        console.log('🛒 Inicializando página de carrito...');
        
        // Cargar carrito desde localStorage
        this.loadCart();
        
        // Renderizar carrito
        this.renderCart();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Actualizar UI
        this.updateUI();
        
        console.log('✅ Página de carrito inicializada');
    }
    
    loadCart() {
        const savedCart = localStorage.getItem('mabel_cart');
        this.cart = savedCart ? JSON.parse(savedCart) : [];
    }
    
    saveCart() {
        localStorage.setItem('mabel_cart', JSON.stringify(this.cart));
        this.updateCartCount();
    }
    
    renderCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        
        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-bag fa-3x"></i>
                    <h2>Tu carrito está vacío</h2>
                    <p>Agrega productos para continuar con tu compra</p>
                    <a href="/shop" class="btn">Ver Tienda</a>
                </div>
            `;
            return;
        }
        
        cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="item-image">
                    <img src="${item.imagen || '/public/images/default-product.jpg'}" 
                         alt="${item.nombre}"
                         onerror="this.src='/public/images/default-product.jpg'">
                </div>
                
                <div class="item-details">
                    <h3>${item.nombre}</h3>
                    <p class="item-category">${this.formatCategory(item.categoria)}</p>
                    <p class="item-price">$${parseFloat(item.precio).toFixed(2)}</p>
                    
                    <div class="item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn decrease" data-id="${item.id}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   class="quantity-input" 
                                   value="${item.quantity}" 
                                   min="1" 
                                   max="${item.stock || 99}"
                                   data-id="${item.id}">
                            <button class="quantity-btn increase" data-id="${item.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        
                        <button class="remove-item" data-id="${item.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
                
                <div class="item-total">
                    <p class="price">$${(item.precio * item.quantity).toFixed(2)}</p>
                    <p class="subtotal">${item.quantity} x $${parseFloat(item.precio).toFixed(2)}</p>
                </div>
            </div>
        `).join('');
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
    
    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
        const shipping = subtotal > 50 || this.cart.length === 0 ? 0 : 5.99;
        const total = subtotal + shipping;
        
        return { subtotal, shipping, total };
    }
    
    updateSummary() {
        const { subtotal, shipping, total } = this.calculateTotals();
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shipping').textContent = shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
        
        // Habilitar/deshabilitar botón de checkout
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = this.cart.length === 0;
        checkoutBtn.textContent = this.cart.length === 0 ? 'Carrito Vacío' : 'Proceder al Pago';
    }
    
    updateCartCount() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElements = document.querySelectorAll('.cart-count');
        
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
            element.style.display = totalItems > 0 ? 'inline-block' : 'none';
        });
    }
    
    updateUI() {
        this.updateSummary();
        this.updateCartCount();
    }
    
    updateQuantity(productId, newQuantity) {
        const item = this.cart.find(item => item.id == productId);
        if (!item) return;
        
        // Validar que no exceda el stock
        const maxStock = item.stock || 99;
        newQuantity = Math.min(Math.max(1, newQuantity), maxStock);
        
        item.quantity = newQuantity;
        this.saveCart();
        this.renderCart();
        this.setupItemListeners();
        this.updateUI();
        
        // Mostrar notificación si se alcanzó el máximo stock
        if (newQuantity >= maxStock) {
            this.showNotification('Cantidad máxima alcanzada', 'info');
        }
    }
    
    removeItem(productId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este producto del carrito?')) {
            return;
        }
        
        this.cart = this.cart.filter(item => item.id != productId);
        this.saveCart();
        this.renderCart();
        this.updateUI();
        
        this.showNotification('Producto eliminado del carrito', 'success');
    }
    
    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
            this.cart = [];
            this.saveCart();
            this.renderCart();
            this.updateUI();
            this.showNotification('Carrito vaciado', 'success');
        }
    }
    
    setupEventListeners() {
        // Botón de checkout
        document.getElementById('checkout-btn').addEventListener('click', () => {
            if (this.cart.length === 0) return;
            
            // Redirigir a página de checkout
            window.location.href = '/checkout';
        });
        
        // Botón para vaciar carrito (si existe)
        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }
        
        // Configurar listeners para items del carrito
        this.setupItemListeners();
    }
    
    setupItemListeners() {
        // Botones de aumentar/disminuir cantidad
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.closest('.quantity-btn').dataset.id;
                const isIncrease = e.target.closest('.quantity-btn').classList.contains('increase');
                const item = this.cart.find(item => item.id == productId);
                
                if (item) {
                    const newQuantity = isIncrease ? item.quantity + 1 : item.quantity - 1;
                    this.updateQuantity(productId, newQuantity);
                }
            });
        });
        
        // Inputs de cantidad
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = e.target.dataset.id;
                const newQuantity = parseInt(e.target.value) || 1;
                this.updateQuantity(productId, newQuantity);
            });
            
            input.addEventListener('blur', (e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) {
                    const productId = e.target.dataset.id;
                    this.updateQuantity(productId, 1);
                }
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.closest('.remove-item').dataset.id;
                this.removeItem(productId);
            });
        });
    }
    
    showNotification(message, type = 'info') {
        // Reutilizar la función del script principal si existe
        if (window.MabelApp && window.MabelApp.showNotification) {
            window.MabelApp.showNotification(message, type);
            return;
        }
        
        // Implementación básica si no existe
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : '#0c5460'};
            border-left: 4px solid ${type === 'success' ? '#28a745' : '#17a2b8'};
            border-radius: 4px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Si tienes una función updateCartTotals, modifícala así:
function updateCartTotals(cartItems) {
    let subtotal = 0;
    let totalItems = 0;
    
    cartItems.forEach(item => {
        const price = parseFloat(item.precio || item.price || 0);
        const quantity = parseInt(item.cantidad || item.quantity || 1);
        
        // Calcular precio con descuento si existe
        let finalPrice = price;
        if (item.descuento_porcentaje) {
            finalPrice = price * (1 - (item.descuento_porcentaje / 100));
        } else if (item.precio_final) {
            finalPrice = parseFloat(item.precio_final);
        }
        
        subtotal += finalPrice * quantity;
        totalItems += quantity;
    });
    
    // Actualizar en la UI
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    
    // ELIMINAR O COMENTAR EL CÁLCULO DEL ENVÍO
    // let shipping = 0;
    // if (subtotal < 50) {
    //     shipping = 10; // o el costo que tengas
    // }
    // document.getElementById('shipping').textContent = shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`;
    
    // El total será igual al subtotal (sin envío)
    const total = subtotal; // ← Sin sumar envío
    
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    
    // Actualizar contador del carrito
    document.querySelectorAll('.cart-count').forEach(element => {
        element.textContent = totalItems;
    });
    
    // Habilitar/deshabilitar botón de checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cartItems.length === 0;
    }
    
    return {
        subtotal: subtotal,
        total: total,
        items: totalItems
    };
}

// Si no tienes esa función, agrega este código al final de tu cart-page.js:
document.addEventListener('DOMContentLoaded', function() {
    // ... tu código existente ...
    
    // Función simplificada para calcular totales
    function calculateCartTotals() {
        const cartData = localStorage.getItem('mabel_cart');
        if (!cartData) {
            updateUIForEmptyCart();
            return;
        }
        
        const cart = JSON.parse(cartData);
        let subtotal = 0;
        
        cart.forEach(item => {
            const price = parseFloat(item.precio || item.price || 0);
            const quantity = parseInt(item.cantidad || item.quantity || 1);
            let itemPrice = price;
            
            // Aplicar descuentos si existen
            if (item.descuento_porcentaje) {
                itemPrice = price * (1 - (item.descuento_porcentaje / 100));
            } else if (item.precio_final) {
                itemPrice = parseFloat(item.precio_final);
            }
            
            subtotal += itemPrice * quantity;
        });
        
        // Actualizar la UI - SOLO SUBTOTAL Y TOTAL (sin envío)
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('total').textContent = `$${subtotal.toFixed(2)}`;
        
        console.log('🛒 Total calculado (sin envío):', subtotal);
    }
    
    // Llama a esta función cuando cargue la página
    calculateCartTotals();
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new CartPage();
});