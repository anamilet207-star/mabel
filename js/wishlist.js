// ============================================
// MANEJADOR DE WISHLIST
// ============================================

class WishlistManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('❤️ Inicializando gestor de wishlist...');
        
        // Verificar si hay usuario logueado
        await this.checkUserSession();
        
        // Configurar botones de wishlist en productos
        this.setupWishlistButtons();
        
        // Configurar eventos
        this.setupEventListeners();
    }

    async checkUserSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                console.log('👤 Usuario para wishlist:', this.currentUser);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error verificando sesión:', error);
            return false;
        }
    }

    setupWishlistButtons() {
        // Encontrar todos los botones de wishlist
        const wishlistButtons = document.querySelectorAll('.wishlist-btn, .btn-wishlist, .add-to-wishlist');
        
        wishlistButtons.forEach(button => {
            const productId = button.dataset.productId || 
                             button.closest('[data-product-id]')?.dataset.productId ||
                             button.closest('.product-card')?.dataset.productId;
            
            if (productId) {
                button.dataset.productId = productId;
                
                // Verificar si ya está en wishlist
                this.checkIfInWishlist(productId).then(isInWishlist => {
                    this.updateButtonState(button, isInWishlist);
                });
                
                // Agregar evento click
                button.addEventListener('click', (e) => this.toggleWishlist(e));
            }
        });
    }

    async checkIfInWishlist(productId) {
        if (!this.currentUser) return false;
        
        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/wishlist`);
            
            if (response.ok) {
                const wishlist = await response.json();
                return wishlist.some(item => item.id == productId || item.producto_id == productId);
            }
            
            return false;
            
        } catch (error) {
            console.error('Error verificando wishlist:', error);
            return false;
        }
    }

    updateButtonState(button, isInWishlist) {
        if (isInWishlist) {
            button.classList.add('in-wishlist');
            button.classList.remove('not-in-wishlist');
            
            // Cambiar icono
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-heart';
                icon.style.color = '#ff4757';
            }
            
            // Cambiar texto si existe
            const text = button.querySelector('.wishlist-text');
            if (text) {
                text.textContent = 'En favoritos';
            }
            
            button.title = 'Quitar de favoritos';
        } else {
            button.classList.add('not-in-wishlist');
            button.classList.remove('in-wishlist');
            
            // Cambiar icono
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'far fa-heart';
                icon.style.color = '';
            }
            
            // Cambiar texto si existe
            const text = button.querySelector('.wishlist-text');
            if (text) {
                text.textContent = 'Agregar a favoritos';
            }
            
            button.title = 'Agregar a favoritos';
        }
    }

    async toggleWishlist(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.currentTarget;
        const productId = button.dataset.productId;
        
        if (!productId) {
            console.error('No product ID found');
            return;
        }
        
        // Si no hay usuario, redirigir a login
        if (!this.currentUser) {
            this.showNotification('Inicia sesión para agregar a favoritos', 'warning');
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        const isCurrentlyInWishlist = button.classList.contains('in-wishlist');
        
        try {
            if (isCurrentlyInWishlist) {
                // Remover de wishlist
                await this.removeFromWishlist(productId, button);
            } else {
                // Agregar a wishlist
                await this.addToWishlist(productId, button);
            }
        } catch (error) {
            console.error('Error toggle wishlist:', error);
            this.showNotification('Error al actualizar favoritos', 'error');
        }
    }

    async addToWishlist(productId, button) {
        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/wishlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ producto_id: productId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateButtonState(button, true);
                this.showNotification('Producto agregado a favoritos ❤️', 'success');
                
                // Actualizar contador de wishlist
                this.updateWishlistCount();
                
                return data;
            } else {
                throw new Error(data.error || 'Error al agregar a favoritos');
            }
            
        } catch (error) {
            console.error('Error agregando a wishlist:', error);
            throw error;
        }
    }

    async removeFromWishlist(productId, button) {
        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/wishlist/${productId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateButtonState(button, false);
                this.showNotification('Producto removido de favoritos', 'info');
                
                // Actualizar contador de wishlist
                this.updateWishlistCount();
                
                // Si estamos en la página de wishlist, recargar la sección
                if (window.location.hash === '#wishlist') {
                    const accountManager = window.AccountManager;
                    if (accountManager) {
                        accountManager.loadSection('wishlist');
                    }
                }
                
                return data;
            } else {
                throw new Error(data.error || 'Error al remover de favoritos');
            }
            
        } catch (error) {
            console.error('Error removiendo de wishlist:', error);
            throw error;
        }
    }

    async updateWishlistCount() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/wishlist`);
            
            if (response.ok) {
                const wishlist = await response.json();
                const count = wishlist.length;
                
                // Actualizar contador en la UI
                const countElements = document.querySelectorAll('.wishlist-count');
                countElements.forEach(element => {
                    element.textContent = count;
                    element.style.display = count > 0 ? 'inline' : 'none';
                });
                
                // Actualizar en Account Manager si existe
                if (window.AccountManager) {
                    window.AccountManager.updateHeaderStats();
                }
            }
        } catch (error) {
            console.error('Error actualizando contador wishlist:', error);
        }
    }

    setupEventListeners() {
        // Escuchar cambios en la sesión
        document.addEventListener('userLoggedIn', (e) => {
            if (e.detail && e.detail.user) {
                this.currentUser = e.detail.user;
                this.updateWishlistCount();
                this.setupWishlistButtons();
            }
        });
        
        document.addEventListener('userLoggedOut', () => {
            this.currentUser = null;
            this.setupWishlistButtons();
        });
    }

    showNotification(message, type = 'info') {
        // Usar la misma función de notificación del AccountManager si existe
        if (window.AccountManager && window.AccountManager.showNotification) {
            window.AccountManager.showNotification(message, type);
            return;
        }
        
        // Si no existe, crear una notificación simple
        const notification = document.createElement('div');
        notification.className = `simple-notification notification-${type}`;
        
        // Configurar colores según el tipo
        let backgroundColor, textColor;
        
        switch(type) {
            case 'success':
                backgroundColor = '#d4edda';
                textColor = '#155724';
                break;
            case 'error':
                backgroundColor = '#f8d7da';
                textColor = '#721c24';
                break;
            case 'warning':
                backgroundColor = '#fff3cd';
                textColor = '#856404';
                break;
            default: // info
                backgroundColor = '#d1ecf1';
                textColor = '#0c5460';
        }
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${backgroundColor};
            color: ${textColor};
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.WishlistManager = new WishlistManager();
});

// También inicializar cuando se cargue contenido dinámico
document.addEventListener('DOMContentLoaded', () => {
    // Observador para detectar cambios en el DOM (productos cargados dinámicamente)
    const observer = new MutationObserver(() => {
        if (window.WishlistManager) {
            window.WishlistManager.setupWishlistButtons();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});