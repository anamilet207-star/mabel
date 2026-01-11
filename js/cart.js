// ============================================
// CARRITO - Funciones globales
// ============================================

class MabelCart {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('mabel_cart')) || [];
    }

    // Agregar producto al carrito
    addToCart(product, quantity = 1, selectedSize = null, selectedColor = null) {
        const existingItemIndex = this.cart.findIndex(item => 
            item.id === product.id && 
            item.size === selectedSize && 
            item.color === selectedColor
        );

        if (existingItemIndex > -1) {
            // Actualizar cantidad existente
            this.cart[existingItemIndex].quantity += quantity;
        } else {
            // Agregar nuevo item
            this.cart.push({
                id: product.id,
                nombre: product.nombre,
                precio: parseFloat(product.precio),
                imagen: product.imagen || '/public/images/default-product.jpg',
                categoria: product.categoria,
                quantity: quantity,
                size: selectedSize,
                color: selectedColor,
                stock: product.stock || 99,
                sku: product.sku || `SKU-${product.id}`
            });
        }

        this.saveCart();
        this.updateCartCount();
        this.showNotification('Producto agregado al carrito', 'success');
    }

    // Eliminar producto del carrito (CORREGIDO: solo elimina el producto específico)
    removeItem(productId, size = null, color = null) {
        console.log('🗑️ Intentando eliminar:', productId, size, color);
        console.log('🛒 Carrito actual:', this.cart);
        
        const initialLength = this.cart.length;
        
        if (size !== null && color !== null) {
            // Eliminar producto específico con talla y color
            this.cart = this.cart.filter(item => 
                !(item.id == productId && item.size === size && item.color === color)
            );
        } else if (size !== null) {
            // Eliminar producto específico con talla
            this.cart = this.cart.filter(item => 
                !(item.id == productId && item.size === size)
            );
        } else {
            // Eliminar todos los items con ese ID
            this.cart = this.cart.filter(item => item.id != productId);
        }
        
        console.log('✅ Carrito después de eliminar:', this.cart);
        console.log('📊 Items eliminados:', initialLength - this.cart.length);
        
        if (initialLength > this.cart.length) {
            this.saveCart();
            this.updateCartCount();
            this.showNotification('Producto eliminado del carrito', 'success');
            
            // Si estamos en la página del carrito, recargar
            if (window.location.pathname.includes('cart')) {
                window.location.reload();
            }
            
            return true;
        }
        
        this.showNotification('Producto no encontrado en el carrito', 'error');
        return false;
    }

    // Actualizar cantidad de un producto
    updateQuantity(productId, newQuantity, size = null, color = null) {
        const item = this.findItem(productId, size, color);
        if (item) {
            item.quantity = Math.max(1, Math.min(newQuantity, item.stock || 99));
            this.saveCart();
            this.updateCartCount();
            
            // Si estamos en la página del carrito, recargar totales
            if (window.location.pathname.includes('cart')) {
                this.updateCartTotals();
            }
            
            return true;
        }
        return false;
    }

    // Encontrar item específico
    findItem(productId, size = null, color = null) {
        return this.cart.find(item => {
            if (size !== null && color !== null) {
                return item.id == productId && item.size === size && item.color === color;
            } else if (size !== null) {
                return item.id == productId && item.size === size;
            }
            return item.id == productId;
        });
    }

    // Vaciar carrito
    clearCart() {
        if (this.cart.length > 0) {
            if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
                this.cart = [];
                this.saveCart();
                this.updateCartCount();
                this.showNotification('Carrito vaciado', 'success');
                
                // Si estamos en la página del carrito, recargar
                if (window.location.pathname.includes('cart')) {
                    window.location.reload();
                }
            }
        }
    }

    // Calcular totales
    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => 
            sum + (item.precio * item.quantity), 0);
        
        // Envío gratis si subtotal > 50
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + shipping;
        
        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            shipping: parseFloat(shipping.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            items: this.cart.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    // Actualizar contador del carrito
    updateCartCount() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElements = document.querySelectorAll('.cart-count');
        
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
            element.style.display = totalItems > 0 ? 'inline-block' : 'none';
        });
    }

    // Actualizar totales en la página del carrito
    updateCartTotals() {
        if (!document.getElementById('subtotal')) return;
        
        const totals = this.calculateTotals();
        
        document.getElementById('subtotal').textContent = `$${totals.subtotal.toFixed(2)}`;
        
        // Actualizar botón de checkout
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = totals.items === 0;
            checkoutBtn.textContent = totals.items === 0 ? 'Carrito Vacío' : 'Proceder al Pago';
        }
    }

    // Guardar carrito en localStorage
    saveCart() {
        localStorage.setItem('mabel_cart', JSON.stringify(this.cart));
        console.log('💾 Carrito guardado:', this.cart);
        
        // Disparar evento personalizado
        const event = new CustomEvent('cartUpdated', { 
            detail: { cart: this.cart } 
        });
        document.dispatchEvent(event);
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : 
                         type === 'error' ? '#f8d7da' : 
                         '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'error' ? '#721c24' : 
                    '#0c5460'};
            border-left: 4px solid ${type === 'success' ? '#28a745' : 
                                   type === 'error' ? '#dc3545' : 
                                   '#17a2b8'};
            border-radius: 4px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Agregar estilos de animación si no existen
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Inicializar carrito en todas las páginas
    init() {
        console.log('🛒 Inicializando carrito Mabel');
        
        // Actualizar contador inicial
        this.updateCartCount();
        
        // Escuchar eventos de agregar al carrito
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.add-to-cart');
            if (addToCartBtn) {
                e.preventDefault();
                const productId = addToCartBtn.dataset.id;
                
                // Buscar datos del producto
                fetch(`/api/products/${productId}`)
                    .then(response => response.json())
                    .then(product => {
                        this.addToCart(product, 1);
                    })
                    .catch(error => {
                        console.error('Error obteniendo producto:', error);
                        this.showNotification('Error agregando al carrito', 'error');
                    });
            }
        });
        
        // Configurar botones de eliminar del carrito
        document.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item');
            if (removeBtn) {
                e.preventDefault();
                const productId = removeBtn.dataset.id;
                const size = removeBtn.dataset.size || null;
                const color = removeBtn.dataset.color || null;
                
                this.removeItem(productId, size, color);
            }
        });
        
        console.log('✅ Carrito inicializado');
    }
}

// Exportar instancia global
window.MabelCart = new MabelCart();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.MabelCart.init();
});