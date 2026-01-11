// js/size-guide.js
class SizeGuideManager {
    constructor(product) {
        this.product = product;
        this.sizes = {};
        this.categories = {};
        this.activeCategory = 'leggings'; // Por defecto
        this.init();
    }
    
    async init() {
        console.log('📏 Inicializando guía de tallas');
        
        // Cargar datos de tallas
        await this.loadSizeData();
        
        // Renderizar sección
        this.renderSizeGuideSection();
        
        // Configurar event listeners
        this.setupEventListeners();
    }
    
    async loadSizeData() {
        // Datos de tallas por categoría (puedes mover esto a una base de datos)
        this.categories = {
            'leggings': {
                name: 'LEGGINGS',
                unit: 'cm',
                measurements: ['Talla', 'Cintura', 'Cadera', 'Largo Total'],
                sizes: {
                    'XS': [58, 80, 90, 86],
                    'S': [62, 84, 94, 88],
                    'M': [66, 88, 98, 90],
                    'L': [70, 92, 102, 92],
                    'XL': [74, 96, 106, 94]
                }
            },
            'tops': {
                name: 'TOPS',
                unit: 'cm',
                measurements: ['Talla', 'Busto', 'Contorno', 'Largo'],
                sizes: {
                    'XS': [80, 64, 34],
                    'S': [84, 68, 35],
                    'M': [88, 72, 36],
                    'L': [92, 76, 37],
                    'XL': [96, 80, 38]
                }
            },
            'sets': {
                name: 'SETS',
                unit: 'cm',
                measurements: ['Talla', 'Cintura', 'Cadera', 'Busto', 'Largo'],
                sizes: {
                    'XS': [58, 80, 80, 30],
                    'S': [62, 84, 84, 31],
                    'M': [66, 88, 88, 32],
                    'L': [70, 92, 92, 33],
                    'XL': [74, 96, 96, 34]
                }
            },
            'shorts': {
                name: 'SHORTS',
                unit: 'cm',
                measurements: ['Talla', 'Cintura', 'Cadera', 'Largo'],
                sizes: {
                    'XS': [58, 80, 40],
                    'S': [62, 84, 41],
                    'M': [66, 88, 42],
                    'L': [70, 92, 43],
                    'XL': [74, 96, 44]
                }
            },
            'accesorios': {
                name: 'ACCESORIOS',
                unit: 'talla única',
                measurements: ['Talla', 'Descripción'],
                sizes: {
                    'Única': ['Se ajusta a todas las tallas', '-']
                }
            }
        };
        
        // Mapear categoría del producto a nuestra guía
        this.activeCategory = this.mapProductCategory(this.product.categoria);
    }
    
    mapProductCategory(productCategory) {
        const categoryMap = {
            'leggings': 'leggings',
            'tops': 'tops',
            'sports-bras': 'tops',
            'sets': 'sets',
            'shorts': 'shorts',
            'jackets': 'tops',
            'pants': 'leggings',
            'accesorios': 'accesorios'
        };
        
        return categoryMap[productCategory] || 'leggings';
    }
    
    renderSizeGuideSection() {
        const productInfo = document.querySelector('.product-info');
        if (!productInfo) return;
        
        // Insertar después de la descripción del producto
        const descriptionSection = productInfo.querySelector('.product-description');
        if (descriptionSection) {
            const sizeGuideHTML = this.getSizeGuideHTML();
            descriptionSection.insertAdjacentHTML('afterend', sizeGuideHTML);
        }
        
        this.renderSizeTabs();
        this.renderSizeTable();
        this.renderSizeAvailability();
    }
    
    getSizeGuideHTML() {
        return `
            <div class="size-guide-section" id="size-guide-section">
                <div class="size-guide-header">
                    <h3>GUÍA DE TALLAS</h3>
                    <button class="size-guide-help" id="size-guide-help">
                        <i class="fas fa-question-circle"></i> ¿Cómo tomar mis medidas?
                    </button>
                </div>
                
                <div class="size-guide-tabs" id="size-guide-tabs">
                    <!-- Las pestañas se cargarán dinámicamente -->
                </div>
                
                <div class="size-guide-tables" id="size-guide-tables">
                    <!-- Las tablas se cargarán dinámicamente -->
                </div>
                
                <div class="size-availability" id="size-availability">
                    <!-- Disponibilidad de tallas -->
                </div>
                
                <div class="measurement-guide" id="measurement-guide" style="display: none;">
                    <h4>¿CÓMO TOMAR MIS MEDIDAS CORRECTAMENTE?</h4>
                    <div class="measurement-steps">
                        <div class="measurement-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h5>Cintura</h5>
                                <p>Mide alrededor de la parte más estrecha de tu cintura, manteniendo la cinta métrica paralela al suelo. No aprietes demasiado, deja espacio para un dedo entre la cinta y tu cuerpo.</p>
                            </div>
                        </div>
                        <div class="measurement-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h5>Cadera</h5>
                                <p>Mide alrededor de la parte más ancha de tus caderas, usualmente a nivel de los glúteos. Mantén la cinta métrica paralela al suelo.</p>
                            </div>
                        </div>
                        <div class="measurement-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h5>Busto</h5>
                                <p>Mide alrededor de la parte más completa de tu busto, pasando por el centro de los senos. Mantén la cinta métrica paralela al suelo sin apretar.</p>
                            </div>
                        </div>
                        <div class="measurement-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h5>Consejos importantes</h5>
                                <p>• Usa una cinta métrica flexible<br>
                                   • Toma las medidas sobre ropa interior o ropa ajustada<br>
                                   • Mantén una postura natural y relajada<br>
                                   • Si tienes dudas, elige la talla más grande</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="size-model-reference">
                    <div class="model-info">
                        <h5>Nuestra modelo de referencia</h5>
                        <p><strong>Altura:</strong> 170 cm<br>
                           <strong>Peso:</strong> 60 kg<br>
                           <strong>Medidas:</strong> 88-66-94 cm (Busto-Cintura-Cadera)<br>
                           <strong>Talla usual:</strong> M en leggings y tops</p>
                    </div>
                    <div class="model-image">
                        <img src="/public/images/model-reference.jpg" alt="Modelo de referencia" 
                             onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\" viewBox=\"0 0 80 80\"><rect width=\"80\" height=\"80\" fill=\"%23f5f5f5\"/><text x=\"40\" y=\"45\" font-family=\"Arial\" font-size=\"14\" text-anchor=\"middle\" fill=\"%23666\">Modelo</text></svg>'">
                    </div>
                </div>
            </div>
        `;
    }
    
    renderSizeTabs() {
        const tabsContainer = document.getElementById('size-guide-tabs');
        if (!tabsContainer) return;
        
        const tabsHTML = Object.entries(this.categories)
            .map(([key, category]) => `
                <button class="size-guide-tab ${key === this.activeCategory ? 'active' : ''}" 
                        data-category="${key}">
                    ${category.name}
                </button>
            `).join('');
        
        tabsContainer.innerHTML = tabsHTML;
    }
    
    renderSizeTable() {
        const tablesContainer = document.getElementById('size-guide-tables');
        if (!tablesContainer) return;
        
        let tablesHTML = '';
        
        Object.entries(this.categories).forEach(([key, category]) => {
            const isActive = key === this.activeCategory;
            const tableHTML = this.generateSizeTableHTML(key, category);
            
            tablesHTML += `
                <div class="size-table-container ${isActive ? 'active' : ''}" 
                     data-category="${key}">
                    ${tableHTML}
                </div>
            `;
        });
        
        tablesContainer.innerHTML = tablesHTML;
    }
    
    generateSizeTableHTML(categoryKey, category) {
        const { measurements, sizes, unit } = category;
        
        let tableHTML = `
            <div class="size-note">
                <p><i class="fas fa-info-circle"></i> Todas las medidas están en ${unit}. Los productos pueden tener un ajuste elástico de hasta un 10%.</p>
            </div>
            
            <table class="size-table">
                <thead>
                    <tr>
                        ${measurements.map(measure => `<th>${measure}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.entries(sizes).forEach(([sizeName, measurementsData]) => {
            const isAvailable = this.isSizeAvailable(sizeName);
            const rowClass = isAvailable ? '' : 'unavailable';
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td class="size-header">${sizeName}</td>
                    ${measurementsData.map(value => `<td>${value}</td>`).join('')}
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }
    
    renderSizeAvailability() {
        const availabilityContainer = document.getElementById('size-availability');
        if (!availabilityContainer || !this.product.tallas) return;
        
        // Ordenar tallas disponibles
        const availableSizes = [...this.product.tallas].sort((a, b) => {
            const sizeOrder = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6 };
            return (sizeOrder[a] || 99) - (sizeOrder[b] || 99);
        });
        
        const availabilityHTML = `
            <h4>DISPONIBILIDAD DE TALLAS PARA ESTE PRODUCTO</h4>
            <div class="availability-list">
                <div class="availability-item">
                    <span class="availability-indicator available"></span>
                    <span>Disponible</span>
                </div>
                <div class="availability-item">
                    <span class="availability-indicator limited"></span>
                    <span>Pocas unidades</span>
                </div>
                <div class="availability-item">
                    <span class="availability-indicator unavailable"></span>
                    <span>No disponible</span>
                </div>
            </div>
            
            <div class="size-tags" style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;">
                ${availableSizes.map(size => `
                    <span class="size-tag ${this.getSizeStatusClass(size)}" 
                          style="padding: 8px 16px; border-radius: 4px; font-size: 13px; font-weight: 500;">
                        ${size}
                    </span>
                `).join('')}
            </div>
        `;
        
        availabilityContainer.innerHTML = availabilityHTML;
    }
    
    getSizeStatusClass(size) {
        // Aquí podrías implementar lógica más compleja basada en stock
        if (this.product.stock <= 0) return 'unavailable';
        
        // Simulación de disponibilidad
        const stockMap = {
            'XS': this.product.stock > 5 ? 'available' : 'limited',
            'S': this.product.stock > 10 ? 'available' : 'limited',
            'M': this.product.stock > 15 ? 'available' : 'limited',
            'L': this.product.stock > 8 ? 'available' : 'limited',
            'XL': this.product.stock > 3 ? 'available' : 'limited'
        };
        
        return stockMap[size] || 'available';
    }
    
    isSizeAvailable(sizeName) {
        return this.product.tallas && this.product.tallas.includes(sizeName);
    }
    
    setupEventListeners() {
        // Cambiar pestañas de categoría
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('.size-guide-tab');
            if (tab && tab.dataset.category) {
                this.changeCategory(tab.dataset.category);
            }
        });
        
        // Botón de ayuda
        const helpBtn = document.getElementById('size-guide-help');
        const measurementGuide = document.getElementById('measurement-guide');
        
        if (helpBtn && measurementGuide) {
            helpBtn.addEventListener('click', () => {
                const isVisible = measurementGuide.style.display === 'block';
                measurementGuide.style.display = isVisible ? 'none' : 'block';
                
                helpBtn.innerHTML = isVisible ? 
                    '<i class="fas fa-question-circle"></i> ¿Cómo tomar mis medidas?' :
                    '<i class="fas fa-times"></i> Cerrar guía de medidas';
                
                // Scroll suave a la guía
                if (!isVisible) {
                    measurementGuide.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    changeCategory(category) {
        this.activeCategory = category;
        
        // Actualizar pestañas activas
        document.querySelectorAll('.size-guide-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Actualizar tablas visibles
        document.querySelectorAll('.size-table-container').forEach(container => {
            container.classList.toggle('active', container.dataset.category === category);
        });
        
        console.log('📏 Cambiado a categoría:', category);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
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
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de detalle de producto
    const productDetailManager = window.productDetailManager;
    
    if (productDetailManager && productDetailManager.product) {
        // Hacer accesible globalmente
        window.sizeGuideManager = new SizeGuideManager(productDetailManager.product);
        console.log('✅ Guía de tallas inicializada');
    }
});