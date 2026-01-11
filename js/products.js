// ============================================
// PRODUCTOS - Funciones generales
// ============================================

class ProductsManager {
    constructor() {
        this.products = [];
        this.categories = new Set();
        this.filters = {
            category: '',
            minPrice: 0,
            maxPrice: 1000,
            sortBy: 'newest',
            search: ''
        };
        this.currentPage = 1;
        this.productsPerPage = 12;
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Error al cargar productos');
            
            this.products = await response.json();
            this.extractCategories();
            
            return this.products;
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            throw error;
        }
    }

    extractCategories() {
        this.categories.clear();
        this.products.forEach(product => {
            if (product.categoria) {
                this.categories.add(product.categoria);
            }
        });
    }

    getCategories() {
        return Array.from(this.categories).map(category => ({
            value: category,
            label: this.formatCategoryName(category)
        }));
    }

    formatCategoryName(category) {
        const categoryMap = {
            'leggings': 'Leggings',
            'tops': 'Tops',
            'sets': 'Sets',
            'shorts': 'Shorts',
            'accesorios': 'Accesorios',
            'sports-bras': 'Sports Bras',
            'jackets': 'Chaquetas',
            'pants': 'Pantalones'
        };
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    filterProducts(products = this.products) {
        let filtered = [...products];

        // Filtrar por categoría
        if (this.filters.category) {
            filtered = filtered.filter(product => 
                product.categoria === this.filters.category
            );
        }

        // Filtrar por precio
        filtered = filtered.filter(product => {
            const price = parseFloat(product.precio);
            return price >= this.filters.minPrice && price <= this.filters.maxPrice;
        });

        // Filtrar por búsqueda
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(product =>
                product.nombre.toLowerCase().includes(searchTerm) ||
                product.descripcion?.toLowerCase().includes(searchTerm) ||
                product.categoria.toLowerCase().includes(searchTerm)
            );
        }

        // Ordenar
        filtered.sort((a, b) => {
            switch (this.filters.sortBy) {
                case 'price-low':
                    return a.precio - b.precio;
                case 'price-high':
                    return b.precio - a.precio;
                case 'name':
                    return a.nombre.localeCompare(b.nombre);
                case 'popular':
                    return (b.vistas || 0) - (a.vistas || 0);
                case 'newest':
                default:
                    return b.id - a.id;
            }
        });

        return filtered;
    }

    getPaginatedProducts(filteredProducts) {
        const startIndex = (this.currentPage - 1) * this.productsPerPage;
        const endIndex = startIndex + this.productsPerPage;
        return filteredProducts.slice(startIndex, endIndex);
    }

    getTotalPages(filteredProducts) {
        return Math.ceil(filteredProducts.length / this.productsPerPage);
    }

    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.currentPage = 1; // Resetear a primera página al cambiar filtros
    }

    setPage(page) {
        this.currentPage = Math.max(1, Math.min(page, this.getTotalPages(this.filterProducts())));
    }

    // Generar HTML para tarjetas de producto
    generateProductCardHTML(product) {
        const stockStatus = product.stock <= 0 ? 'Agotado' : 
                          product.stock <= 5 ? 'Últimas unidades' : 'Disponible';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-img">
                    <img src="${product.imagen || '/public/images/default-product.jpg'}" 
                         alt="${product.nombre}"
                         onerror="this.src='/public/images/default-product.jpg'">
                    ${product.stock <= 5 ? '<span class="stock-badge">Últimas unidades</span>' : ''}
                    ${product.stock <= 0 ? '<span class="stock-badge out-of-stock">Agotado</span>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.nombre}</h3>
                    <p class="product-category">${this.formatCategoryName(product.categoria)}</p>
                    <p class="price">$${parseFloat(product.precio).toFixed(2)}</p>
                    <button class="add-to-cart" 
                            data-id="${product.id}"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        ${product.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            </div>
        `;
    }

    // Generar HTML para grid de productos
    generateProductsGridHTML(products) {
        if (products.length === 0) {
            return `
                <div class="no-products">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No se encontraron productos</h3>
                    <p>Intenta con otros filtros o categorías</p>
                </div>
            `;
        }

        return products.map(product => this.generateProductCardHTML(product)).join('');
    }

    // Generar controles de paginación
    generatePaginationHTML(totalPages) {
        if (totalPages <= 1) return '';

        let paginationHTML = '<div class="pagination">';
        
        // Botón anterior
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="page-btn prev" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
            `;
        }

        // Números de página
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Botón siguiente
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="page-btn next" data-page="${this.currentPage + 1}">
                    Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</div>';
        return paginationHTML;
    }

    // Aumentar vistas del producto
    async incrementProductViews(productId) {
        try {
            await fetch(`/api/products/${productId}/view`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error incrementando vistas:', error);
        }
    }

    // Obtener productos por categoría
    getProductsByCategory(category, limit = 4) {
        return this.products
            .filter(product => product.categoria === category)
            .slice(0, limit);
    }

    // Obtener productos destacados
    getFeaturedProducts(limit = 6) {
        return this.products
            .filter(product => product.activo)
            .sort((a, b) => (b.vistas || 0) - (a.vistas || 0))
            .slice(0, limit);
    }

    // Obtener producto por ID
    getProductById(id) {
        return this.products.find(product => product.id == id);
    }

    // Buscar productos
    searchProducts(query) {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return this.products;

        return this.products.filter(product => {
            return product.nombre.toLowerCase().includes(searchTerm) ||
                   product.descripcion?.toLowerCase().includes(searchTerm) ||
                   product.categoria.toLowerCase().includes(searchTerm) ||
                   product.material?.toLowerCase().includes(searchTerm);
        });
    }

    // Obtener productos relacionados
    getRelatedProducts(product, limit = 4) {
        return this.products
            .filter(p => 
                p.id !== product.id && 
                (p.categoria === product.categoria || 
                 this.hasSimilarPrice(p.precio, product.precio))
            )
            .slice(0, limit);
    }

    hasSimilarPrice(price1, price2, threshold = 20) {
        return Math.abs(parseFloat(price1) - parseFloat(price2)) <= threshold;
    }
}

// Exportar singleton para uso global
window.ProductsManager = new ProductsManager();

// Inicializar cuando se necesite
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.ProductsManager.loadProducts();
        
        // Si estamos en una página que necesita productos, inicializar
        if (document.querySelector('.products-grid')) {
            window.ProductsManager.initializeProductGrid();
        }
    } catch (error) {
        console.error('Error inicializando ProductsManager:', error);
    }
});