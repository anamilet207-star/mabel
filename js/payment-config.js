// ============================================
// CONFIGURACIÓN DE PAGOS - Stripe & PayPal
// ============================================

// CONFIGURACIÓN SIMPLIFICADA DE PAGOS
class PaymentConfig {
    constructor() {
        this.paypal = null;
        this.currency = 'USD';
        this.init();
    }

    async init() {
        try {
            // Solo cargar configuración básica para PayPal
            const response = await fetch('/api/payments/config');
            const config = await response.json();
            
            this.currency = config.currency || 'USD';
            
            console.log('✅ Configuración de pagos simplificada cargada');
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            this.currency = 'USD';
        }
    }

    getCurrency() {
        return this.currency;
    }

    formatAmount(amount) {
        // Solo para PayPal si es necesario
        return parseFloat(amount).toFixed(2);
    }
}

// Singleton global
window.PaymentConfig = new PaymentConfig();