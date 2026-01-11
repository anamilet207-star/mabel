// ============================================
// INICIALIZACIÓN DE COMPONENTES
// ============================================

class MabelApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Mabel Activewear App...');
        
        // Inicializar componentes si existen
        this.initComponents();
        
        // Actualizar contador del carrito
        this.updateCartCount();
        
        // Verificar sesión
        await this.checkSession();
        
        console.log('✅ Aplicación inicializada');
    }

    initComponents() {
        // Inicializar componentes dinámicos
        if (typeof window.MabelCart !== 'undefined') {
            window.MabelCart.init();
        }
        
        // Inicializar componentes custom si no existen
        if (!customElements.get('mabel-navbar')) {
            this.initNavbar();
        }
        
        if (!customElements.get('mabel-footer')) {
            this.initFooter();
        }
    }

    initNavbar() {
        // Cargar navbar si no existe
        if (!document.querySelector('mabel-navbar')) {
            const navbar = document.createElement('mabel-navbar');
            document.body.insertBefore(navbar, document.body.firstChild);
        }
    }

    initFooter() {
        // Cargar footer si no existe
        if (!document.querySelector('mabel-footer')) {
            const footer = document.createElement('mabel-footer');
            document.body.appendChild(footer);
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

    async checkSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (data.authenticated) {
                // Actualizar UI con datos del usuario
                this.updateUserUI(data.user);
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
        }
    }

    updateUserUI(user) {
        // Actualizar elementos de usuario en la página
        document.querySelectorAll('.user-name').forEach(element => {
            element.textContent = `${user.nombre} ${user.apellido}`;
        });
        
        document.querySelectorAll('.user-email').forEach(element => {
            element.textContent = user.email;
        });
        
        // Actualizar avatar
        document.querySelectorAll('.user-avatar').forEach(element => {
            const initials = `${user.nombre?.charAt(0) || 'U'}${user.apellido?.charAt(0) || 'S'}`.toUpperCase();
            element.textContent = initials;
        });
    }

    // Función para mostrar notificaciones globales
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `global-notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 
                              'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : 
                         type === 'error' ? '#f8d7da' : 
                         type === 'warning' ? '#fff3cd' : 
                         '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'error' ? '#721c24' : 
                    type === 'warning' ? '#856404' : 
                    '#0c5460'};
            border-left: 4px solid ${type === 'success' ? '#28a745' : 
                                   type === 'error' ? '#dc3545' : 
                                   type === 'warning' ? '#ffc107' : 
                                   '#17a2b8'};
            border-radius: 4px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        // Botón cerrar
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
        
        // Auto-remover
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Inicializar app global
document.addEventListener('DOMContentLoaded', () => {
    window.MabelApp = new MabelApp();
});